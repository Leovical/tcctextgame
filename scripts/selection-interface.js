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
    }

    onPowerOn() {
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
            <div class="case-card ${cssClass}" onclick="window.selectionInterface.selectCase('${caso.id}', '${status}')">
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.selectionInterface = new SelectionInterface();
});