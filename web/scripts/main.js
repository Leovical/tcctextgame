let introText = "Iniciando conexão com o DITEC...";

const outputEl = document.getElementById('output');
const inputEl = document.getElementById('command-input');

let messageQueue = [];
let isTyping = false;
const TYPE_SPEED = 15;
let isSkipping = false;

document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && isTyping) {
        event.preventDefault();
        isSkipping = true;
    }
});

inputEl.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        if (isTyping) {
            isSkipping = true;
            return;
        }

        const command = inputEl.value;
        inputEl.value = '';
        const commandLower = command.trim().toLowerCase();

        if (commandLower === 'clear' || commandLower === 'limpar' || commandLower === 'cls') {
            outputEl.innerHTML = '';
            await reloadCurrentNarrative();
            return;
        }


        queueMessage(`\n> ${command}`, 'prompt');

        try {
            const response = await fetch('/api/execute-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: command }),
            });
            const data = await response.json();

            if (response.ok) {
                if (data.narrative) queueMessage(`\n➤ ${data.narrative}`, 'narrative');
                if (data.data) queueMessage(formatTable(data.data), 'data');
            } else {
                queueMessage(`\n➤ ERRO: ${data.error || 'Erro desconhecido'}`, 'error');
            }
        } catch (err) {
            queueMessage(`\n➤ ERRO DE CONEXÃO: ${err.message}`, 'error');
        }
    }
});

function queueMessage(content, type) {
    messageQueue.push({ content, type });
    processQueue();
}

async function reloadCurrentNarrative() {
    try {
        const response = await fetch('/api/execute-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: "START_GAME" }),
        });

        const data = await response.json();
        if (data.narrative) queueMessage(`➤ ${data.narrative}`, 'narrative');

    } catch (err) {
        queueMessage(`➤ ERRO: ${err.message}`, 'error');
    }
}


function processQueue() {
    if (isTyping || messageQueue.length === 0) return;

    isTyping = true;
    const message = messageQueue.shift();

    const wrapper = document.createElement('div');
    wrapper.className = 'output-block typewriter-wrapper';

    if (message.type === 'data') {
        const block = document.createElement('pre');
        block.className = message.type;
        block.innerHTML = message.content;
        const shouldAutoScroll = isUserAtBottom();

        wrapper.appendChild(block);
        outputEl.appendChild(wrapper);
        if (shouldAutoScroll) {
            outputEl.scrollTop = outputEl.scrollHeight;
        }

        scrollToBottom();
        isTyping = false;
        processQueue();
        return;
    }

    const ghost = document.createElement('pre');
    ghost.className = `typewriter-ghost ${message.type}`;
    ghost.innerHTML = message.content;

    const visible = document.createElement('pre');
    visible.className = `typewriter-visible ${message.type}`;
    visible.textContent = "";

    wrapper.appendChild(ghost);
    wrapper.appendChild(visible);
    outputEl.appendChild(wrapper);

    typewriter(visible, ghost, message.content, () => {
        isTyping = false;
        processQueue();
    });
}

function typewriter(visibleEl, ghostEl, fullHtml, callback) {
    let i = 0;
    let plainText = fullHtml.replace(/<[^>]+>/g, "");
    isSkipping = false;

    inputEl.disabled = true;

    function tick() {
        if (isSkipping) {
            visibleEl.innerHTML = fullHtml;
            finish();
            return;
        }

        if (i < plainText.length) {
            visibleEl.textContent = plainText.slice(0, i + 1);
            i++;
            followScroll();
            setTimeout(tick, TYPE_SPEED);
        } else {
            finish();
        }
    }

    function finish() {
        visibleEl.innerHTML = fullHtml;
        ghostEl.remove();
        visibleEl.classList.remove("typewriter-visible");
        visibleEl.style.position = "static";
        inputEl.disabled = false;
        inputEl.focus();
        followScroll();
        callback();
    }

    tick();
}

function scrollToBottom() {
    outputEl.scrollTop = outputEl.scrollHeight;
}

function formatTable(data) {
    if (!Array.isArray(data) || data.length === 0) return "Nenhum resultado.";
    const headers = Object.keys(data[0]);
    if (headers.includes('posicao') && headers.includes('casa')) return formatLogicPuzzle(data, headers);
    return formatStandardTable(data, headers);
}

function formatLogicPuzzle(data, headers) {
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
    return table;
}

function formatStandardTable(data, headers) {
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
    return table;
}

async function initializeGame() {
    try {
        const response = await fetch('/api/execute-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: "START_GAME" }),
        });
        const data = await response.json();
        if (data.narrative) {
            introText = data.narrative;
            queueMessage(`➤ ${introText}`, 'narrative');
        }
    } catch {
        queueMessage(`➤ ERRO DE CONEXÃO: Não foi possível carregar o caso.`, 'error');
    }
}

function capitalizeFirstLetter(s) {
    if (typeof s !== 'string' || s.length === 0) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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

function isUserAtBottom() {
    const threshold = 20;
    return outputEl.scrollHeight - outputEl.scrollTop - outputEl.clientHeight < threshold;
}
function followScroll() {
    if (isUserAtBottom()) {
        outputEl.scrollTop = outputEl.scrollHeight;
    }
}


initializeGame();
