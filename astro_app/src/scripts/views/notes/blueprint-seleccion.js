// ════════════════════════════════════════════════════════════════
//  PLANOS · Qué figura hay bajo un punto
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { distPointToSegment, pointInPolygon, shapeBounds } from './blueprint-geometry.js';
import { _ctx } from './blueprint-estado.js';

export function findShapeAt(x, y) {
    for (let i = _ctx.shapes.length - 1; i >= 0; i--) {
        if (shapeHit(_ctx.shapes[i], x, y)) return i;
    }
    return -1;
}

// Hit-test PRECISO: solo devuelve true si el click es realmente sobre la figura
function shapeHit(s, x, y) {
    const tol = 6 / (_ctx?.view?.zoom || 1);

    if (s.type === 'line' || s.type === 'arrow') {
        return distPointToSegment({ x, y }, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) < tol;
    }
    if (s.type === 'rect') {
        const x1 = Math.min(s.x, s.x + s.w), x2 = Math.max(s.x, s.x + s.w);
        const y1 = Math.min(s.y, s.y + s.h), y2 = Math.max(s.y, s.y + s.h);
        const outer  = x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
        const inner  = x >= x1 + tol && x <= x2 - tol && y >= y1 + tol && y <= y2 - tol;
        return s.fill ? outer : (outer && !inner);
    }
    if (s.type === 'circle') {
        const d = Math.hypot(x - s.cx, y - s.cy);
        return s.fill ? d <= s.r + tol : Math.abs(d - s.r) < tol;
    }
    if (s.type === 'ellipse') {
        // Test elíptico
        const nx = (x - s.cx) / (s.rx || 1);
        const ny = (y - s.cy) / (s.ry || 1);
        const d = Math.hypot(nx, ny);
        const t = tol / Math.min(s.rx || 1, s.ry || 1);
        return s.fill ? d <= 1 + t : Math.abs(d - 1) < t;
    }
    if (s.type === 'triangle') {
        const p1 = { x: s.x + s.w / 2, y: s.y };
        const p2 = { x: s.x + s.w, y: s.y + s.h };
        const p3 = { x: s.x, y: s.y + s.h };
        if (distPointToSegment({ x, y }, p1, p2) < tol) return true;
        if (distPointToSegment({ x, y }, p2, p3) < tol) return true;
        if (distPointToSegment({ x, y }, p3, p1) < tol) return true;
        if (s.fill && pointInPolygon({ x, y }, [p1, p2, p3])) return true;
        return false;
    }
    if (s.type === 'polyline' || s.type === 'polygon' || s.type === 'pen') {
        if (!s.points?.length) return false;
        for (let i = 1; i < s.points.length; i++) {
            if (distPointToSegment({ x, y }, s.points[i - 1], s.points[i]) < tol) return true;
        }
        if (s.closed && s.points.length > 1) {
            if (distPointToSegment({ x, y }, s.points[s.points.length - 1], s.points[0]) < tol) return true;
            if (s.fill && pointInPolygon({ x, y }, s.points)) return true;
        }
        return false;
    }
    if (s.type === 'text' || s.type === 'symbol') {
        const b = shapeBounds(s);
        if (!b) return false;
        return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    }
    return false;
}

// ────────────────────────────────────────────────────────────────
//  Indicador visual de ángulo (estilo trigonometría/AutoCAD)
// ────────────────────────────────────────────────────────────────
export function findIncomingLineDirection(point) {
    // Busca una línea cuyo extremo coincida con `point`. Devuelve la
    // dirección que apunta HACIA el vértice (entrante al punto).
    const tol = 0.5;
    for (let i = _ctx.shapes.length - 1; i >= 0; i--) {
        const s = _ctx.shapes[i];
        if (s.type !== 'line' && s.type !== 'arrow') continue;
        if (Math.abs(s.x2 - point.x) < tol && Math.abs(s.y2 - point.y) < tol) {
            return Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        }
        if (Math.abs(s.x1 - point.x) < tol && Math.abs(s.y1 - point.y) < tol) {
            return Math.atan2(s.y1 - s.y2, s.x1 - s.x2);
        }
    }
    return null;
}
