// ─────────────────────────────────────────────────────────────
// DISPOSITIVOS — punto de entrada del módulo.
// Cada parte vive en ./devices/: navegación, tabla, vista General,
// formulario genérico, reportes y enlaces ISP, y un archivo por cada
// tipo de dispositivo con su tabla y su formulario.
// ─────────────────────────────────────────────────────────────
import { store } from '../store.js';
import { showCameraForm } from './devices/cameras.js';
import { showNvrForm } from './devices/nvr.js';
import { showAntennaForm } from './devices/antennas.js';
import { showSwitchForm } from './devices/switches.js';
import { showSfpForm } from './devices/sfp.js';
import { showApForm } from './devices/ap.js';
import { showBiometricoForm } from './devices/biometricos.js';
import { showUpsForm } from './devices/ups.js';
import { showSuppressorForm } from './devices/suppressors.js';
import { showPduForm } from './devices/pdu.js';
import { showPatchPanelForm } from './devices/patchpanels.js';
import { showBandejaFibraForm } from './devices/bandejasfibra.js';
import { showOrganizadorForm } from './devices/organizadores.js';
import { showPatchcordForm } from './devices/patchcords.js';
import { showPatchcordFibraForm } from './devices/patchcordsfibra.js';
import { prepararHistorial, currentSubcategory, navigateToSubcategories, navigateToDeviceTable, _applyNavState, _readNavFromLocation } from './devices/navegacion.js';
import { filterDeviceTable } from './devices/tabla.js';
import { showStandaloneDeviceForm } from './devices/formulario.js';
import { showCategoryForm } from './devices/tipos.js';

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
export function initDevices() {
    if (!document.getElementById('devices-module')) return;

    // Cada carga de página arranca su propia sincronización con el historial:
    // el primer nivel que se renderice reemplaza la entrada actual.
    prepararHistorial();

    // Button: manage types (hidden as per request)
    const btnManageTypes = document.getElementById('btn-manage-types');
    if (btnManageTypes) btnManageTypes.style.display = 'none';

    // Button: add device (only visible in device table view)
    document.getElementById('btn-add-device')?.addEventListener('click', () => {
        if (currentSubcategory === 'Cámaras') showCameraForm(null);
        else if (currentSubcategory === 'NVR') showNvrForm(null);
        else if (currentSubcategory === 'Antenas') showAntennaForm(null);
        else if (currentSubcategory === 'Switch') showSwitchForm(null);
        else if (currentSubcategory === 'SFP') showSfpForm(null);
        else if (currentSubcategory === 'AP') showApForm(null);
        else if (currentSubcategory === 'Biométricos') showBiometricoForm(null);
        else if (currentSubcategory === 'UPS') showUpsForm(null);
        else if (currentSubcategory === 'Supresores') showSuppressorForm(null);
        else if (currentSubcategory === 'PDU') showPduForm(null);
        else if (currentSubcategory === 'Patch Panels') showPatchPanelForm(null);
        else if (currentSubcategory === 'Bandejas de fibra') showBandejaFibraForm(null);
        else if (currentSubcategory === 'Organizadores') showOrganizadorForm(null);
        else if (currentSubcategory === 'Patchcords') showPatchcordForm(null);
        else if (currentSubcategory === 'Patchcords de fibra') showPatchcordFibraForm(null);
        else showStandaloneDeviceForm(null);
    });

    // Button: add category type
    document.getElementById('btn-add-category')?.addEventListener('click', () => showCategoryForm(null));

    // Filters
    document.getElementById('search-devices')?.addEventListener('input', filterDeviceTable);
    document.getElementById('dev-region-filter')?.addEventListener('change', filterDeviceTable);
    document.getElementById('dev-area-filter')?.addEventListener('change', filterDeviceTable);
    document.getElementById('dev-status-filter')?.addEventListener('change', filterDeviceTable);

    // Populate region/area selects
    const regSel = document.getElementById('dev-region-filter');
    if (regSel && store.regions.length) {
        regSel.innerHTML = '<option value="">Todas las regiones</option>' +
            store.regions.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
    }
    const areaSel = document.getElementById('dev-area-filter');
    if (areaSel && store.areas.length) {
        areaSel.innerHTML = '<option value="">Todas las áreas</option>' +
            store.areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }

    // MagicBento navigation listeners
    document.removeEventListener('nav-category', window._bentoNavCatHandler);
    window._bentoNavCatHandler = (e) => navigateToSubcategories(e.detail);
    document.addEventListener('nav-category', window._bentoNavCatHandler);

    document.removeEventListener('nav-subcategory', window._bentoNavSubHandler);
    window._bentoNavSubHandler = (e) => navigateToDeviceTable(e.detail);
    document.addEventListener('nav-subcategory', window._bentoNavSubHandler);

    // Restauramos el nivel desde la URL (recarga de página o enlace compartido)
    _applyNavState(_readNavFromLocation());
}
