// ════════════════════════════════════════════════════════════════
//  ÍCONOS 3D DE MAPAS
//
//  Cada tipo de dispositivo o de infraestructura tiene su glifo (trazo
//  blanco, 24×24) dentro de una "ficha" con volumen: degradado de su
//  color, brillo arriba, canto oscuro abajo y sombra (ver .ic3d en
//  maps.css). Se pinta con CSS y no con degradados SVG para no depender
//  de ids repetidos en la página.
// ════════════════════════════════════════════════════════════════

const s = (cuerpo) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;

export const GLIFOS = {
    camaraBala: s('<path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/><path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/><path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/><path d="M2 21v-4"/><path d="M7 9h.01"/>'),
    camaraDomo: s('<path d="M3 7h18"/><path d="M5 7v1a7 7 0 0 0 14 0V7"/><circle cx="12" cy="11" r="2.6"/><path d="M12 11h.01"/>'),
    camaraPtz:  s('<path d="M4 5h16"/><path d="M6 5v1a6 6 0 0 0 12 0V5"/><circle cx="12" cy="8.5" r="2.2"/><path d="M4.5 16.5a9 3.6 0 0 0 15 0"/><path d="m17.2 14.4 2.3 2.1-2.9.9"/>'),
    camaraOjo:  s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/>'),
    nvr:        s('<rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h4"/><path d="M6 14h4"/><circle cx="16.5" cy="12" r="2.3"/><path d="M16.5 12h.01"/>'),
    switch:     s('<rect x="2" y="7" width="20" height="10" rx="2.5"/><path d="M6 12h.01"/><path d="M9 12h.01"/><path d="M12 12h.01"/><path d="M15 12h.01"/><path d="M18.5 11v2"/>'),
    sfp:        s('<rect x="3" y="8" width="13" height="8" rx="1.5"/><path d="M16 10h3a2 2 0 0 1 0 4h-3"/><path d="M6 12h4"/>'),
    firewall:   s('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M12 10v4"/>'),
    telefono:   s('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    ap:         s('<path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M12 20h.01"/>'),
    antena:     s('<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>'),
    biometrico: s('<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>'),
    ups:        s('<path d="M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/><path d="m11 7-3 5h4l-3 5"/><line x1="22" x2="22" y1="11" y2="13"/>'),
    energia:    s('<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="m2 22 3-3"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m18 3-4 4h6l-4 4"/>'),
    pasivo:     s('<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M5.5 11h2v2h-2z"/><path d="M9.5 11h2v2h-2z"/><path d="M13.5 11h2v2h-2z"/><path d="M18 12h1"/>'),
    servidor:   s('<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>'),
    pc:         s('<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>'),
    impresora:  s('<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>'),
    generico:   s('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
    bastidor:   s('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 9.5h8"/><path d="M8 13h8"/><path d="M8 16.5h3"/><path d="M15.5 16.5h.01"/>'),

    // Infraestructura
    fibra:      s('<path d="M3 20c3.5-1 5-4 6-7s2.5-6 6-7"/><path d="M15 6h3"/><path d="M19.5 4.5 21 3"/><path d="M20 7.5h2"/><path d="M19.5 9.5 21 11"/><circle cx="3" cy="20" r="1"/>'),
    utp:        s('<path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/>'),
    coaxial:    s('<circle cx="9" cy="12" r="6"/><circle cx="9" cy="12" r="2"/><path d="M15 12h6"/>'),
    ducto:      s('<rect x="2" y="6.5" width="20" height="4.5" rx="2.25"/><rect x="2" y="13" width="20" height="4.5" rx="2.25"/><path d="M6 6.5v4.5"/><path d="M18 13v4.5"/>'),
    electrico:  s('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    radioenlace:s('<path d="M5 21V10"/><path d="M19 21V10"/><path d="M8.5 7.5a5 5 0 0 1 7 0"/><path d="M10.6 9.8a2 2 0 0 1 2.8 0"/><path d="M5.5 4.5a9 9 0 0 1 13 0"/><path d="M3 21h4"/><path d="M17 21h4"/>'),
    linea:      s('<path d="M3 17c4-8 8 4 12-4 2-4 4-6 6-6"/><circle cx="3" cy="17" r="1.6"/><circle cx="21" cy="7" r="1.6"/>'),
    mufa:       s('<rect x="6" y="3" width="12" height="17" rx="6"/><path d="M6 9.5h12"/><path d="M9.5 20v2"/><path d="M14.5 20v2"/>'),
    poste:      s('<path d="M12 2v20"/><path d="M5 6h14"/><path d="M7 10h10"/><path d="M5 6v2"/><path d="M19 6v2"/><path d="M9 22h6"/>'),
    pozo:       s('<ellipse cx="12" cy="12" rx="9" ry="5"/><path d="M5 12h14"/><path d="M8 9.6v4.8"/><path d="M12 9v6"/><path d="M16 9.6v4.8"/>'),
    nap:        s('<rect x="4" y="3" width="16" height="17" rx="2"/><circle cx="9" cy="8.5" r="1.3"/><circle cx="15" cy="8.5" r="1.3"/><circle cx="9" cy="13.5" r="1.3"/><circle cx="15" cy="13.5" r="1.3"/><path d="M12 20v2"/>'),
    odf:        s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 13h.01"/><path d="M11 13h.01"/><path d="M15 13h.01"/><path d="M7 16.5h.01"/><path d="M11 16.5h.01"/><path d="M15 16.5h.01"/>'),
    splitter:   s('<path d="M2 12h6"/><path d="M8 12l4.5-6H22"/><path d="M8 12h14"/><path d="M8 12l4.5 6H22"/><circle cx="2.5" cy="12" r=".9"/>'),
    reserva:    s('<ellipse cx="12" cy="11" rx="8" ry="5"/><ellipse cx="12" cy="11" rx="4.5" ry="2.4"/><path d="M3 19l4-4"/><path d="M21 19l-4-4"/>'),
    torre:      s('<path d="m8 22 4-14 4 14"/><path d="M9.2 18h5.6"/><path d="M10.3 14h3.4"/><circle cx="12" cy="5" r="2"/><path d="M7.2 2.8a6 6 0 0 0 0 4.4"/><path d="M16.8 2.8a6 6 0 0 1 0 4.4"/>'),
    gabinete:   s('<rect x="4" y="2" width="16" height="20" rx="1.5"/><path d="M4 7h16"/><path d="M15 12v3"/><path d="M8 18h3"/>'),
    roseta:     s('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 10h6v5H9z"/><path d="M10.5 10V8.5h3V10"/>')
};

// Paleta: claro → oscuro, para el degradado de la ficha
const P = {
    azul:     ['#7cb6ff', '#1d4ed8'],
    indigo:   ['#a5b4fc', '#4338ca'],
    turquesa: ['#5eead4', '#0f766e'],
    rojo:     ['#fca5a5', '#b91c1c'],
    cian:     ['#67e8f9', '#0e7490'],
    violeta:  ['#d8b4fe', '#7e22ce'],
    esmeralda:['#6ee7b7', '#047857'],
    ambar:    ['#fcd34d', '#b45309'],
    naranja:  ['#fdba74', '#c2410c'],
    pizarra:  ['#cbd5e1', '#334155'],
    cielo:    ['#7dd3fc', '#0369a1'],
    rosa:     ['#f9a8d4', '#be185d'],
    grafito:  ['#94a3b8', '#0f172a'],
    lima:     ['#bef264', '#4d7c0f'],
    cafe:     ['#d6a77a', '#7c2d12']
};

const sinAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Dispositivos ────────────────────────────────────────────────
// El tipo se reconoce por el nombre de su categoría (las categorías las
// crea el usuario, así que se mira por palabras clave).
const REGLAS = [
    [/camara|cctv/,                  'camara',     'Cámara',             P.azul],
    [/\bnvr\b|\bdvr\b|grabador/,     'nvr',        'NVR',                P.indigo],
    [/switch|conmutador/,            'switch',     'Switch',             P.turquesa],
    [/sfp|transceptor/,              'sfp',        'SFP',                P.cielo],
    [/firewall|router|fortigate/,    'firewall',   'Firewall',           P.rojo],
    [/planta|telefon|central/,       'telefono',   'Telefonía',          P.rosa],
    [/^ap$|access point|punto de acceso|wifi/, 'ap', 'Access Point',     P.cian],
    [/antena|radio/,                 'antena',     'Antena',             P.violeta],
    [/biometric|reloj|marcador/,     'biometrico', 'Biométrico',         P.esmeralda],
    [/\bups\b/,                      'ups',        'UPS',                P.ambar],
    [/supresor|pdu|regleta|energia/, 'energia',    'Energía',            P.naranja],
    [/patch|bandeja|organizador|cordon/, 'pasivo', 'Pasivo',             P.pizarra],
    [/servidor|server|\bnas\b/,      'servidor',   'Servidor',           P.indigo],
    [/impresora/,                    'impresora',  'Impresora',          P.pizarra],
    [/\bpc\b|computadora|laptop|monitor/, 'pc',    'Equipo de cómputo',  P.cielo]
];

export function estiloDispositivo(dev) {
    const tipo = sinAcentos(dev?.device);
    const r = REGLAS.find(([re]) => re.test(tipo));
    if (!r) return { clave: 'generico', etiqueta: dev?.device || 'Dispositivo', c: P.pizarra, glifo: GLIFOS.generico };
    const [, clave, etiqueta, c] = r;
    let glifo = GLIFOS[clave] ?? GLIFOS.generico;
    if (clave === 'camara') {
        const forma = sinAcentos(dev?.cameraType);
        glifo = /domo|dome/.test(forma) ? GLIFOS.camaraDomo
            : /ptz/.test(forma) ? GLIFOS.camaraPtz
            : /ojo|fish|360/.test(forma) ? GLIFOS.camaraOjo
            : GLIFOS.camaraBala;
    }
    return { clave, etiqueta, c, glifo };
}

export const ESTILO_BASTIDOR = { clave: 'bastidor', etiqueta: 'Bastidor', c: P.grafito, glifo: GLIFOS.bastidor };

// ── Infraestructura: color propio del elemento ──────────────────
// El usuario elige el color del elemento; la ficha se arma con ese color
// aclarado arriba y oscurecido abajo.
export function estiloColor(color, glifo) {
    const base = /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : '#64748b';
    return { c: [`color-mix(in srgb, ${base} 55%, #ffffff)`, `color-mix(in srgb, ${base} 82%, #000000)`], glifo };
}

// ── HTML de la ficha 3D ─────────────────────────────────────────
export function icono3d(estilo, { tam = 36, clase = '' } = {}) {
    const [c1, c2] = estilo.c;
    return `<span class="ic3d ${clase}" style="--c1:${c1};--c2:${c2};--tam:${tam}px">${estilo.glifo}</span>`;
}
