const API_URL = "https://casosdecodigo-5l0x.onrender.com/api";

const SelectionAPI = {
    
    // simulando requisição
    async getCases() {
        // por enquanto, retornando dados locais (depois fazer fecth igual do main.js)
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { id: 1, title: "O INÍCIO", status: "completed", difficulty: 1, label: "CONCLUÍDO" },
                    { id: 2, title: "BACANA MESMO", status: "available", difficulty: 2, label: "DISPONÍVEL" },
                    { id: 3, title: "ACESSO NEGADO", status: "blocked", difficulty: 5, label: "BLOQUEADO" }
                ]);
            }, 500); 
        });
    }
};

class SelectionInterface {
    constructor() {
        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerBtnButton = this.powerBtnContainer?.querySelector('.button');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.audioLoop = document.getElementById('music-loop');
        this.sfxPower = document.getElementById('sfx-power') || new Audio('audio/startup_button.mp3');
        this.caseListContainer = document.getElementById('case-list');
        this.isPoweredOn = false;
        this.bindEvents();
    }

    bindEvents() {
        this.powerBtnContainer?.addEventListener('click', () => this.togglePower());
        this.mobilePowerBtn?.addEventListener('click', () => this.togglePower());
    }

    togglePower() {
        this.isPoweredOn ? this.turnOff() : this.turnOn();
    }

    async turnOn() {
        this.isPoweredOn = true;
        
        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);
        
        this.powerLed?.classList.add('on');
        this.sfxPower.currentTime = 0;
        this.sfxPower.play().catch(() => {});

        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = 'none';
        
        this.screenArea.classList.replace('screen-off', 'screen-on');

        setTimeout(async () => {
            if (this.isPoweredOn) {
                this.audioLoop.volume = 0.3;
                this.audioLoop.play().catch(() => {});

                this.loadAndRenderCases();
            }
        }, 1200);
    }

    turnOff() {
        this.isPoweredOn = false;
        
        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);
        
        this.powerLed?.classList.remove('on');
        
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = '';
        
        this.screenArea.classList.replace('screen-on', 'screen-off');
        this.audioLoop.pause();
        this.audioLoop.currentTime = 0;
    }

    // renderizando os casos
    async loadAndRenderCases() {
        if (!this.caseListContainer) return;

        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">ACESSANDO BANCO DE DADOS...</p>';

        // mock ou api
        const cases = await SelectionAPI.getCases();

        this.caseListContainer.innerHTML = '';

        cases.forEach(caso => {
            const cardHTML = this.createCaseCard(caso);
            this.caseListContainer.innerHTML += cardHTML;
        });
    }

    createCaseCard(caso) {
        let iconPath = '';
        let cssClass = '';

        switch(caso.status) {
            case 'completed':
                iconPath = 'images/icon-check.png';
                cssClass = 'completed';
                break;
            case 'available':
                iconPath = 'images/icon-folder.png';
                cssClass = 'available';
                break;
            case 'blocked':
            default:
                iconPath = 'images/icon-lock.png';
                cssClass = 'blocked';
                break;
        }

        const stars = '★'.repeat(caso.difficulty) + '☆'.repeat(5 - caso.difficulty);

        return `
            <div class="case-card ${cssClass}" onclick="window.gameInterface.selectCase(${caso.id}, '${caso.status}')">
                <div class="card-icon">
                    <img src="${iconPath}" alt="${caso.status}">
                </div>
                <div class="card-content">
                    <h2>CASO ${String(caso.id).padStart(2, '0')}: ${caso.title}</h2>
                    <div class="card-meta">
                        <span>${caso.label}</span>
                        <span>DIF: ${stars}</span>
                    </div>
                </div>
            </div>
        `;
    }


    selectCase(id, status) {
        if (status === 'blocked') {
            alert("ACESSO NEGADO: Complete os casos anteriores.");
            return;
        }
        console.log(`Carregando caso ${id}...`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameInterface = new SelectionInterface();
});