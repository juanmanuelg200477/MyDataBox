// ════════════════════════════════════════════════════════════════
//  LOGIN — selección de rama y autenticación
//  Extraído de pages/login.astro sin cambios de lógica.
// ════════════════════════════════════════════════════════════════
import { supabase } from '../supabase.js';

// ── Avisos (esquina inferior derecha) ──────────────────────
// En inglés a propósito: son los mensajes de estado de las ramas.
// Va en este mismo módulo que la usa: no se exporta porque solo la
// necesitan la selección de rama y el inicio de sesión.
function pushToast(title, body) {
    const cont = document.getElementById('lg-toasts');
    if (!cont) return;

    const el = document.createElement('div');
    el.className = 'lg-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `
        <span class="lg-toast-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
        </span>
        <span class="lg-toast-txt">
            <span class="lg-toast-title"></span>
            <span class="lg-toast-body"></span>
        </span>
        <button class="lg-toast-x" aria-label="Dismiss">&times;</button>`;

    // textContent y no innerHTML: el texto lleva el nombre de la rama.
    el.querySelector('.lg-toast-title').textContent = title;
    el.querySelector('.lg-toast-body').textContent  = body;

    const cerrar = () => {
        if (!el.isConnected) return;
        el.classList.add('out');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    el.querySelector('.lg-toast-x').onclick = cerrar;

    cont.appendChild(el);
    setTimeout(cerrar, 5200);
}

document.addEventListener('DOMContentLoaded', async () => {
    sessionStorage.removeItem('auth_cleared');
    sessionStorage.removeItem('databox_role');
    sessionStorage.removeItem('databox_branch');

    // Si ya hay sesión activa, ir directo al dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { window.location.href = '/'; return; }

    const btn        = document.getElementById('login-btn');
    const emailInput = document.getElementById('username');
    const passInput  = document.getElementById('password');
    const errorEl    = document.getElementById('login-error');

    // ── Selector de rama ──────────────────────────────────
    const picker    = document.getElementById('branch-picker');
    const branchBtn = document.getElementById('branch-btn');
    const branchMenu= document.getElementById('branch-menu');
    const btnLabel  = document.getElementById('branch-btn-label');
    const nameEl    = document.getElementById('branch-name');
    const descEl    = document.getElementById('branch-desc');
    const pulseEl   = document.getElementById('branch-pulse');
    const opciones  = [...branchMenu.querySelectorAll('.lg-branch-opt')];

    // Ninguna rama viene preseleccionada: elegir es obligatorio.
    let rama = null;

    const abrirMenu = (abrir) => {
        branchMenu.hidden = !abrir;
        branchBtn.setAttribute('aria-expanded', String(abrir));
        if (abrir) opciones[0]?.focus();
    };

    branchBtn.onclick = () => abrirMenu(branchMenu.hidden);

    opciones.forEach(opt => {
        opt.onclick = () => {
            rama = {
                id:    opt.dataset.id,
                label: opt.dataset.label,
                desc:  opt.dataset.desc,
                color: opt.dataset.color,
                ready: opt.dataset.ready === 'true',
                home:  opt.dataset.home
            };

            opciones.forEach(o => o.setAttribute('aria-selected', String(o === opt)));

            btnLabel.textContent = rama.label;
            branchBtn.classList.add('chosen');
            branchBtn.classList.remove('nudge');
            branchBtn.style.setProperty('--branch-color', rama.color);

            // El entorno entero se tiñe de la rama elegida.
            nameEl.textContent = `Branch ${rama.label}`;
            descEl.textContent = rama.desc;
            pulseEl.style.setProperty('--branch-color', rama.color);
            pulseEl.style.color = rama.color;

            errorEl.textContent = '';
            abrirMenu(false);
            branchBtn.focus();
        };
    });

    // Cerrar al pulsar fuera o con Escape
    document.addEventListener('click', e => {
        if (!picker.contains(e.target)) abrirMenu(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !branchMenu.hidden) {
            abrirMenu(false);
            branchBtn.focus();
        }
    });

    // ── Ver / ocultar contraseña ──
    const pwdToggle = document.getElementById('pwd-toggle');
    if (pwdToggle) {
        pwdToggle.onclick = () => {
            const visible = passInput.type === 'text';
            passInput.type = visible ? 'password' : 'text';
            pwdToggle.classList.toggle('visible', !visible);
            pwdToggle.setAttribute('aria-pressed', String(!visible));
            const etiqueta = visible ? 'Mostrar contraseña' : 'Ocultar contraseña';
            pwdToggle.setAttribute('aria-label', etiqueta);
            pwdToggle.title = etiqueta;
            // Devolver el foco al campo y dejar el cursor al final,
            // para poder seguir escribiendo sin volver a tocarlo.
            passInput.focus();
            const fin = passInput.value.length;
            passInput.setSelectionRange(fin, fin);
        };
    }

    // ── Permisos de rama ──────────────────────────────────
    // Si la cuenta trae una lista explícita en sus metadatos, manda
    // esa. Si no, el dueño entra a todas y el resto solo a
    // Infraestructura, que es la única construida.
    //
    // OJO: esto es un control de interfaz. Cuando las otras ramas
    // tengan datos propios habrá que protegerlas también con RLS en
    // la base, igual que se hizo con el inventario.
    function ramasPermitidas(user) {
        const meta = user?.user_metadata ?? {};
        if (Array.isArray(meta.branches) && meta.branches.length) {
            return meta.branches.map(b => String(b).toLowerCase());
        }
        return meta.role === 'owner'
            ? opciones.map(o => o.dataset.id)
            : ['infrastructure'];
    }

    const doLogin = async () => {
        // 1. La rama primero: sin ella no se miran las credenciales.
        if (!rama) {
            errorEl.textContent = 'Elige una rama antes de iniciar sesión.';
            branchBtn.classList.remove('nudge');
            void branchBtn.offsetWidth;   // reinicia la animación
            branchBtn.classList.add('nudge');
            abrirMenu(true);
            return;
        }

        // 2. Ramas que todavía no existen: se avisa y se para aquí.
        //    No tiene sentido comprobar una contraseña contra algo
        //    que no está construido.
        if (!rama.ready) {
            pushToast(
                'Branch in progress',
                `The ${rama.label} branch is still under construction and cannot be accessed yet.`
            );
            return;
        }

        const email    = emailInput.value.trim();
        const password = passInput.value;

        if (!email || !password) {
            errorEl.textContent = 'Completa correo y contraseña.';
            return;
        }

        btn.disabled    = true;
        btn.textContent = 'Ingresando…';
        errorEl.textContent = '';

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        const restaurar = () => {
            btn.disabled    = false;
            btn.textContent = 'Ingresar';
        };

        if (error) {
            // Antes cualquier fallo decía "contraseña incorrecta", así que
            // casos como el correo sin confirmar o un bloqueo por intentos
            // quedaban escondidos y no había forma de saber qué pasaba.
            const MOTIVOS = {
                invalid_credentials:     'Correo o contraseña incorrectos.',
                email_not_confirmed:     'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.',
                over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
                user_banned:             'Esta cuenta está deshabilitada.'
            };
            errorEl.textContent = MOTIVOS[error.code] ?? `No se pudo iniciar sesión: ${error.message}`;
            console.error('[login]', error.code ?? '(sin código)', error.message);
            restaurar();
            return;
        }

        // 3. La cuenta es válida, pero ¿es de esta rama? Si no, se
        //    cierra la sesión recién abierta para no dejarla viva.
        const permitidas = ramasPermitidas(data?.user);
        if (!permitidas.includes(rama.id)) {
            await supabase.auth.signOut();
            errorEl.textContent = `Tu cuenta no tiene acceso a la rama ${rama.label}.`;
            restaurar();
            return;
        }

        sessionStorage.setItem('databox_branch', rama.id);
        window.location.href = rama.home;
    };

    btn.addEventListener('click', doLogin);

    // Permitir Enter en cualquiera de los dos campos
    [emailInput, passInput].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
    );
});
