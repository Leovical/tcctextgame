import { api } from './api.js';
import { PowerManager } from './power-manager.js';
import { formatTableData } from './formatters.js';
import { API_URL } from './config.js';
import { setGameVolume, getGameVolume } from './audio_settings.js';

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

        this.volumeKnob = document.getElementById('hw-volume-knob');
        this.volumeSlider = document.getElementById('hw-volume-slider');
        this.volumeHud = document.getElementById('volume-hud');
        this.knobIndicator = this.volumeKnob?.querySelector('.knob-indicator');

        this.currentVolume = getGameVolume();
        this.hudTimeout = null;

        const urlParams = new URLSearchParams(window.location.search);
        this.caseId = urlParams.get('id');
        this.teamCode = urlParams.get('team_code');
        this.matricula = urlParams.get('matricula');
        this.isPractice = urlParams.get('practice') === 'true';
        this.isTournament = !this.isPractice && !!(this.teamCode && this.matricula);
        this.teamReady = false;
        this.playerMap = {};

        if (this.caseId) {
            const storageKey = `commandHistory_${this.caseId}_${this.matricula || 'single'}`;
            this.commandHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
            this.historyIndex = -1;
            this.commandHistoryStorageKey = storageKey;
        } else {
            this.commandHistory = [];
            this.historyIndex = -1;
        }

        if (!this.caseId) {
            alert('Nenhum caso especificado.');
            window.location.href = 'select-cases.html';
            return;
        }

        if (this.isTournament || this.isPractice) {
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
        } else {
            const chatToggle = document.getElementById('chat-toggle');
            if (chatToggle) chatToggle.remove();
        }
        this.initDicas();
        this.initAnotacoes();

        this.narrativeStarted = false;
        this.messageQueue = [];
        this.isTyping = false;
        this.isSkipping = false;
        this.TYPE_SPEED = 15;
        this.autoScrollEnabled = true;
        this.isProgrammaticScroll = false;
        this.SCROLL_THRESHOLD = 5;

        window.gameCaseData = null;

        this.focusIndicator = document.createElement('div');
        this.focusIndicator.id = 'focus-indicator';
        this.focusIndicator.className = 'focus-indicator';
        this.focusIndicator.textContent = 'FOCO: --';
        const gameInterfaceContainer = document.querySelector('.game-interface');
        if (gameInterfaceContainer) {
            gameInterfaceContainer.appendChild(this.focusIndicator);
        } else {
            document.body.appendChild(this.focusIndicator);
        }

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

        this.setupVolumeControl();

        if (this.isTournament || this.isPractice) {
            this.notification = document.createElement('div');
            this.notification.className = 'game-notification';
            document.body.appendChild(this.notification);
        }
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

        const rotation = (this.currentVolume * 180) - 90;
        if (this.knobIndicator) {
            this.knobIndicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
        if (this.volumeSlider) {
            this.volumeSlider.value = this.currentVolume;
            this.volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(parseFloat(e.target.value) - this.currentVolume);
            });
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

    updateFocusIndicator() {
        if (!this.focusIndicator) return;
        const focusObj = api.state?.current_focus;
        const focusText = (focusObj && focusObj.toLowerCase() !== 'none')
            ? String(focusObj).toUpperCase()
            : 'NENHUM';
        this.focusIndicator.textContent = `FOCO: ${focusText}`;
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

        const saved = sessionStorage.getItem(`chat_${this.teamCode}`);
        if (saved) {
            JSON.parse(saved).forEach(msg => this.displayChatMessage(msg, false));
        }

        this.connectWebSocket();

        this.chatSend.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.sendChatMessage();
            }
        });
    }

    connectWebSocket() {
        const wsUrl = API_URL.replace('http', 'ws') + `/chat/ws?team_code=${this.teamCode}`;
        this.chatWs = new WebSocket(wsUrl);
        this.chatWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.displayChatMessage(data, true);
            if (!this.chatOpen) {
                this.unreadCount++;
                this.updateNotification();
            }
        };
        this.chatWs.onclose = () => {
            console.warn('Chat WebSocket fechado, reconectando...');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
        this.chatWs.onerror = (err) => {
            console.error('Chat WebSocket erro', err);
            this.showMessage('Erro na conexão do chat', 3000);
        };
    }

    displayChatMessage(data, save = true) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="user">${data.user}:</span> <span class="text">${data.message}</span>`;
        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        if (save) {
            this.saveChatMessage(data);
        }
    }

    sendChatMessage() {
        if (!this.isTournament && !this.isPractice) return; const msg = this.chatInput.value.trim();
        if (!msg) return;
        if (msg.length > 500) {
            this.showMessage('Mensagem muito longa (máx 500 caracteres)');
            return;
        }
        const member = this.members.find(m => m.matricula === this.matricula);
        const userName = member ? member.nome : this.matricula;
        try {
            this.chatWs.send(JSON.stringify({
                user: userName,
                matricula: this.matricula,
                message: msg
            }));
            this.chatInput.value = '';
            this.charCounter.textContent = '0/500';
            this.charCounter.style.color = 'var(--phosphor-main)';
        } catch (e) {
            this.showMessage('Falha ao enviar mensagem. Tente novamente.', 3000);
        }
    }

    saveChatMessage(data) {
        const key = `chat_${this.teamCode}`;
        let messages = JSON.parse(sessionStorage.getItem(key) || '[]');
        messages.push({
            user: data.user,
            message: data.message,
            timestamp: Date.now()
        });

        if (messages.length > 200) {
            messages = messages.slice(-200);
        }
        sessionStorage.setItem(key, JSON.stringify(messages));
    }

    toggleChat() {
        this.closeAllModals();
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

    async onPowerOn() {
        this.inputEl.disabled = false;
        if (api.state && (this.isTournament || this.isPractice)) {
            const statusRes = this.isPractice
                ? await api.getPracticeRoomStatus(this.teamCode)
                : await api.tournamentStatus(this.teamCode);
            this.teamReady = statusRes.data.ready;
        }

        setGameVolume(this.currentVolume);

        this.maybeStartNarrative();
    }

    onPowerOff() {
        this.inputEl.disabled = true;
    }

    addToHistory(command) {
        if (!command) return;
        const lower = command.toLowerCase();
        if (['clear', 'limpar', 'cls'].includes(lower)) return;

        if (this.commandHistory.length > 0 && this.commandHistory[this.commandHistory.length - 1] === command) {
            return;
        }

        this.commandHistory.push(command);
        if (this.commandHistory.length > 10) {
            this.commandHistory.shift();
        }
        localStorage.setItem(this.commandHistoryStorageKey, JSON.stringify(this.commandHistory));
        this.historyIndex = -1;
    }

    navigateHistory(direction) {
        if (!this.commandHistory.length) return;

        if (direction === -1) {
            if (this.historyIndex === -1) {
                this.historyIndex = this.commandHistory.length - 1;
            } else if (this.historyIndex > 0) {
                this.historyIndex--;
            } else {
                return;
            }
        } else {
            if (this.historyIndex === -1) return;
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
            } else {
                this.inputEl.value = '';
                this.historyIndex = -1;
                return;
            }
        }

        this.inputEl.value = this.commandHistory[this.historyIndex];
        this.inputEl.selectionStart = this.inputEl.selectionEnd = this.inputEl.value.length;
    }

    bindEvents() {
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleEnterAction(e);
        });

        this.submitBtn?.addEventListener('click', (e) => {
            this.handleEnterAction(e);
            this.inputEl.focus();
        });

        document.addEventListener('keydown', (e) => {
            if (!this.powerManager.isPoweredOn) return;

            if (this.chatInput && document.activeElement === this.chatInput) {
                return;
            }

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
            if (this.isPractice) {
                window.location.href = `practice-room.html?room=${this.teamCode}&nickname=${encodeURIComponent(this.matricula)}`;
            } else if (this.isTournament) {
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

        if (this.isTournament || this.isPractice) {
            res = await api.initializePracticeCase(this.caseId, this.teamCode, this.matricula);
        } else {
            res = await api.initializeGame(this.caseId);
        }

        if (res.ok) {
            window.gameCaseData = res.data.case;

            if (res.data.progression) {
                api.state = res.data.progression;
                this.updateFocusIndicator();
            }

            this.updateHeaderTitle(window.gameCaseData.title);

            if (this.isTournament || this.isPractice) {
                await this.loadPlayerMap();
            }

            if (this.isPractice) {
                const statusRes = await api.getPracticeRoomStatus(this.teamCode);
                this.teamReady = statusRes.data.ready;
                if (statusRes.ok && !statusRes.data.ready) {
                    this.queueMessage("\nAguardando seu time se conectar. Digite CLS quando todos estiverem prontos.", 'system');
                    return;
                }
            } else if (this.isTournament) {
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
                if (this.isPractice) {
                    alert('Este caso já foi escolhido por outro jogador. Retornando à sala.');
                    window.location.href = `practice-room.html?room=${this.teamCode}&nickname=${encodeURIComponent(this.matricula)}`;
                } else if (this.isTournament) {
                    alert('Este caso não está disponível para sua matrícula. Você será redirecionado.');
                    window.location.href = 'team-select-case.html';
                } else {
                    alert('Erro ao carregar o caso.');
                }
                return;
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
        if ((this.isTournament || this.isPractice) && !this.teamReady) {
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

            const lastPuzzle = window.gameCaseData?.puzzles?.reduce((max, p) => Math.max(max, p.number), 0);

            if (puzzleNum === lastPuzzle) {
                setTimeout(() => {
                    this.queueMessage("\n\n[ SISTEMA: ARQUIVO FINALIZADO. UTILIZE O BOTÃO DE VOLTAR PARA RETORNAR AO MENU OU 'RESET' PARA REINICIAR ]", 'system');
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

        this.addToHistory(command);

        this.inputEl.value = '';

        const lowerCommand = command.toLowerCase();

        if (['clear', 'limpar', 'cls'].includes(lowerCommand)) {
            this.outputEl.innerHTML = '';
            this.messageQueue = [];
            this.isTyping = false;
            this.isSkipping = false;
            this.inputEl.disabled = false;

            if (this.isPractice) {
                const statusRes = await api.getPracticeRoomStatus(this.teamCode);
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
            } else if (this.isTournament) {
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
        } else if (this.isPractice) {
            res = await api.executePracticeSQL(this.caseId, command, this.teamCode, this.matricula);
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
            this.updateFocusIndicator();

            const newPuzzle = api.state?.current_puzzle;
            if (newPuzzle && oldPuzzle && newPuzzle > oldPuzzle) {
                setTimeout(() => this.startNarrative(true), 1000);
            }
        } else {
            this.queueMessage(`\n➤ ERRO: ${res.data.error || 'Erro desconhecido'}`, 'error');
        }
    }

    async loadPlayerMap() {
        const orderRaw = sessionStorage.getItem('room_case_ids');
        if (!orderRaw) return;
        const order = JSON.parse(orderRaw);

        const progressRes = await api.request(`/game/progress?team_code=${this.teamCode}`, 'GET');
        if (!progressRes.ok || !Array.isArray(progressRes.data)) return;

        const members = JSON.parse(sessionStorage.getItem('team_members') || '[]');

        this.playerMap = {};
        order.forEach((caseId, index) => {
            const pos = String(index + 1);
            const prog = progressRes.data.find(p => p.case_id === caseId && p.active);
            if (prog) {
                const mat = prog.matricula;
                const member = members.find(m => m.matricula === mat);
                const fullName = member ? member.nome : mat;
                const firstName = fullName.split(' ')[0];
                this.playerMap[pos] = firstName;
            } else {
                this.playerMap[pos] = `Jogador ${pos}`;
            }
        });
    }

    replacePlayerTags(text) {
        if (!text || !this.playerMap || Object.keys(this.playerMap).length === 0) return text;
        return text.replace(/<player(\d)>/gi, (match, num) => {
            const name = this.playerMap[num] || `Jogador ${num}`;
            return `<span class="player-name">${name}</span>`;
        });
    }

    queueMessage(content, type, imageKey = null) {
        let processedContent = content;

        if (imageKey) {
            const assetsBaseUrl = API_URL.replace('/api', '');
            const imgHtml = `<img class="evidence-container" src="${assetsBaseUrl}/assets/${imageKey}">`;
            processedContent = content.includes('[[IMAGE]]')
                ? content.replace('[[IMAGE]]', imgHtml)
                : content + `<br>${imgHtml}`;
        }

        processedContent = this.replacePlayerTags(processedContent);

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

    insertControlButton(btn) {
        const controlsRight = document.querySelector('.monitor-controls-right');
        if (controlsRight) {
            controlsRight.prepend(btn);
        } else {
            const bottom = document.querySelector('.monitor-bottom');
            if (bottom) {
                bottom.prepend(btn);
            } else {
                let controls = document.getElementById('game-controls');
                if (!controls) {
                    controls = document.createElement('div');
                    controls.id = 'game-controls';
                    controls.className = 'game-controls';
                    document.querySelector('.game-interface')?.appendChild(controls) || document.body.appendChild(controls);
                }
                controls.appendChild(btn);
            }
        }
    }

    initDicas() {
        if (document.getElementById('dicas-btn')) return;

        const dicasBtn = document.createElement('div');
        dicasBtn.id = 'dicas-btn';
        dicasBtn.className = 'chat-toggle';
        dicasBtn.innerHTML = '<div class="button"><i class="fa-solid fa-lightbulb"></i></div>';
        dicasBtn.title = 'Dicas do sistema';

        const dicasSlides = [
            {
                titulo: 'Comandos Básicos',
                conteudo: '<p><strong>Comandos disponíveis:</strong> AJUDA, OLHAR, LIMPAR, RESET (e comandos SQL).</p>'
            },
            {
                titulo: 'Ajuda SQL',
                conteudo: '<p><strong>Se precisar relembrar a sintaxe SQL, utilize os comandos de ajuda, como AJUDA SELECT.</strong></p>'
            },
            {
                titulo: 'Nomes de Tabela',
                conteudo: '<p><strong>Nomes de tabela podem estar em itálico ou destacados em cor amarela, preste atenção!</strong></p>'
            },
            {
                titulo: 'Nomes de Objetos',
                conteudo: '<p><strong>Nomes de objetos geralmente estão em maiúsculo. Ex: MESA</strong></p>'
            },
            {
                titulo: 'Cores dos Objetos',
                conteudo: `
                <p><strong>Cores dos objetos (ao usar OLHAR):</strong></p>
                <ul style="list-style:none; padding-left:0;">
                    <li><span style="color: #00ff88;">Verde</span> - objeto ainda não examinado.</li>
                    <li><span style="color: #dc3545;">Vermelho</span> - objeto já examinado.</li>
                    <li><span style="color: #ffc107;">Amarelo</span> - objeto examinado, mas sua descrição mudou desde a última vez.</li>
                </ul>
            `
            },
            {
                titulo: 'Limpeza da Tela',
                conteudo: '<p><strong>Se a tela estiver muito cheia de comandos e erros, use o comando "LIMPAR". A narrativa mais atual será reexibida em seguida!</strong></p>'
            },
            {
                titulo: 'Navegação',
                conteudo: '<p><strong>Use as setas ↑↓ para navegar entre comandos anteriores.</strong></p>'
            }
        ];

        let currentSlide = 0;

        const dicasModal = document.createElement('div');
        dicasModal.id = 'dicas-modal';
        dicasModal.className = 'chat-container';
        dicasModal.style.width = '450px';
        dicasModal.style.height = 'auto';
        dicasModal.style.maxHeight = '80vh';

        const updateSlide = () => {
            const slide = dicasSlides[currentSlide];
            dicasModal.querySelector('.modal-content').innerHTML = slide.conteudo;
            dicasModal.querySelector('.modal-title').textContent = slide.titulo;

            const prevBtn = dicasModal.querySelector('.prev-slide');
            const nextBtn = dicasModal.querySelector('.next-slide');
            if (prevBtn) prevBtn.disabled = currentSlide === 0;
            if (nextBtn) nextBtn.disabled = currentSlide === dicasSlides.length - 1;
        };

        dicasModal.innerHTML = `
        <div class="chat-header" style="display: flex; align-items: center; justify-content: space-between;">
            <button class="prev-slide" style="background:transparent; border:none; color:#000; font-size:1.2rem; cursor:pointer; ${currentSlide === 0 ? 'opacity:0.3; pointer-events:none;' : ''}">←</button>
            <span class="modal-title"><i class="fa-solid fa-lightbulb"></i> Dicas do Sistema</span>
            <button class="next-slide" style="background:transparent; border:none; color:#000; font-size:1.2rem; cursor:pointer; ${currentSlide === dicasSlides.length - 1 ? 'opacity:0.3; pointer-events:none;' : ''}">→</button>
            <span style="cursor:pointer; margin-left:auto;" class="close-modal">&times;</span>
        </div>
        <div class="chat-messages modal-content" style="flex-grow:1; overflow-y:auto; padding:10px;">
            ${dicasSlides[0].conteudo}
        </div>
        <div style="text-align:center; padding:5px; font-size:0.8rem;">
            ${currentSlide + 1}/${dicasSlides.length}
        </div>
    `;

        this.insertControlButton(dicasBtn);
        const gameInterface = document.querySelector('.game-interface');
        if (gameInterface) {
            gameInterface.appendChild(dicasModal);
        } else {
            document.body.appendChild(dicasModal);
        }

        const prevBtn = dicasModal.querySelector('.prev-slide');
        const nextBtn = dicasModal.querySelector('.next-slide');
        const titleSpan = dicasModal.querySelector('.modal-title');
        const contentDiv = dicasModal.querySelector('.modal-content');
        const counterDiv = dicasModal.querySelector('div:last-child');

        const updateUI = () => {
            const slide = dicasSlides[currentSlide];
            titleSpan.innerHTML = `<i class="fa-solid fa-lightbulb"></i> ${slide.titulo}`;
            contentDiv.innerHTML = slide.conteudo;
            counterDiv.textContent = `${currentSlide + 1}/${dicasSlides.length}`;

            prevBtn.disabled = currentSlide === 0;
            nextBtn.disabled = currentSlide === dicasSlides.length - 1;

            prevBtn.style.opacity = currentSlide === 0 ? '0.3' : '1';
            prevBtn.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
            nextBtn.style.opacity = currentSlide === dicasSlides.length - 1 ? '0.3' : '1';
            nextBtn.style.pointerEvents = currentSlide === dicasSlides.length - 1 ? 'none' : 'auto';
        };

        prevBtn.addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateUI();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentSlide < dicasSlides.length - 1) {
                currentSlide++;
                updateUI();
            }
        });

        dicasBtn.addEventListener('click', () => {
            const isOpen = dicasModal.classList.contains('open');
            this.closeAllModals();
            if (!isOpen) {
                dicasModal.classList.add('open');
            }
        });

        const closeBtn = dicasModal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            dicasModal.classList.remove('open');
        });

        dicasModal.addEventListener('click', (e) => {
            if (e.target === dicasModal) dicasModal.classList.remove('open');
        });
    }

    initAnotacoes() {
        if (this.isTournament || this.isPractice) return;
        if (document.getElementById('anotacoes-btn')) return;

        const anotacoesBtn = document.createElement('div');
        anotacoesBtn.id = 'anotacoes-btn';
        anotacoesBtn.className = 'chat-toggle';
        anotacoesBtn.innerHTML = '<div class="button"><i class="fa-solid fa-pen-to-square"></i></div>';
        anotacoesBtn.title = 'Anotações';

        const anotacoesModal = document.createElement('div');
        anotacoesModal.id = 'anotacoes-modal';
        anotacoesModal.className = 'chat-container';
        anotacoesModal.style.width = '400px';
        anotacoesModal.style.height = 'auto';
        anotacoesModal.style.maxHeight = '80vh';
        anotacoesModal.innerHTML = `
    <div class="chat-header">
        <i class="fa-regular fa-note-sticky"></i> Anotações
        <span style="float:right; cursor:pointer;" class="close-modal">&times;</span>
    </div>
    <div class="chat-messages" style="flex-grow:1; overflow-y:auto; padding:10px;">
        <textarea id="anotacoes-text" placeholder="Escreva suas observações aqui..." 
            style="width:100%; background:#111; border:1px solid var(--phosphor-main); color:var(--phosphor-main); font-family:inherit; padding:8px; box-sizing:border-box; resize:none; white-space:pre-wrap; word-wrap:break-word;"></textarea>
    </div>
`;

        this.insertControlButton(anotacoesBtn);
        const gameInterface = document.querySelector('.game-interface');
        if (gameInterface) {
            gameInterface.appendChild(anotacoesModal);
        } else {
            document.body.appendChild(anotacoesModal);
        }

        const storageKey = `notes_${this.caseId}`;
        const textarea = anotacoesModal.querySelector('#anotacoes-text');
        const saved = localStorage.getItem(storageKey);
        if (saved) textarea.value = saved;

        textarea.addEventListener('input', () => {
            localStorage.setItem(storageKey, textarea.value);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        });

        anotacoesBtn.addEventListener('click', () => {
            const isOpen = anotacoesModal.classList.contains('open');
            this.closeAllModals();
            if (!isOpen) {
                anotacoesModal.classList.add('open');
            }
        });

        const closeBtn = anotacoesModal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            anotacoesModal.classList.remove('open');
        });

        anotacoesModal.addEventListener('click', (e) => {
            if (e.target === anotacoesModal) anotacoesModal.classList.remove('open');
        });
    }

    closeAllModals() {
        const modals = ['chat-container', 'dicas-modal', 'anotacoes-modal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.classList.remove('open');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gameInterface = new GameInterface();
    gameInterface.preloadGameData();
    window.gameInterface = gameInterface;
});