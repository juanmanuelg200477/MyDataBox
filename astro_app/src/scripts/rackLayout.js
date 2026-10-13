// ─────────────────────────────────────────────────────────────
// DISPOSICIÓN DE UN BASTIDOR — qué U ocupa cada equipo.
//
// Los equipos montados viven en rack.slots con su U más baja como
// clave. Miden 1U salvo que lleven `uHeight` (2, 3…): entonces ocupan
// desde esa U hacia arriba. Un organizador con clave 10 y uHeight 2
// ocupa la 10U y la 11U.
//
// Aquí solo hay cálculo, nada de DOM: lo usan la vista del bastidor
// (desplazar y cambiar tamaño) y los conteos de ocupación del
// dashboard y del listado de bastidores.
// ─────────────────────────────────────────────────────────────

export function unitHeight(dev) {
    const h = parseInt(dev?.uHeight, 10);
    return h > 1 ? h : 1;
}

export function rackTotalU(rack) {
    return parseInt(rack?.height, 10) || 42;
}

// Reparte las U del bastidor entre sus equipos.
//   items → { key, dev, base, top } por equipo (key = su clave en slots)
//   owner → owner[u] = el item que ocupa esa U, o null
// Si por datos viejos dos equipos se pisaran, la U se la queda el de
// más arriba y al otro se le recorta lo que pisa: nunca se dibujan
// encimados ni se pierde ninguno de vista.
export function rackLayout(rack) {
    const total = rackTotalU(rack);
    const owner = new Array(total + 1).fill(null);
    const items = [];

    const porArriba = Object.entries(rack?.slots ?? {})
        .map(([key, dev]) => ({ key, dev, base: parseInt(key, 10) }))
        .filter(it => it.base >= 1 && it.base <= total)
        .sort((a, b) => b.base - a.base);

    for (const it of porArriba) {
        let top = Math.min(it.base + unitHeight(it.dev) - 1, total);
        for (let u = it.base; u <= top; u++) {
            if (owner[u]) { top = u - 1; break; }
        }
        if (top < it.base) continue;
        it.top = top;
        for (let u = it.base; u <= top; u++) owner[u] = it;
        items.push(it);
    }
    return { total, items, owner };
}

export const spanOf = (it) => it.top - it.base + 1;

// U ocupadas (no equipos): es lo que mide el uso de espacio.
export function usedUnits(rack) {
    return rackLayout(rack).items.reduce((s, it) => s + spanOf(it), 0);
}

// "10U" o "10U–11U"
export function rangeLabel(base, h) {
    return h > 1 ? `${base}U–${base + h - 1}U` : `${base}U`;
}

// ¿[base, base+h-1] cabe en el bastidor sin pisar a nadie salvo a `ignorar`?
function rangeFree(layout, base, h, ignorar) {
    if (base < 1 || base + h - 1 > layout.total) return false;
    for (let u = base; u < base + h; u++) {
        const o = layout.owner[u];
        if (o && !ignorar.includes(o)) return false;
    }
    return true;
}

// Qué pasa si `item` se suelta apuntando a la U `u`:
//   · U libre → se mueve ahí: su parte de arriba en esa U o, si así no
//     cabe, su base en esa U.
//   · U de otro equipo → intercambian posiciones. Si miden distinto, se
//     prueba alinearlos por abajo y por arriba hasta que quepan los dos.
// Devuelve { type: 'same' | 'move' | 'swap' | 'invalid', ... }.
export function planMove(layout, item, u) {
    const h = spanOf(item);
    const other = layout.owner[u];
    if (other === item) return { type: 'same' };

    if (!other) {
        for (const base of [u - h + 1, u]) {
            if (rangeFree(layout, base, h, [item])) return { type: 'move', base };
        }
        return { type: 'invalid', reason: `Ahí no hay ${h} U libres seguidas` };
    }

    const ho = spanOf(other);
    for (const base of [other.base, other.top - h + 1]) {
        for (const otherBase of [item.base, item.top - ho + 1]) {
            const separados = base + h - 1 < otherBase || otherBase + ho - 1 < base;
            if (separados
                && rangeFree(layout, base, h, [item, other])
                && rangeFree(layout, otherBase, ho, [item, other])) {
                return { type: 'swap', base, other, otherBase };
            }
        }
    }
    return { type: 'invalid', reason: `No caben al intercambiarse con ${other.dev.name}` };
}

// Qué se puede hacer con `item` si ahora ocupa [base, base+h-1].
// Cada valor es null si se puede, o el motivo si no.
export function resizeLimits(layout, item, base, h) {
    const bloqueo = (u) => {
        if (u > layout.total) return 'Ya llega al tope del bastidor';
        if (u < 1) return 'Ya llega a la 1U';
        const o = layout.owner[u];
        return o && o !== item ? `Ocupada por ${o.dev.name}` : null;
    };
    return {
        growUp:     bloqueo(base + h),
        growDown:   bloqueo(base - 1),
        shrinkUp:   h > 1 ? null : 'Ya mide 1U',
        shrinkDown: h > 1 ? null : 'Ya mide 1U'
    };
}

// Aplica cambios de posición o tamaño a rack.slots. Se quitan todos y
// luego se ponen, para que un intercambio no se pise a sí mismo.
// Devuelve las claves viejas → nuevas de los que cambiaron de U base.
export function applyRackChanges(rack, cambios) {
    const movidas = new Map();
    for (const c of cambios) delete rack.slots[c.item.key];
    for (const c of cambios) {
        if (c.height > 1) c.item.dev.uHeight = c.height;
        else delete c.item.dev.uHeight;
        rack.slots[c.base] = c.item.dev;
        if (String(c.base) !== String(c.item.key)) movidas.set(String(c.item.key), String(c.base));
    }
    return movidas;
}
