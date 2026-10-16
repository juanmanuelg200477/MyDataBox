// ════════════════════════════════════════════════════════════════
//  APUNTES · Estilos inyectados
//  Extraído de notes-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════
export function injectStyles() {
    if (document.getElementById('ap-styles')) return;
    const s = document.createElement('style');
    s.id = 'ap-styles';
    s.textContent = `
        .nws-apuntes {
            position: relative;
        }
        .nws-apuntes .nws-side:first-child {
            width: 230px;
        }
        .nws-apuntes .ap-notes-side {
            width: 270px; background: var(--surface);
            border-right: 1px solid var(--border);
        }

        /* ── Modo enfocado: ocultar carpetas + lista ── */
        .nws-apuntes.ap-focus > .nws-side {
            display: none !important;
        }
        .ap-focus-restore {
            position: absolute;
            left: 0; top: 50%;
            transform: translateY(-50%);
            width: 26px; height: 70px;
            background: var(--primary);
            color: #fff;
            border: none;
            border-radius: 0 12px 12px 0;
            cursor: pointer;
            display: none;
            align-items: center; justify-content: center;
            z-index: 10;
            box-shadow: 0 6px 18px rgba(59, 130, 246, .35);
            transition: all .2s ease, transform .25s cubic-bezier(.34,1.4,.64,1);
            opacity: 0;
            transform: translateY(-50%) translateX(-100%);
        }
        .nws-apuntes.ap-focus .ap-focus-restore {
            display: flex;
            opacity: 1;
            transform: translateY(-50%) translateX(0);
        }
        .ap-focus-restore:hover {
            background: var(--primary-hover);
            width: 32px;
        }
        .ap-focus-restore svg { width: 14px; height: 14px; }

        /* Botón Focus en el editor */
        .ap-focus-btn { color: var(--text-muted); }
        .ap-focus-btn:hover {
            background: color-mix(in srgb, var(--primary) 10%, var(--surface-2));
            color: var(--primary);
            border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
        }
        .ap-focus-btn.active {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }
        .ap-side-empty {
            padding: 20px 14px; text-align: center;
            font-size: 12px; color: var(--text-muted);
            font-style: italic;
        }

        /* ── Folders ── */
        .ap-folder {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 11px; border-radius: 8px;
            cursor: pointer; transition: background .15s ease;
            position: relative;
        }
        .ap-folder:hover { background: var(--surface); }
        .ap-folder.active {
            background: color-mix(in srgb, var(--c) 12%, var(--surface));
            box-shadow: inset 3px 0 0 var(--c);
        }
        .ap-folder-ico {
            width: 28px; height: 28px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--c) 14%, transparent);
            color: var(--c);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .ap-folder-ico svg { width: 15px; height: 15px; }
        .ap-folder-name {
            flex: 1; font-size: 13px; font-weight: 600;
            color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ap-folder-count {
            background: var(--surface-3);
            color: var(--text-muted);
            font-size: 10.5px; font-weight: 700;
            padding: 2px 7px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
        }
        .ap-folder-edit {
            opacity: 0; border: none; background: transparent;
            cursor: pointer; padding: 4px;
            color: var(--text-muted);
            transition: opacity .15s ease, color .15s ease;
        }
        .ap-folder:hover .ap-folder-edit { opacity: 1; }
        .ap-folder-edit:hover { color: var(--primary); }
        .ap-folder-edit svg { width: 13px; height: 13px; }

        /* ── Note cards ── */
        .ap-note-card {
            padding: 11px 12px;
            border-radius: 9px;
            cursor: pointer;
            transition: background .15s ease, transform .15s ease;
            border: 1px solid transparent;
        }
        .ap-note-card:hover { background: var(--surface-3); }
        .ap-note-card.active {
            background: color-mix(in srgb, var(--primary) 8%, var(--surface-2));
            border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
        }
        .ap-note-row1 { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .ap-star { color: #f59e0b; font-size: 13px; }
        .ap-note-title {
            font-size: 13px; font-weight: 700; color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            flex: 1;
        }
        .ap-note-snippet {
            font-size: 11.5px; color: var(--text-muted);
            line-height: 1.4;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden;
            margin-bottom: 5px;
        }
        .ap-note-meta {
            display: flex; align-items: center; gap: 4px;
            font-size: 10.5px; color: var(--text-muted);
        }
        .ap-note-date { font-family: 'JetBrains Mono', monospace; }

        /* ════════════════════════════════════════════════════════
           EDITOR estilo Word + Canva
           ════════════════════════════════════════════════════════ */
        .ap-editor-host { flex: 1; min-height: 0; display: flex; }
        .ap-editor {
            flex: 1; min-height: 0;
            display: flex; flex-direction: column;
            position: relative;
        }

        /* Header */
        .ap-editor-top {
            display: flex; align-items: center; gap: 10px;
            padding: 22px 32px 0;
            flex-shrink: 0;
        }
        .ap-editor-title {
            flex: 1;
            border: none; outline: none; background: transparent;
            font-size: 30px; font-weight: 800;
            color: var(--text-main);
            font-family: inherit;
            letter-spacing: -.8px;
            padding: 4px 0;
        }
        .ap-editor-actions { display: flex; gap: 6px; }
        .nws-iconbtn.starred {
            background: #fef3c7; color: #f59e0b; border-color: #fde68a;
            box-shadow: 0 2px 6px rgba(245,158,11,.2);
        }
        .nws-iconbtn.danger:hover {
            background: color-mix(in srgb, var(--danger) 12%, transparent);
            color: var(--danger);
            border-color: var(--danger);
        }

        /* Tags */
        .ap-tags-row {
            padding: 8px 32px 14px;
            display: flex; align-items: center; gap: 8px;
            flex-wrap: wrap;
            font-size: 11px; color: var(--text-muted);
            flex-shrink: 0;
        }
        .ap-tags-lbl {
            font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
            font-size: 10px;
            background: var(--surface-3);
            padding: 3px 8px; border-radius: 6px;
        }
        .ap-tag {
            background: color-mix(in srgb, var(--primary) 10%, transparent);
            color: var(--primary);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px; font-weight: 600;
            display: inline-flex; align-items: center; gap: 4px;
        }
        .ap-tag button {
            border: none; background: transparent;
            color: var(--primary); cursor: pointer;
            font-size: 14px; padding: 0; line-height: 1;
        }
        #ap-tags-input {
            border: 1px dashed var(--border); outline: none; background: transparent;
            font-size: 11.5px; color: var(--text-main);
            font-family: inherit;
            padding: 3px 8px; border-radius: 10px;
            transition: border-color .15s ease;
        }
        #ap-tags-input:focus { border-color: var(--primary); border-style: solid; }

        /* ── ÁREA SCROLLABLE (contiene tags + toolbar sticky + contenido) ── */
        .ap-scroll-area {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            background: var(--surface-2);
            display: flex;
            flex-direction: column;
        }
        .ap-scroll-area::-webkit-scrollbar { width: 10px; }
        .ap-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .ap-scroll-area::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 5px;
            border: 2px solid var(--surface-2);
        }
        .ap-scroll-area::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        /* ── TOOLBAR sticky (anclada al tope del scroll area) ── */
        .ap-toolbar-wrap {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(14px) saturate(180%);
            -webkit-backdrop-filter: blur(14px) saturate(180%);
            border-bottom: 1px solid var(--border);
            box-shadow: 0 4px 12px -6px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(15, 23, 42, 0.04);
            flex-shrink: 0;
        }
        /* Sombra reforzada cuando hay contenido por encima */
        .ap-toolbar-wrap::after {
            content: '';
            position: absolute;
            left: 0; right: 0; bottom: -8px;
            height: 8px;
            background: linear-gradient(180deg, rgba(15,23,42,0.06), transparent);
            pointer-events: none;
            opacity: 0;
            transition: opacity .25s ease;
        }
        .ap-scroll-area.scrolled .ap-toolbar-wrap::after { opacity: 1; }
        .ap-toolbar {
            display: flex; align-items: center;
            gap: 2px;
            padding: 8px 22px;
            flex-wrap: wrap;
            row-gap: 6px;
        }
        .ap-tg {
            display: flex; align-items: center; gap: 2px;
            background: var(--surface-2);
            border-radius: 9px;
            padding: 3px;
        }
        .ap-tb-btn {
            min-width: 30px; height: 30px;
            border: none;
            background: transparent;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12.5px; font-weight: 700;
            color: var(--text-main);
            font-family: inherit;
            display: flex; align-items: center; justify-content: center;
            padding: 0 8px;
            transition: all .12s ease;
        }
        .ap-tb-btn:hover {
            background: var(--surface);
            box-shadow: 0 2px 6px rgba(0,0,0,.06);
        }
        .ap-tb-btn:active { transform: scale(.94); }
        .ap-tb-btn svg { width: 15px; height: 15px; }
        .ap-tb-btn.ap-tb-mini { font-size: 10px; padding: 0 6px; min-width: 26px; }
        .ap-tb-btn b, .ap-tb-btn i, .ap-tb-btn u, .ap-tb-btn s {
            font-style: inherit;
            text-decoration: inherit;
        }
        .ap-tb-btn b { font-weight: 800; }
        .ap-tb-btn i { font-style: italic; font-family: Georgia, serif; }
        .ap-tb-btn u { text-decoration: underline; }
        .ap-tb-btn s { text-decoration: line-through; }

        .ap-tb-sep {
            width: 1px; height: 20px;
            background: var(--border);
            margin: 0 3px;
            flex-shrink: 0;
        }

        /* Selects de la toolbar */
        .ap-tb-select {
            border: 1px solid transparent;
            background: transparent;
            border-radius: 6px;
            padding: 5px 8px;
            font-size: 12px;
            color: var(--text-main);
            font-family: inherit;
            cursor: pointer;
            transition: all .12s ease;
            min-width: 30px;
            outline: none;
        }
        .ap-tb-select:hover {
            background: var(--surface);
            border-color: var(--border);
        }
        .ap-tb-select:focus { border-color: var(--primary); }
        .ap-tb-font { min-width: 130px; }
        .ap-tb-size { min-width: 50px; text-align: center; }
        .ap-tb-block { min-width: 105px; }

        /* Color picker */
        .ap-tb-color {
            position: relative;
            display: flex; align-items: center;
            background: transparent;
            border-radius: 7px;
            padding: 0;
            cursor: pointer;
            transition: background .12s ease;
        }
        .ap-tb-color:hover { background: var(--surface); }
        .ap-tb-color-ico {
            display: flex; flex-direction: column; align-items: center;
            padding: 3px 4px 1px 7px;
            color: var(--text-main);
            cursor: pointer;
            gap: 1px;
        }
        .ap-tb-color-ico svg { width: 14px; height: 14px; }
        .ap-tb-color-bar {
            width: 18px; height: 4px;
            border-radius: 2px;
            border: 1px solid rgba(0,0,0,.06);
        }
        .ap-tb-color-caret {
            width: 12px !important; height: 12px !important;
            color: var(--text-muted);
            padding-right: 5px;
        }
        .ap-tb-color-pop {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px;
            box-shadow: 0 12px 32px rgba(0,0,0,.15);
            display: none;
            grid-template-columns: repeat(6, 1fr);
            gap: 4px;
            z-index: 100;
            min-width: 180px;
        }
        .ap-tb-color.open .ap-tb-color-pop { display: grid; }
        .ap-tb-color-pop button {
            width: 22px; height: 22px;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 5px;
            cursor: pointer;
            transition: transform .15s ease, box-shadow .15s ease;
        }
        .ap-tb-color-pop button:hover {
            transform: scale(1.15);
            box-shadow: 0 2px 8px rgba(0,0,0,.15);
            z-index: 1;
        }

        /* ── Contenido editable (dentro del scroll area, debajo de la toolbar sticky) ──
           flex: 1 0 auto hace que la hoja:
             - Siempre ocupe al menos toda la altura visible del scroll area
             - Crezca naturalmente con el contenido cuando se hace más largo
             - Nunca se quede más corta que el contenido (overflow visible) */
        .ap-content {
            max-width: 880px;
            width: calc(100% - 36px);
            margin: 22px auto 22px;
            background: var(--surface);
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 0 0 1px var(--border);
            padding: 50px 60px;
            flex: 1 0 auto;
            font-size: 15px;
            line-height: 1.75;
            color: var(--text-main);
            outline: none;
            font-family: 'DM Sans', sans-serif;
            overflow: visible;
            box-sizing: border-box;
        }
        .ap-content:focus { outline: none; }
        .ap-content h1 { font-size: 32px; font-weight: 800; margin: 18px 0 10px; letter-spacing: -.7px; color: var(--text-main); }
        .ap-content h2 { font-size: 26px; font-weight: 700; margin: 14px 0 8px; letter-spacing: -.4px; color: var(--text-main); }
        .ap-content h3 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; color: var(--text-main); }
        .ap-content h4 { font-size: 17px; font-weight: 700; margin: 10px 0 5px; color: var(--text-main); }
        .ap-content p { margin: 8px 0; }
        .ap-content ul, .ap-content ol { padding-left: 32px; margin: 10px 0; }
        .ap-content li { margin: 4px 0; }
        .ap-content blockquote {
            border-left: 4px solid var(--primary);
            background: color-mix(in srgb, var(--primary) 5%, transparent);
            margin: 14px 0;
            padding: 10px 18px;
            border-radius: 0 8px 8px 0;
            color: var(--text-muted);
            font-style: italic;
        }
        .ap-content pre {
            background: #0f172a;
            color: #e2e8f0;
            padding: 16px 20px;
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            overflow-x: auto;
            margin: 14px 0;
            line-height: 1.6;
        }
        .ap-content code {
            background: var(--surface-3);
            padding: 2px 6px;
            border-radius: 5px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #be185d;
        }
        .ap-content a { color: var(--primary); text-decoration: underline; }
        .ap-content hr {
            border: none; border-top: 1px solid var(--border);
            margin: 20px 0;
        }
        .ap-content .ap-table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 14px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 0 1px var(--border);
        }
        .ap-content .ap-table th,
        .ap-content .ap-table td {
            border: 1px solid var(--border);
            padding: 9px 13px;
            text-align: left;
        }
        .ap-content .ap-table th {
            background: var(--surface-2);
            font-weight: 700;
            color: var(--text-main);
        }
        .ap-content .ap-checklist {
            list-style: none;
            padding-left: 6px;
        }
        .ap-content .ap-checklist li {
            display: flex; align-items: center; gap: 10px;
        }
        .ap-content .ap-checklist input[type="checkbox"] {
            width: 16px; height: 16px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        /* ── Footer del editor ── */
        .ap-editor-foot {
            padding: 9px 22px;
            border-top: 1px solid var(--border);
            background: var(--surface);
            font-size: 11px;
            color: var(--text-muted);
            display: flex; align-items: center; gap: 10px;
            flex-shrink: 0;
        }
        .ap-foot-sep { opacity: .6; }
        .ap-save-dot {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #10b981;
            margin-right: 5px;
            vertical-align: middle;
        }
        .ap-save-dot.saving {
            background: #f59e0b;
            animation: apPulse 1s ease-in-out infinite;
        }
        @keyframes apPulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }

        /* ════════════════════════════════════════════════════════
           MODAL DE EDICIÓN DE CARPETA
           ════════════════════════════════════════════════════════ */
        .ap-modal-overlay {
            position: fixed; inset: 0; z-index: var(--z-notes-modal);
            background: rgba(8,12,24,.55);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .22s ease;
        }
        .ap-modal-overlay.show { opacity: 1; }
        .ap-modal {
            background: var(--surface);
            border-radius: 14px;
            width: min(440px, 92%);
            box-shadow: 0 30px 80px rgba(0,0,0,.35);
            transform: scale(.94); transition: transform .25s cubic-bezier(.34,1.4,.64,1);
            /* Mismo patrón que el resto de diálogos: el alto se limita a la
               ventana visible y lo que sobra se desplaza por dentro, para
               que el pie con los botones nunca quede fuera de pantalla. */
            max-height: calc(var(--vh-util) * 0.9 - env(safe-area-inset-bottom, 0px));
            display: flex; flex-direction: column;
            overflow: hidden;
        }
        .ap-modal-overlay.show .ap-modal { transform: scale(1); }
        .ap-modal-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .ap-modal-hdr h3 { font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0; }
        .ap-modal-body {
            padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;
            overflow-y: auto;
        }
        .ap-field { display: flex; flex-direction: column; gap: 6px; }
        .ap-field-lbl {
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .4px;
            color: var(--text-muted);
        }
        .ap-field input {
            padding: 9px 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 13px;
            background: var(--surface-2);
            color: var(--text-main);
            outline: none;
            font-family: inherit;
        }
        .ap-field input:focus { border-color: var(--primary); }
        .ap-color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .ap-color-dot {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            transition: transform .15s ease, border-color .15s ease;
        }
        .ap-color-dot:hover { transform: scale(1.15); }
        .ap-color-dot.active { border-color: var(--text-main); transform: scale(1.15); }
        .ap-modal-ftr {
            padding: 14px 20px;
            border-top: 1px solid var(--border);
            display: flex; align-items: center; gap: 8px;
            background: var(--surface-2);
        }

        /* ════════════════════════════════════════════════════════
           RESPONSIVE
           ════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
            .ap-content { padding: 36px 40px; margin: 18px; }
            .ap-editor-top { padding: 18px 22px 0; }
            .ap-tags-row { padding: 8px 22px 12px; }
        }
        @media (max-width: 768px) {
            .ap-editor-title { font-size: 24px; }
            .ap-toolbar { padding: 6px 12px; gap: 4px; }
            .ap-tb-font { min-width: 90px; font-size: 11px; }
            .ap-tb-block { min-width: 90px; }
            .ap-content { padding: 24px 22px; margin: 12px; }
        }
        @media (max-width: 600px) {
            .ap-tb-font, .ap-tb-block { display: none; }
            .ap-editor-top { padding: 14px 16px 0; }
            .ap-tags-row { padding: 6px 16px 10px; }
        }

        /* El botón de volver solo tiene sentido en la vista por niveles */
        .ap-back-btn { display: none; }

        /* ════════════════════════════════════════════════════════
           APUNTES EN TELÉFONO — navegación por niveles
           Los tres paneles (carpetas · lista · editor) no caben uno al
           lado de otro en una pantalla estrecha. Aquí se recorre por
           niveles, como una app de notas:
             Nivel 1 → carpetas en tira + lista de notas
             Nivel 2 → el editor ocupa toda el área, con botón atrás
           La clase .ap-editing (la pone selectNote) decide cuál se ve.
           En escritorio nada de esto aplica: siguen los tres paneles.
           ════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
            .nws-apuntes { flex-direction: column; }

            /* Carpetas: de panel lateral de 230px a tira horizontal.
               El max-height:35vh que la regla global de 900px aplica a
               todo .nws-side se anula aquí: en una tira sobra, y en la
               lista de notas la dejaría recortada a un tercio de alto. */
            .nws-apuntes .nws-side:first-child {
                width: 100%;
                max-height: none;
                flex-direction: row;
                align-items: center;
                flex-shrink: 0;
                border-right: none;
                border-bottom: 1px solid var(--border);
            }
            .nws-apuntes .nws-side:first-child .nws-side-hdr {
                border-bottom: none;
                border-right: 1px solid var(--border);
                padding: 8px 10px;
                flex-shrink: 0;
            }
            /* El rótulo "Carpetas" sobra: el botón + ya se entiende */
            .nws-apuntes .nws-side:first-child .nws-side-title { display: none; }
            .nws-apuntes .nws-side:first-child .nws-side-list {
                flex-direction: row;
                overflow-x: auto;
                overflow-y: hidden;
                gap: 6px;
                padding: 8px 10px;
            }
            .nws-apuntes .nws-side:first-child .nws-side-list > * {
                flex-shrink: 0;
                white-space: nowrap;
            }

            /* Carpetas como pastillas: en fila, la franja de color a la
               izquierda de la versión de escritorio no se lee. */
            .nws-apuntes .nws-side:first-child .ap-folder {
                padding: 7px 12px;
                border: 1px solid var(--border);
                border-radius: 20px;
                background: var(--surface);
                gap: 8px;
            }
            .nws-apuntes .nws-side:first-child .ap-folder.active {
                box-shadow: none;
                border-color: var(--c);
                background: color-mix(in srgb, var(--c) 14%, var(--surface));
            }
            /* El lápiz de renombrar dependía de hover, así que en una
               pantalla táctil no había manera de llegar a él. */
            .nws-apuntes .ap-folder-edit { opacity: 1; }

            /* Lista de notas: ocupa el resto del alto */
            .nws-apuntes .ap-notes-side {
                width: 100%;
                max-height: none;
                flex: 1;
                min-height: 0;
                border-right: none;
            }

            /* Nivel 2: el editor sale del marco de la app y ocupa la
               pantalla entera, como si fuera una app de notas aparte.
               position:fixed lo saca de .nw-content (que recorta con
               overflow:hidden) y de la tarjeta, la cabecera y las pestañas. */
            .nws-apuntes .nws-main { display: none; }
            .nws-apuntes.ap-editing .nws-main {
                display: flex;
                flex-direction: column;
                position: fixed;
                inset: 0;
                z-index: var(--z-sheet);
                min-height: 0;
                background: var(--surface);
            }
            /* El área de escritura necesita poder encogerse para que su
               propio scroll funcione dentro del panel fijo. */
            .nws-apuntes.ap-editing .ap-scroll-area { min-height: 0; }

            /* El modo enfocado es de escritorio; aquí manda .ap-editing,
               y sin esto una sesión que lo dejó activo escondería los
               paneles sin forma de recuperarlos. */
            .nws-apuntes.ap-focus > .nws-side { display: flex !important; }
            .nws-apuntes.ap-editing > .nws-side { display: none !important; }
            .ap-focus-restore,
            .ap-focus-btn { display: none !important; }

            .ap-back-btn { display: inline-flex; }

            /* Objetivos táctiles más cómodos en la lista */
            .nws-apuntes .ap-notes-side .nws-side-list { padding: 8px; }
        }
    `;
    document.head.appendChild(s);
}
