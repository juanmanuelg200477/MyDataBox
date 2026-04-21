import { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css';

const DEFAULT_PARTICLE_COUNT  = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR       = '132, 0, 255';
const MOBILE_BREAKPOINT        = 768;

// ─────────────────────────────────────────────────────────────
// CATEGORY DATA
// ─────────────────────────────────────────────────────────────
const CATEGORY_DATA = [
  { id: 'cctv',       color: '#1a1025', title: 'CCTV',       description: 'Videovigilancia',             label: 'Seguridad' },
  { id: 'networks',   color: '#0a1929', title: 'Networks',   description: 'Infraestructura de Red',      label: 'Redes'     },
  { id: 'isp',        color: '#061d18', title: 'ISP',        description: 'Conectividad e Internet',     label: 'Conexión'  },
  { id: 'servidores', color: '#13112a', title: 'Servidores', description: 'Infraestructura de Cómputo',  label: 'Central'   },
  { id: 'proteccion', color: '#2b1d06', title: 'Protección', description: 'Energía y Supresión',        label: 'Energía'   },
  { id: 'elementos',  color: '#1e293b', title: 'Elementos',  description: 'Organización y Cableado',    label: 'Pasivo'    },
  { id: 'general',    color: '#131f3c', title: 'General',    description: 'Todos los Dispositivos',     label: 'Global'    },
];

// ─────────────────────────────────────────────────────────────
// SUBCATEGORY DATA  (keyed by category id)
// ─────────────────────────────────────────────────────────────
const SUBCATEGORY_DATA = {
  cctv: {
    glow: '150, 30, 255',
    items: [
      { id: 'Cámaras',  title: 'Cámaras',  description: 'Cámaras de Vigilancia IP',    label: 'CCTV', color: '#1a0535' },
      { id: 'Antenas',  title: 'Antenas',  description: 'Antenas y Radios Punto-Punto', label: 'CCTV', color: '#0e1240' },
      { id: 'NVR',      title: 'NVR',      description: 'Grabadoras de Video en Red',  label: 'CCTV', color: '#17092e' },
    ],
  },
  networks: {
    glow: '0, 140, 255',
    items: [
      { id: 'Switch',           title: 'Switch',           description: 'Conmutadores de Red',    label: 'Networks', color: '#071828' },
      { id: 'SFP',              title: 'SFP',              description: 'Módulos de Fibra Óptica', label: 'Networks', color: '#0a1e35' },
      { id: 'Firewall',         title: 'Firewall',         description: 'Seguridad Perimetral',   label: 'Networks', color: '#0f1520' },
      { id: 'Planta Telefónica',title: 'Planta Telefónica',description: 'Centralitas y PBX IP',  label: 'Networks', color: '#0c1a2e' },
    ],
  },
  isp: {
    glow: '0, 210, 150',
    items: [
      { id: 'ISPs General',  title: 'ISPs General',  description: 'Proveedores de Internet',   label: 'ISP', color: '#041510' },
      { id: 'Controladoras', title: 'Controladoras', description: 'Controladoras Wireless',    label: 'ISP', color: '#0a1929' },
      { id: 'Routers',       title: 'Routers',       description: 'Enrutadores de Red',        label: 'ISP', color: '#1a1025' },
      { id: 'AP',            title: 'AP',            description: 'Puntos de Acceso WiFi',     label: 'ISP', color: '#2b1d06' },
      { id: 'Reportes',      title: 'Reportes',      description: 'Informes y Estadísticas',   label: 'ISP', color: '#13112a' },
    ],
  },
  servidores: {
    glow: '110, 80, 255',
    items: [
      { id: 'Servidores', title: 'Servidores', description: 'Infraestructura de Cómputo', label: 'Servidores', color: '#10112a' },
    ],
  },
  proteccion: {
    glow: '240, 160, 0',
    items: [
      { id: 'UPS',       title: 'UPS',       description: 'Sistemas de Alimentación Ininterrumpida', label: 'Protección', color: '#2a1500' },
      { id: 'Supresores',title: 'Supresores',description: 'Supresores de Voltaje',                   label: 'Protección', color: '#221200' },
      { id: 'PDU',       title: 'PDU',       description: 'Unidades de Distribución de Energía',     label: 'Protección', color: '#1e1000' },
    ],
  },
  elementos: {
    glow: '80, 120, 200',
    items: [
      { id: 'Patch Panels',       title: 'Patch Panels',       description: 'Paneles de Parcheo UTP',      label: 'Elementos', color: '#131e2e' },
      { id: 'Bandejas de fibra',  title: 'Bandejas de fibra',  description: 'Gestión de Fibra Óptica',     label: 'Elementos', color: '#0e1a2a' },
      { id: 'Organizadores',      title: 'Organizadores',      description: 'Gestión y Orden de Cables',   label: 'Elementos', color: '#0c1620' },
      { id: 'Patchcords',         title: 'Patchcords',         description: 'Cables de Conexión UTP',      label: 'Elementos', color: '#111e2c' },
      { id: 'Patchcords de fibra',title: 'Patchcords de fibra',description: 'Cables de Conexión Fibra',   label: 'Elementos', color: '#0f1c28' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// PARTICLE & SPOTLIGHT HELPERS (unchanged)
// ─────────────────────────────────────────────────────────────
const createParticleElement = (x, y, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute; width: 4px; height: 4px; border-radius: 50%;
    background: rgba(${color}, 1); box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none; z-index: 100; left: ${x}px; top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = radius => ({
  proximity:    radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (card, mouseX, mouseY, glow, radius) => {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--glow-x', `${((mouseX - rect.left) / rect.width) * 100}%`);
  card.style.setProperty('--glow-y', `${((mouseY - rect.top) / rect.height) * 100}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

// ─────────────────────────────────────────────────────────────
// PARTICLE CARD
// ─────────────────────────────────────────────────────────────
const ParticleCard = ({
  children, className = '', disableAnimations = false, style,
  particleCount = DEFAULT_PARTICLE_COUNT, glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true, clickEffect = false, enableMagnetism = false, onClick,
}) => {
  const cardRef             = useRef(null);
  const particlesRef        = useRef([]);
  const timeoutsRef         = useRef([]);
  const isHoveredRef        = useRef(false);
  const memoizedParticles   = useRef([]);
  const particlesInitialized= useRef(false);
  const magnetismAnimRef    = useRef(null);

  const initParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimRef.current?.kill();
    particlesRef.current.forEach(p => {
      gsap.to(p, { scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)', onComplete: () => p.parentNode?.removeChild(p) });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    if (!particlesInitialized.current) initParticles();
    memoizedParticles.current.forEach((p, i) => {
      const tid = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const clone = p.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(clone, { x: (Math.random() - .5) * 100, y: (Math.random() - .5) * 100, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: 'none', repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
      }, i * 100);
      timeoutsRef.current.push(tid);
    });
  }, [initParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const el = cardRef.current;

    const onEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
      if (enableTilt) gsap.to(el, { rotateX: 5, rotateY: 5, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
    };
    const onLeave = () => {
      isHoveredRef.current = false;
      clearParticles();
      if (enableTilt) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' });
      if (enableMagnetism) gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    };
    const onMove = e => {
      if (!enableTilt && !enableMagnetism) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const cx = r.width / 2, cy = r.height / 2;
      if (enableTilt) gsap.to(el, { rotateX: ((y - cy) / cy) * -10, rotateY: ((x - cx) / cx) * 10, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
      if (enableMagnetism) magnetismAnimRef.current = gsap.to(el, { x: (x - cx) * 0.05, y: (y - cy) * 0.05, duration: 0.3, ease: 'power2.out' });
    };
    const onClickW = e => {
      if (clickEffect) {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const md = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y), Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
        const rip = document.createElement('div');
        rip.style.cssText = `position:absolute;width:${md*2}px;height:${md*2}px;border-radius:50%;background:radial-gradient(circle,rgba(${glowColor},.4) 0%,rgba(${glowColor},.2) 30%,transparent 70%);left:${x-md}px;top:${y-md}px;pointer-events:none;z-index:1000;`;
        el.appendChild(rip);
        gsap.fromTo(rip, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => rip.remove() });
      }
      onClick?.(e);
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('click', onClickW);
    return () => {
      isHoveredRef.current = false;
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('click', onClickW);
      clearParticles();
    };
  }, [animateParticles, clearParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor, onClick]);

  return (
    <div ref={cardRef} className={`${className} particle-container`} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GLOBAL SPOTLIGHT
// ─────────────────────────────────────────────────────────────
const GlobalSpotlight = ({ gridRef, disableAnimations = false, enabled = true, spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS, glowColor = DEFAULT_GLOW_COLOR }) => {
  const spotRef = useRef(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spot = document.createElement('div');
    spot.className = 'global-spotlight';
    spot.style.cssText = `position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(${glowColor},.15) 0%,rgba(${glowColor},.08) 15%,rgba(${glowColor},.04) 25%,rgba(${glowColor},.02) 40%,rgba(${glowColor},.01) 65%,transparent 70%);z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
    document.body.appendChild(spot);
    spotRef.current = spot;

    const onMove = e => {
      if (!spotRef.current || !gridRef.current) return;
      const section = gridRef.current.closest('.bento-section');
      const rect = section?.getBoundingClientRect();
      const inside = rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const cards = gridRef.current.querySelectorAll('.magic-bento-card');
      if (!inside) {
        gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards.forEach(c => c.style.setProperty('--glow-intensity', '0'));
        return;
      }
      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDist = Infinity;
      cards.forEach(card => {
        const r = card.getBoundingClientRect();
        const dist = Math.max(0, Math.hypot(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2)) - Math.max(r.width, r.height)/2);
        minDist = Math.min(minDist, dist);
        updateCardGlowProperties(card, e.clientX, e.clientY, dist <= proximity ? 1 : dist <= fadeDistance ? (fadeDistance - dist)/(fadeDistance - proximity) : 0, spotlightRadius);
      });
      gsap.to(spotRef.current, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });
      const ta = minDist <= proximity ? 0.8 : minDist <= fadeDistance ? ((fadeDistance - minDist)/(fadeDistance - proximity)) * 0.8 : 0;
      gsap.to(spotRef.current, { opacity: ta, duration: ta > 0 ? 0.2 : 0.5, ease: 'power2.out' });
    };
    const onLeave = () => {
      gridRef.current?.querySelectorAll('.magic-bento-card').forEach(c => c.style.setProperty('--glow-intensity', '0'));
      if (spotRef.current) gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      spotRef.current?.parentNode?.removeChild(spotRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

// ─────────────────────────────────────────────────────────────
// BENTO CARD GRID
// ─────────────────────────────────────────────────────────────
const BentoCardGrid = ({ children, gridRef, extraClass = '' }) => (
  <div className={`card-grid bento-section ${extraClass}`} ref={gridRef}>
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

// ─────────────────────────────────────────────────────────────
// CARD INNER CONTENT
// ─────────────────────────────────────────────────────────────
const CardContent = ({ card }) => (
  <>
    <div className="magic-bento-card__header">
      <div className="magic-bento-card__label">{card.label}</div>
    </div>
    <div className="magic-bento-card__content">
      <h2 className="magic-bento-card__title">{card.title}</h2>
      <p className="magic-bento-card__description">{card.description}</p>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// MAGIC BENTO — main export
// mode: 'categories' | 'subcategories'
// ─────────────────────────────────────────────────────────────
const MagicBento = ({
  mode = 'categories',
  textAutoHide    = true,
  enableStars     = true,
  enableSpotlight = true,
  enableBorderGlow= true,
  disableAnimations = false,
  spotlightRadius = 400,
  particleCount   = 12,
  enableTilt      = false,
  glowColor       = DEFAULT_GLOW_COLOR,
  clickEffect     = true,
  enableMagnetism = false,
}) => {
  const gridRef  = useRef(null);
  const isMobile = useMobileDetection();
  const noAnim   = disableAnimations || isMobile;

  // Subcategory mode: dynamic items from event
  const [subcatItems, setSubcatItems] = useState([]);
  const [subcatGlow,  setSubcatGlow]  = useState(DEFAULT_GLOW_COLOR);

  useEffect(() => {
    if (mode !== 'subcategories') return;
    const handler = e => {
      const data = SUBCATEGORY_DATA[e.detail];
      if (data) {
        setSubcatItems(data.items);
        setSubcatGlow(data.glow);
      }
    };
    document.addEventListener('render-subcategories', handler);
    return () => document.removeEventListener('render-subcategories', handler);
  }, [mode]);

  // Determine active data & glow
  const items     = mode === 'categories' ? CATEGORY_DATA : subcatItems;
  const activeGlow= mode === 'categories' ? glowColor     : subcatGlow;

  // Navigation dispatcher
  const navigate = (id) => {
    const eventName = mode === 'categories' ? 'nav-category' : 'nav-subcategory';
    document.dispatchEvent(new CustomEvent(eventName, { detail: id }));
  };

  // Grid extra class for subcategory layout
  const gridClass = mode === 'subcategories'
    ? `subcat-grid subcat-count-${items.length}`
    : '';

  const cardClass = [
    'magic-bento-card',
    textAutoHide   ? 'magic-bento-card--text-autohide' : '',
    enableBorderGlow ? 'magic-bento-card--border-glow' : '',
  ].join(' ');

  if (mode === 'subcategories' && items.length === 0) {
    // Placeholder while waiting for event
    return <div style={{ padding: '40px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: '14px' }}>Cargando subcategorías…</div>;
  }

  return (
    <>
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={noAnim}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={activeGlow}
        />
      )}

      <BentoCardGrid gridRef={gridRef} extraClass={gridClass}>
        {items.map((card, index) => {
          const cardStyle = {
            backgroundColor: card.color,
            '--glow-color': activeGlow,
          };

          if (enableStars) {
            return (
              <ParticleCard
                key={card.id || index}
                className={cardClass}
                style={cardStyle}
                disableAnimations={noAnim}
                particleCount={particleCount}
                glowColor={activeGlow}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
                onClick={() => navigate(card.id)}
              >
                <CardContent card={card} />
              </ParticleCard>
            );
          }

          return (
            <div
              key={card.id || index}
              className={cardClass}
              style={cardStyle}
              onClick={() => navigate(card.id)}
            >
              <CardContent card={card} />
            </div>
          );
        })}
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;
