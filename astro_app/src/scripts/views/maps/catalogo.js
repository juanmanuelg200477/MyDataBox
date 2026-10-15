// ════════════════════════════════════════════════════════════════
//  TIPOS DE INFRAESTRUCTURA
//
//  Lo que se puede crear en el catálogo antes de usarlo en un mapa.
//  · forma 'linea' → se dibuja como tramo (cableado, canalización…).
//    El metraje NO va aquí: se pide en cada tramo puesto en el mapa.
//  · forma 'punto' → se coloca como un ícono (mufas, postes…).
//  Todos los datos son opcionales salvo el nombre; las listas son
//  sugerencias, también se puede escribir otro valor.
// ════════════════════════════════════════════════════════════════
import { GLIFOS } from './iconos.js';

const notas = { id: 'notas', etiqueta: 'Observaciones', tipo: 'area' };
const marca = { id: 'marca', etiqueta: 'Marca / fabricante', tipo: 'texto' };

export const TIPOS_INFRA = [
    // ── Cableado y rutas (líneas) ───────────────────────────────
    {
        kind: 'fibra', nombre: 'Fibra óptica', forma: 'linea', glifo: GLIFOS.fibra, color: '#eab308',
        ayuda: 'Troncal, distribución o acometida de fibra.',
        campos: [
            { id: 'modo', etiqueta: 'Modo', opciones: ['Monomodo (SM)', 'Multimodo (MM)'] },
            { id: 'categoria', etiqueta: 'Categoría', opciones: ['OS1', 'OS2', 'OM1', 'OM2', 'OM3', 'OM4', 'OM5'] },
            { id: 'hilos', etiqueta: 'Número de hilos', opciones: ['2', '4', '6', '8', '12', '24', '48', '96', '144'] },
            { id: 'cable', etiqueta: 'Tipo de cable', opciones: ['ADSS (aéreo)', 'Figura 8 (con mensajero)', 'Drop / acometida', 'Armado', 'Interior', 'Canalizado', 'Directamente enterrado'] },
            { id: 'instalacion', etiqueta: 'Instalación', opciones: ['Aérea', 'Subterránea', 'Canalizada', 'Interior', 'Fachada'] },
            { id: 'conector', etiqueta: 'Conectores', opciones: ['SC/UPC', 'SC/APC', 'LC/UPC', 'LC/APC', 'FC', 'ST', 'MPO/MTP', 'Fusionado (sin conector)'] },
            { id: 'atenuacion', etiqueta: 'Atenuación (dB/km)', tipo: 'texto' },
            { id: 'chaqueta', etiqueta: 'Color de chaqueta', tipo: 'texto' },
            marca, notas
        ]
    },
    {
        kind: 'utp', nombre: 'Cableado estructurado (UTP)', forma: 'linea', glifo: GLIFOS.utp, color: '#3b82f6',
        ayuda: 'Cable de cobre Ethernet entre equipos, rosetas y racks.',
        campos: [
            { id: 'categoria', etiqueta: 'Categoría', opciones: ['Cat 5e', 'Cat 6', 'Cat 6A', 'Cat 7', 'Cat 8'] },
            { id: 'blindaje', etiqueta: 'Blindaje', opciones: ['UTP (sin blindaje)', 'FTP', 'STP', 'S/FTP'] },
            { id: 'uso', etiqueta: 'Uso', opciones: ['Interior', 'Exterior', 'Exterior con gel', 'PoE'] },
            { id: 'norma', etiqueta: 'Norma de ponchado', opciones: ['T568A', 'T568B'] },
            { id: 'chaqueta', etiqueta: 'Color de chaqueta', tipo: 'texto' },
            marca, notas
        ]
    },
    {
        kind: 'coaxial', nombre: 'Cable coaxial', forma: 'linea', glifo: GLIFOS.coaxial, color: '#475569',
        ayuda: 'Cámaras analógicas, TV o enlaces de RF.',
        campos: [
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['RG59', 'RG6', 'RG11', 'LMR-400'] },
            { id: 'uso', etiqueta: 'Uso', opciones: ['CCTV', 'Televisión', 'Radiofrecuencia'] },
            marca, notas
        ]
    },
    {
        kind: 'ducto', nombre: 'Ducto / canalización', forma: 'linea', glifo: GLIFOS.ducto, color: '#a16207',
        ayuda: 'Tubería o bandeja por donde va el cableado.',
        campos: [
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['Subterráneo', 'Superficial', 'Bandeja portacables', 'Escalerilla', 'Canaleta'] },
            { id: 'material', etiqueta: 'Material', opciones: ['PVC', 'HDPE', 'EMT (metálico)', 'Conduit flexible', 'Galvanizado'] },
            { id: 'diametro', etiqueta: 'Diámetro', opciones: ['1/2"', '3/4"', '1"', '1 1/2"', '2"', '3"', '4"'] },
            { id: 'vias', etiqueta: 'Número de vías', tipo: 'texto' },
            notas
        ]
    },
    {
        kind: 'electrico', nombre: 'Cable eléctrico', forma: 'linea', glifo: GLIFOS.electrico, color: '#dc2626',
        ayuda: 'Alimentación de cámaras, racks o equipos exteriores.',
        campos: [
            { id: 'calibre', etiqueta: 'Calibre', opciones: ['14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG'] },
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['THHN', 'TSJ', 'Dúplex', 'Triplex', 'Encauchetado'] },
            { id: 'voltaje', etiqueta: 'Voltaje', opciones: ['12 V', '24 V', '120 V', '240 V'] },
            notas
        ]
    },
    {
        kind: 'radioenlace', nombre: 'Radioenlace', forma: 'linea', glifo: GLIFOS.radioenlace, color: '#a855f7', estilo: 'discontinua',
        ayuda: 'Enlace inalámbrico punto a punto entre antenas.',
        campos: [
            { id: 'frecuencia', etiqueta: 'Frecuencia', opciones: ['2.4 GHz', '5 GHz', '24 GHz', '60 GHz'] },
            { id: 'canal', etiqueta: 'Ancho de canal', opciones: ['20 MHz', '40 MHz', '80 MHz'] },
            { id: 'equipos', etiqueta: 'Equipos', tipo: 'texto' },
            { id: 'capacidad', etiqueta: 'Capacidad', tipo: 'texto' },
            notas
        ]
    },
    {
        kind: 'linea', nombre: 'Línea libre', forma: 'linea', glifo: GLIFOS.linea, color: '#0ea5e9',
        ayuda: 'Trazo para marcar rutas, límites o recorridos.',
        campos: [
            { id: 'uso', etiqueta: 'Para qué es', opciones: ['Ruta', 'Límite', 'Perímetro', 'Recorrido', 'Referencia'] },
            notas
        ]
    },

    // ── Puntos ──────────────────────────────────────────────────
    {
        kind: 'mufa', nombre: 'Mufa / caja de empalme', forma: 'punto', glifo: GLIFOS.mufa, color: '#f97316',
        ayuda: 'Donde se empalman o derivan las fibras.',
        campos: [
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['Domo (vertical)', 'En línea (horizontal)'] },
            { id: 'capacidad', etiqueta: 'Capacidad de fusiones', opciones: ['12', '24', '48', '96', '144', '288'] },
            { id: 'bandejas', etiqueta: 'Bandejas', tipo: 'texto' },
            { id: 'montaje', etiqueta: 'Montaje', opciones: ['Poste', 'Pozo', 'Muro', 'Rack'] },
            marca, notas
        ]
    },
    {
        kind: 'poste', nombre: 'Poste', forma: 'punto', glifo: GLIFOS.poste, color: '#78716c',
        ayuda: 'Apoyo para el tendido aéreo.',
        campos: [
            { id: 'material', etiqueta: 'Material', opciones: ['Concreto', 'Madera', 'Metal', 'Fibra de vidrio'] },
            { id: 'altura', etiqueta: 'Altura', opciones: ['8 m', '9 m', '10 m', '11 m', '12 m'] },
            { id: 'propietario', etiqueta: 'Propietario', opciones: ['Propio', 'Empresa eléctrica', 'Telefónica', 'Municipal'] },
            { id: 'herrajes', etiqueta: 'Herrajes', opciones: ['Retención', 'Suspensión', 'Retención y suspensión'] },
            notas
        ]
    },
    {
        kind: 'pozo', nombre: 'Pozo / caja de registro', forma: 'punto', glifo: GLIFOS.pozo, color: '#64748b',
        ayuda: 'Acceso a la canalización subterránea.',
        campos: [
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['Pozo de visita', 'Caja de registro', 'Handhole'] },
            { id: 'medidas', etiqueta: 'Medidas', tipo: 'texto' },
            { id: 'tapa', etiqueta: 'Tapa', opciones: ['Concreto', 'Hierro fundido', 'Polímero'] },
            notas
        ]
    },
    {
        kind: 'nap', nombre: 'Caja NAP / distribución', forma: 'punto', glifo: GLIFOS.nap, color: '#16a34a',
        ayuda: 'Punto de acceso donde salen las acometidas.',
        campos: [
            { id: 'puertos', etiqueta: 'Puertos', opciones: ['4', '8', '12', '16', '24'] },
            { id: 'splitter', etiqueta: 'Splitter interno', opciones: ['Sin splitter', '1:4', '1:8', '1:16'] },
            { id: 'ubicacion', etiqueta: 'Ubicación', opciones: ['Exterior', 'Interior', 'Poste', 'Fachada'] },
            marca, notas
        ]
    },
    {
        kind: 'odf', nombre: 'ODF / distribuidor de fibra', forma: 'punto', glifo: GLIFOS.odf, color: '#0d9488',
        ayuda: 'Donde terminan las fibras dentro del cuarto de equipos.',
        campos: [
            { id: 'puertos', etiqueta: 'Puertos', opciones: ['12', '24', '48', '96', '144'] },
            { id: 'conector', etiqueta: 'Adaptadores', opciones: ['SC', 'LC', 'FC', 'ST'] },
            { id: 'montaje', etiqueta: 'Montaje', opciones: ['Rack', 'Pared'] },
            marca, notas
        ]
    },
    {
        kind: 'splitter', nombre: 'Splitter óptico', forma: 'punto', glifo: GLIFOS.splitter, color: '#ca8a04',
        ayuda: 'Divide una fibra en varias salidas.',
        campos: [
            { id: 'relacion', etiqueta: 'Relación', opciones: ['1:2', '1:4', '1:8', '1:16', '1:32'] },
            { id: 'tecnologia', etiqueta: 'Tecnología', opciones: ['PLC', 'FBT'] },
            { id: 'conector', etiqueta: 'Conector', opciones: ['SC/APC', 'SC/UPC', 'LC', 'Sin conector'] },
            notas
        ]
    },
    {
        kind: 'reserva', nombre: 'Reserva de cable', forma: 'punto', glifo: GLIFOS.reserva, color: '#ea580c',
        ayuda: 'Gaza o raqueta con metros de cable de sobra.',
        campos: [
            { id: 'metros', etiqueta: 'Metros de reserva', tipo: 'texto' },
            { id: 'ubicacion', etiqueta: 'Dónde está', opciones: ['Poste', 'Pozo', 'Cuarto de equipos', 'Fachada'] },
            notas
        ]
    },
    {
        kind: 'torre', nombre: 'Torre / mástil', forma: 'punto', glifo: GLIFOS.torre, color: '#7c3aed',
        ayuda: 'Estructura para antenas y radioenlaces.',
        campos: [
            { id: 'tipo', etiqueta: 'Tipo', opciones: ['Autosoportada', 'Arriostrada', 'Mástil', 'Monopolo'] },
            { id: 'altura', etiqueta: 'Altura', tipo: 'texto' },
            notas
        ]
    },
    {
        kind: 'gabinete', nombre: 'Gabinete / caja exterior', forma: 'punto', glifo: GLIFOS.gabinete, color: '#334155',
        ayuda: 'Caja o gabinete de intemperie que no es un bastidor del inventario.',
        campos: [
            { id: 'material', etiqueta: 'Material', opciones: ['Metálico', 'Policarbonato', 'Fibra de vidrio'] },
            { id: 'proteccion', etiqueta: 'Protección', opciones: ['IP55', 'IP65', 'IP66', 'NEMA 4X'] },
            { id: 'medidas', etiqueta: 'Medidas', tipo: 'texto' },
            notas
        ]
    },
    {
        kind: 'roseta', nombre: 'Toma de red', forma: 'punto', glifo: GLIFOS.roseta, color: '#2563eb',
        ayuda: 'Punto de datos en pared o piso (roseta).',
        campos: [
            { id: 'puertos', etiqueta: 'Puertos', opciones: ['1', '2', '4'] },
            { id: 'categoria', etiqueta: 'Categoría', opciones: ['Cat 5e', 'Cat 6', 'Cat 6A'] },
            { id: 'etiqueta', etiqueta: 'Etiqueta / código', tipo: 'texto' },
            notas
        ]
    }
];

export const tipoInfra = (kind) => TIPOS_INFRA.find(t => t.kind === kind) ?? null;

export const ESTILOS_LINEA = [
    { id: 'solida', nombre: 'Sólida' },
    { id: 'discontinua', nombre: 'Discontinua' },
    { id: 'punteada', nombre: 'Punteada' }
];

export const GROSORES = [
    { id: 3, nombre: 'Fina' },
    { id: 5, nombre: 'Media' },
    { id: 7, nombre: 'Gruesa' }
];

// Tipos de mapa (para la portada y el filtro de la lista)
export const TIPOS_MAPA = ['Sede', 'Área', 'Edificio', 'Ruta', 'Otro'];
