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
        this.connectSSE();
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


    connectSSE() {
        const eventSource = new EventSource(`${API_URL}/game/tournament/subscribe?team_code=${this.teamCode}`);
        eventSource.addEventListener('case-status', (e) => {
            const data = JSON.parse(e.data);
            this.updateCaseCard(data.case_id, data.status === 'occupied');
        });
        eventSource.onerror = () => {
            console.warn('SSE connection error. Retrying...');
            eventSource.close();
            setTimeout(() => this.connectSSE(), 5000);
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

    loadCases() {
        this.renderCases();
    }

    clearCases() {
        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">SISTEMA DESLIGADO</p>';
    }

    renderCases() {
        if (!this.caseListContainer) return;
        this.caseListContainer.innerHTML = '';

        this.cases.forEach(c => {
            const card = this.createCaseCard(c);
            this.caseListContainer.appendChild(card);
        });
    }

    createCaseCard(c) {
        const card = document.createElement('div');
        card.className = `case-card ${c.occupied ? 'blocked' : ''}`;
        card.setAttribute('data-case-id', c.id);
        card.innerHTML = `
            <div class="card-icon">
                <img src="images/icon-folder.png" alt="Caso">
            </div>
            <div class="card-content">
                <h2>${c.title}</h2>
                <div class="card-meta">
                    <span>${c.occupied ? 'OCUPADO' : 'DISPONÍVEL'}</span>
                    <span>DIF: ${'★'.repeat(parseInt(c.difficulty) || 1)}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => this.selectCase(c));
        return card;
    }

    selectCase(c) {
        if (c.occupied) {
            alert('Esta linha narrativa já está ocupada por outro membro do time.');
            return;
        }
        window.location.href = `game.html?id=${c.id}&team_code=${this.teamCode}&matricula=${this.myMatricula}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.teamSelect = new TeamSelectInterface();
});