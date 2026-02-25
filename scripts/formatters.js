export function formatTableData(data) {
    if (data && typeof data === 'object' && Array.isArray(data.columns) && Array.isArray(data.rows)) {
        const headers = data.columns || [];
        const rows = data.rows || [];

        if (headers.length === 0) return "Nenhum resultado.";

        let table = '<table class="data-table"><thead><tr>';
        headers.forEach(header => table += `<th>${formatHeader(header)}</th>`);
        table += '</tr></thead><tbody>';

        if (rows.length === 0) {
            table += `<tr><td colspan="${headers.length}" style="text-align:center;opacity:.8;">0 resultados</td></tr>`;
        } else {
            rows.forEach(row => {
                table += '<tr>';
                headers.forEach(header => {
                    table += `<td>${formatDataCell(row?.[header])}</td>`;
                });
                table += '</tr>';
            });
        }

        table += '</tbody></table>';
        table += `<div class="schema-hint">// SCHEMA: [ ${headers.join(', ')} ]</div>`;
        return table;
    }

    if (!Array.isArray(data) || data.length === 0) return "Nenhum resultado.";

    const headers = Object.keys(data[0]);
    let table = '<table class="data-table"><thead><tr>';
    headers.forEach(header => table += `<th>${formatHeader(header)}</th>`);
    table += '</tr></thead><tbody>';

    data.forEach(row => {
        table += '<tr>';
        headers.forEach(header => table += `<td>${formatDataCell(row[header])}</td>`);
        table += '</tr>';
    });

    table += '</tbody></table>';
    table += `<div class="schema-hint">// SCHEMA: [ ${headers.join(', ')} ]</div>`;
    return table;
}

function formatDataCell(val) {
    if (val === null) return 'NULL';
    if (typeof val === 'string') return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    return String(val);
}

function formatHeader(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}