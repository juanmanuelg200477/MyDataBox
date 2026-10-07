// Copia los encabezados de la tabla a cada celda como data-label.
// En teléfono el CSS oculta el <thead> y usa esa etiqueta para rotular
// cada dato, convirtiendo la fila en una tarjeta; así se evita el scroll
// horizontal, que partía las palabras a media pantalla.
// Llamar después de cada render del tbody.
export function labelTableCells(tbody) {
    const el    = typeof tbody === 'string' ? document.getElementById(tbody) : tbody;
    const table = el?.closest('table');
    if (!table) return;

    const titulos = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!titulos.length) return;

    el.querySelectorAll('tr').forEach(fila => {
        [...fila.children].forEach((celda, i) => {
            if (titulos[i]) celda.setAttribute('data-label', titulos[i]);
        });
    });
}

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
