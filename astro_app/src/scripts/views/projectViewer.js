// ════════════════════════════════════════════════════════════════
//  VISTA PREVIA DE DOCUMENTOS — PDF, Word (.docx) e imágenes
//
//  pdf.js y docx-preview se cargan solo la primera vez que hacen falta:
//  pesan, y el resto de la app no los usa.
//
//  Cada visor guarda en el propio contenedor lo que hay que soltar al
//  cambiar de documento (el PDF abierto, los observadores). Si se pide
//  otro documento antes de que termine el anterior, el anterior se
//  descarta al llegar: nunca pisa al nuevo.
// ════════════════════════════════════════════════════════════════
import { fileBlob, tipoDe } from '../projectsStore.js';
import { escapeHtml } from '../utils.js';

let pdfjsPromesa = null;
function cargarPdfjs() {
    pdfjsPromesa ??= Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ]).then(([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        return lib;
    }).catch(err => { pdfjsPromesa = null; throw err; });
    return pdfjsPromesa;
}

let docxPromesa = null;
const cargarDocx = () => (docxPromesa ??= import('docx-preview').catch(err => { docxPromesa = null; throw err; }));

// ── URLs de objeto (imágenes, abrir en pestaña, descargar) ──────
const urls = new Map();

export async function urlDe(archivo) {
    if (!urls.has(archivo.path)) urls.set(archivo.path, URL.createObjectURL(await fileBlob(archivo)));
    return urls.get(archivo.path);
}

export function liberarUrls() {
    urls.forEach(u => URL.revokeObjectURL(u));
    urls.clear();
}

export async function descargar(archivo) {
    const a = document.createElement('a');
    a.href = await urlDe(archivo);
    a.download = archivo.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// ── Visor ───────────────────────────────────────────────────────
const NADA = { paginas: 0, destruir() {} };

export function soltarVisor(cont) {
    if (!cont) return;
    cont._turno = (cont._turno || 0) + 1;   // invalida lo que esté cargando
    // Limpiar nunca debe romper lo que viene después (cambiar de documento,
    // repintar la tarjeta): si algo falla aquí, se anota y se sigue.
    try { cont._visor?.destruir(); }
    catch (err) { console.warn('[proyectos] al cerrar el visor:', err); }
    cont._visor = null;
}

export async function mostrarArchivo(cont, archivo) {
    soltarVisor(cont);
    const turno = cont._turno;
    const vigente = () => cont._turno === turno && cont.isConnected;

    cont.innerHTML = `<div class="pjv-cargando"><div class="db-spinner"></div><span>Abriendo ${escapeHtml(archivo.name)}…</span></div>`;
    try {
        const tipo = tipoDe(archivo);
        const visor =
            tipo === 'pdf'    ? await mostrarPdf(cont, archivo, vigente) :
            tipo === 'docx'   ? await mostrarDocx(cont, archivo, vigente) :
            tipo === 'imagen' ? await mostrarImagen(cont, archivo, vigente) :
                                mostrarSinVista(cont, archivo);
        if (vigente()) cont._visor = visor;
        else visor.destruir();
        return visor;
    } catch (err) {
        if (vigente()) {
            cont.innerHTML = `<div class="pjv-aviso">
                <p class="pjv-aviso-tit">No se pudo mostrar este documento</p>
                <p>${escapeHtml(err?.message ?? String(err))}</p>
                <button type="button" class="pj-btn-suave" data-acc="descargar">Descargarlo</button>
            </div>`;
        }
        return NADA;
    }
}

// ── PDF: cada página se dibuja cuando se acerca a la vista ───────
async function mostrarPdf(cont, archivo, vigente) {
    const [pdfjs, blob] = await Promise.all([cargarPdfjs(), fileBlob(archivo)]);
    const datos = new Uint8Array(await blob.arrayBuffer());
    // En pdf.js 6 quien se destruye es la tarea de carga, no el documento
    const carga = pdfjs.getDocument({ data: datos });
    const doc = await carga.promise;
    if (!vigente()) { carga.destroy(); return NADA; }

    // Huecos con la proporción de la 1.ª página: el scroll ya tiene su
    // alto final aunque las páginas aún no se hayan dibujado.
    const base = (await doc.getPage(1)).getViewport({ scale: 1 });
    const hojas = document.createElement('div');
    hojas.className = 'pjv-hojas';
    for (let n = 1; n <= doc.numPages; n++) {
        const hoja = document.createElement('div');
        hoja.className = 'pjv-hoja';
        hoja.dataset.n = n;
        hoja.style.aspectRatio = `${base.width} / ${base.height}`;
        hojas.appendChild(hoja);
    }

    const contador = document.createElement('div');
    contador.className = 'pjv-contador';
    contador.textContent = doc.numPages > 1 ? `Página 1 de ${doc.numPages}` : '1 página';
    cont.replaceChildren(hojas, contador);

    const tareas = new Set();
    const dibujar = async (hoja) => {
        if (hoja.dataset.lista) return;
        hoja.dataset.lista = '1';
        const pagina = await doc.getPage(Number(hoja.dataset.n));
        const natural = pagina.getViewport({ scale: 1 });
        hoja.style.aspectRatio = `${natural.width} / ${natural.height}`;
        const nitidez = Math.min(window.devicePixelRatio || 1, 2);
        const vista = pagina.getViewport({ scale: (hoja.clientWidth / natural.width) * nitidez });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vista.width);
        canvas.height = Math.floor(vista.height);
        const tarea = pagina.render({ canvas, viewport: vista });
        tareas.add(tarea);
        try {
            await tarea.promise;
            hoja.appendChild(canvas);
        } catch { /* cancelado al cerrar */ }
        finally { tareas.delete(tarea); }
    };

    const io = new IntersectionObserver((entradas) => {
        for (const e of entradas) if (e.isIntersecting) dibujar(e.target);
    }, { root: cont, rootMargin: '600px 0px' });
    hojas.childNodes.forEach(h => io.observe(h));

    // "Página X de N": la que ocupa el centro del visor
    let marco = 0;
    const alDesplazar = () => {
        if (marco || doc.numPages < 2) return;
        marco = requestAnimationFrame(() => {
            marco = 0;
            const centro = cont.getBoundingClientRect().top + cont.clientHeight / 2;
            for (const h of hojas.childNodes) {
                const r = h.getBoundingClientRect();
                if (r.top <= centro && r.bottom >= centro) {
                    contador.textContent = `Página ${h.dataset.n} de ${doc.numPages}`;
                    break;
                }
            }
        });
    };
    cont.addEventListener('scroll', alDesplazar, { passive: true });

    return {
        paginas: doc.numPages,
        destruir() {
            io.disconnect();
            cont.removeEventListener('scroll', alDesplazar);
            if (marco) cancelAnimationFrame(marco);
            tareas.forEach(t => t.cancel());
            carga.destroy();
        }
    };
}

// ── Word (.docx): se convierte a páginas HTML y se encaja al ancho ──
async function mostrarDocx(cont, archivo, vigente) {
    const [{ renderAsync }, blob] = await Promise.all([cargarDocx(), fileBlob(archivo)]);

    const estilos = document.createElement('div');
    const lienzo = document.createElement('div');
    lienzo.className = 'pjv-docx';
    // Se pinta fuera de la vista y se mete después: así el visor no
    // parpadea con el documento a medio armar.
    await renderAsync(blob, lienzo, estilos, {
        className: 'pjdocx',
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true
    });
    if (!vigente()) return NADA;
    cont.replaceChildren(estilos, lienzo);

    // Ancho natural de la hoja (con el margen gris alrededor), medido una
    // vez sin zoom; luego se reduce lo justo para que quepa en el visor.
    const hoja = lienzo.querySelector('section.pjdocx');
    const natural = hoja ? hoja.offsetWidth + 48 : 0;
    const encajar = () => {
        if (!natural) return;
        lienzo.style.zoom = String(Math.min(1, cont.clientWidth / natural));
    };
    encajar();
    const ro = new ResizeObserver(encajar);
    ro.observe(cont);
    return { paginas: lienzo.querySelectorAll('section.pjdocx').length, destruir() { ro.disconnect(); } };
}

// ── Imagen ──────────────────────────────────────────────────────
async function mostrarImagen(cont, archivo, vigente) {
    const url = await urlDe(archivo);
    if (!vigente()) return NADA;
    const marco = document.createElement('div');
    marco.className = 'pjv-imagen';
    const img = new Image();
    img.alt = archivo.name;
    img.decoding = 'async';
    img.src = url;
    marco.appendChild(img);
    cont.replaceChildren(marco);
    return NADA;
}

// ── Sin vista previa (.doc de Word 97-2003) ─────────────────────
function mostrarSinVista(cont, archivo) {
    cont.innerHTML = `<div class="pjv-aviso">
        <div class="pjv-aviso-ico">DOC</div>
        <p class="pjv-aviso-tit">${escapeHtml(archivo.name)}</p>
        <p>Los archivos .doc (Word 97-2003) no se pueden previsualizar en el navegador.
           Si lo guardas como .docx o PDF sí se verá aquí.</p>
        <button type="button" class="pj-btn-suave" data-acc="descargar">Descargar</button>
    </div>`;
    return NADA;
}
