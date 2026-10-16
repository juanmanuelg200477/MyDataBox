// ════════════════════════════════════════════════════════════════
//  EDITOR DE MAPAS — estado compartido
//
//  E es el editor abierto (null si no hay ninguno). Los demás módulos
//  lo leen; solo abrirEditor() y cerrarEditor() lo cambian, con
//  fijarEditor(), porque un import no se puede reasignar.
//  Extraído de editor.js sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { I } from '../ui.js';

export const CAPAS_KEY = 'databox:mapas:capas';
export const IMAN_PX = 24;   // radio (en pantalla) para pegar un cable a una marca
export const ESTILO_PERDIDO = { c: ['#e2e8f0', '#64748b'], glifo: I.x };
export const CAPA_DE = { device: 'dispositivos', rack: 'bastidores', infra_point: 'puntos', infra_line: 'lineas' };

export let E = null;               // el editor abierto

// Lo usan abrirEditor() y cerrarEditor() (editor.js)
export function fijarEditor(nuevo) {
    E = nuevo;
    return nuevo;
}

// ── Pantallas ───────────────────────────────────────────────────
// Un teléfono tiene su lado corto por debajo de 600 px; una tableta no.
export const esTelefono = () => Math.min(screen.width, screen.height) < 600;
export const esTelefonoVertical = () => esTelefono() && innerHeight > innerWidth;
// Igual que en maps.css: solo en escritorio el panel va fijo a la izquierda
export const panelFijo = () => matchMedia('(min-width: 1025px) and (min-height: 501px)').matches;

export function escuchar(o, ev, fn, op) {
    o.addEventListener(ev, fn, op);
    E.escuchas.push([o, ev, fn, op]);
}
