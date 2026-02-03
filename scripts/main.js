const API_URL = "https://casosdecodigo-5l0x.onrender.com/api";
const CASE_ID = "caso_1";

const GameAPI = {
    state: null,

    async request(endpoint, method = "POST", body = null) {
        const headers = { "Content-Type": "application/json" };
        const guestId = localStorage.getItem("guest_id");
        if (guestId) headers["X-Guest-ID"] = guestId;

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            const newGuestId = response.headers.get("X-Guest-ID");
            if (newGuestId && newGuestId !== "null" && newGuestId !== "undefined") {
                localStorage.setItem("guest_id", newGuestId);
            }

            const data = await response.json();
            return { ok: response.ok, data };
        } catch (error) {
            return { ok: false, data: { error: "FALHA DE CONEXÃO COM O SERVIDOR." } };
        }
    },

    async initializeGame() {
        const res = await this.request("/cases/initialize", "POST", { case_id: CASE_ID });
        if (res.ok) this.state = res.data;
        return res;
    },

    async getGameProgress() {
        const res = await this.request("/game/progress", "GET");
        return res;
    },

    async executeSQL(sql) {
        return await this.request("/game/execute", "POST", {
            case_id: CASE_ID,
            sql
        });
    },

    getCurrentNarrative(stateData) {
        return stateData?.narrative || stateData?.state?.narrative || null;
    },

    getPuzzleBaseNarrative(stateData) {
        const puzzleNum = stateData?.current_puzzle || stateData?.state?.current_puzzle || 1;
        if (window.gameCaseData && window.gameCaseData.puzzles) {
            const puzzle = window.gameCaseData.puzzles.find(p => p.number === puzzleNum);
            return puzzle?.narrative;
        }
        return null;
    },

    formatTableData(data) {
        if (!Array.isArray(data) || data.length === 0) return "Nenhum resultado.";

        const headers = Object.keys(data[0]);
        let table = '<table class="data-table"><thead><tr>';
        headers.forEach(header => table += `<th>${this.formatHeader(header)}</th>`);
        table += '</tr></thead><tbody>';
        data.forEach(row => {
            table += '<tr>';
            headers.forEach(header => table += `<td>${this.formatDataCell(row[header])}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';

        table += `<div class="schema-hint">// SCHEMA: [ ${headers.join(', ')} ]</div>`;

        return table;
    },

    formatDataCell(val) {
        if (val === null) return 'NULL';
        if (typeof val === 'string') return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        return String(val);
    },

    formatHeader(s) {
        return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};

class GameInterface {
    constructor() {
        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerBtnButton = this.powerBtnContainer?.querySelector('.button');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.scrollContainer = document.querySelector('.game-interface');
        this.outputEl = document.getElementById('output');
        this.inputEl = document.getElementById('command-input');
        this.audioLoop = document.getElementById('music-loop');
        this.sfxPower = document.getElementById('sfx-power');

        this.isPoweredOn = false;
        this.messageQueue = [];
        this.isTyping = false;
        this.isSkipping = false;
        this.TYPE_SPEED = 15;
        this.autoScrollEnabled = true;
        this.isProgrammaticScroll = false;
        this.SCROLL_THRESHOLD = 5;

        window.gameCaseData = null;

        this.bindEvents();
        this.preloadGameData();
    }

    async preloadGameData() {
        await GameAPI.initializeGame().then(res => {
            if (res.ok) window.gameCaseData = res.data.case;
        });
    }

    bindEvents() {
        this.powerBtnContainer?.addEventListener('click', () => this.togglePower());
        this.mobilePowerBtn?.addEventListener('click', () => this.togglePower());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleEnterAction(e);
        });
        this.submitBtn?.addEventListener('click', (e) => {
            this.handleEnterAction(e);
            this.inputEl.focus();
        });
        document.addEventListener('keydown', (e) => {
            if (!this.isPoweredOn) return;
            if (e.key === 'Enter' && document.activeElement !== this.inputEl) {
                e.preventDefault();
                this.inputEl.focus();
            }
            if ((e.key === 'Enter' || e.key === ' ') && this.isTyping) {
                e.preventDefault();
                this.isSkipping = true;
            }
        });
        this.scrollContainer.addEventListener('scroll', () => {
            if (this.isProgrammaticScroll) return;
            const dist = this.scrollContainer.scrollHeight - this.scrollContainer.scrollTop - this.scrollContainer.clientHeight;
            this.autoScrollEnabled = dist < this.SCROLL_THRESHOLD;
        });
    }

    togglePower() {
        this.isPoweredOn ? this.turnOff() : this.turnOn();
    }

    async turnOn() {
        this.isPoweredOn = true;
        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);
        this.powerLed?.classList.add('on');
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = 'none';
        this.screenArea.classList.replace('screen-off', 'screen-on');
        this.sfxPower.currentTime = 0;
        this.sfxPower.play().catch(() => { });

        setTimeout(async () => {
            if (this.isPoweredOn) {
                this.audioLoop.volume = 0.3;
                this.audioLoop.play().catch(() => { });
                this.inputEl.focus();

                this.outputEl.innerHTML = '';
                this.messageQueue = [];
                this.isTyping = false;
                this.isSkipping = false;
                this.inputEl.disabled = false;

                await this.startNarrative(true);
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

    async startNarrative(isBaseOnly = false) {

        if (!GameAPI.state) {
            const res = await GameAPI.getGameProgress();
            if (res.ok) {
                const progressions = res.data;
                if (progressions && progressions.length > 0) {
                    const currentProgression = progressions.find(p => p.case_id === CASE_ID);
                    if (currentProgression) {
                        GameAPI.state = {
                            current_puzzle: currentProgression.current_puzzle,
                            current_focus: currentProgression.current_focus
                        };
                    }
                }
            }
        }

        let narrative;

        if (isBaseOnly) {
            narrative = GameAPI.getPuzzleBaseNarrative(GameAPI.state);

            if (!narrative && window.gameCaseData?.puzzles) {
                const puzzleNum = GameAPI.state?.current_puzzle || 1;
                const puzzle = window.gameCaseData.puzzles.find(p => p.number === puzzleNum);
                narrative = puzzle?.narrative;
            }
        } else {
            narrative = GameAPI.getCurrentNarrative(GameAPI.state);
        }

        if (narrative) {
            const puzzleNum = GameAPI.state?.current_puzzle || 1;
            const puzzleData = window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum);
            const imgKey = puzzleData?.image_key;

            setTimeout(() => {
                this.queueMessage(narrative, 'narrative', imgKey);
            }, 100);
        } else {
            setTimeout(() => {
                this.queueMessage("Sistema inicializado. Digite AJUDA para ver os comandos disponíveis.", 'narrative');
            }, 100);
        }
    }

    async handleEnterAction(event) {
        if (!this.isPoweredOn) return;
        if (this.isTyping) {
            if (event) event.preventDefault();
            this.isSkipping = true;
            return;
        }

        const command = this.inputEl.value.trim();
        if (!command) return;
        this.inputEl.value = '';

        if (['clear', 'limpar', 'cls'].includes(command.toLowerCase())) {
            this.outputEl.innerHTML = '';
            this.messageQueue = [];
            this.isTyping = false;
            this.isSkipping = false;
            this.inputEl.disabled = false;

            await this.startNarrative(true);
            return;
        }

        this.queueMessage(`\n> ${command}`, 'prompt');
        this.scrollToBottom(true);
        const res = await GameAPI.executeSQL(command);

        if (res.ok) {
            const baseNarrative = GameAPI.getPuzzleBaseNarrative(res.data);
            let narrativeToShow = res.data.narrative || res.data.state?.narrative;

            const stateTables = res.data.state?.tables;

            if (stateTables && stateTables.length > 0 && narrativeToShow.includes("Tabelas disponíveis")) {
                const tableListString = `\n> [ ${stateTables.join(', ')} ]`;

                narrativeToShow = narrativeToShow.replace(
                    "consulte as tabelas listadas acima.",
                    tableListString
                );
            }

            const imageKey = res.data.image_key || res.data.success_image_key || res.data.failure_image_key;

            if (res.data.data && narrativeToShow === baseNarrative) {
                narrativeToShow = "Você executa a consulta. As linhas surgem no monitor.";
            }

            if (narrativeToShow) {
                this.queueMessage(`\n➤ ${narrativeToShow}`, 'narrative', imageKey);
            }

            if (res.data.data) this.queueMessage(GameAPI.formatTableData(res.data.data), 'data');
            GameAPI.state = res.data;
        } else {
            this.queueMessage(`\n➤ ERRO: ${res.data.error || 'Erro desconhecido'}`, 'error');
        }
    }

    queueMessage(content, type, imageKey = null) {
        let processedContent = content;

        if (imageKey) {
            const assetsBaseUrl = API_URL.replace('/api', '');
            const imgHtml = `
            <div class="evidence-container">
                <img src="${assetsBaseUrl}/assets/${imageKey}" class="evidence-img">
            </div>`;

            processedContent = content.includes('[[IMAGE]]')
                ? content.replace('[[IMAGE]]', imgHtml)
                : content + `<br>${imgHtml}`;
        }

        this.messageQueue.push({ content: processedContent, type });
        requestAnimationFrame(() => this.processQueue());
    }

    processQueue() {
        if (this.isTyping || this.messageQueue.length === 0) return;

        this.isTyping = true;
        const msg = this.messageQueue.shift();

        if (msg.type === 'data') {
            this.appendDataBlock(msg.content);
            return;
        }

        this.createTypewriterBlock(msg);
    }

    appendDataBlock(content) {
        const wrapper = document.createElement('div');
        wrapper.className = 'output-block typewriter-wrapper';
        const block = document.createElement('div');
        block.className = 'data';
        block.innerHTML = content;
        wrapper.appendChild(block);
        this.outputEl.appendChild(wrapper);
        this.scrollToBottom(true);
        this.isTyping = false;
        this.processQueue();
    }

    createTypewriterBlock(msg) {
        const wrapper = document.createElement('div');
        wrapper.className = 'output-block typewriter-wrapper';

        const ghost = document.createElement('div');
        ghost.className = `typewriter-ghost ${msg.type}`;
        ghost.style.cssText = 'visibility:hidden;pointer-events:none;white-space:pre-wrap;position:absolute;top:0;left:0;';

        const visible = document.createElement('div');
        visible.className = `typewriter-visible ${msg.type}`;
        visible.style.whiteSpace = 'pre-wrap';
        visible.style.position = 'relative';

        wrapper.appendChild(ghost);
        wrapper.appendChild(visible);
        this.outputEl.appendChild(wrapper);

        if (this.autoScrollEnabled) this.scrollToBottom();
        this.typewriterEffect(visible, ghost, msg.content);
    }

    typewriterEffect(visibleEl, ghostEl, content) {
        let i = 0;
        this.isSkipping = false;
        this.inputEl.disabled = true;

        const tick = () => {
            if (this.isSkipping) {
                visibleEl.innerHTML = content.replace(/\n/g, '<br>');
                finish();
                return;
            }

            if (i < content.length) {
                if (content[i] === '<') {
                    let tagEnd = content.indexOf('>', i);
                    if (tagEnd !== -1) {
                        i = tagEnd + 1;
                    } else {
                        i++;
                    }
                } else {
                    i++;
                }

                visibleEl.innerHTML = content.slice(0, i).replace(/\n/g, '<br>');

                if (this.autoScrollEnabled) this.scrollToBottom();
                setTimeout(tick, this.TYPE_SPEED);
            } else {
                finish();
            }
        };

        const finish = () => {
            visibleEl.innerHTML = content.replace(/\n/g, '<br>');
            if (ghostEl && ghostEl.parentElement) ghostEl.remove();
            visibleEl.classList.remove("typewriter-visible");
            visibleEl.style.position = "static";
            visibleEl.style.whiteSpace = 'normal';
            this.inputEl.disabled = false;
            this.inputEl.focus();

            if (this.isSkipping) {
                this.scrollToBottom(true);
            } else if (this.autoScrollEnabled) {
                this.scrollToBottom();
            }

            this.isTyping = false;
            this.processQueue();
        };

        tick();
    }

    scrollToBottom(force = false) {
        if (!force && !this.autoScrollEnabled) return;
        this.isProgrammaticScroll = true;
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
        requestAnimationFrame(() => { this.isProgrammaticScroll = false; });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameInterface = new GameInterface();
});