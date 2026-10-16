// ════════════════════════════════════════════════════════════════
//  PLANOS · Exportar a PNG y SVG
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { getDrawing } from '../../notesStore.js';
import { toast, escapeHtml } from './notesApp.js';
import { boundsAll } from './blueprint-geometry.js';
import { _ctx } from './blueprint-estado.js';

// ────────────────────────────────────────────────────────────────
//  Export
// ────────────────────────────────────────────────────────────────
export function exportPNG(canvas) {
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = getDrawing(_ctx.activeDrawingId);
        a.download = `${(d?.name || 'plano').replace(/[^a-z0-9]/gi, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast('PNG exportado', 'success');
    });
}

export function exportSVG() {
    const d = getDrawing(_ctx.activeDrawingId);
    const b = boundsAll(_ctx.shapes) || { x: 0, y: 0, w: 800, h: 600 };
    const pad = 20;
    const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;

    const parts = _ctx.shapes.map(s => {
        const stroke = s.stroke || '#0f172a';
        const sw = s.strokeWidth || 2;
        const fill = s.fill || 'none';
        if (s.type === 'rect') return `<rect x="${Math.min(s.x, s.x + s.w)}" y="${Math.min(s.y, s.y + s.h)}" width="${Math.abs(s.w)}" height="${Math.abs(s.h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'ellipse') return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'triangle') return `<polygon points="${s.x + s.w/2},${s.y} ${s.x + s.w},${s.y + s.h} ${s.x},${s.y + s.h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
        if (s.type === 'arrow') return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${stroke}" stroke-width="${sw}" marker-end="url(#arrow)"/>`;
        if (s.type === 'polyline' || s.type === 'polygon' || s.type === 'pen') {
            const pts = s.points.map(p => `${p.x},${p.y}`).join(' ');
            const tag = (s.type === 'polygon' && s.closed) ? 'polygon' : 'polyline';
            return `<${tag} points="${pts}" fill="${(s.closed && s.fill) ? s.fill : 'none'}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        if (s.type === 'text') return `<text x="${s.x}" y="${s.y + (s.size || 14)}" font-family="DM Sans, sans-serif" font-size="${s.size || 14}" fill="${s.color || '#0f172a'}">${escapeHtml(s.text)}</text>`;
        if (s.type === 'symbol') return `<g><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="white" stroke="${stroke}" stroke-width="${sw}"/><text x="${s.x + s.w/2}" y="${s.y + s.h/2 + 5}" font-size="${Math.max(8, s.h * 0.15)}" text-anchor="middle" fill="${stroke}">${s.symbolId}</text></g>`;
        return '';
    }).join('\n  ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${b.w + pad * 2}" height="${b.h + pad * 2}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" fill="#fefcf7"/>
  ${parts}
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(d?.name || 'plano').replace(/[^a-z0-9]/gi, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast('SVG exportado', 'success');
}
