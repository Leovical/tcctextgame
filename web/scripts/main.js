let introText = "Iniciando conexão com o DITEC...";

const outputEl = document.getElementById('output');
const inputEl = document.getElementById('command-input');

inputEl.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        const command = inputEl.value;
        inputEl.value = '';

        const commandLower = command.trim().toLowerCase();
        if (commandLower === 'clear' || commandLower === 'limpar' || commandLower === 'cls') {
            outputEl.innerHTML = '';
            appendOutput(`➤ ${introText}`, 'narrative');
            return;
        }

        appendOutput(`\n> ${command}`, 'prompt');

        try {
            const response = await fetch('/api/execute-sql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql: command }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.narrative) {
                    appendOutput(`\n➤ ${data.narrative}`, 'narrative');
                }
                if (data.data) {
                    const tableHtml = formatTable(data.data);
                    appendOutput(tableHtml, 'data');
                }
            } else {
                appendOutput(`\n➤ ERRO: ${data.error || 'Erro desconhecido'}`, 'error');
            }

        } catch (err) {
            appendOutput(`\n➤ ERRO DE CONEXÃO: ${err.message}`, 'error');
        }
    }
});


function appendOutput(content, type) {
    const isScrolledToBottom = outputEl.scrollHeight - outputEl.clientHeight <= outputEl.scrollTop + 10;

    const pre = document.createElement('pre');
    pre.className = type;
    pre.innerHTML = content;
    outputEl.appendChild(pre);

    if (isScrolledToBottom) {
        outputEl.scrollTop = outputEl.scrollHeight;
    }
}


function formatTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return "Nenhum resultado.";
    }
    const headers = Object.keys(data[0]);
    if (headers.includes('posicao') && headers.includes('casa')) {
        return formatLogicPuzzle(data, headers);
    } else {
        return formatStandardTable(data, headers);
    }
}

function formatLogicPuzzle(data, headers) {
    headers = headers.filter(h => h !== 'posicao');
    headers.unshift('posicao');

    const dataByPos = {};
    data.forEach(row => { dataByPos[row.posicao] = row; });

    const posicoes = Object.keys(dataByPos).sort();
    const colWidths = {};
    const rowHeaders = headers.filter(h => h !== 'posicao');

    let maxHeaderWidth = 0;
    rowHeaders.forEach(header => {
        const cleanHeader = formatHeader(header);
        if (cleanHeader.length > maxHeaderWidth) { maxHeaderWidth = cleanHeader.length; }
    });
    maxHeaderWidth += 2;

    posicoes.forEach(pos => {
        const posStr = `Posição ${pos}`;
        colWidths[pos] = posStr.length;
    });

    rowHeaders.forEach(header => {
        posicoes.forEach(pos => {
            const val = formatDataCell(dataByPos[pos][header]);
            if (val.length > colWidths[pos]) { colWidths[pos] = val.length; }
        });
    });

    let table = '<table class="logic-table">';

    table += '<thead><tr><th></th>';
    posicoes.forEach(pos => {
        table += `<th>Posição ${pos}</th>`;
    });
    table += '</tr></thead>';

    table += '<tbody>';
    rowHeaders.forEach(header => {
        const cleanHeader = formatHeader(header) + ":";
        table += `<tr><td>${cleanHeader}</td>`;
        posicoes.forEach(pos => {
            const val = formatDataCell(dataByPos[pos][header]);
            table += `<td>${val}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';

    return table;
}

function formatStandardTable(data, headers) {
    const colWidths = {};
    const keyColumns = ['id', 'posicao'];
    let sortedHeaders = headers.filter(h => !keyColumns.includes(h));
    keyColumns.reverse().forEach(key => {
        if (headers.includes(key)) { sortedHeaders.unshift(key); }
    });

    sortedHeaders.forEach(header => {
        colWidths[header] = formatHeader(header).length;
    });

    data.forEach(row => {
        sortedHeaders.forEach(header => {
            const val = formatDataCell(row[header]);
            if (val.length > colWidths[header]) {
                colWidths[header] = val.length;
            }
        });
    });

    let table = '<table class="data-table">';

    table += '<thead><tr>';
    sortedHeaders.forEach(header => {
        const cleanHeader = formatHeader(header);
        table += `<th>${cleanHeader}</th>`;
    });
    table += '</tr></thead>';

    table += '<tbody>';
    data.forEach(row => {
        table += '<tr>';
        sortedHeaders.forEach(header => {
            const val = formatDataCell(row[header]);
            table += `<td>${val}</td>`;
        });
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
            outputEl.innerHTML = '';
            appendOutput(`➤ ${introText}`, 'narrative');
        }
    } catch (err) {
        outputEl.innerHTML = '';
        appendOutput(`➤ ERRO DE CONEXÃO: Não foi possível carregar o caso.`, 'error');
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
