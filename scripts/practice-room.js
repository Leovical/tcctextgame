import { api } from './api.js';
import { API_URL } from './config.js';
import { PowerManager } from './power-manager.js';

class PracticeRoom {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.roomCode = params.get('room');
        this.nickname = params.get('nickname') || sessionStorage.getItem('nickname');

        if (!this.roomCode || !this.nickname) {
            alert('Dados inválidos. Volte ao início.');
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('room-code-display').textContent = this.roomCode;
        document.getElementById('player-nickname').textContent = this.nickname;

        this.screenArea = document.getElementById('game-screen-area');
        this.caseListContainer = document.getElementById('case-list');
        this.ws = null;
        this.cases = [];

        this.powerManager = new PowerManager({
            powerBtnContainer: document.getElementById('power-btn-container'),
            powerLed: document.getElementById('power-led'),
            mobilePowerBtn: document.getElementById('mobile-power-btn'),
            screenArea: this.screenArea,
            audioLoop: document.getElementById('music-loop'),
            sfxPower: 'audio/startup_button.mp3',
            onPowerOn: () => this.loadCases(),
            onPowerOff: () => this.clearCases()
        });
        this.powerManager.init();
        this.bindEvents();
        this.connectWebSocket();
    }

    bindEvents() {
        document.getElementById('btn-exit-case').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    connectWebSocket() {
        const wsUrl = API_URL.replace('http', 'ws') + `/game/team/ws?team_code=${this.roomCode}`;
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.case_id) {
                this.updateCaseCard(data.case_id, data.status === 'occupied');
            }
        };
        this.ws.onclose = () => {
            console.warn('WebSocket fechado, reconectando...');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    updateCaseCard(caseId, occupied) {
        const card = document.querySelector(`.case-card[data-case-id="${caseId}"]`);
        if (!card) return;
        if (occupied) {
            card.classList.add('blocked');
            card.querySelector('.card-meta span:first-child').textContent = 'OCUPADO';
        } else {
            card.classList.remove('blocked');
            card.querySelector('.card-meta span:first-child').textContent = 'DISPONÍVEL';
        }
    }

    async loadCases() {
        if (!this.caseListContainer) return;
        this.caseListContainer.innerHTML = '<p>Carregando casos...</p>';

        try {
            const roomRes = await api.checkPracticeRoom(this.roomCode);
            if (!roomRes.ok) throw new Error('Sala não encontrada');
            const caseIDs = roomRes.data.case_ids;

            const cases = [];
            for (const id of caseIDs) {
                const caseRes = await api.getCaseById(id);
                if (caseRes.ok && caseRes.data.case) {
                    cases.push(caseRes.data.case);
                }
            }
            this.cases = cases;

            const progressRes = await api.request(`/game/progress?team_code=${this.roomCode}`, 'GET');
            let occupiedCases = [];
            if (progressRes.ok && Array.isArray(progressRes.data)) {
                occupiedCases = progressRes.data.filter(p => p.active).map(p => p.case_id);
            }

            const validateRes = await api.validateTeam(this.teamCode);
            if (validateRes.ok && validateRes.data.valid) {
                this.cases = validateRes.data.cases;
                sessionStorage.setItem('room_case_ids', JSON.stringify(this.cases.map(c => c.id)));
            }

            const myActiveProg = progressRes.ok && Array.isArray(progressRes.data)
                ? progressRes.data.find(p => p.active && p.matricula === this.nickname)
                : null;
            if (myActiveProg) {
                window.location.href = `game.html?id=${myActiveProg.case_id}&team_code=${this.roomCode}&matricula=${encodeURIComponent(this.nickname)}&practice=true`;
                return;
            }

            this.renderCases(occupiedCases);
        } catch (e) {
            this.caseListContainer.innerHTML = '<p>Erro ao carregar casos.</p>';
            console.error(e);
        }
    }

    renderCases(occupiedCaseIds) {
        this.caseListContainer.innerHTML = '';
        this.cases.forEach(c => {
            const isOccupied = occupiedCaseIds.includes(c.id);
            const card = this.createCaseCard(c, isOccupied);
            this.caseListContainer.appendChild(card);
        });
    }

    createCaseCard(c, isOccupied) {
        const card = document.createElement('div');
        card.className = `case-card ${isOccupied ? 'blocked' : ''}`;
        card.setAttribute('data-case-id', c.id);
        const statusText = isOccupied ? 'OCUPADO' : 'DISPONÍVEL';

        const difficultyMap = {
            iniciante: 1,
            intermediario: 2,
            dificil: 3
        };
        const diffKey = (c.difficulty || '').toLowerCase();
        const stars = '★'.repeat(difficultyMap[diffKey] || 1) + '☆'.repeat(5 - (difficultyMap[diffKey] || 1));

        card.innerHTML = `
        <div class="card-icon"><img src="images/icon-folder.png" alt="Caso"></div>
        <div class="card-content">
            <div class="card-row">
                <div class="card-main-info">
                    <h2>${c.description}</h2>
                    <h3>${c.title}</h3>
                </div>
                <div class="card-meta">
                    <span>${statusText}</span>
                    <span>DIF: ${stars}</span>
                </div>
            </div>
        </div>
    `;

        if (isOccupied) {
            card.addEventListener('click', () => alert('Este caso já está ocupado por outro jogador.'));
        } else {
            card.addEventListener('click', () => this.selectCase(c.id));
        }
        return card;
    }

    async selectCase(caseId) {
        window.location.href = `game.html?id=${caseId}&team_code=${this.roomCode}&matricula=${encodeURIComponent(this.nickname)}&practice=true`;
    }

    clearCases() {
        this.caseListContainer.innerHTML = '<p>SISTEMA DESLIGADO</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.practiceRoom = new PracticeRoom();
});