export function filterTable(input, tbodyId) {
    const val = input.value.toLowerCase();
    document.querySelectorAll(`#${tbodyId} tr`).forEach(row => {
        const text = row.dataset.search?.toLowerCase() || '';
        row.style.display = text.includes(val) ? '' : 'none';
    });
}
