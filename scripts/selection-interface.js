import { setGlobalPowerState } from './storage.js';
import { api } from './api.js';
import { PowerManager } from './power-manager.js';

class SelectionInterface {
    constructor() {
        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.audioLoop = document.getElementById('music-loop');
        this.caseListContainer = document.getElementById('case-list');

        this.volumeKnob = document.getElementById('hw-volume-knob');
        this.volumeSlider = document.getElementById('hw-volume-slider');
        this.volumeHud = document.getElementById('volume-hud');
        this.knobIndicator = this.volumeKnob.querySelector('.knob-indicator');
        this.hudTimeout = null;
        this.currentVolume = typeof getGameVolume === 'function' ? getGameVolume() : 0.3;
        this.updateVolume(0);


        this.setupVolumeControl();

        this.exitButtons = [
            document.querySelector('.exit-switch'),
            document.getElementById('btn-exit-case'),
            document.getElementById('btn-voltar-mobile')
        ].filter(btn => btn);

        this.powerManager = new PowerManager({
            powerBtnContainer: this.powerBtnContainer,
            powerLed: this.powerLed,
            mobilePowerBtn: this.mobilePowerBtn,
            screenArea: this.screenArea,
            audioLoop: this.audioLoop,
            sfxPower: 'audio/startup_button.mp3',
            onPowerOn: () => this.onPowerOn(),
            onPowerOff: () => this.onPowerOff()
        });

        this.powerManager.init();
        this.bindExitEvents();

        this.initVisualButtons();
    }

    bindExitEvents() {
        this.exitButtons.forEach(btn => {
            btn.addEventListener('click', () => this.exitSystem());
        });
    }

    exitSystem() {
        setGlobalPowerState(false);

        if (this.screenArea) {
            this.screenArea.classList.add('screen-shutting-down');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } else {
            window.location.href = 'index.html';
        }
    }

    onPowerOn() {
        if (typeof setGameVolume === 'function') {
            setGameVolume(this.currentVolume);
        }
        this.loadAndRenderCases();
    }

    onPowerOff() {
        if (this.caseListContainer) {
            this.caseListContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">SISTEMA DESLIGADO</p>';
        }
    }

    async loadAndRenderCases() {
        if (!this.caseListContainer) return;

        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">CONECTANDO AO SERVIDOR...</p>';

        const data = await api.getCases();

        if (!data || !data.cases) {
            this.caseListContainer.innerHTML = '<p style="text-align:center; color: red;">ERRO DE CONEXÃO.</p>';
            return;
        }

        this.caseListContainer.innerHTML = '';

        const progressionsMap = {};
        if (data.progressions) {
            data.progressions.forEach(p => progressionsMap[p.case_id] = p);
        }

        let previousCompleted = true;

        data.cases.forEach(caso => {
            const progression = progressionsMap[caso.id];
            let status = 'blocked';
            let label = 'BLOQUEADO';

            if (progression?.completed) {
                status = 'completed';
                label = 'CONCLUÍDO';
            } else if (previousCompleted) {
                status = 'available';
                label = progression ? 'EM ANDAMENTO' : 'DISPONÍVEL';
            }

            previousCompleted = (status === 'completed');

            const cardHTML = this.createCaseCard(caso, status, label);
            this.caseListContainer.innerHTML += cardHTML;
        });
    }

    createCaseCard(caso, status, label) {
        const icons = {
            completed: 'images/icon-check.png',
            available: 'images/icon-folder.png',
            blocked: 'images/icon-lock.png'
        };
        const iconPath = icons[status] || icons.blocked;
        const cssClass = status === 'completed' ? 'completed' : (status === 'blocked' ? 'blocked' : '');

        const diffNum = parseInt(caso.difficulty) || 1;
        const stars = '★'.repeat(diffNum) + '☆'.repeat(5 - diffNum);

        return `
            <div class="case-card ${cssClass}" onclick="window.gameInterface.selectCase('${caso.id}', '${status}')">
                <div class="card-icon"><img src="${iconPath}" alt="${status}"></div>
                <div class="card-content">
                    <h2>${caso.title}</h2>
                    <div class="card-meta"><span>${label}</span><span>DIF: ${stars}</span></div>
                </div>
            </div>
        `;
    }

    selectCase(id, status) {
        if (status === 'blocked') {
            alert("ACESSO NEGADO: Arquivos criptografados. Complete os casos anteriores.");
            return;
        }
        window.location.href = `game.html?id=${id}`;
    }

    setupVolumeControl() {
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
    }

    updateVolume(delta) {
        this.currentVolume = Math.min(1, Math.max(0, this.currentVolume + delta));

        if (this.currentVolume < 0.02) this.currentVolume = 0;

        if (typeof setGameVolume === 'function') {
            setGameVolume(this.currentVolume);
        }

        const rotation = (this.currentVolume * 180) - 90;
        if (this.knobIndicator) {
            this.knobIndicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }

        if (this.volumeSlider) this.volumeSlider.value = this.currentVolume;

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

    insertControlButton(btn) {
        const controlsRight = document.querySelector('.monitor-controls-right');
        if (controlsRight) {
            controlsRight.prepend(btn);
        }
    }

    initVisualButtons() {
        const dicasBtn = document.createElement('div');
        dicasBtn.className = 'chat-toggle';
        dicasBtn.style.opacity = "0.6";
        dicasBtn.style.cursor = "default";
        dicasBtn.title = "Sistema de ajuda indisponível nesta tela";
        dicasBtn.innerHTML = '<div class="button"><i class="fa-solid fa-lightbulb"></i></div>';

        const anotacoesBtn = document.createElement('div');
        anotacoesBtn.className = 'chat-toggle';
        anotacoesBtn.style.opacity = "0.6";
        anotacoesBtn.style.cursor = "default";
        anotacoesBtn.title = "Bloco de notas indisponível nesta tela";
        anotacoesBtn.innerHTML = '<div class="button"><i class="fa-solid fa-pen-to-square"></i></div>';

        this.insertControlButton(dicasBtn);
        this.insertControlButton(anotacoesBtn);

    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.gameInterface = new SelectionInterface();
});