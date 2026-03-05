import { api } from './api.js';
import { PowerManager } from './power-manager.js';
import { formatTableData } from './formatters.js';
import { API_URL } from './config.js';

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

        const urlParams = new URLSearchParams(window.location.search);
        this.caseId = urlParams.get('id');
        this.teamCode = urlParams.get('team_code');
        this.matricula = urlParams.get('matricula');
        this.isTournament = !!(this.teamCode && this.matricula);
        this.teamReady = false;

        if (!this.caseId) {
            alert('Nenhum caso especificado.');
            window.location.href = 'select-cases.html';
            return;
        }

        if (this.isTournament) {
            const members = JSON.parse(sessionStorage.getItem('team_members') || '[]');
            this.members = members;
            const member = members.find(m => m.matricula === this.matricula);
            this.playerName = member ? member.nome : this.matricula;
            const playerInfoEl = document.getElementById('player-info');
            if (playerInfoEl) {
                playerInfoEl.textContent = `Agente: ${this.playerName}`;
                playerInfoEl.style.display = 'block';
            }
            this.unreadCount = 0;
            this.chatOpen = false;
            this.initChat();
        }

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

        this.powerManager.init();
        this.bindEvents();

        if (this.isTournament) {
            this.notification = document.createElement('div');
            this.notification.className = 'game-notification';
            document.body.appendChild(this.notification);
        }
    }

    showMessage(text, duration = 3000) {
        this.notification.textContent = text;
        this.notification.classList.add('show');
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            this.notification.classList.remove('show');
        }, duration);
    }

    initChat() {
        console.log("Chamado")
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSend = document.getElementById('chat-send');
        this.chatToggle = document.getElementById('chat-toggle');
        this.chatNotification = document.getElementById('chat-notification');

        this.chatInput.maxLength = 500;

        this.charCounter = document.createElement('span');
        this.charCounter.className = 'char-counter';
        this.charCounter.textContent = '0/500';
        this.chatInput.parentNode.insertBefore(this.charCounter, this.chatInput.nextSibling);

        this.chatInput.addEventListener('input', () => {
            const len = this.chatInput.value.length;
            this.charCounter.textContent = `${len}/500`;
            if (len > 500) {
                this.charCounter.style.color = '#ff3333';
            } else {
                this.charCounter.style.color = 'var(--phosphor-main)';
            }
        });

        this.chatToggle.addEventListener('click', () => (this.toggleChat()));

        const wsUrl = API_URL.replace('http', 'ws') + `/chat/ws?team_code=${this.teamCode}`;
        this.chatWs = new WebSocket(wsUrl);
        this.chatWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.displayChatMessage(data);
            if (!this.chatOpen) {
                this.unreadCount++;
                this.updateNotification();
            }
        };
        this.chatWs.onclose = () => {
            console.warn('Chat WebSocket fechado');
        };

        this.chatSend.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
    }

    toggleChat() {
        this.chatOpen = !this.chatOpen;
        if (this.chatOpen) {
            this.chatContainer.classList.add('open');
            this.unreadCount = 0;
            this.updateNotification();
        } else {
            this.chatContainer.classList.remove('open');
        }
    }

    updateNotification() {
        if (this.unreadCount > 0) {
            this.chatNotification.textContent = this.unreadCount;
            this.chatNotification.classList.add('has-unread');
        } else {
            this.chatNotification.classList.remove('has-unread');
        }
    }

    sendChatMessage() {
        if (!this.isTournament) return;
        const msg = this.chatInput.value.trim();
        if (!msg) return;
        if (msg.length > 500) {
            this.showMessage('Mensagem muito longa (máx 500 caracteres)');
            return;
        }
        const member = this.members.find(m => m.matricula === this.matricula);
        const userName = member ? member.nome : this.matricula;
        this.chatWs.send(JSON.stringify({
            user: userName,
            matricula: this.matricula,
            message: msg
        }));
        this.chatInput.value = '';
        this.charCounter.textContent = '0/500';
        this.charCounter.style.color = 'var(--phosphor-main)';
    }

    displayChatMessage(data) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="user">${data.user}:</span> <span class="text">${data.message}</span>`;
        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async onPowerOn() {
        this.inputEl.disabled = false;
        if (api.state && this.isTournament) {
            const statusRes = await api.tournamentStatus(this.teamCode);
            this.teamReady = statusRes.data.ready;
        }
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

        const handleExit = async () => {
            if (this.isTournament) {
                await api.request('/game/leave', 'POST', {
                    case_id: this.caseId,
                    team_code: this.teamCode,
                    matricula: this.matricula
                }).catch(() => { });
                window.location.href = 'team-select-case.html';
            } else {
                window.location.href = 'select-cases.html';
            }
        };

        btnExit?.addEventListener('click', handleExit);
        btnExitMobile?.addEventListener('click', handleExit);
    }

    async preloadGameData() {
        let res;

        if (this.isTournament) {
            res = await api.initializeTournamentCase(this.caseId, this.teamCode, this.matricula);
        } else {
            res = await api.initializeGame(this.caseId);
        }

        if (res.ok) {
            window.gameCaseData = res.data.case;

            if (res.data.progression) {
                api.state = res.data.progression;
            }

            this.updateHeaderTitle(window.gameCaseData.title);

            if (this.isTournament) {
                const statusRes = await api.tournamentStatus(this.teamCode);
                this.teamReady = statusRes.data.ready;

                if (statusRes.ok && !statusRes.data.ready) {
                    this.queueMessage("\nAguardando seu time se conectar. Digite CLS quando todos estiverem prontos.", 'system');
                    return;
                }
            }

            if (this.powerManager.isPoweredOn) {
                this.maybeStartNarrative();
            }
        } else {
            if (res.status === 409) {
                alert('Este caso não está disponível para sua matrícula. Você será redirecionado.');
                window.location.href = 'team-select-case.html';
            } else {
                alert('Erro ao carregar o caso.');
            }
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
        if (this.isTournament && !this.teamReady) {
            this.queueMessage("\nAguardando seu time se conectar. Digite CLS quando todos estiverem prontos.", 'system');
            return;
        }
        this.narrativeStarted = true;
        this.startNarrative(true);
    }

    async startNarrative(isBaseOnly = false) {
        if (!api.state) return;

        const puzzleNum = api.state.current_puzzle;
        const puzzle = window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum);
        if (!puzzle) return;

        const narrative = puzzle.narrative;
        if (!narrative) return;

        const imgKey = narrative.includes('[[IMAGE]]') ? puzzle.image_key : null;

        setTimeout(() => {
            this.queueMessage(narrative, 'narrative', imgKey);

            if (puzzleNum === 6) {
                setTimeout(() => {
                    this.queueMessage("\n\n[ SISTEMA: ARQUIVO FINALIZADO. UTILIZE O BOTÃO 'VOLTAR' PARA RETORNAR AO MENU OU 'RESET' PARA REINICIAR ]", 'system');
                }, 1500);
            }
        }, 100);
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

        const lowerCommand = command.toLowerCase();

        if (['clear', 'limpar', 'cls'].includes(lowerCommand)) {
            this.outputEl.innerHTML = '';
            this.messageQueue = [];
            this.isTyping = false;
            this.isSkipping = false;
            this.inputEl.disabled = false;

            if (this.isTournament) {
                const statusRes = await api.tournamentStatus(this.teamCode);
                this.teamReady = statusRes.data.ready;

                if (this.teamReady) {
                    const puzzleNum = api.state?.current_puzzle;
                    const puzzle = window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum);
                    if (puzzle) {
                        this.queueMessage(puzzle.narrative, 'narrative', puzzle.image_key);
                    }
                } else {
                    this.queueMessage("\nAguardando seu time se conectar. Digite CLS quando todos estiverem prontos.", 'system');
                }
            } else {
                const puzzleNum = api.state?.current_puzzle;
                const puzzle = window.gameCaseData?.puzzles?.find(p => p.number === puzzleNum);
                if (puzzle) {
                    this.queueMessage(puzzle.narrative, 'narrative', puzzle.image_key);
                }
            }
            return;
        }

        const oldPuzzle = api.state?.current_puzzle;
        this.queueMessage(`\n> ${command}`, 'prompt');
        this.scrollToBottom(true);

        let res;
        if (this.isTournament) {
            res = await api.executeTournamentSQL(this.caseId, command, this.teamCode, this.matricula);
        } else {
            res = await api.executeSQL(this.caseId, command);
        }

        if (res.ok) {
            const baseNarrative = window.gameCaseData?.puzzles?.find(p => p.number === res.data.state?.current_puzzle)?.narrative;
            let narrativeToShow = res.data.narrative || res.data.state?.narrative;
            const stateTables = res.data.state?.tables;

            if (stateTables && stateTables.length > 0 && narrativeToShow?.includes("Tabelas disponíveis")) {
                const tableListString = `\n> [ ${stateTables.join(', ')} ]`;
                narrativeToShow = narrativeToShow.replace("consulte as tabelas listadas acima.", tableListString);
            }

            const rawImageKey = res.data.image_key ?? res.data.success_image_key ?? res.data.failure_image_key ?? null;
            const imageKey = narrativeToShow?.includes('[[IMAGE]]') ? rawImageKey : null;

            if (res.data.data && narrativeToShow === baseNarrative) {
                narrativeToShow = "Você executa a consulta. As linhas surgem no monitor.";
            }

            if (narrativeToShow) {
                this.queueMessage(`\n➤ ${narrativeToShow}`, 'narrative', imageKey);
            }

            if (res.data.data) {
                this.queueMessage(formatTableData(res.data.data), 'data');
            }

            api.state = res.data.state;

            const newPuzzle = api.state?.current_puzzle;
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
            const imgHtml = `<div class="evidence-container"><img src="${assetsBaseUrl}/assets/${imageKey}" class="evidence-img"></div>`;
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

        requestAnimationFrame(() => {
            this.isProgrammaticScroll = false;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gameInterface = new GameInterface();
    gameInterface.preloadGameData();
    window.gameInterface = gameInterface;
});