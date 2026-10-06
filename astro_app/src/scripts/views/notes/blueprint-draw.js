// ════════════════════════════════════════════════════════════════
//  PLANOS · Primitivas de dibujo (funciones puras)
//  Extraído de blueprint-section.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════

export function drawSymbol(ctx, id, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(1.2, ctx.lineWidth);
    const cx = x + w / 2, cy = y + h / 2;

    switch (id) {
        case 'router': {
            // Disco con 4 flechas
            ctx.beginPath();
            roundRect(ctx, x + 2, y + h * 0.35, w - 4, h * 0.5, 6);
            ctx.fill(); ctx.stroke();
            const a = w * 0.18;
            ctx.beginPath();
            ctx.moveTo(cx - a, cy); ctx.lineTo(cx + a, cy);
            ctx.moveTo(cx, cy - h * 0.18); ctx.lineTo(cx, cy + h * 0.18);
            ctx.stroke();
            // Flechas
            ctx.beginPath();
            arrowHead(ctx, cx + a, cy, 0, 5);
            arrowHead(ctx, cx - a, cy, Math.PI, 5);
            arrowHead(ctx, cx, cy + h * 0.18, Math.PI / 2, 5);
            arrowHead(ctx, cx, cy - h * 0.18, -Math.PI / 2, 5);
            ctx.fillStyle = color; ctx.fill();
            break;
        }
        case 'switch': {
            // Rectángulo con puertos
            ctx.beginPath();
            roundRect(ctx, x + 2, y + h * 0.3, w - 4, h * 0.4, 4);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // 6 puertos
            const ports = 6;
            const portW = (w - 14) / ports;
            for (let i = 0; i < ports; i++) {
                const px = x + 7 + i * portW;
                ctx.fillStyle = '#fff';
                ctx.fillRect(px, y + h * 0.45, portW - 2, h * 0.18);
                ctx.strokeRect(px, y + h * 0.45, portW - 2, h * 0.18);
            }
            break;
        }
        case 'firewall': {
            // Pared con llamas
            ctx.beginPath();
            roundRect(ctx, x + 4, y + h * 0.25, w - 8, h * 0.55, 3);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Ladrillos
            const brickH = (h * 0.55) / 3;
            for (let i = 0; i < 3; i++) {
                const yy = y + h * 0.25 + i * brickH;
                ctx.beginPath();
                ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy);
                ctx.stroke();
                const offset = i % 2 === 0 ? 0 : (w - 8) / 4;
                for (let j = 0; j < 2; j++) {
                    const vx = x + 4 + offset + (j + 1) * ((w - 8) / 2);
                    ctx.beginPath();
                    ctx.moveTo(vx, yy);
                    ctx.lineTo(vx, yy + brickH);
                    ctx.stroke();
                }
            }
            // Llama arriba
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.1, y + h * 0.22);
            ctx.quadraticCurveTo(cx, y + h * 0.05, cx + w * 0.1, y + h * 0.22);
            ctx.fillStyle = color; ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
        }
        case 'modem': {
            // Caja chata con leds
            ctx.beginPath();
            roundRect(ctx, x + 2, y + h * 0.35, w - 4, h * 0.4, 3);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = color;
                ctx.fillRect(x + 6 + i * 7, y + h * 0.5, 3, 3);
            }
            // Antena
            ctx.beginPath();
            ctx.moveTo(x + w - 8, y + h * 0.35);
            ctx.lineTo(x + w - 8, y + h * 0.15);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + w - 8, y + h * 0.13, 2, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            break;
        }
        case 'server': {
            // Servidor rack (vertical, varios slots)
            ctx.beginPath();
            roundRect(ctx, x + w * 0.2, y + 2, w * 0.6, h - 4, 4);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            const slots = 5;
            for (let i = 0; i < slots; i++) {
                const yy = y + 6 + i * ((h - 12) / slots);
                ctx.beginPath();
                ctx.moveTo(x + w * 0.22, yy);
                ctx.lineTo(x + w * 0.78, yy);
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x + w * 0.75, yy + 3, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 'nvr': {
            // Caja gris con NVR label
            ctx.beginPath();
            roundRect(ctx, x + 2, y + h * 0.3, w - 4, h * 0.5, 4);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Pantalla pequeña
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(x + 6, y + h * 0.4, w - 12, h * 0.15);
            ctx.globalAlpha = 1;
            ctx.strokeRect(x + 6, y + h * 0.4, w - 12, h * 0.15);
            // Texto NVR
            ctx.fillStyle = color;
            ctx.font = `bold ${Math.max(7, h * 0.15)}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('NVR', cx, y + h * 0.7);
            ctx.textAlign = 'left';
            break;
        }
        case 'cam_dome': {
            // Domo: medio círculo + lente
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.65, w * 0.32, Math.PI, 0);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Lente
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.6, w * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - w * 0.04, y + h * 0.56, w * 0.04, 0, Math.PI * 2);
            ctx.fill();
            // Base
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.35, y + h * 0.66);
            ctx.lineTo(cx + w * 0.35, y + h * 0.66);
            ctx.stroke();
            break;
        }
        case 'cam_bullet': {
            // Cilindro horizontal con base + flecha de visión
            ctx.beginPath();
            roundRect(ctx, x + w * 0.15, y + h * 0.35, w * 0.55, h * 0.3, h * 0.15);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Lente
            ctx.beginPath();
            ctx.arc(x + w * 0.7, y + h * 0.5, h * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            // Soporte
            ctx.beginPath();
            ctx.moveTo(x + w * 0.4, y + h * 0.65);
            ctx.lineTo(x + w * 0.4, y + h * 0.85);
            ctx.lineTo(x + w * 0.2, y + h * 0.85);
            ctx.stroke();
            break;
        }
        case 'ap': {
            // Access point: disco con ondas wifi
            ctx.beginPath();
            ctx.ellipse(cx, y + h * 0.7, w * 0.35, h * 0.08, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Ondas
            ctx.strokeStyle = color;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(cx, y + h * 0.7, w * 0.15 * i, Math.PI, 0);
                ctx.globalAlpha = 1 - i * 0.18;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'antenna': {
            // Antena: triángulo + onda
            ctx.beginPath();
            ctx.moveTo(cx, y + h * 0.4);
            ctx.lineTo(cx - w * 0.18, y + h * 0.85);
            ctx.lineTo(cx + w * 0.18, y + h * 0.85);
            ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Onda
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.4, w * 0.18, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, y + h * 0.4, w * 0.28, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
            break;
        }
        case 'pc': {
            // Monitor + base
            ctx.beginPath();
            roundRect(ctx, x + w * 0.1, y + h * 0.15, w * 0.8, h * 0.5, 4);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            ctx.fillStyle = color; ctx.globalAlpha = 0.1;
            ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.4);
            ctx.globalAlpha = 1;
            // Soporte
            ctx.beginPath();
            ctx.moveTo(cx, y + h * 0.65);
            ctx.lineTo(cx, y + h * 0.78);
            ctx.moveTo(x + w * 0.3, y + h * 0.85);
            ctx.lineTo(x + w * 0.7, y + h * 0.85);
            ctx.stroke();
            break;
        }
        case 'laptop': {
            // Pantalla angulada + base
            ctx.beginPath();
            ctx.moveTo(x + w * 0.2, y + h * 0.6);
            ctx.lineTo(x + w * 0.3, y + h * 0.2);
            ctx.lineTo(x + w * 0.7, y + h * 0.2);
            ctx.lineTo(x + w * 0.8, y + h * 0.6);
            ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Base
            ctx.beginPath();
            ctx.moveTo(x + w * 0.1, y + h * 0.6);
            ctx.lineTo(x + w * 0.9, y + h * 0.6);
            ctx.lineTo(x + w * 0.85, y + h * 0.75);
            ctx.lineTo(x + w * 0.15, y + h * 0.75);
            ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            break;
        }
        case 'phone': {
            // Handset + base
            ctx.beginPath();
            roundRect(ctx, x + w * 0.15, y + h * 0.45, w * 0.7, h * 0.4, 5);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Handset arriba
            ctx.beginPath();
            ctx.moveTo(x + w * 0.25, y + h * 0.3);
            ctx.quadraticCurveTo(cx, y + h * 0.1, x + w * 0.75, y + h * 0.3);
            ctx.lineWidth = ctx.lineWidth * 1.6;
            ctx.stroke();
            ctx.lineWidth = ctx.lineWidth / 1.6;
            // Botones
            ctx.fillStyle = color;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(x + w * 0.3 + j * w * 0.2, y + h * 0.58 + i * h * 0.08, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
        }
        case 'printer': {
            // Caja con bandeja
            ctx.beginPath();
            roundRect(ctx, x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.4, 3);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Papel saliendo
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.2);
            ctx.strokeRect(x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.2);
            // Bandeja inferior
            ctx.beginPath();
            ctx.moveTo(x + w * 0.18, y + h * 0.7);
            ctx.lineTo(x + w * 0.82, y + h * 0.7);
            ctx.lineTo(x + w * 0.75, y + h * 0.85);
            ctx.lineTo(x + w * 0.25, y + h * 0.85);
            ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            break;
        }
        case 'rack': {
            // Gabinete vertical con slots
            ctx.beginPath();
            roundRect(ctx, x + w * 0.2, y + 2, w * 0.6, h - 4, 3);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            const slots = 6;
            for (let i = 0; i < slots; i++) {
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.15;
                ctx.fillRect(x + w * 0.24, y + 5 + i * ((h - 10) / slots), w * 0.52, ((h - 10) / slots) - 2);
                ctx.globalAlpha = 1;
                ctx.strokeRect(x + w * 0.24, y + 5 + i * ((h - 10) / slots), w * 0.52, ((h - 10) / slots) - 2);
            }
            break;
        }
        case 'ups': {
            // Batería con rayo
            ctx.beginPath();
            roundRect(ctx, x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.6, 4);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Rayo
            ctx.beginPath();
            ctx.moveTo(cx + 2, y + h * 0.3);
            ctx.lineTo(cx - w * 0.05, y + h * 0.5);
            ctx.lineTo(cx + 2, y + h * 0.5);
            ctx.lineTo(cx - 2, y + h * 0.7);
            ctx.lineTo(cx + w * 0.08, y + h * 0.45);
            ctx.lineTo(cx, y + h * 0.45);
            ctx.lineTo(cx + 4, y + h * 0.3);
            ctx.closePath();
            ctx.fillStyle = color; ctx.fill();
            break;
        }
        case 'patch': {
            // Patch panel: rect con puertos
            ctx.beginPath();
            roundRect(ctx, x + 2, y + h * 0.35, w - 4, h * 0.3, 3);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            const ports = 12;
            const portW = (w - 12) / ports;
            for (let i = 0; i < ports; i++) {
                const px = x + 6 + i * portW;
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(px, y + h * 0.42, portW - 1, h * 0.16);
                ctx.globalAlpha = 1;
                ctx.strokeRect(px, y + h * 0.42, portW - 1, h * 0.16);
            }
            break;
        }
        case 'cloud': {
            // Nube clásica
            ctx.beginPath();
            ctx.arc(x + w * 0.3, y + h * 0.55, h * 0.22, Math.PI, Math.PI * 1.5);
            ctx.arc(x + w * 0.45, y + h * 0.42, h * 0.28, Math.PI * 1.3, Math.PI * 2);
            ctx.arc(x + w * 0.7, y + h * 0.5, h * 0.24, Math.PI * 1.8, Math.PI * 0.5);
            ctx.arc(x + w * 0.5, y + h * 0.7, h * 0.2, 0, Math.PI);
            ctx.closePath();
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            break;
        }
        case 'internet': {
            // Globo terráqueo
            ctx.beginPath();
            ctx.arc(cx, cy, Math.min(w, h) * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
            // Meridianos
            const r = Math.min(w, h) * 0.35;
            ctx.beginPath();
            ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
            ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 0.5, r, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        default: {
            ctx.beginPath();
            ctx.rect(x + 4, y + 4, w - 8, h - 8);
            ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        }
    }
    ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

export function arrowHead(ctx, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.restore();
}

export function drawArrow(ctx, x1, y1, x2, y2, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(8, width * 4);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(angle) * headLen * 0.7, y2 - Math.sin(angle) * headLen * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(angle - Math.PI / 6) * headLen, y2 - Math.sin(angle - Math.PI / 6) * headLen);
    ctx.lineTo(x2 - Math.cos(angle + Math.PI / 6) * headLen, y2 - Math.sin(angle + Math.PI / 6) * headLen);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
}
