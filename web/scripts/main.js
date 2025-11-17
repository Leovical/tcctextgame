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
            queueMessage(`➤ ${introText}`, 'narrative');
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

function processQueue() {
    if (isTyping || messageQueue.length === 0) return;

    isTyping = true;
    const message = messageQueue.shift();
    const pre = document.createElement('pre');
    pre.className = message.type;
    outputEl.appendChild(pre);

    if (message.type === 'data') {
        pre.innerHTML = message.content;
        scrollToBottom();
        isTyping = false;
        processQueue();
    } else {
        typewriter(pre, message.content, () => {
            isTyping = false;
            processQueue();
        });
    }
}

function typewriter(element, text, callback) {
    let i = 0;
    inputEl.disabled = true;
    isSkipping = false;

    function type() {
        if (isSkipping) {
            element.innerHTML = text;
            i = text.length;
            isSkipping = false;
        }
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            scrollToBottom();
            setTimeout(type, TYPE_SPEED);
        } else {
            inputEl.disabled = false;
            inputEl.focus();
            callback();
        }
    }
    type();
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

initializeGame();
