document.addEventListener('DOMContentLoaded', () => {

    const powerBtnContainer = document.getElementById('power-btn-container');
    const powerBtnButton = powerBtnContainer.querySelector('.button');
    const powerLed = document.getElementById('power-led');
    const mobilePowerBtn = document.getElementById('mobile-power-btn');
    const submitBtn = document.getElementById('submit-btn');
    const screenArea = document.getElementById('game-screen-area');
    const scrollContainer = document.querySelector('.game-interface');
    const outputEl = document.getElementById('output');
    const inputEl = document.getElementById('command-input');
    const audioLoop = document.getElementById('music-loop');
    const sfxPower = document.getElementById('sfx-power');


    let isPoweredOn = false;
    let messageQueue = [];
    let isTyping = false;
    let isSkipping = false;
    const TYPE_SPEED = 15;
    let autoScrollEnabled = true;
    let isProgrammaticScroll = false;
    const SCROLL_THRESHOLD = 5;

    function togglePower() {
        if (isPoweredOn) {
            turnOff();
        } else {
            turnOn();
        }
    }

    function turnOn() {
        isPoweredOn = true;

        if (powerBtnButton) {
            powerBtnButton.classList.add('clicked');
            setTimeout(() => powerBtnButton.classList.remove('clicked'), 150);
        }
        if (powerLed) powerLed.classList.add('on');
        if (mobilePowerBtn) mobilePowerBtn.style.display = 'none';

        screenArea.classList.remove('screen-off');
        screenArea.classList.add('screen-on');

        if (sfxPower) {
            sfxPower.currentTime = 0;
            sfxPower.play().catch(() => { });
        }

        setTimeout(() => {
            if (isPoweredOn) {
                if (audioLoop) {
                    audioLoop.volume = 0.3;
                    audioLoop.play().catch(() => { });
                }
                inputEl.focus();

                if (outputEl.innerHTML === "") {
                    initializeGame();
                }
            }
        }, 1200);
    }

    function turnOff() {
        isPoweredOn = false;

        if (powerBtnButton) {
            powerBtnButton.classList.add('clicked');
            setTimeout(() => powerBtnButton.classList.remove('clicked'), 150);
        }
        if (powerLed) powerLed.classList.remove('on');

        if (mobilePowerBtn) mobilePowerBtn.style.display = '';

        screenArea.classList.remove('screen-on');
        screenArea.classList.add('screen-off');

        if (audioLoop) {
            audioLoop.pause();
            audioLoop.currentTime = 0;
        }
    }

    if (powerBtnContainer) powerBtnContainer.addEventListener('click', togglePower);
    if (mobilePowerBtn) mobilePowerBtn.addEventListener('click', togglePower);


    async function handleEnterAction(event) {
        if (!isPoweredOn) return;

        if (isTyping) {
            if (event) event.preventDefault();
            isSkipping = true;
            return;
        }

        const raw = inputEl.value;
        if (!raw || !raw.trim()) return;

        const command = raw.trim();
        inputEl.value = '';
        const commandLower = command.toLowerCase();

        if (commandLower === 'clear' || commandLower === 'limpar' || commandLower === 'cls') {
            outputEl.innerHTML = '';
            await reloadCurrentNarrative();
            return;
        }

        queueMessage(`\n> ${command}`, 'prompt');
        scrollToBottom(true);

        try {
            const response = await fetch('/api/execute-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: command }),
            });
            const data = await response.json();

            if (response.ok) {
                if (data.narrative) {
                    queueMessage(`\n➤ ${data.narrative}`, 'narrative');
                }

                if (data.data) {
                    queueMessage(formatTable(data.data), 'data');
                }
            } else {
                queueMessage(`\n➤ ERRO: ${data.error || 'Erro desconhecido'}`, 'error');
            }
        } catch (err) {
            queueMessage(`\n➤ FALHA DE SISTEMA: ${err.message}`, 'error');
        }
    }

    inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') handleEnterAction(event);
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', (event) => {
            handleEnterAction(event);
            inputEl.focus();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (!isPoweredOn) return;

        if (event.key === 'Enter' && document.activeElement !== inputEl) {
            event.preventDefault();
            inputEl.focus();
        }

        if ((event.key === 'Enter' || event.key === ' ') && isTyping) {
            event.preventDefault();
            isSkipping = true;
        }
    });

    function queueMessage(content, type) {
        messageQueue.push({ content, type });
        processQueue();
    }

    function processQueue() {
        if (isTyping || messageQueue.length === 0) return;

        isTyping = true;
        const message = messageQueue.shift();

        const wrapper = document.createElement('div');
        wrapper.className = 'output-block typewriter-wrapper';

        if (message.type === 'data') {
            const block = document.createElement('div');
            block.className = message.type;
            block.innerHTML = message.content;
            wrapper.appendChild(block);
            outputEl.appendChild(wrapper);
            scrollToBottom(true);
            isTyping = false;
            processQueue();
            return;
        }

        const ghost = document.createElement('div');
        ghost.className = `typewriter-ghost ${message.type}`;
        ghost.style.visibility = 'hidden';
        ghost.style.pointerEvents = 'none';
        ghost.style.height = '0px';
        ghost.style.overflow = 'hidden';
        ghost.style.whiteSpace = 'pre-wrap';

        const visible = document.createElement('div');
        visible.className = `typewriter-visible ${message.type}`;
        visible.textContent = "";
        visible.style.whiteSpace = 'pre-wrap';

        wrapper.appendChild(ghost);
        wrapper.appendChild(visible);
        outputEl.appendChild(wrapper);

        if (autoScrollEnabled) scrollToBottom();

        typewriter(visible, ghost, message.content, () => {
            isTyping = false;
            processQueue();
        });
    }

    function typewriter(visibleEl, ghostEl, fullHtml, callback) {
        let i = 0;
        const plainText = fullHtml.replace(/<[^>]+>/g, "");
        isSkipping = false;

        inputEl.disabled = true;

        function tick() {
            if (isSkipping) {
                finish();
                return;
            }

            if (i < plainText.length) {
                visibleEl.textContent = plainText.slice(0, i + 1);
                if (autoScrollEnabled) scrollToBottom();
                i++;
                setTimeout(tick, TYPE_SPEED);
            } else {
                finish();
            }
        }

        function finish() {
            visibleEl.innerHTML = fullHtml.replace(/\n/g, '<br>');

            if (ghostEl && ghostEl.parentElement) ghostEl.remove();

            visibleEl.classList.remove("typewriter-visible");
            visibleEl.style.position = "static";
            visibleEl.style.whiteSpace = 'normal';

            inputEl.disabled = false;
            inputEl.focus();

            if (isSkipping) scrollToBottom(true);
            else if (autoScrollEnabled) scrollToBottom();

            callback();
        }

        tick();
    }

    function scrollToBottom(force = false) {
        if (!force && !autoScrollEnabled) return;

        isProgrammaticScroll = true;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;

        requestAnimationFrame(() => {
            isProgrammaticScroll = false;
        });
    }

    scrollContainer.addEventListener('scroll', () => {
        if (isProgrammaticScroll) return;
        const distanceToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
        autoScrollEnabled = distanceToBottom < SCROLL_THRESHOLD;
    });

    function formatTable(data) {
        if (!Array.isArray(data) || data.length === 0) return "Nenhum resultado.";
        const headers = Object.keys(data[0]);

        if (headers.includes('posicao') && headers.includes('casa')) {
            return formatLogicPuzzle(data, headers);
        }
        return formatStandardTable(data, headers);
    }

    function formatLogicPuzzle(data, headers) {
        const rawSchema = headers.join(', ');

        headers = headers.filter(h => h !== 'posicao');
        headers.unshift('posicao');
        const dataByPos = {};
        data.forEach(row => dataByPos[row.posicao] = row);
        const posicoes = Object.keys(dataByPos).sort();

        let table = '<table class="logic-table"><thead><tr><th></th>';
        posicoes.forEach(pos => table += `<th>Posição ${pos}</th>`);
        table += '</tr></thead><tbody>';

        headers.filter(h => h !== 'posicao').forEach(header => {
            table += `<tr><td>${formatHeader(header)}:</td>`;
            posicoes.forEach(pos => table += `<td>${formatDataCell(dataByPos[pos][header])}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';

        table += `<div class="schema-hint">// SCHEMA: [ ${rawSchema} ]</div>`;
        return table;
    }

    function formatStandardTable(data, headers) {
        const rawSchema = headers.join(', ');

        const keyColumns = ['id', 'posicao'];
        let sortedHeaders = headers.filter(h => !keyColumns.includes(h));
        keyColumns.reverse().forEach(key => { if (headers.includes(key)) sortedHeaders.unshift(key); });

        let table = '<table class="data-table"><thead><tr>';
        sortedHeaders.forEach(header => table += `<th>${formatHeader(header)}</th>`);
        table += '</tr></thead><tbody>';

        data.forEach(row => {
            table += '<tr>';
            sortedHeaders.forEach(header => table += `<td>${formatDataCell(row[header])}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';

        table += `<div class="schema-hint">// SCHEMA: [ ${rawSchema} ]</div>`;
        return table;
    }

    function formatDataCell(val) {
        if (val === null) return 'NULL';
        if (typeof val === 'string') return capitalizeFirstLetter(val);
        return String(val);
    }

    function formatHeader(s) {
        if (typeof s !== 'string') return '';
        return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function capitalizeFirstLetter(s) {
        if (typeof s !== 'string' || s.length === 0) return s;
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }


    async function initializeGame() {
        await reloadCurrentNarrative();
    }

    async function reloadCurrentNarrative() {
        try {
            const response = await fetch('/api/execute-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: "START_GAME" }),
            });
            const data = await response.json();

            if (data.narrative) {
                queueMessage(`➤ ${data.narrative}`, 'narrative');
            }
        } catch (err) {
            queueMessage(`➤ ERRO DE CONEXÃO: Não foi possível carregar o caso.`, 'error');
        }
    }
});