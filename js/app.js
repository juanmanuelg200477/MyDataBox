let currentView = 'dashboard';
let viewState = {};

function navigate(view, state = {}) {
    currentView = view;
    viewState = state;
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });
    render();
}

function setBreadcrumb(...parts) {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '<span>InfraBox</span>' + parts.map((p, i) =>
        `<span class="sep">›</span><span class="${i === parts.length - 1 ? 'current' : ''}">${p}</span>`
    ).join('');
}

function render() {
    const app = document.getElementById('app');
    switch (currentView) {
        case 'dashboard': renderDashboard(app); break;
        case 'regions': renderRegions(app); break;
        case 'areas': renderAreas(app); break;
        case 'contacts': renderContacts(app); break;
        case 'racks': renderRacks(app); break;
        case 'rackView': renderRackView(app); break;
        case 'rackDevice': renderRackDevice(app); break;
        case 'devices': renderDevices(app); break;
    }
}

function filterTable(input, tbodyId) {
    const val = input.value.toLowerCase();
    document.querySelectorAll(`#${tbodyId} tr`).forEach(row => {
        const text = row.dataset.search?.toLowerCase() || '';
        row.style.display = text.includes(val) ? '' : 'none';
    });
}

// ==================== INIT ====================
// Starts the application by navigating to the dashboard natively after everything is loaded.
navigate('dashboard');
