import { api } from './api.js';
import { PowerManager } from './power-manager.js';
import { formatTableData } from './formatters.js';
import { API_URL } from './config.js';

const CASE_ID = new URLSearchParams(window.location.search).get('id') || "caso_0";

class GameInterface {
    constructor() {
        this.powerBtnContainer = document.getElementById('power-btn-container');
        this.powerLed = document.getElementById('power-led');
        this.mobilePowerBtn = document.getElementById('mobile-power-btn');
        this.screenArea = document.getElementById('game-screen-area');
        this.scrollContainer = document.querySelector('.game-interface');
        this.outputEl = document.getElementById('output');
        this.inputEl = document.getElementById('command-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.audioLoop = document.getElementById('music-loop');
        this.sfxPower = document.getElementById('sfx-power');

        this.narrativeStarted = false;
        this.messageQueue = [];
        this.isTyping = false;
        this.isSkipping = false;
        this.TYPE_SPEED = 15;
        this.autoScrollEnabled = true;
        this.isProgrammaticScroll = false;
        this.SCROLL_THRESHOLD = 5;

        window.gameCaseData = null;

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

        this.bindEvents();
        this.powerManager.init();
    }

    onPowerOn() {
        this.inputEl.disabled = false;
        this.maybeStartNarrative();
    }

    onPowerOff() {
        this.inputEl.disabled = true;
    }

    bindEvents() {
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleEnterAction(e);
        });
        this.submitBtn?.addEventListener('click', (e) => {
            this.handleEnterAction(e);
            this.inputEl.focus();
        });
        document.addEventListener('keydown', (e) => {
            if (!this.powerManager.isPoweredOn) return;
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

        const btnExit = document.getElementById('btn-exit-case');
        const btnExitMobile = document.getElementById('btn-voltar-mobile');
        const handleExit = () => window.location.href = 'select-cases.html';
        btnExit?.addEventListener('click', handleExit);
        btnExitMobile?.addEventListener('click', handleExit);
    }

    async preloadGameData() {
        const res = await api.initializeGame(CASE_ID);
        if (res.ok) {
            window.gameCaseData = res.data.case;
            if (res.data.progression) {
                api.state = res.data.progression;
            }
            this.updateHeaderTitle(window.gameCaseData.title);
            this.maybeStartNarrative();
        }
    }

    updateHeaderTitle(fullTitle) {
        const titleEl = document.getElementById('case-title');
        if (!titleEl || !fullTitle) return;
        if (fullTitle.includes(' - ')) {
            const shortTitle = fullTitle.split(' - ')[1];
            titleEl.innerText = shortTitle.toUpperCase();
        } else {
            titleEl.innerText = fullTitle.toUpperCase();
        }
    }

    maybeStartNarrative() {
        if (!this.powerManager.isPoweredOn) return;
        if (!api.state) return;
        if (this.narrativeStarted) return;
        this.narrativeStarted = true;
        this.startNarrative(true);
    }

    async startNarrative(isBaseOnly = false) {
        if (!api.state) return;

        let narrative;
        if (isBaseOnly) {
            narrative = this.getPuzzleBaseNarrative(api.state);
        } else {
            narrative = this.getCurrentNarrative(api.state);
        }

        if (!narrative && window.gameCaseData?.puzzles) {
            const puzzleNum = this.getPuzzleNumber(api.state);
            const puzzle = window.gameCaseData.puzzles.find(p => p.number === puzzleNum);
            narrative = puzzle?.narrative;
        }

        if (narrative) {
            const puzzleNum = this.getPuzzleNumber(api.state);
            const puzzleData = window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum);
            const imgKey = (narrative.includes('[[IMAGE]]')) ? (puzzleData?.image_key || null) : null;

            setTimeout(() => {
                this.queueMessage(narrative, 'narrative', imgKey);
                if (puzzleNum === 6) {
                    setTimeout(() => {
                        this.queueMessage("\n\n[ SISTEMA: ARQUIVO FINALIZADO. UTILIZE O BOTÃO 'VOLTAR' PARA RETORNAR AO MENU OU 'RESET' PARA REINICIAR ]", 'system');
                    }, 1500);
                }
            }, 100);
        }
    }

    getCurrentNarrative(stateData) {
        return stateData?.narrative || stateData?.state?.narrative || null;
    }

    getPuzzleBaseNarrative(stateData) {
        const puzzleNum = stateData?.current_puzzle || stateData?.state?.current_puzzle || 1;
        return window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum)?.narrative || null;
    }

    getPuzzleNumber(stateData) {
        return stateData?.current_puzzle ?? stateData?.state?.current_puzzle ?? 1;
    }

    async handleEnterAction(event) {
        if (!this.powerManager.isPoweredOn) return;
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

        const oldPuzzle = this.getPuzzleNumber(api.state);

        this.queueMessage(`\n> ${command}`, 'prompt');
        this.scrollToBottom(true);
        const res = await api.executeSQL(CASE_ID, command);

        if (res.ok) {
            const baseNarrative = this.getPuzzleBaseNarrative(res.data);
            let narrativeToShow = res.data.narrative || res.data.state?.narrative;
            const stateTables = res.data.state?.tables;

            if (stateTables && stateTables.length > 0 && narrativeToShow.includes("Tabelas disponíveis")) {
                const tableListString = `\n> [ ${stateTables.join(', ')} ]`;
                narrativeToShow = narrativeToShow.replace(
                    "consulte as tabelas listadas acima.",
                    tableListString
                );
            }

            const rawImageKey =
                res.data.image_key ??
                res.data.success_image_key ??
                res.data.failure_image_key ??
                null;

            const imageKey = (narrativeToShow?.includes('[[IMAGE]]')) ? rawImageKey : null;

            if (res.data.data && narrativeToShow === baseNarrative) {
                narrativeToShow = "Você executa a consulta. As linhas surgem no monitor.";
            }

            if (narrativeToShow) {
                this.queueMessage(`\n➤ ${narrativeToShow}`, 'narrative', imageKey);
            }

            if (res.data.data) this.queueMessage(formatTableData(res.data.data), 'data');

            api.state = res.data;

            const newPuzzle = this.getPuzzleNumber(res.data);
            if (newPuzzle && oldPuzzle && newPuzzle > oldPuzzle) {
                setTimeout(() => this.startNarrative(true), 1000);
            }
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
                    const tagEnd = content.indexOf('>', i);
                    i = (tagEnd !== -1) ? tagEnd + 1 : i + 1;
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
            if (ghostEl?.parentElement) ghostEl.remove();
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
    const gameInterface = new GameInterface();
    gameInterface.preloadGameData();
    window.gameInterface = gameInterface;
});