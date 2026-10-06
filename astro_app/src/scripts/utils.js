// Para interpolar texto que viene de la base de datos dentro de innerHTML.
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

export function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function filterTable(input, tbodyId) {
    const val = input.value.toLowerCase();
    document.querySelectorAll(`#${tbodyId} tr`).forEach(row => {
        const text = row.dataset.search?.toLowerCase() || '';
        row.style.display = text.includes(val) ? '' : 'none';
    });
}
