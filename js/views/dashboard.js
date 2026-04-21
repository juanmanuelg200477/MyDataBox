function renderDashboard(app) {
    setBreadcrumb('Dashboard');
    const allDevs = getAllDevices();
    app.innerHTML = `<div class="view-transition">
        <div class="page-header"><h1>Dashboard</h1></div>
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--primary)">${icons.globe}</div>
                <div class="stat-info"><h3>${store.regions.length}</h3><p>Regiones</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--teal)">${icons.grid}</div>
                <div class="stat-info"><h3>${store.areas.length}</h3><p>Áreas</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--orange)">${icons.users}</div>
                <div class="stat-info"><h3>${store.contacts.length}</h3><p>Contactos</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--purple)">${icons.rack}</div>
                <div class="stat-info"><h3>${store.racks.length}</h3><p>Bastidores</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--success)">${icons.server}</div>
                <div class="stat-info"><h3>${allDevs.length}</h3><p>Dispositivos</p></div>
            </div>
        </div>
    </div>`;
}
