// ════════════════════════════════════════════════════════════════
//  PLANOS · Estilos inyectados
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { RULER_SIZE } from './blueprint-section.js';

export function injectStyles() {
    if (document.getElementById('bp-styles')) return;
    const s = document.createElement('style');
    s.id = 'bp-styles';
    s.textContent = `
        .nws-bp .bp-sidebar { width: 260px; }
        .bp-side-empty {
            padding: 20px 14px; text-align: center;
            font-size: 12px; color: var(--text-muted);
            font-style: italic;
        }
        .bp-item {
            display: flex; align-items: center; gap: 10px;
            padding: 9px 11px; border-radius: 9px;
            cursor: pointer; transition: background .15s ease;
        }
        .bp-item:hover { background: var(--surface); }
        .bp-item.active {
            background: color-mix(in srgb, #f59e0b 8%, var(--surface));
            box-shadow: inset 3px 0 0 #f59e0b;
        }
        .bp-item-thumb {
            width: 50px; height: 36px;
            background: #fefcf7;
            border: 1px solid var(--border);
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            color: var(--text-muted);
            flex-shrink: 0;
            overflow: hidden;
        }
        .bp-item-thumb svg { width: 18px; height: 18px; }
        .bp-item-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .bp-item-body { flex: 1; min-width: 0; }
        .bp-item-name {
            font-size: 13px; font-weight: 600; color: var(--text-main);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .bp-item-meta {
            font-size: 10.5px; color: var(--text-muted);
            margin-top: 2px;
            font-family: 'JetBrains Mono', monospace;
        }
        .bp-item-del {
            opacity: 0; border: none; background: transparent;
            cursor: pointer; padding: 4px;
            color: var(--text-muted);
            transition: opacity .15s ease, color .15s ease;
        }
        .bp-item:hover .bp-item-del { opacity: 1; }
        .bp-item-del:hover { color: var(--danger); }
        .bp-item-del svg { width: 13px; height: 13px; }

        /* ════════════════════════════════════════════════════════ */
        #bp-editor { flex: 1; min-height: 0; display: flex; }
        .bp-editor {
            flex: 1; min-height: 0;
            display: flex; flex-direction: column;
            background: #f8fafc;
        }
        /* ── Fullscreen mode ── */
        .bp-editor.bp-fs {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: var(--z-fullscreen) !important;
            background: #f8fafc !important;
            margin: 0 !important;
            transform: none !important;
            isolation: isolate;
        }
        body.bp-fs-body { overflow: hidden; }
        /* En fullscreen los dropdowns deben quedar por encima */
        .bp-editor.bp-fs .bp-dropdown { z-index: 1000000; }

        /* ── TOP BAR ── */
        .bp-top {
            padding: 10px 16px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, var(--surface), var(--surface-2));
            display: flex; align-items: center; gap: 14px;
            flex-shrink: 0;
        }
        .bp-top-left { flex: 1; min-width: 0; }
        .bp-name-input {
            width: 100%;
            border: 1px solid transparent;
            background: transparent;
            font-size: 17px; font-weight: 700;
            color: var(--text-main);
            padding: 7px 10px;
            border-radius: 8px;
            outline: none;
            font-family: inherit;
            letter-spacing: -.3px;
        }
        .bp-name-input:hover, .bp-name-input:focus {
            border-color: var(--border);
            background: var(--surface);
        }
        .bp-top-right { display: flex; gap: 8px; flex-shrink: 0; }
        .bp-tg {
            display: flex; gap: 2px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 9px;
            padding: 3px;
        }
        .bp-tbtn {
            min-width: 32px; height: 30px;
            border: none; background: transparent;
            border-radius: 6px;
            cursor: pointer;
            color: var(--text-main);
            display: flex; align-items: center; justify-content: center;
            transition: all .12s ease;
            font-family: inherit;
            font-size: 11.5px; font-weight: 600;
            padding: 0 8px;
            gap: 5px;
        }
        .bp-tbtn:hover { background: var(--surface-3); }
        .bp-tbtn svg { width: 15px; height: 15px; }
        .bp-export:hover { background: var(--primary); color: #fff; }

        /* ── Workspace ── */
        .bp-workspace { flex: 1; min-height: 0; display: flex; }

        /* ── Toolbar lateral CAD ── */
        .bp-toolbar {
            width: 58px;
            background: linear-gradient(180deg, #1e293b, #0f172a);
            padding: 10px 8px;
            display: flex; flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
            border-right: 1px solid #0f172a;
            box-shadow: inset -2px 0 6px rgba(0,0,0,.2);
            position: relative;
            z-index: 2;
        }
        .bp-tool {
            position: relative;
            width: 42px; height: 42px;
            border: 1px solid transparent;
            background: transparent;
            border-radius: 9px;
            cursor: pointer;
            color: rgba(255,255,255,.55);
            display: flex; align-items: center; justify-content: center;
            transition: all .15s ease;
        }
        .bp-tool:hover {
            background: rgba(255,255,255,.06);
            color: #fff;
            transform: translateY(-1px);
        }
        .bp-tool.active {
            background: #f59e0b;
            color: #0f172a;
            border-color: #fbbf24;
            box-shadow: 0 4px 12px rgba(245, 158, 11, .4), 0 0 0 2px rgba(245, 158, 11, .15);
        }
        .bp-tool svg { width: 18px; height: 18px; }
        .bp-tool-preview {
            position: absolute; inset: 0;
            margin: auto;
            pointer-events: none;
        }
        .bp-tool-kbd {
            position: absolute;
            top: 2px; right: 4px;
            font-size: 8px; font-weight: 700;
            opacity: .5;
            font-family: 'JetBrains Mono', monospace;
        }
        .bp-tool.active .bp-tool-kbd { opacity: .8; }
        .bp-tool-caret {
            position: absolute;
            bottom: 2px; right: 2px;
            opacity: .45;
            display: flex;
        }
        .bp-tool-caret svg { width: 9px; height: 9px; }

        /* ── Dropdowns flotantes ── */
        .bp-dropdown {
            position: fixed;
            z-index: 200;
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 16px 50px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.02);
            padding: 10px;
            display: none;
            min-width: 280px;
            max-width: 340px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .bp-dropdown.open {
            display: block;
            animation: bpDdIn .15s cubic-bezier(.34,1.4,.64,1);
        }
        @keyframes bpDdIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        .bp-dd-title {
            font-size: 10.5px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .5px;
            color: var(--text-muted);
            padding: 4px 8px 8px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 6px;
        }
        .bp-dd-grid {
            display: flex; flex-direction: column; gap: 2px;
        }
        .bp-dd-item {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 10px;
            border-radius: 8px;
            border: none; background: transparent;
            cursor: pointer;
            text-align: left;
            font-family: inherit;
            transition: background .12s ease;
        }
        .bp-dd-item:hover { background: var(--surface-2); }
        .bp-dd-item svg {
            width: 22px; height: 22px;
            color: var(--text-main);
            flex-shrink: 0;
        }
        .bp-dd-info { display: flex; flex-direction: column; gap: 1px; }
        .bp-dd-name {
            font-size: 13px; font-weight: 600;
            color: var(--text-main);
        }
        .bp-dd-desc {
            font-size: 10.5px;
            color: var(--text-muted);
        }
        /* Symbols grid */
        .bp-dropdown-symbols {
            min-width: 340px;
            max-width: 380px;
        }
        .bp-dd-cat { margin-bottom: 10px; }
        .bp-dd-cat-name {
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .5px;
            color: var(--text-muted);
            padding: 6px 8px 4px;
        }
        .bp-dd-symbols-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
        }
        .bp-dd-symbol {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            padding: 8px 4px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: var(--surface-2);
            cursor: pointer;
            font-family: inherit;
            transition: all .12s ease;
        }
        .bp-dd-symbol:hover {
            background: var(--surface);
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,.06);
        }
        .bp-dd-sym-preview {
            width: 48px; height: 48px;
            display: flex; align-items: center; justify-content: center;
        }
        .bp-dd-sym-preview canvas { width: 48px; height: 48px; }
        .bp-dd-sym-name {
            font-size: 9.5px;
            color: var(--text-muted);
            text-align: center;
            line-height: 1.1;
            font-weight: 600;
        }

        /* ── Canvas area ── */
        .bp-canvas-area {
            flex: 1; min-width: 0;
            position: relative;
            display: grid;
            grid-template-columns: ${RULER_SIZE}px 1fr;
            grid-template-rows: ${RULER_SIZE}px 1fr;
            overflow: hidden;
        }
        .bp-canvas-area.no-rulers {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr;
        }
        .bp-canvas-area.no-rulers .bp-ruler,
        .bp-canvas-area.no-rulers .bp-ruler-corner { display: none; }
        .bp-canvas-area.no-rulers .bp-canvas-wrap { grid-column: 1; grid-row: 1; }
        .bp-ruler-corner {
            grid-column: 1; grid-row: 1;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: #f59e0b;
            display: flex; align-items: center; justify-content: center;
            border-right: 1px solid #334155;
            border-bottom: 1px solid #334155;
        }
        .bp-ruler-corner svg { width: 12px; height: 12px; }
        .bp-ruler { display: block; }
        .bp-ruler-x { grid-column: 2; grid-row: 1; border-bottom: 1px solid #334155; }
        .bp-ruler-y { grid-column: 1; grid-row: 2; border-right: 1px solid #334155; }
        .bp-canvas-wrap {
            grid-column: 2; grid-row: 2;
            position: relative;
            background: #fefcf7;
            overflow: hidden;
        }
        #bp-canvas { display: block; width: 100%; height: 100%; }

        /* Crosshair */
        .bp-crosshair {
            position: absolute; inset: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity .15s ease;
            z-index: 2;
        }
        .bp-crosshair-x, .bp-crosshair-y { position: absolute; background: rgba(59, 130, 246, .35); }
        .bp-crosshair-x { left: 0; right: 0; height: 1px; }
        .bp-crosshair-y { top: 0; bottom: 0; width: 1px; }

        /* Tooltip flotante de medidas */
        .bp-measure-tip {
            position: absolute;
            background: #0f172a;
            color: #f59e0b;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 10px;
            border-radius: 6px;
            pointer-events: none;
            z-index: 3;
            opacity: 0;
            transition: opacity .12s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
            white-space: nowrap;
        }
        .bp-measure-tip.show { opacity: 1; }

        /* Botón X de salir fullscreen */
        .bp-fullscreen-exit {
            position: absolute;
            top: 12px; right: 12px;
            width: 38px; height: 38px;
            border: none;
            background: #0f172a;
            color: #fff;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            align-items: center; justify-content: center;
            z-index: 100;
            box-shadow: 0 6px 18px rgba(0,0,0,.3);
            transition: all .18s ease;
        }
        .bp-editor.bp-fs .bp-fullscreen-exit { display: flex; }
        .bp-fullscreen-exit:hover {
            background: var(--danger);
            transform: scale(1.08) rotate(90deg);
        }
        .bp-fullscreen-exit svg { width: 18px; height: 18px; }

        /* Editor de texto inline */
        .bp-text-editor {
            position: absolute;
            min-width: 30px;
            min-height: 1em;
            padding: 2px 4px;
            outline: 2px dashed #3b82f6;
            outline-offset: 2px;
            background: rgba(59, 130, 246, .05);
            color: inherit;
            white-space: pre;
            line-height: 1.2;
            cursor: text;
            z-index: 4;
            font-family: 'DM Sans', sans-serif;
        }
        .bp-text-editor:empty::before {
            content: attr(data-placeholder);
            color: rgba(15,23,42,.35);
            font-style: italic;
        }

        /* ── Props panel ── */
        .bp-props {
            width: 250px;
            background: var(--surface);
            border-left: 1px solid var(--border);
            padding: 16px;
            overflow-y: auto;
            display: flex; flex-direction: column;
            gap: 18px;
            flex-shrink: 0;
        }
        .bp-props-section { display: flex; flex-direction: column; gap: 10px; }
        .bp-props-title {
            display: flex; align-items: center; gap: 7px;
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .5px;
            color: var(--text-muted);
            padding-bottom: 6px;
            border-bottom: 1px solid var(--border);
        }
        .bp-props-title svg { width: 13px; height: 13px; }
        .bp-color-row {
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            gap: 4px;
        }
        .bp-color {
            width: 100%; aspect-ratio: 1;
            border-radius: 5px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: transform .15s ease;
            padding: 0; position: relative;
        }
        .bp-color:hover { transform: scale(1.15); }
        .bp-color.active {
            border-color: var(--text-main);
            box-shadow: 0 0 0 2px var(--surface);
        }
        .bp-color-custom {
            background: conic-gradient(red, orange, yellow, green, cyan, blue, magenta, red);
            display: flex; align-items: center; justify-content: center;
            color: #fff; overflow: hidden;
        }
        .bp-color-custom input { display: none; }
        .bp-color-custom svg { width: 11px; height: 11px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
        .bp-check {
            display: flex; align-items: center; gap: 8px;
            font-size: 12.5px; color: var(--text-main);
            cursor: pointer;
        }
        .bp-check input { width: 15px; height: 15px; cursor: pointer; accent-color: var(--primary); }
        .bp-input-row {
            display: flex; align-items: center; gap: 8px;
            font-size: 12px; color: var(--text-muted);
        }
        .bp-input-row > span:first-child { width: 58px; flex-shrink: 0; }
        .bp-input-row input[type="range"] { flex: 1; accent-color: var(--primary); }
        .bp-input-row > span:last-child {
            min-width: 36px; text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: var(--text-main);
            font-weight: 600;
        }
        .bp-tip {
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: #cbd5e1;
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 11.5px;
            line-height: 1.6;
            position: relative;
            overflow: hidden;
        }
        .bp-tip::before {
            content: '';
            position: absolute; top:0; left:0; right:0; height:2px;
            background: linear-gradient(90deg, #f59e0b, #ef4444);
        }
        .bp-tip strong {
            display: block;
            color: #f59e0b;
            font-size: 10.5px;
            text-transform: uppercase; letter-spacing: .5px;
            margin-bottom: 8px;
        }
        .bp-tip ul { list-style: none; padding: 0; margin: 0; }
        .bp-tip li { padding: 3px 0; display: flex; gap: 8px; }
        .bp-tip kbd {
            background: rgba(255,255,255,.08);
            padding: 1px 6px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,.12);
            font-family: 'JetBrains Mono', monospace;
            font-size: 9.5px;
            color: #f59e0b;
            white-space: nowrap;
        }

        /* ── Status bar ── */
        .bp-status {
            background: linear-gradient(180deg, #0f172a, #020617);
            color: #cbd5e1;
            display: flex;
            font-size: 10.5px;
            font-family: 'JetBrains Mono', monospace;
            border-top: 1px solid #334155;
            flex-shrink: 0;
            box-shadow: 0 -2px 8px rgba(0,0,0,.15);
        }
        .bp-status-cell {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 16px;
            border-right: 1px solid #1e293b;
            flex-shrink: 0;
        }
        .bp-status-cell.bp-status-flex { flex: 1; }
        .bp-status-lbl {
            color: #64748b; font-weight: 700;
            font-size: 9px; letter-spacing: .6px;
        }
        .bp-status-cell > span:last-child { color: #fff; font-weight: 600; }
        .bp-status-tool > span:last-child { color: #f59e0b; }
        .bp-status-mode .bp-status-state {
            background: #334155; color: #94a3b8;
            padding: 2px 8px; border-radius: 4px;
            font-size: 9px; font-weight: 700;
        }
        .bp-status-mode.active .bp-status-state { background: #f59e0b; color: #0f172a; }
        .bp-status-dot {
            display: inline-block;
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #10b981;
            margin-right: 4px;
            vertical-align: middle;
            box-shadow: 0 0 6px rgba(16, 185, 129, .6);
        }
        .bp-status-dot.saving {
            background: #f59e0b;
            box-shadow: 0 0 6px rgba(245, 158, 11, .6);
            animation: bpPulse 1s ease-in-out infinite;
        }
        @keyframes bpPulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }

        /* ── Responsive ── */
        @media (max-width: 1280px) { .bp-props { width: 220px; } }
        @media (max-width: 1100px) { .bp-props { display: none; } }
        @media (max-width: 800px) {
            .bp-toolbar { width: 48px; padding: 8px 4px; }
            .bp-tool { width: 38px; height: 38px; }
            .bp-tool-kbd { display: none; }
            .bp-tbtn span { display: none; }
            .bp-status { font-size: 9.5px; overflow-x: auto; }
            .bp-status-cell { padding: 6px 10px; gap: 5px; }
            .bp-name-input { font-size: 14px; }
            .bp-dropdown { min-width: 240px; }
        }
    `;
    document.head.appendChild(s);
}
