const FIXED_AREAS = [
    'CASA PATRONAL BUNGALOWS', 'CAFETERIA', 'GARITA', 'PRODUCCIÓN', 'MICROMEZCLAS',
    'PELET', 'DESPACHOS', 'MATERIA PRIMA', 'MANTENIMIENTO', 'SANITIZACIÓN',
    'DATA CENTER', 'BOD CARTON', 'SILOS', 'OFICINAS'
];

let store = {
    regions: [],
    areas: [],
    contacts: [],
    racks: [],
    devices: [] // standalone devices (not in racks)
};

function save() { 
    localStorage.setItem('infrabox_data', JSON.stringify(store)); 
}

function load() {
    const d = localStorage.getItem('infrabox_data');
    if (d) store = JSON.parse(d);
}

load();

function genId() { 
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); 
}

// Get all devices (from racks + standalone)
function getAllDevices() {
    let devs = [...store.devices];
    store.racks.forEach(r => {
        if (r.slots) {
            Object.values(r.slots).forEach(d => {
                devs.push({ ...d, rack: r.name, rackRegion: r.region, rackArea: r.area });
            });
        }
    });
    return devs;
}
