// ─────────────────────────────────────────────────────────────
// ACOMODAR EQUIPOS EN EL BASTIDOR — solo en PC.
//
// Con el cursor 1 segundo encima de un equipo aparece un menú pequeño:
//   · Desplazar → se elige otra U. Si está libre, el equipo pasa ahí;
//     si hay otro equipo, los dos intercambian posición.
//   · Tamaño    → agrandar o encoger de a una U, por arriba o por abajo.
// En teléfono no se activa: ahí no hay cursor que se pose encima.
// ─────────────────────────────────────────────────────────────
import { store, save } from '../store.js';
import { toastSuccess } from '../toast.js';
import { escapeHtml } from '../utils.js';
import { rackLayout, planMove, resizeLimits, applyRackChanges, spanOf, rangeLabel } from '../rackLayout.js';

const ESPERA_MENU   = 1000;  // ms con el cursor encima antes de ofrecer las opciones
const GRACIA_CIERRE = 350;   // ms para cruzar del equipo al menú sin que se cierre

const svg = (cuerpo) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`;
const ICONO_MOVER  = svg('<path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/>');
const ICONO_TAMANO = svg('<path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3 3-3-3"/><path d="m15 5-3-3-3 3"/>');

// La vista del bastidor se vuelve a pintar entera tras cada cambio, y cada
// pintado crea su propio acomodador. Lo único que sobrevive al pintado son
// las escuchas puestas en document: aquí se guarda cómo soltarlas.
let soltarAnterior = null;
document.addEventListener('astro:before-swap', () => { soltarAnterior?.(); soltarAnterior = null; });

export function initRackArrange({ rack, twin, table, renderRows, onChange }) {
    soltarAnterior?.();
    soltarAnterior = null;
    if (!twin || !table) return;
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;

    const rails  = table.closest('.rack-rails');
    const layout = rackLayout(rack);

    let modo    = null;   // null | 'menu' | 'mover' | 'tamano'
    let item    = null;   // el equipo (de layout) con el que se trabaja
    let ancla   = null;   // su <a> en la tabla
    let trabajo = null;   // tamaño en edición: { base, h }
    let tEspera = 0;
    let tCierre = 0;

    // ── Piezas flotantes ─────────────────────────────────────
    const menu = crear('div', 'ra-menu');
    menu.innerHTML = `
        <div class="ra-cap"></div>
        <button type="button" class="ra-op" data-op="mover">${ICONO_MOVER}<span>Desplazar</span></button>
        <button type="button" class="ra-op" data-op="tamano">${ICONO_TAMANO}<span>Tamaño</span></button>`;

    const panel = crear('div', 'ra-panel');
    panel.innerHTML = `
        <div class="ra-cap"></div>
        <div class="ra-tam-medida"><span class="ra-tam-num"></span><span class="ra-tam-rango"></span></div>
        <div class="ra-tam-ctrl"><span>Arriba</span>
            <button type="button" class="ra-tam-btn" data-acc="growUp" aria-label="Agrandar 1U hacia arriba">+</button>
            <button type="button" class="ra-tam-btn" data-acc="shrinkUp" aria-label="Quitar 1U de arriba">−</button>
        </div>
        <div class="ra-tam-ctrl"><span>Abajo</span>
            <button type="button" class="ra-tam-btn" data-acc="growDown" aria-label="Agrandar 1U hacia abajo">+</button>
            <button type="button" class="ra-tam-btn" data-acc="shrinkDown" aria-label="Quitar 1U de abajo">−</button>
        </div>
        <div class="ra-tam-pie">
            <button type="button" class="ra-btn-sec" data-acc="cancelar">Cancelar</button>
            <button type="button" class="ra-btn-pri" data-acc="guardar">Guardar</button>
        </div>`;

    const aviso = crear('div', 'ra-aviso');
    aviso.innerHTML = `<span class="ra-aviso-texto"></span><button type="button">Cancelar</button>`;
    const avisoTexto = aviso.querySelector('.ra-aviso-texto');

    const fantasma  = crear('div', 'ra-ghost');   // dónde caería el equipo
    const fantasma2 = crear('div', 'ra-ghost');   // dónde iría el otro, si intercambian

    twin.append(menu, panel, aviso);
    rails.append(fantasma, fantasma2);

    const itemDe = (a) => layout.items.find(it => String(it.base) === a.dataset.base) ?? null;

    // ── Menú tras 1 s con el cursor encima ───────────────────
    table.addEventListener('mouseover', (e) => {
        if (modo === 'mover' || modo === 'tamano') return;
        const a = e.target.closest?.('a.rack-device');
        if (!a || a.contains(e.relatedTarget)) return;
        if (modo === 'menu' && a === ancla) { clearTimeout(tCierre); return; }
        clearTimeout(tEspera);
        tEspera = setTimeout(() => abrirMenu(a), ESPERA_MENU);
    });
    table.addEventListener('mouseout', (e) => {
        if (modo === 'mover' || modo === 'tamano') return;
        const a = e.target.closest?.('a.rack-device');
        if (!a || a.contains(e.relatedTarget)) return;
        clearTimeout(tEspera);
        if (modo === 'menu' && a === ancla && !menu.contains(e.relatedTarget)) programarCierre();
    });
    menu.addEventListener('mouseenter', () => clearTimeout(tCierre));
    menu.addEventListener('mouseleave', (e) => {
        if (modo === 'menu' && !ancla?.contains(e.relatedTarget)) programarCierre();
    });
    menu.addEventListener('click', (e) => {
        const op = e.target.closest('.ra-op')?.dataset.op;
        if (op === 'mover') entrarMover();
        else if (op === 'tamano') entrarTamano();
    });

    function abrirMenu(a) {
        const it = itemDe(a);
        if (!it) return;
        salir();
        modo = 'menu';
        item = it;
        ancla = a;
        a.classList.add('ra-target');
        menu.querySelector('.ra-cap').textContent = it.dev.name || 'Equipo';
        colocarJunto(menu, a);
        menu.classList.add('visible');
        escucharDocumento(true);
    }

    function programarCierre() {
        clearTimeout(tCierre);
        tCierre = setTimeout(() => { if (modo === 'menu') salir(); }, GRACIA_CIERRE);
    }

    // ── Desplazar ────────────────────────────────────────────
    function entrarMover() {
        clearTimeout(tEspera);
        clearTimeout(tCierre);
        menu.classList.remove('visible');
        modo = 'mover';
        ancla.classList.remove('ra-target');
        ancla.classList.add('ra-fuente');
        twin.classList.add('ra-modo-mover');
        avisoBase();
        aviso.classList.add('visible');
    }

    function avisoBase() {
        avisar(`Desplazando <b>${escapeHtml(item.dev.name)}</b> · elige la nueva U`);
    }

    function avisar(html, mal = false) {
        avisoTexto.innerHTML = html;
        aviso.classList.toggle('ra-mal', mal);
    }

    aviso.querySelector('button').addEventListener('click', () => cancelar());

    rails.addEventListener('mousemove', (e) => {
        if (modo !== 'mover') return;
        const u = uBajo(e.clientY);
        if (u === null) { ocultarFantasmas(); avisoBase(); return; }
        pintarPlan(planMove(layout, item, u), u);
    });
    rails.addEventListener('mouseleave', () => {
        if (modo !== 'mover') return;
        ocultarFantasmas();
        avisoBase();
    });

    // Pulsar dentro de la tabla en plena edición no debe dejar el foco en
    // el enlace de la fila (con Escape aparecería su anillo) ni seleccionar
    // texto. Cancelar el mousedown evita ambas cosas y el clic sigue llegando.
    table.addEventListener('mousedown', (e) => {
        if (modo === 'mover' || modo === 'tamano') e.preventDefault();
    }, true);

    // Mientras se desplaza o se cambia el tamaño, la tabla no navega: ni a
    // la ficha del equipo ni al alta de una U vacía. Va en captura para
    // adelantarse al onclick de las filas vacías.
    table.addEventListener('click', (e) => {
        if (modo !== 'mover' && modo !== 'tamano') return;
        e.preventDefault();
        e.stopPropagation();
        if (modo !== 'mover') return;
        const u = uBajo(e.clientY);
        if (u === null) return;
        const plan = planMove(layout, item, u);
        if (plan.type === 'same') cancelar();
        else if (plan.type === 'invalid') sacudirAviso();
        else confirmarMover(plan);
    }, true);

    function uBajo(y) {
        for (const tr of table.rows) {
            const r = tr.getBoundingClientRect();
            if (y >= r.top && y < r.bottom) return parseInt(tr.dataset.u, 10);
        }
        return null;
    }

    function pintarPlan(plan, u) {
        const h = spanOf(item);
        fantasma2.classList.remove('visible');
        if (plan.type === 'same') {
            fantasma.classList.remove('visible');
            avisar(`<b>${escapeHtml(item.dev.name)}</b> ya está aquí`);
        } else if (plan.type === 'invalid') {
            ponerFantasma(fantasma, u, 1, 'ra-mal', 'No cabe');
            avisar(escapeHtml(plan.reason), true);
        } else if (plan.type === 'move') {
            ponerFantasma(fantasma, plan.base, h, 'ra-ok', rangeLabel(plan.base, h));
            avisar(`Mover <b>${escapeHtml(item.dev.name)}</b> a la ${rangeLabel(plan.base, h)}`);
        } else {
            ponerFantasma(fantasma, plan.base, h, 'ra-swap', item.dev.name);
            ponerFantasma(fantasma2, plan.otherBase, spanOf(plan.other), 'ra-swap ra-pareja', plan.other.dev.name);
            avisar(`Intercambiar <b>${escapeHtml(item.dev.name)}</b> con <b>${escapeHtml(plan.other.dev.name)}</b>`);
        }
    }

    function ponerFantasma(f, base, h, clases, texto) {
        const r = rectDeRango(base, base + h - 1);
        if (!r) { f.classList.remove('visible'); return; }
        f.className = `ra-ghost ${clases} visible`;
        f.style.left   = `${r.left}px`;
        f.style.top    = `${r.top}px`;
        f.style.width  = `${r.width}px`;
        f.style.height = `${r.height}px`;
        f.textContent  = texto;
    }

    // Rectángulo de las U [base, top] dentro del riel, medido sobre las
    // filas reales de la tabla y sin la columna de números.
    function rectDeRango(base, top) {
        const filaTop  = table.querySelector(`tr[data-u="${top}"]`);
        const filaBase = table.querySelector(`tr[data-u="${base}"]`);
        if (!filaTop || !filaBase) return null;
        const rr  = rails.getBoundingClientRect();
        const ox  = rr.left + rails.clientLeft;
        const oy  = rr.top + rails.clientTop;
        const num = filaTop.cells[0].getBoundingClientRect();
        const arriba = filaTop.getBoundingClientRect().top;
        const abajo  = filaBase.getBoundingClientRect().bottom;
        const derecha = table.getBoundingClientRect().right;
        return {
            left:   num.right - ox + 2,
            top:    arriba - oy + 1,
            width:  derecha - num.right - 4,
            height: abajo - arriba - 2
        };
    }

    function ocultarFantasmas() {
        fantasma.classList.remove('visible');
        fantasma2.classList.remove('visible');
    }

    function sacudirAviso() {
        aviso.classList.remove('ra-sacudir');
        void aviso.offsetWidth;   // reinicia la animación
        aviso.classList.add('ra-sacudir');
    }

    function confirmarMover(plan) {
        const fuente  = item;
        const h       = spanOf(fuente);
        const cambios = [{ item: fuente, base: plan.base, height: h }];
        if (plan.type === 'swap') {
            cambios.push({ item: plan.other, base: plan.otherBase, height: spanOf(plan.other) });
        }
        persistir(cambios, plan.type === 'swap'
            ? `«${fuente.dev.name}» y «${plan.other.dev.name}» intercambiaron posición.`
            : `«${fuente.dev.name}» pasó a la ${rangeLabel(plan.base, h)}.`);
    }

    // ── Tamaño ───────────────────────────────────────────────
    function entrarTamano() {
        clearTimeout(tEspera);
        clearTimeout(tCierre);
        menu.classList.remove('visible');
        modo = 'tamano';
        ancla.classList.remove('ra-target');
        twin.classList.add('ra-modo-tamano');
        trabajo = { base: item.base, h: spanOf(item) };
        panel.querySelector('.ra-cap').textContent = `Tamaño · ${item.dev.name || 'Equipo'}`;
        pintarTamano();
        panel.classList.add('visible');
    }

    // Dibuja el bastidor como quedaría, sin guardar nada todavía.
    function pintarTamano() {
        const slots = { ...rack.slots };
        delete slots[item.key];
        slots[trabajo.base] = { ...item.dev, uHeight: trabajo.h };
        table.innerHTML = renderRows(rackLayout({ ...rack, slots }));

        ancla = table.querySelector(`a.rack-device[data-base="${trabajo.base}"]`);
        ancla?.classList.add('ra-editando');

        panel.querySelector('.ra-tam-num').textContent   = `${trabajo.h}U`;
        panel.querySelector('.ra-tam-rango').textContent = rangeLabel(trabajo.base, trabajo.h);
        const limites = resizeLimits(layout, item, trabajo.base, trabajo.h);
        for (const [acc, motivo] of Object.entries(limites)) {
            const b = panel.querySelector(`[data-acc="${acc}"]`);
            b.disabled = Boolean(motivo);
            b.title = motivo || b.getAttribute('aria-label');
        }
        if (ancla) colocarJunto(panel, ancla);
    }

    panel.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b || b.disabled || modo !== 'tamano') return;
        const acc = b.dataset.acc;
        if (acc === 'cancelar') { cancelar(); return; }
        if (acc === 'guardar')  { guardarTamano(); return; }
        if (acc === 'growUp')     trabajo.h += 1;
        if (acc === 'shrinkUp')   trabajo.h -= 1;
        if (acc === 'growDown')   { trabajo.base -= 1; trabajo.h += 1; }
        if (acc === 'shrinkDown') { trabajo.base += 1; trabajo.h -= 1; }
        pintarTamano();
    });

    function guardarTamano() {
        const { base, h } = trabajo;
        if (base === item.base && h === spanOf(item)) { cancelar(); return; }
        persistir([{ item, base, height: h }],
            `«${item.dev.name}» ahora ocupa la ${rangeLabel(base, h)}${h > 1 ? ` (${h}U)` : ''}.`);
    }

    // ── Comunes ──────────────────────────────────────────────
    // Junto al equipo, fuera del bastidor: a la izquierda, o a la derecha
    // si a la izquierda no queda sitio.
    function colocarJunto(flotante, a) {
        const tw = twin.getBoundingClientRect();
        const r  = a.getBoundingClientRect();
        flotante.style.top = `${r.top + r.height / 2 - tw.top - twin.clientTop}px`;
        flotante.classList.toggle('ra-lado-der', tw.left < flotante.offsetWidth + 24);
    }

    // Se aplica al momento y se repinta; Supabase se sincroniza detrás,
    // como en el resto de la app. La confirmación dura poco: los avisos
    // salen abajo a la derecha, encima de las U bajas del bastidor.
    async function persistir(cambios, mensaje) {
        const movidas = applyRackChanges(rack, cambios);
        actualizarPuertos(rack.id, movidas);
        salir();
        onChange();
        if (await save()) toastSuccess(mensaje, { duration: 2500 });
    }

    function cancelar() {
        if (modo === 'tamano') table.innerHTML = renderRows(layout);   // deshace la vista previa
        salir();
    }

    function salir() {
        clearTimeout(tEspera);
        clearTimeout(tCierre);
        menu.classList.remove('visible');
        panel.classList.remove('visible');
        aviso.classList.remove('visible', 'ra-mal', 'ra-sacudir');
        ocultarFantasmas();
        twin.classList.remove('ra-modo-mover', 'ra-modo-tamano');
        table.querySelectorAll('.ra-target, .ra-fuente, .ra-editando')
            .forEach(n => n.classList.remove('ra-target', 'ra-fuente', 'ra-editando'));
        modo = item = ancla = trabajo = null;
        escucharDocumento(false);
    }

    // Escape cancela; un clic fuera cierra el menú o abandona el desplazamiento.
    // El tamaño solo se cierra con sus botones o Escape, para no perder por
    // un clic suelto los ajustes que se llevan hechos.
    const alTeclear = (e) => {
        if (e.key !== 'Escape' || !modo) return;
        e.preventDefault();
        cancelar();
    };
    const alClicFuera = (e) => {
        if (modo === 'menu' && !menu.contains(e.target) && !ancla?.contains(e.target)) salir();
        else if (modo === 'mover' && !rails.contains(e.target) && !aviso.contains(e.target)) cancelar();
    };
    let escuchando = false;
    function escucharDocumento(activar) {
        if (activar === escuchando) return;
        escuchando = activar;
        const metodo = activar ? 'addEventListener' : 'removeEventListener';
        document[metodo]('keydown', alTeclear, true);
        document[metodo]('click', alClicFuera, true);
    }

    soltarAnterior = salir;
}

function crear(tag, clase) {
    const n = document.createElement(tag);
    n.className = clase;
    return n;
}

// Los puertos de los switches guardan a qué equipo van conectados por su id,
// y el id de un equipo montado lleva su U (rack_<bastidor>_<U>). Si un equipo
// cambia de U, se actualiza esa referencia: si no, el puerto quedaría
// apuntando a lo que ahora ocupe la U vieja. Todos los cambios se calculan
// a la vez, así un intercambio no se reescribe dos veces.
function actualizarPuertos(rackId, movidas) {
    if (!movidas.size) return;
    const nuevoId = new Map([...movidas].map(([de, a]) => [`rack_${rackId}_${de}`, `rack_${rackId}_${a}`]));
    const equipos = [...store.devices, ...store.racks.flatMap(r => Object.values(r.slots ?? {}))];
    for (const d of equipos) {
        for (const p of Object.values(d.interfaces ?? {})) {
            if (nuevoId.has(p.hostId))      p.hostId      = nuevoId.get(p.hostId);
            if (nuevoId.has(p.sfpDeviceId)) p.sfpDeviceId = nuevoId.get(p.sfpDeviceId);
        }
    }
}
