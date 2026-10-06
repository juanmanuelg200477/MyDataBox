// ════════════════════════════════════════════════════════════════
//  PLANOS · Geometría (funciones puras)
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

export function shapeBounds(s) {
    if (s.type === 'line') return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    if (s.type === 'rect') return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
    if (s.type === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 };
    if (s.type === 'ellipse') return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
    if (s.type === 'triangle') return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
    if (s.type === 'arrow') return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    if (s.type === 'polyline' || s.type === 'polygon' || s.type === 'pen') {
        if (!s.points?.length) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        s.points.forEach(p => {
            if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
        });
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    if (s.type === 'text') return { x: s.x, y: s.y, w: (s.text?.length || 1) * (s.size || 14) * 0.6, h: (s.size || 14) * 1.2 };
    if (s.type === 'symbol') return { x: s.x, y: s.y, w: s.w, h: s.h };
    return null;
}

export function boundsAll(shapes) {
    if (!shapes.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(s => {
        const b = shapeBounds(s); if (!b) return;
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.w > maxX) maxX = b.x + b.w;
        if (b.y + b.h > maxY) maxY = b.y + b.h;
    });
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function distPointToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function pointInPolygon(p, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        const intersect = ((yi > p.y) !== (yj > p.y)) &&
                          (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function translateShape(sh, orig, dx, dy) {
    if (sh.type === 'rect' || sh.type === 'triangle' || sh.type === 'symbol' || sh.type === 'text') { sh.x = orig.x + dx; sh.y = orig.y + dy; }
    else if (sh.type === 'circle' || sh.type === 'ellipse') { sh.cx = orig.cx + dx; sh.cy = orig.cy + dy; }
    else if (sh.type === 'line' || sh.type === 'arrow') { sh.x1 = orig.x1 + dx; sh.y1 = orig.y1 + dy; sh.x2 = orig.x2 + dx; sh.y2 = orig.y2 + dy; }
    else if (sh.type === 'polyline' || sh.type === 'polygon' || sh.type === 'pen') {
        sh.points = orig.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
}

export function getHandles(s) {
    const h = [];
    if (s.type === 'rect' || s.type === 'triangle' || s.type === 'symbol') {
        const x1 = Math.min(s.x, s.x + s.w), x2 = Math.max(s.x, s.x + s.w);
        const y1 = Math.min(s.y, s.y + s.h), y2 = Math.max(s.y, s.y + s.h);
        const xm = (x1 + x2) / 2, ym = (y1 + y2) / 2;
        h.push({ x: x1, y: y1, type: 'corner-tl', cursor: 'nwse-resize' });
        h.push({ x: x2, y: y1, type: 'corner-tr', cursor: 'nesw-resize' });
        h.push({ x: x2, y: y2, type: 'corner-br', cursor: 'nwse-resize' });
        h.push({ x: x1, y: y2, type: 'corner-bl', cursor: 'nesw-resize' });
        h.push({ x: xm, y: y1, type: 'edge-t',    cursor: 'ns-resize' });
        h.push({ x: x2, y: ym, type: 'edge-r',    cursor: 'ew-resize' });
        h.push({ x: xm, y: y2, type: 'edge-b',    cursor: 'ns-resize' });
        h.push({ x: x1, y: ym, type: 'edge-l',    cursor: 'ew-resize' });
    } else if (s.type === 'circle') {
        h.push({ x: s.cx + s.r, y: s.cy, type: 'radius-r', cursor: 'ew-resize' });
        h.push({ x: s.cx, y: s.cy + s.r, type: 'radius-b', cursor: 'ns-resize' });
        h.push({ x: s.cx - s.r, y: s.cy, type: 'radius-l', cursor: 'ew-resize' });
        h.push({ x: s.cx, y: s.cy - s.r, type: 'radius-t', cursor: 'ns-resize' });
    } else if (s.type === 'ellipse') {
        h.push({ x: s.cx + s.rx, y: s.cy, type: 'rx-r', cursor: 'ew-resize' });
        h.push({ x: s.cx - s.rx, y: s.cy, type: 'rx-l', cursor: 'ew-resize' });
        h.push({ x: s.cx, y: s.cy + s.ry, type: 'ry-b', cursor: 'ns-resize' });
        h.push({ x: s.cx, y: s.cy - s.ry, type: 'ry-t', cursor: 'ns-resize' });
    } else if (s.type === 'line' || s.type === 'arrow') {
        h.push({ x: s.x1, y: s.y1, type: 'start', cursor: 'move' });
        h.push({ x: s.x2, y: s.y2, type: 'end',   cursor: 'move' });
    } else if (s.type === 'polyline' || s.type === 'polygon') {
        s.points.forEach((p, i) => h.push({ x: p.x, y: p.y, type: 'vertex', index: i, cursor: 'move' }));
    } else if (s.type === 'text') {
        // Para texto solo el origen
        h.push({ x: s.x, y: s.y, type: 'origin', cursor: 'move' });
    }
    return h;
}

export function moveHandle(sh, orig, hi, wx, wy) {
    const handles = getHandles(orig);
    const h = handles[hi];
    if (!h) return;

    if (sh.type === 'rect' || sh.type === 'triangle' || sh.type === 'symbol') {
        const ox1 = Math.min(orig.x, orig.x + orig.w);
        const oy1 = Math.min(orig.y, orig.y + orig.h);
        const ox2 = Math.max(orig.x, orig.x + orig.w);
        const oy2 = Math.max(orig.y, orig.y + orig.h);
        let nx1 = ox1, ny1 = oy1, nx2 = ox2, ny2 = oy2;
        switch (h.type) {
            case 'corner-tl': nx1 = wx; ny1 = wy; break;
            case 'corner-tr': nx2 = wx; ny1 = wy; break;
            case 'corner-br': nx2 = wx; ny2 = wy; break;
            case 'corner-bl': nx1 = wx; ny2 = wy; break;
            case 'edge-t':    ny1 = wy; break;
            case 'edge-r':    nx2 = wx; break;
            case 'edge-b':    ny2 = wy; break;
            case 'edge-l':    nx1 = wx; break;
        }
        sh.x = nx1; sh.y = ny1;
        sh.w = nx2 - nx1; sh.h = ny2 - ny1;
    } else if (sh.type === 'circle') {
        sh.r = Math.max(2, Math.hypot(wx - orig.cx, wy - orig.cy));
    } else if (sh.type === 'ellipse') {
        if (h.type === 'rx-r' || h.type === 'rx-l') sh.rx = Math.max(2, Math.abs(wx - orig.cx));
        if (h.type === 'ry-b' || h.type === 'ry-t') sh.ry = Math.max(2, Math.abs(wy - orig.cy));
    } else if (sh.type === 'line' || sh.type === 'arrow') {
        if (h.type === 'start') { sh.x1 = wx; sh.y1 = wy; }
        if (h.type === 'end')   { sh.x2 = wx; sh.y2 = wy; }
    } else if (sh.type === 'polyline' || sh.type === 'polygon') {
        if (h.type === 'vertex') {
            sh.points = orig.points.map((p, i) => i === h.index ? { x: wx, y: wy } : p);
        }
    } else if (sh.type === 'text') {
        sh.x = wx; sh.y = wy;
    }
}
