const API_BASE_URL = "https://casosdecodigo-5l0x.onrender.com/api";

const SelectionAPI = {
    async getCases() {
        const token = localStorage.getItem('auth_token');
        const guestId = localStorage.getItem('guest_id');

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (guestId) {
            headers['X-Guest-ID'] = guestId;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/cases`, {
                method: 'GET',
                headers: headers
            });

            if (response.status === 401) {
                alert("Sessão expirada. Faça login novamente.");
                window.location.href = 'login.html';
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error("Erro ao buscar casos:", error);
            return null;
        }
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
        this.sfxPower = new Audio('audio/startup_button.mp3');
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

    turnOn() {
        if (this.isPoweredOn) return;
        this.isPoweredOn = true;

        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);

        this.powerLed?.classList.add('on');
        this.sfxPower.currentTime = 0;
        this.sfxPower.play().catch(e => console.log("Erro audio:", e));

        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = 'none';

        this.screenArea.classList.replace('screen-off', 'screen-on');

        setTimeout(() => {
            if (this.isPoweredOn) {
                this.audioLoop.volume = 0.2;
                this.audioLoop.play().catch(() => { });

                this.loadAndRenderCases();
            }
        }, 1500);
    }

    turnOff() {
        if (!this.isPoweredOn) return;
        this.isPoweredOn = false;

        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);

        this.powerLed?.classList.remove('on');

        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = '';

        this.screenArea.classList.replace('screen-on', 'screen-off');
        this.audioLoop.pause();
        this.audioLoop.currentTime = 0;

        if (this.caseListContainer) {
            this.caseListContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">INICIALIZANDO SISTEMA...</p>';
        }
    }

    async loadAndRenderCases() {
        if (!this.caseListContainer) return;

        this.caseListContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">CONECTANDO AO SERVIDOR...</p>';

        const data = await SelectionAPI.getCases();

        if (!data || !data.cases) {
            this.caseListContainer.innerHTML = '<p style="text-align:center; color: red;">ERRO DE CONEXÃO.</p>';
            return;
        }

        this.caseListContainer.innerHTML = '';

        const progressionsMap = {};
        if (data.progressions) {
            data.progressions.forEach(p => {
                progressionsMap[p.case_id] = p;
            });
        }

        let previousCompleted = true;

        data.cases.forEach((caso, index) => {
            const progression = progressionsMap[caso.id];
            let status = 'blocked';
            let label = 'BLOQUEADO';

            if (progression && progression.completed) {
                status = 'completed';
                label = 'CONCLUÍDO';
            } else if (previousCompleted) {
                status = 'available';
                label = 'DISPONÍVEL';
                if (progression) label = 'EM ANDAMENTO';
            }

            previousCompleted = (status === 'completed');

            const cardHTML = this.createCaseCard(caso, status, label);
            this.caseListContainer.innerHTML += cardHTML;
        });
    }

    createCaseCard(caso, status, label) {
        let iconPath = '';
        let cssClass = '';

        switch (status) {
            case 'completed':
                iconPath = 'images/icon-check.png';
                cssClass = 'completed';
                break;
            case 'available':
                iconPath = 'images/icon-folder.png';
                cssClass = '';
                break;
            case 'blocked':
            default:
                iconPath = 'images/icon-lock.png';
                cssClass = 'blocked';
                break;
        }

        let diffNum = parseInt(caso.difficulty) || 1;
        const stars = '★'.repeat(diffNum) + '☆'.repeat(5 - diffNum);

        return `
            <div class="case-card ${cssClass}" onclick="window.gameInterface.selectCase('${caso.id}', '${status}')">
                <div class="card-icon">
                    <img src="${iconPath}" alt="${status}">
                </div>
                <div class="card-content">
                    <h2>${caso.title}</h2>
                    <div class="card-meta">
                        <span>${label}</span>
                        <span>DIF: ${stars}</span>
                    </div>
                </div>
            </div>
        `;
    }

    selectCase(id, status) {
        if (status === 'blocked') {
            alert("ACESSO NEGADO: Arquivos criptografados. Complete os casos anteriores.");
            return;
        }

        console.log(`Carregando caso ${id}...`);

        window.location.href = `game.html?id=${id}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameInterface = new SelectionInterface();
});