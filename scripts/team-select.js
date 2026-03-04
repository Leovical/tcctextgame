import { api } from './api.js';
import { API_URL } from './config.js';
import { PowerManager } from './power-manager.js';

class TeamSelectInterface {
    constructor() {
        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.audioLoop = document.getElementById('music-loop');
        this.caseListContainer = document.getElementById('case-list');
        this.ws = null;

        this.teamCode = sessionStorage.getItem('team_code');
        this.myMatricula = sessionStorage.getItem('my_matricula');
        this.members = JSON.parse(sessionStorage.getItem('team_members') || '[]');
        this.cases = JSON.parse(sessionStorage.getItem('tournament_cases') || '[]');

        if (!this.teamCode || !this.myMatricula || !this.members.length || !this.cases.length) {
            alert('Dados do torneio não encontrados. Volte ao início.');
            window.location.href = 'index.html';
            return;
        }

        const member = this.members.find(m => m.matricula === this.myMatricula);
        const playerInfoEl = document.getElementById('player-info');
        if (playerInfoEl) {
            playerInfoEl.textContent = `Agente: ${member ? member.nome : this.myMatricula}`;
            playerInfoEl.style.display = 'block';
        }

        const memberSelection = document.getElementById('member-selection');
        if (memberSelection) memberSelection.style.display = 'none';

        this.powerManager = new PowerManager({
            powerBtnContainer: this.powerBtnContainer,
            powerLed: this.powerLed,
            mobilePowerBtn: this.mobilePowerBtn,
            screenArea: this.screenArea,
            audioLoop: this.audioLoop,
            sfxPower: 'audio/startup_button.mp3',
            onPowerOn: () => this.loadCases(),
            onPowerOff: () => this.clearCases()
        });

        this.powerManager.init();
        this.bindEvents();
        this.connectWebSocket();
    }

    bindEvents() {
        const exitButtons = [
            document.getElementById('btn-exit-case'),
            document.getElementById('btn-voltar-mobile')
        ];
        exitButtons.forEach(btn => {
            btn?.addEventListener('click', async () => {
                await api.request('/tournament/release', 'POST', {
                    team_code: this.teamCode,
                    matricula: this.myMatricula
                }).catch(() => { });
                sessionStorage.removeItem('team_code');
                sessionStorage.removeItem('team_members');
                sessionStorage.removeItem('tournament_cases');
                sessionStorage.removeItem('my_matricula');
                window.location.href = 'index.html';
            });
        });
    }

    connectWebSocket() {
        const wsUrl = API_URL.replace('http', 'ws') + `/game/team/ws?team_code=${this.teamCode}`;
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.case_id) {
                this.updateCaseCard(data.case_id, data.status === 'occupied');
            }
        };
        this.ws.onclose = () => {
            console.warn('WebSocket fechado. Tentando reconectar...');
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
        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">CARREGANDO...</p>';

        let myCaseId = null;
        try {
            const progressRes = await api.request(`/game/progress?team_code=${this.teamCode}`, 'GET');

            if (progressRes.ok && progressRes.data && Array.isArray(progressRes.data)) {
                const myProg = progressRes.data.find(p => p.matricula === this.myMatricula);
                if (myProg) {
                    myCaseId = myProg.case_id;
                }
            } else {
                console.warn('Resposta de progress não é um array, usando vazio');
            }
        } catch (error) {
            console.error('Erro ao buscar progressões:', error);
        }

        this.caseListContainer.innerHTML = '';
        this.cases.forEach(c => {
            const isMyCase = (c.id === myCaseId);
            const card = this.createCaseCard(c, isMyCase, myCaseId);
            this.caseListContainer.appendChild(card);
        });
    }

    createCaseCard(c, isMyCase, myCaseId) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.setAttribute('data-case-id', c.id);

        let statusText = '';
        let clickHandler = null;

        if (isMyCase) {
            card.classList.add('my-case');
            statusText = 'SEU CASO';
            clickHandler = () => {
                window.location.href = `game.html?id=${c.id}&team_code=${this.teamCode}&matricula=${this.myMatricula}`;
            };
        } else if (myCaseId) {
            card.classList.add('blocked');
            statusText = 'INDISPONÍVEL';
            clickHandler = () => alert('Você já possui um caso em andamento. Finalize ou reative-o antes de escolher outro.');
        } else {
            if (c.occupied) {
                card.classList.add('blocked');
                statusText = 'OCUPADO';
                clickHandler = () => alert('Esta linha narrativa já está ocupada por outro membro do time.');
            } else {
                statusText = 'DISPONÍVEL';
                clickHandler = () => this.selectCase(c);
            }
        }

        card.innerHTML = `
            <div class="card-icon">
                <img src="images/icon-folder.png" alt="Caso">
            </div>
            <div class="card-content">
                <h2>${c.title}</h2>
                <div class="card-meta">
                    <span>${statusText}</span>
                    <span>DIF: ${'★'.repeat(parseInt(c.difficulty) || 1)}</span>
                </div>
            </div>
        `;

        if (clickHandler) {
            card.addEventListener('click', clickHandler);
        }

        return card;
    }

    clearCases() {
        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">SISTEMA DESLIGADO</p>';
    }

    selectCase(c) {
        if (!this.myMatricula || this.myMatricula === 'null') {
            alert('Erro: matrícula inválida.');
            return;
        }
        window.location.href = `game.html?id=${c.id}&team_code=${this.teamCode}&matricula=${this.myMatricula}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.teamSelect = new TeamSelectInterface();
});