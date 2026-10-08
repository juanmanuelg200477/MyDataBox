// ════════════════════════════════════════════════════════════════
//  Título de página dibujado con TechText.
//
//  No recibe el texto por props: lo lee del <h1> real de la cabecera y
//  lo sigue con un MutationObserver. El motivo es que quien cambia ese
//  título al navegar entre categorías es código suelto (devices.js), no
//  React, así que no hay forma de que le llegue una prop. De paso, el
//  <h1> sigue existiendo para los lectores de pantalla y no hay que
//  tocar nada de la vista.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import TechText from './TechText.jsx';

// El lienzo no entiende var(--…): hay que resolver el token antes.
function token(nombre, respaldo) {
    if (typeof document === 'undefined') return respaldo;
    const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return valor || respaldo;
}

const PageTitleTech = ({ watch, fallback = '', ...resto }) => {
    const [texto, setTexto] = useState(fallback);
    const [tema, setTema] = useState({ color: '#0f172a', accent: '#3b82f6' });

    useEffect(() => {
        setTema({
            color:  token('--text', '#0f172a'),
            // accentColor pasa por un conversor de hexadecimal, así que
            // este token tiene que ser un #rrggbb y no un rgb() o similar.
            accent: token('--primary', '#3b82f6')
        });
    }, []);

    useEffect(() => {
        const fuente = document.getElementById(watch);
        if (!fuente) return undefined;

        const leer = () => setTexto((fuente.textContent || '').trim());
        leer();

        const observador = new MutationObserver(leer);
        observador.observe(fuente, { childList: true, characterData: true, subtree: true });
        return () => observador.disconnect();
    }, [watch]);

    if (!texto) return null;

    return <TechText text={texto} color={tema.color} accentColor={tema.accent} {...resto} />;
};

export default PageTitleTech;
