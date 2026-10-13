// ─────────────────────────────────────────────────────────────
// BARRA HORIZONTAL FIJA — para tablas anchas (hoy, solo Cámaras).
//
// La tabla se desplaza a lo ancho con su propia barra, que está al
// final de la tabla: con 30 filas por página había que bajar hasta
// abajo para alcanzarla. Esta es una copia pegada al pie de la ventana,
// como la de Excel, que mueve la tabla a la vez (y al revés).
//
// Solo se ve mientras la barra propia de la tabla está fuera de la
// vista: en cuanto aparece la de verdad, esta se esconde, para que
// nunca haya dos. En pantallas táctiles no se crea: ahí la tabla se
// desliza con el dedo.
// ─────────────────────────────────────────────────────────────

let activa = null;   // { desplazable, actualizar, quitar }

// El elemento que de verdad se desplaza es el envoltorio de la tabla,
// no #devices-table-container (ver DevicesModule.astro). Se busca
// subiendo desde la tabla el primero que desborda a lo ancho.
function encontrarDesplazable(contenedor) {
    const tabla = contenedor.querySelector('table');
    let el = tabla?.parentElement;
    while (el && el !== contenedor.parentElement) {
        const ox = getComputedStyle(el).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) return el;
        el = el.parentElement;
    }
    // Aún no desborda (pantalla ancha): el envoltorio inmediato es el
    // candidato; si más tarde desborda, la barra aparecerá sola.
    return tabla?.parentElement ?? contenedor;
}

export function fijarBarraHorizontal(contenedor) {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;

    const desplazable = encontrarDesplazable(contenedor);
    // Cada filtro o cambio de página vuelve a pintar la tabla: si la barra
    // ya sigue a este mismo elemento, basta con recalcular medidas.
    if (activa && activa.desplazable === desplazable) {
        activa.actualizar();
        return;
    }
    quitarBarraHorizontal();

    const barra = document.createElement('div');
    barra.className = 'barra-h-fija';
    barra.setAttribute('aria-hidden', 'true');   // atajo visual; la tabla sigue siendo la real
    const relleno = document.createElement('div');
    relleno.className = 'barra-h-fija-relleno';
    barra.appendChild(relleno);
    document.body.appendChild(barra);

    // Sincronía en los dos sentidos. La tolerancia de 1 px evita que las
    // dos se persigan con posiciones fraccionarias (zoom del navegador).
    const cerca = (a, b) => Math.abs(a - b) <= 1;
    const alMoverBarra = () => {
        if (!cerca(desplazable.scrollLeft, barra.scrollLeft)) desplazable.scrollLeft = barra.scrollLeft;
    };
    const alMoverTabla = () => {
        if (!cerca(barra.scrollLeft, desplazable.scrollLeft)) barra.scrollLeft = desplazable.scrollLeft;
    };

    let frame = 0;
    const recalcular = () => {
        frame = 0;
        if (!desplazable.isConnected) { quitarBarraHorizontal(); return; }

        const r = desplazable.getBoundingClientRect();
        const desborda    = desplazable.scrollWidth > desplazable.clientWidth + 1;
        const enPantalla  = r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
        // La barra propia va en el borde inferior del desplazable
        const propiaVisible = r.bottom <= window.innerHeight;

        const mostrar = desborda && enPantalla && !propiaVisible;
        barra.style.display = mostrar ? 'block' : 'none';
        if (!mostrar) return;

        barra.style.left  = `${r.left + desplazable.clientLeft}px`;
        barra.style.width = `${desplazable.clientWidth}px`;
        relleno.style.width = `${desplazable.scrollWidth}px`;
        alMoverTabla();
    };
    // Como mucho un cálculo por fotograma
    const actualizar = () => { if (!frame) frame = requestAnimationFrame(recalcular); };

    barra.addEventListener('scroll', alMoverBarra, { passive: true });
    desplazable.addEventListener('scroll', alMoverTabla, { passive: true });
    // En captura sobre document: recibe el desplazamiento de la página sea
    // cual sea el elemento que desplaza.
    document.addEventListener('scroll', actualizar, { passive: true, capture: true });
    window.addEventListener('resize', actualizar, { passive: true });
    const observador = new ResizeObserver(actualizar);
    observador.observe(desplazable);
    const tabla = desplazable.querySelector('table');
    if (tabla) observador.observe(tabla);

    activa = {
        desplazable,
        actualizar,
        quitar() {
            if (frame) cancelAnimationFrame(frame);
            barra.removeEventListener('scroll', alMoverBarra);
            desplazable.removeEventListener('scroll', alMoverTabla);
            document.removeEventListener('scroll', actualizar, { capture: true });
            window.removeEventListener('resize', actualizar);
            observador.disconnect();
            barra.remove();
        }
    };
    actualizar();
}

export function quitarBarraHorizontal() {
    activa?.quitar();
    activa = null;
}

// Al cambiar de página el <body> se reemplaza y la barra se va con él,
// pero las escuchas de window y document seguirían vivas: se sueltan aquí.
document.addEventListener('astro:before-swap', quitarBarraHorizontal);
