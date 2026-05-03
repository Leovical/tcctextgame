import { api } from './api.js';
import { API_URL } from './config.js';
import { PowerManager } from './power-manager.js';
import { setGameVolume, getGameVolume } from './audio_settings.js';

class TeamSelectInterface {
    constructor() {

        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.audioLoop = document.getElementById('music-loop');
        this.caseListContainer = document.getElementById('case-list');
        this.sfxPower = document.getElementById('sfx-power');

        this.volumeKnob = document.getElementById('hw-volume-knob');
        this.volumeSlider = document.getElementById('hw-volume-slider');
        this.volumeHud = document.getElementById('volume-hud');
        this.knobIndicator = this.volumeKnob?.querySelector('.knob-indicator');
        this.currentVolume = getGameVolume();
        this.hudTimeout = null;
        this.setupVolumeControl();

        this.teamCode = sessionStorage.getItem('team_code');
        this.myMatricula = sessionStorage.getItem('my_matricula');
        this.members = JSON.parse(sessionStorage.getItem('team_members') || '[]');
        this.ws = null;
        this.cases = [];

        if (!this.teamCode || !this.myMatricula || !this.members.length) {
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
            sfxPower: this.sfxPower,
            onPowerOn: () => this.onPowerOn(),
            onPowerOff: () => this.onPowerOff()
        });

        this.powerManager.init();
        this.bindEvents();
        this.connectWebSocket();
    }

    setupVolumeControl() {
        if (!this.volumeKnob) return;

        let isDragging = false;
        let startX = 0;

        const startDrag = (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            document.body.style.cursor = 'pointer';
        };

        const doDrag = (e) => {
            if (!isDragging) return;
            const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const deltaX = currentX - startX;
            const sensitivity = 200;
            this.updateVolume(deltaX / sensitivity);
            startX = currentX;
        };

        const stopDrag = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };

        this.volumeKnob.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);

        this.volumeKnob.addEventListener('touchstart', startDrag);
        window.addEventListener('touchmove', doDrag);
        window.addEventListener('touchend', stopDrag);

        if (this.volumeSlider) {
            this.volumeSlider.value = this.currentVolume;
            this.volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(parseFloat(e.target.value) - this.currentVolume);
            });
        }

        const rotation = (this.currentVolume * 180) - 90;
        if (this.knobIndicator) {
            this.knobIndicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
    }

    updateVolume(delta) {
        this.currentVolume = Math.min(1, Math.max(0, this.currentVolume + delta));
        if (this.currentVolume < 0.02) this.currentVolume = 0;

        setGameVolume(this.currentVolume);

        const rotation = (this.currentVolume * 180) - 90;
        if (this.knobIndicator) {
            this.knobIndicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
        if (this.volumeSlider) {
            this.volumeSlider.value = this.currentVolume;
        }

        this.showVolumeHUD();
    }

    showVolumeHUD() {
        if (!this.volumeHud) return;
        this.volumeHud.classList.remove('hidden');
        clearTimeout(this.hudTimeout);
        this.hudTimeout = setTimeout(() => {
            this.volumeHud.classList.add('hidden');
        }, 2000);
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
                const caseIdx = this.cases?.findIndex(c => c.id === data.case_id);
                if (caseIdx !== -1) {
                    this.cases[caseIdx].occupied = (data.status === 'occupied');
                }
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
            const statusSpan = card.querySelector('.card-meta span:first-child');
            if (statusSpan) statusSpan.textContent = 'OCUPADO';
        } else {
            card.classList.remove('blocked');
            const statusSpan = card.querySelector('.card-meta span:first-child');
            if (statusSpan) statusSpan.textContent = 'DISPONÍVEL';
        }
    }

    onPowerOn() {
        setGameVolume(this.currentVolume);
        this.loadCases();
    }

    onPowerOff() {
        if (this.caseListContainer) {
            this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">SISTEMA DESLIGADO</p>';
        }
    }

    async loadCases() {
        if (!this.caseListContainer) return;
        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">CARREGANDO...</p>';

        try {
            const validateRes = await api.validateTeam(this.teamCode);
            if (!validateRes.ok || !validateRes.data.valid) {
                throw new Error('Time inválido');
            }
            this.cases = validateRes.data.cases;

            sessionStorage.setItem('room_case_ids', JSON.stringify(this.cases.map(c => c.id)));

            const progressRes = await api.request(`/game/progress?team_code=${this.teamCode}`, 'GET');
            let myCaseId = null;
            if (progressRes.ok && Array.isArray(progressRes.data)) {
                const myProg = progressRes.data.find(p => p.matricula === this.myMatricula);
                if (myProg) myCaseId = myProg.case_id;
            }

            this.renderCases(myCaseId);
        } catch (error) {
            console.error('Erro ao carregar casos:', error);
            this.caseListContainer.innerHTML = '<p style="text-align:center; color:red;">ERRO AO CARREGAR CASOS</p>';
        }
    }

    renderCases(myCaseId) {
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

        const difficultyMap = {
            iniciante: 1,
            intermediario: 2,
            dificil: 3
        };
        const stars = '★'.repeat(difficultyMap[c.difficulty] || 1) + '☆'.repeat(5 - (difficultyMap[c.difficulty] || 1));

        card.innerHTML = `
            <div class="card-icon">
                <img src="images/icon-folder.png" alt="Caso">
            </div>
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

        if (clickHandler) {
            card.addEventListener('click', clickHandler);
        }

        return card;
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