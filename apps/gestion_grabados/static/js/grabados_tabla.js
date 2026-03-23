/**
 * ═══════════════════════════════════════════════════════════════
 * grabados_tabla.js
 * ───────────────────────────────────────────────────────────────
 * Script principal para la tabla de Órdenes de Fabricación (OF)
 * del módulo de Grabados en el sistema Cigar Rings.
 *
 * RESPONSABILIDADES:
 *  - Renderizar filas con paginación
 *  - Filtrar por texto (búsqueda en tiempo real)
 *  - Filtrar por rango de fechas
 *  - Ordenar columnas al hacer click en el encabezado
 *  - Mostrar/ocultar columnas con preferencia guardada por usuario
 *  - Reordenar columnas con drag & drop
 *  - Exportar los datos visibles a CSV o Excel
 *
 * PREFIJO: Todas las funciones y variables usan el prefijo "gt"
 * para evitar conflictos con otros scripts del proyecto.
 *
 * INTEGRACIÓN CON DJANGO:
 *  En el template, reemplazar GT_DATA con los datos del contexto:
 *    const GT_DATA = {{ grabados_json|safe }};
 *  Donde "grabados_json" es el queryset serializado en la view.
 *
 * ALMACENAMIENTO LOCAL (localStorage):
 *  - 'gt_hidden'    → columnas ocultas por el usuario
 *  - 'gt_col_order' → orden de columnas personalizado
 *  Estas preferencias persisten entre sesiones del navegador.
 * ═══════════════════════════════════════════════════════════════
 */


/* ══════════════════════════════════════════════
   SECCIÓN 1: CONSTANTES DE CONFIGURACIÓN
   ══════════════════════════════════════════════
   Valores fijos que controlan el comportamiento
   y la apariencia de la tabla.
   Modificar estos valores afecta toda la tabla.
*/

/**
 * Mapeo de nombre de estado → clase CSS de badge.
 * Cada estado tiene un color diferente definido en grabados_tabla.css
 * Clases: gt-b-pend=amarillo, gt-b-proc=azul, gt-b-comp=verde,
 *         gt-b-canc=rojo, gt-b-rev=morado
 */
const GT_ESTADO_CLASS = {
  'Pendiente':   'gt-b-pend',
  'En Proceso':  'gt-b-proc',
  'Completado':  'gt-b-comp',
  'Cancelado':   'gt-b-canc',
  'En Revisión': 'gt-b-rev'
};

/**
 * Ícono SVG de pin de ubicación.
 * Se reutiliza en las columnas "Ubicación" y "Sobre".
 */
const GT_PIN_SVG = `<svg viewBox="0 0 24 24" stroke-width="2">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
  <circle cx="12" cy="10" r="3"/>
</svg>`;

/**
 * HTML de los botones de acción por fila (Ver, Editar, Eliminar).
 * IMPORTANTE: En Django los href deben apuntar a URLs reales.
 * Ejemplo: href="{% url 'grabados:grabado_detail' grabado.pk %}"
 */
const GT_ACT = `<div class="gt-actions">
  <a class="gt-abtn gt-abtn--view" href="#" title="Ver detalle">
    <svg viewBox="0 0 24 24" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </a>
  <a class="gt-abtn gt-abtn--edit" href="#" title="Editar">
    <svg viewBox="0 0 24 24" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </a>
  <button class="gt-abtn gt-abtn--delete" title="Eliminar">
    <svg viewBox="0 0 24 24" stroke-width="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  </button>
</div>`;

/**
 * Columnas que NO se pueden ocultar ni reordenar.
 * - "of": identificador principal de cada registro
 * - "acciones": botones de operación siempre deben estar visibles
 */
const GT_LOCKED = ['of', 'acciones'];

/** Clave localStorage para guardar columnas ocultas. Formato: ["tipo","proceso"] */
const GT_KEY = 'gt_hidden';

/** Clave localStorage para guardar el orden de columnas. Formato: ["of","cliente",...] */
const GT_COL_ORDER_KEY = 'gt_col_order';

/**
 * Registros por página. Cambiar este número afecta
 * la paginación y el texto del footer.
 */
const GT_PER_PAGE = 10;

/**
 * Nombres legibles de cada columna para el selector (···).
 * La clave debe coincidir con el atributo data-col del <th> en el HTML.
 * Si se agrega una columna nueva al HTML, agregar su nombre aquí también.
 */
const GT_NAMES = {
  of:        'OF',
  ref:       'OF Referencia',
  desc:      'Descripción',
  cliente:   'Cliente',
  tipo:      'Tipo de Grabado',
  proceso:   'Proceso',
  maquina:   'Máquina',
  estado:    'Estado',
  fecha:     'Fecha Prog.',
  ubicacion: 'Ubicación',
  sobre:     'Sobre',         /* Segunda ubicación dentro del taller */
  acciones:  'Acciones'
};


/* ══════════════════════════════════════════════
   SECCIÓN 2: ESTADO GLOBAL
   ══════════════════════════════════════════════
   Variables que representan el estado actual de
   la tabla. No modificar directamente desde afuera;
   usar las funciones provistas en este archivo.
*/

/** Página actual de la paginación. Siempre empieza en 1. */
let gtCurrentPage = 1;

/** Array con los registros actualmente visibles (después de filtros y orden). */
let gtFiltered = [];

/**
 * Palabras del buscador activas.
 * Se actualiza con cada keystroke. Formato: ["palabra1","palabra2"]
 * Se requiere que TODAS aparezcan en algún campo de la fila.
 */
let gtSearchWords = [];

/**
 * Bandera que indica si el filtro de fechas está activo.
 * Cuando es true: muestra TODOS los registros del rango (sin límite de 100).
 * Cuando es false: muestra solo los últimos 100 por defecto.
 */
let gtDateActive = false;

/**
 * Timestamp de inicio del filtro de fechas (medianoche hora local).
 * null si no hay fecha de inicio seleccionada.
 */
let gtDateFrom = null;

/**
 * Timestamp del fin del filtro de fechas (23:59:59.999 del día seleccionado).
 * Se usa el último milisegundo del día para que la comparación sea inclusiva.
 */
let gtDateTo = null;

/** Key (data-col) de la columna actualmente ordenada. null = sin orden activo. */
let gtSortCol = null;

/** Dirección del ordenamiento: 'asc' = A→Z o menor a mayor, 'desc' = al revés. */
let gtSortDir = 'asc';


/* ══════════════════════════════════════════════
   SECCIÓN 3: DATOS
   ══════════════════════════════════════════════
*/

/**
 * Array principal con todos los registros de OF.
 * Cada objeto representa una Orden de Fabricación con sus campos.
 *
 * INTEGRACIÓN CON DJANGO:
 * Reemplazar esta línea en el template con:
 *   const GT_DATA = {{ grabados_json|safe }};
 *
 * En la view de Django serializar el queryset así:
 *   import json
 *   grabados_json = json.dumps([{
 *     'of':        str(g.of_numero),
 *     'ref':       str(g.of_referencia),
 *     'desc':      g.descripcion or '',
 *     'cliente':   str(g.cliente),
 *     'tipo':      g.tipo_grabado.nombre,
 *     'proceso':   g.proceso.nombre,
 *     'maquina':   g.maquina.nombre,
 *     'estado':    g.estado.nombre,
 *     'fecha':     g.fecha_programacion.strftime('%d/%m/%Y'),
 *     'ubicacion': g.ubicacion or '—',
 *     'sobre':     g.sobre or '—',
 *   } for g in grabados], ensure_ascii=False)
 */
const GT_DATA = []; /* ← Reemplazar con: {{ grabados_json|safe }} */


/* ══════════════════════════════════════════════
   SECCIÓN 4: UTILIDADES DE FECHA
   ══════════════════════════════════════════════
   Se usa timestamp numérico internamente para
   evitar problemas de zona horaria con UTC.
*/

/**
 * Convierte "dd/mm/yyyy" (formato Django) a timestamp local midnight.
 *
 * Se usa new Date(y, m, d) en lugar de new Date("yyyy-mm-dd") porque
 * el segundo crea la fecha en UTC, lo que desplaza el día en zonas
 * horarias negativas (como República Dominicana UTC-4).
 *
 * @param {string} str - Fecha "dd/mm/yyyy" o "—" para sin fecha
 * @returns {number|null} Timestamp en ms, o null si es inválido
 */
function gtParseDate(str) {
  if (!str || str === '—') return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; /* Meses en JS base 0: enero=0 */
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m, d).getTime();
}

/**
 * Convierte el valor de un input[type="date"] ("yyyy-mm-dd") a timestamp local.
 *
 * @param {string} val - Valor del input, ej: "2026-01-15"
 * @returns {number|null} Timestamp en ms, o null si está vacío
 */
function gtInputToTs(val) {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Ordena un array de registros de más reciente a más antigua.
 * Se usa como base antes de filtrar, para que los últimos 100
 * por defecto siempre sean los más recientes.
 *
 * @param {Array} arr - Registros con campo 'fecha' en "dd/mm/yyyy"
 * @returns {Array} Nuevo array ordenado por fecha descendente
 */
function gtSortByDateDesc(arr) {
  return [...arr].sort((a, b) => {
    const ta = gtParseDate(a.fecha) || 0;
    const tb = gtParseDate(b.fecha) || 0;
    return tb - ta; /* Mayor timestamp = fecha más reciente */
  });
}


/* ══════════════════════════════════════════════
   SECCIÓN 5: RESALTADO DE BÚSQUEDA
   ══════════════════════════════════════════════
*/

/**
 * Envuelve cada coincidencia de búsqueda en <mark class="gt-mark">
 * para resaltarla en amarillo dentro del texto de la celda.
 * La clase .gt-mark está definida en grabados_tabla.css.
 *
 * @param {string} text  - Texto del campo a procesar
 * @param {Array}  words - Palabras buscadas actualmente
 * @returns {string} HTML con coincidencias envueltas en <mark>
 */
function gtHL(text, words) {
  if (!words || words.length === 0) return text;
  let result = String(text);
  words.forEach(w => {
    if (!w) return;
    /* Escapar caracteres especiales para búsqueda literal (no regex) */
    const regex = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark class="gt-mark">$1</mark>');
  });
  return result;
}


/* ══════════════════════════════════════════════
   SECCIÓN 6: RENDERIZADO DE LA TABLA
   ══════════════════════════════════════════════
*/

/**
 * Genera y pega el HTML de las filas de la página actual en el tbody.
 * Aplica resaltado de búsqueda a todos los campos de texto.
 * Se llama después de cada filtro, cambio de página u ordenamiento.
 *
 * @param {Array} data - Registros filtrados y ordenados a renderizar
 */
function gtRenderRows(data) {
  const start = (gtCurrentPage - 1) * GT_PER_PAGE; /* Primer índice de la página */
  const page  = data.slice(start, start + GT_PER_PAGE); /* Slice de la página */
  const body  = document.getElementById('gt-body');
  const w     = gtSearchWords;

  body.innerHTML = page.map(r => `
    <tr>
      <td data-label="OF">
        <!-- Enlace al detalle. En Django: href="{% url 'grabados:grabado_detail' r.pk %}" -->
        <a class="gt-of-link" href="#">${gtHL(r.of, w)}</a>
      </td>
      <td data-label="OF Ref.">
        <span class="gt-of-ref">${gtHL(r.ref, w)}</span>
      </td>
      <td data-label="Descripción">
        <!-- title muestra el texto completo en tooltip cuando está truncado -->
        <span class="gt-desc" title="${r.desc}">${gtHL(r.desc, w)}</span>
      </td>
      <td data-label="Cliente">
        <span class="gt-client">${gtHL(r.cliente, w)}</span>
      </td>
      <td data-label="Tipo">${gtHL(r.tipo, w)}</td>
      <td data-label="Proceso">${gtHL(r.proceso, w)}</td>
      <td data-label="Máquina">
        <span class="gt-machine">${gtHL(r.maquina, w)}</span>
      </td>
      <td data-label="Estado">
        <!-- Badge de color según GT_ESTADO_CLASS. Clic abre modal de cambio de estado -->
        <button class="gt-badge ${GT_ESTADO_CLASS[r.estado] || 'gt-b-pend'}">
          ${gtHL(r.estado, w)}
        </button>
      </td>
      <td data-label="Fecha">${gtHL(r.fecha, w)}</td>
      <td data-label="Ubicación">
        <!-- Ubicación principal: ej "Taller Z - Mesa 100" -->
        <span class="gt-loc">${GT_PIN_SVG}${gtHL(r.ubicacion || '—', w)}</span>
      </td>
      <td data-label="Sobre">
        <!-- Segunda ubicación: ej número de estante o caja dentro del taller -->
        <span class="gt-loc">${GT_PIN_SVG}${gtHL(r.sobre || '—', w)}</span>
      </td>
      <td data-label="Acciones">
        ${GT_ACT}
      </td>
    </tr>`).join('');
}

/**
 * Renderiza los botones de paginación y el texto del footer.
 * Siempre muestra: primera página, última, y las cercanas a la actual.
 * Las demás se reemplazan con "..." para no saturar la UI.
 *
 * @param {number} total - Total de registros en gtFiltered
 */
function gtRenderPagination(total) {
  const pages = Math.ceil(total / GT_PER_PAGE);
  const pg    = document.getElementById('gt-pagination');
  if (!pg) return;

  /* Flecha izquierda: página anterior */
  const arrowL = `<button class="gt-pg" onclick="gtGoPage(${gtCurrentPage - 1})">
    <svg viewBox="0 0 24 24" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  /* Flecha derecha: página siguiente */
  const arrowR = `<button class="gt-pg" onclick="gtGoPage(${gtCurrentPage + 1})">
    <svg viewBox="0 0 24 24" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  /* Botones numerados con puntos suspensivos en los huecos */
  let nums = '';
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - gtCurrentPage) <= 1) {
      /* Mostrar: primera, última o páginas cercanas a la actual */
      nums += `<button class="gt-pg${i === gtCurrentPage ? ' gt-pg--active' : ''}"
        onclick="gtGoPage(${i})">${i}</button>`;
    } else if (Math.abs(i - gtCurrentPage) === 2) {
      /* Mostrar "..." donde hay huecos */
      nums += `<span style="font-size:13px;color:var(--gt-muted);padding:0 2px;">...</span>`;
    }
  }

  pg.innerHTML = (gtCurrentPage > 1 ? arrowL : '') + nums + (gtCurrentPage < pages ? arrowR : '');

  /* Texto del footer: "Mostrando 1–10 de 100 registros" */
  const s    = (gtCurrentPage - 1) * GT_PER_PAGE + 1;
  const e    = Math.min(gtCurrentPage * GT_PER_PAGE, total);
  const info = document.getElementById('gt-footer-info');
  if (info) info.innerHTML = `Mostrando <strong>${s}–${e}</strong> de <strong>${total}</strong> registros`;
}

/**
 * Navega a una página específica de la paginación.
 * Valida que el número sea válido, luego re-renderiza filas y visibilidad.
 *
 * @param {number} p - Número de página destino (base 1)
 */
function gtGoPage(p) {
  const pages = Math.ceil(gtFiltered.length / GT_PER_PAGE);
  if (p < 1 || p > pages) return;
  gtCurrentPage = p;
  gtRenderRows(gtFiltered);
  gtRenderPagination(gtFiltered.length);
  gtApplyVis(); /* Re-aplicar visibilidad después de renderizar nuevas filas */
}

/**
 * Reinicia a página 1 y re-renderiza todo.
 * Punto de entrada para cualquier cambio de filtro u ordenamiento.
 */
function gtRefresh() {
  gtCurrentPage = 1;
  gtRenderRows(gtFiltered);
  gtRenderPagination(gtFiltered.length);
  gtApplyVis();
  gtUpdateSortIcons(); /* Actualizar íconos de flecha en encabezados */
}


/* ══════════════════════════════════════════════
   SECCIÓN 7: FILTRO COMBINADO
   ══════════════════════════════════════════════
   Punto central de filtrado. Combina texto + fecha.
*/

/**
 * Aplica todos los filtros activos sobre GT_DATA y actualiza gtFiltered.
 *
 * COMPORTAMIENTO:
 *  - Sin filtros → últimos 100 registros por fecha (para no sobrecargar)
 *  - Con filtro de fecha → TODOS los del rango sin límite
 *  - Con búsqueda de texto → busca en TODOS sin límite
 *
 * El límite de 100 es intencional para cuando haya miles de OF en producción.
 */
function gtApplyCombinedFilter() {
  const words = gtSearchWords;

  /* Base: todos los datos ordenados de más reciente a más antiguo */
  const base = gtSortByDateDesc(GT_DATA);

  /* Con filtro activo: usar todo; sin filtro: solo los últimos 100 */
  const pool = (gtDateActive || words.length > 0) ? base : base.slice(0, 100);

  gtFiltered = pool.filter(r => {
    /* ── FILTRO DE TEXTO ──
       Todas las palabras del buscador deben aparecer en algún campo de la fila.
       Se une todo el objeto en un string para buscar en todos los campos a la vez. */
    if (words.length > 0) {
      const text = Object.values(r).join(' ').toLowerCase();
      if (!words.every(w => text.includes(w))) return false;
    }

    /* ── FILTRO DE FECHA ──
       La fecha del registro debe estar dentro del rango [gtDateFrom, gtDateTo] */
    if (gtDateFrom !== null || gtDateTo !== null) {
      const ts = gtParseDate(r.fecha);
      if (ts === null) return false; /* Sin fecha = no pasa el filtro de fecha */
      if (gtDateFrom !== null && ts < gtDateFrom) return false;
      if (gtDateTo   !== null && ts > gtDateTo)   return false;
    }

    return true;
  });

  gtRefresh();
}


/* ══════════════════════════════════════════════
   SECCIÓN 8: FILTRO DE FECHAS
   ══════════════════════════════════════════════
*/

/**
 * Abre/cierra el panel del calendario.
 * También alterna la clase 'active' en el botón para cambiar su color.
 */
function gtToggleDatePanel() {
  document.getElementById('gt-date-panel').classList.toggle('open');
  document.getElementById('gt-date-btn').classList.toggle('active');
}

/**
 * Lee los inputs "Desde" y "Hasta", convierte a timestamps y filtra la tabla.
 *
 * NOTA sobre gtDateTo:
 * Se suma 1 día y se resta 1ms para hacer el día "Hasta" inclusivo.
 * Ejemplo: si el usuario elige "31/12/2025", gtDateTo = 31/12/2025 23:59:59.999
 * Sin esto, una OF con esa fecha exacta quedaría excluida.
 */
function gtApplyDateFilter() {
  const from = document.getElementById('gt-date-from').value;
  const to   = document.getElementById('gt-date-to').value;

  gtDateFrom = gtInputToTs(from);

  if (to) {
    /* Último milisegundo del día seleccionado para comparación inclusiva */
    const [y, m, d] = to.split('-').map(Number);
    gtDateTo = new Date(y, m - 1, d + 1).getTime() - 1;
  } else {
    gtDateTo = null;
  }

  /* Activar bandera si al menos un campo tiene valor */
  gtDateActive = !!(gtDateFrom || gtDateTo);

  /* Actualizar texto del botón con el rango visual */
  const label = document.getElementById('gt-date-label');
  if (gtDateActive) {
    const f = from ? from.split('-').reverse().join('/') : '...';
    const t = to   ? to.split('-').reverse().join('/')   : '...';
    label.textContent = `${f} → ${t}`;
    document.getElementById('gt-date-btn').classList.add('active');
  } else {
    label.textContent = 'Fecha';
    document.getElementById('gt-date-btn').classList.remove('active');
  }

  gtApplyCombinedFilter();
}

/**
 * Limpia el filtro de fechas completamente.
 * Resetea inputs, variables de estado y vuelve al default de 100 registros.
 */
function gtClearDates() {
  document.getElementById('gt-date-from').value = '';
  document.getElementById('gt-date-to').value   = '';
  gtDateFrom   = null;
  gtDateTo     = null;
  gtDateActive = false;
  document.getElementById('gt-date-label').textContent = 'Fecha';
  document.getElementById('gt-date-btn').classList.remove('active');
  gtApplyCombinedFilter();
}


/* ══════════════════════════════════════════════
   SECCIÓN 9: EXPORTAR
   ══════════════════════════════════════════════
   Descarga los registros filtrados y columnas
   visibles en CSV o Excel.
*/

/**
 * Abre/cierra el panel de exportación y actualiza
 * el contador de registros que se van a exportar.
 */
function gtToggleExport() {
  const panel = document.getElementById('gt-export-panel');
  const btn   = document.getElementById('gt-export-btn');
  panel.classList.toggle('open');
  btn.classList.toggle('active');

  const count = document.getElementById('gt-export-count');
  if (count) count.textContent = gtFiltered.length;
}

/**
 * Retorna solo las columnas actualmente visibles (no ocultas, no "acciones").
 * Respeta el orden actual en el DOM (incluyendo reordenamientos del usuario).
 *
 * @returns {Array} [{col: string, name: string}]
 */
function gtGetVisibleCols() {
  const hidden = gtGetHidden();
  return Array.from(document.querySelectorAll('#gt-table thead th'))
    .filter(th => th.dataset.col !== 'acciones' && !hidden.includes(th.dataset.col))
    .map(th => ({
      col:  th.dataset.col,
      name: GT_NAMES[th.dataset.col] || th.dataset.col
    }));
}

/**
 * Exporta los datos al formato indicado y los descarga.
 *
 * CSV: Texto separado por comas con BOM UTF-8 para que Excel
 *      en Windows abra las tildes y ñ correctamente.
 *
 * Excel: Tabla HTML con namespace de Microsoft Office que Excel
 *        reconoce como archivo .xls nativo. Los encabezados tienen
 *        el fondo verde de la tabla para coherencia visual.
 *
 * Nombre del archivo: grabados_YYYYMMDD.csv / grabados_YYYYMMDD.xls
 *
 * @param {string} type - 'csv' o 'excel'
 */
function gtExport(type) {
  const cols = gtGetVisibleCols(); /* Solo columnas visibles */
  const rows = gtFiltered;         /* Solo registros filtrados */

  if (type === 'csv') {
    /* BOM (U+FEFF) para que Excel detecte UTF-8 automáticamente */
    let csv = '\uFEFF';
    csv += cols.map(c => `"${c.name}"`).join(',') + '\n';
    rows.forEach(r => {
      /* Las comillas dobles dentro de un campo se escapan duplicándolas ("") */
      csv += cols.map(c => `"${(r[c.col] || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    gtDownload(csv, 'grabados_' + gtDateStr() + '.csv', 'text/csv;charset=utf-8;');

  } else if (type === 'excel') {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
               'xmlns:x="urn:schemas-microsoft-com:office:excel">';
    html += '<head><meta charset="UTF-8"></head><body><table>';
    /* Encabezados con fondo verde */
    html += '<tr>' + cols.map(c =>
      `<th style="background:#2d8a3e;color:#fff;font-weight:bold">${c.name}</th>`
    ).join('') + '</tr>';
    rows.forEach(r => {
      html += '<tr>' + cols.map(c => `<td>${r[c.col] || ''}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    gtDownload(html, 'grabados_' + gtDateStr() + '.xls', 'application/vnd.ms-excel;charset=utf-8;');
  }

  /* Cerrar el panel después de iniciar la descarga */
  document.getElementById('gt-export-panel').classList.remove('open');
  document.getElementById('gt-export-btn').classList.remove('active');
}

/**
 * Genera la fecha de hoy en formato YYYYMMDD para el nombre del archivo.
 * @returns {string} Ej: "20260322" para el 22 de marzo de 2026
 */
function gtDateStr() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Crea un Blob con el contenido y lo descarga en el navegador
 * simulando un click en un enlace invisible.
 * Libera la URL del objeto después de 1 segundo para evitar memory leaks.
 *
 * @param {string} content  - Contenido del archivo
 * @param {string} filename - Nombre del archivo descargado
 * @param {string} mime     - Tipo MIME del contenido
 */
function gtDownload(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/* ══════════════════════════════════════════════
   SECCIÓN 10: ORDENAMIENTO POR COLUMNA
   ══════════════════════════════════════════════
   Click en encabezado ordena la columna.
   Segundo click invierte el orden.
*/

/**
 * Ordena gtFiltered por la columna indicada.
 * - Mismo click: invierte la dirección (asc ↔ desc)
 * - Click en otra columna: ordena ascendente
 * - Intenta ordenar como número si los valores son numéricos
 * - Si no son numéricos, ordena alfabético en español (respeta tildes, ñ)
 *
 * @param {string} col - Key de la columna (data-col del th clickeado)
 */
function gtSort(col) {
  if (gtSortCol === col) {
    gtSortDir = gtSortDir === 'asc' ? 'desc' : 'asc'; /* Invertir */
  } else {
    gtSortCol = col;
    gtSortDir = 'asc'; /* Nueva columna siempre empieza ascendente */
  }

  gtFiltered.sort((a, b) => {
    let va = a[col] || '';
    let vb = b[col] || '';

    /* Intentar comparar como número (ej: "20.035" → 20.035) */
    const na = parseFloat(va.toString().replace(/[^0-9.]/g, ''));
    const nb = parseFloat(vb.toString().replace(/[^0-9.]/g, ''));

    if (!isNaN(na) && !isNaN(nb)) {
      return gtSortDir === 'asc' ? na - nb : nb - na;
    }

    /* Comparación alfabética con soporte de idioma español */
    return gtSortDir === 'asc'
      ? va.toString().localeCompare(vb.toString(), 'es')
      : vb.toString().localeCompare(va.toString(), 'es');
  });

  gtRefresh();
}

/**
 * Actualiza los íconos SVG de los encabezados para mostrar el estado del orden:
 * - Columna activa: flecha única apuntando en la dirección del orden
 * - Otras columnas: doble flecha gris (↕) indicando que son clicables
 */
function gtUpdateSortIcons() {
  document.querySelectorAll('#gt-table thead th[data-col]').forEach(th => {
    const col = th.dataset.col;
    const svg = th.querySelector('svg');
    if (!svg) return;

    if (col === gtSortCol) {
      svg.style.stroke  = '#fff';
      svg.style.opacity = '1';
      /* Flecha hacia abajo = ascendente (A primero), flecha arriba = descendente */
      svg.innerHTML = gtSortDir === 'asc'
        ? '<polyline points="7 15 12 20 17 15"/><line x1="12" y1="4" x2="12" y2="20"/>'
        : '<polyline points="7 9 12 4 17 9"/><line x1="12" y1="20" x2="12" y2="4"/>';
    } else {
      /* Doble flecha gris para columnas no ordenadas */
      svg.style.stroke  = 'rgba(255,255,255,0.45)';
      svg.style.opacity = '0.7';
      svg.innerHTML = '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>';
    }
  });
}


/* ══════════════════════════════════════════════
   SECCIÓN 11: VISIBILIDAD DE COLUMNAS
   ══════════════════════════════════════════════
   El usuario puede ocultar columnas que no necesita.
   La preferencia se guarda en localStorage (GT_KEY).
*/

/**
 * Lee la lista de columnas ocultas desde localStorage.
 * @returns {Array} Keys de columnas ocultas, ej: ["tipo","proceso"]
 */
function gtGetHidden() {
  try { return JSON.parse(localStorage.getItem(GT_KEY)) || []; }
  catch { return []; }
}

/**
 * Guarda la lista de columnas ocultas en localStorage.
 * @param {Array} h - Keys de columnas a ocultar
 */
function gtSaveHidden(h) {
  try { localStorage.setItem(GT_KEY, JSON.stringify(h)); }
  catch {}
}

/**
 * Aplica la visibilidad al DOM.
 * Oculta/muestra cada <th> y todos los <td> de esa columna en cada fila.
 * Se debe llamar después de cada renderizado (gtRenderRows lo necesita).
 */
function gtApplyVis() {
  const hidden = gtGetHidden();
  const ths    = document.querySelectorAll('#gt-table thead th');

  ths.forEach((th, i) => {
    const col  = th.dataset.col;
    const show = !hidden.includes(col);
    th.style.display = show ? '' : 'none';

    /* Ocultar/mostrar la celda en la misma posición en cada fila del cuerpo */
    document.querySelectorAll('#gt-body tr').forEach(tr => {
      if (tr.cells[i]) tr.cells[i].style.display = show ? '' : 'none';
    });
  });
}


/* ══════════════════════════════════════════════
   SECCIÓN 12: ORDEN DE COLUMNAS (DRAG & DROP)
   ══════════════════════════════════════════════
   El usuario arrastra columnas en el panel (···)
   para cambiar su orden. Se guarda en localStorage.
*/

/**
 * Lee el orden guardado en localStorage.
 * Si no existe (primera vez), usa el orden del HTML como default.
 * @returns {Array} Keys de columnas en el orden actual
 */
function gtGetOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(GT_COL_ORDER_KEY));
    if (saved && Array.isArray(saved)) return saved;
  } catch {}
  /* Orden por defecto según el HTML */
  return Array.from(document.querySelectorAll('#gt-table thead th')).map(th => th.dataset.col);
}

/**
 * Guarda el orden de columnas en localStorage.
 * @param {Array} order - Keys en el nuevo orden
 */
function gtSaveOrder(order) {
  try { localStorage.setItem(GT_COL_ORDER_KEY, JSON.stringify(order)); }
  catch {}
}

/**
 * Reorganiza físicamente los <th> y <td> de la tabla para reflejar
 * el orden guardado. Se llama al inicio y después de cada drag & drop.
 * Después de reordenar, re-aplica la visibilidad de columnas.
 */
function gtApplyOrder() {
  const order = gtGetOrder();
  const thead = document.querySelector('#gt-table thead tr');
  const cols  = Array.from(thead.querySelectorAll('th')); /* Orden actual */

  /* Reordenar <th>: appendChild mueve el elemento al final → orden queda correcto */
  order.forEach(col => {
    const th = cols.find(t => t.dataset.col === col);
    if (th) thead.appendChild(th);
  });

  /* Reordenar <td> en cada fila del cuerpo */
  document.querySelectorAll('#gt-body tr').forEach(tr => {
    const tds        = Array.from(tr.cells);
    const thsOrdered = Array.from(thead.querySelectorAll('th'));
    thsOrdered.forEach(th => {
      const col     = th.dataset.col;
      const origIdx = cols.findIndex(t => t.dataset.col === col);
      if (origIdx > -1 && tds[origIdx]) tr.appendChild(tds[origIdx]);
    });
  });

  gtApplyVis();
}

/**
 * Construye la lista del panel de configuración de columnas (···).
 *
 * Cada ítem tiene:
 * - Handle de arrastre (4 líneas): solo columnas no fijas
 * - Checkbox: para mostrar/ocultar
 * - Label: nombre de la columna
 * - Badge "fijo": para columnas de GT_LOCKED
 *
 * Implementa HTML5 Drag & Drop:
 *  dragstart → guarda el elemento origen (dragSrc)
 *  dragover  → muestra línea visual donde se soltará
 *  drop      → reordena el DOM y guarda el nuevo orden
 */
function gtBuildPicker() {
  const hidden = gtGetHidden();
  const order  = gtGetOrder();
  const list   = document.getElementById('gt-col-list');
  list.innerHTML = '';

  let dragSrc = null; /* Elemento que se está arrastrando actualmente */

  order.forEach(col => {
    const locked  = GT_LOCKED.includes(col);
    const checked = !hidden.includes(col);
    const name    = GT_NAMES[col] || col;

    const div = document.createElement('div');
    div.className   = 'gt-col-opt' + (locked ? ' gt-col-locked' : '');
    div.dataset.col = col;
    div.draggable   = !locked; /* Solo se pueden arrastrar las no fijas */

    div.innerHTML = `
      ${!locked
        ? `<div class="gt-drag-handle" title="Mantener presionado y arrastrar para reordenar">
             <span></span><span></span><span></span><span></span>
           </div>`
        : '<div style="width:18px;flex-shrink:0"></div>' /* Espaciado alineador */}
      <input type="checkbox" id="gtc-${col}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''}>
      <label for="gtc-${col}">${name}</label>
      ${locked ? '<span class="gt-lock-tag">fijo</span>' : ''}
    `;

    if (!locked) {
      /* Checkbox: ocultar/mostrar columna */
      div.querySelector('input').onchange = function () {
        const h = gtGetHidden();
        if (this.checked) {
          /* Mostrar: remover de la lista de ocultas */
          const i = h.indexOf(col);
          if (i > -1) h.splice(i, 1);
        } else {
          /* Ocultar: agregar a la lista de ocultas */
          if (!h.includes(col)) h.push(col);
        }
        gtSaveHidden(h);
        gtApplyVis();
      };

      /* Inicio del arrastre */
      div.addEventListener('dragstart', e => {
        dragSrc = div;
        div.classList.add('gt-dragging'); /* Reduce opacidad visual */
        e.dataTransfer.effectAllowed = 'move';
      });

      /* Fin del arrastre: limpiar clases visuales */
      div.addEventListener('dragend', () => {
        div.classList.remove('gt-dragging');
        list.querySelectorAll('.gt-col-opt').forEach(d => d.classList.remove('gt-drag-over'));
      });

      /* Pasando sobre otro ítem: mostrar línea verde arriba del destino */
      div.addEventListener('dragover', e => {
        e.preventDefault(); /* Requerido para que el drop funcione */
        e.dataTransfer.dropEffect = 'move';
        if (dragSrc && dragSrc !== div) {
          list.querySelectorAll('.gt-col-opt').forEach(d => d.classList.remove('gt-drag-over'));
          div.classList.add('gt-drag-over');
        }
      });

      /* Saliendo del ítem: quitar línea indicadora */
      div.addEventListener('dragleave', () => div.classList.remove('gt-drag-over'));

      /* Soltar: reordenar y guardar */
      div.addEventListener('drop', e => {
        e.preventDefault();
        div.classList.remove('gt-drag-over');
        if (!dragSrc || dragSrc === div) return;

        const items  = Array.from(list.querySelectorAll('.gt-col-opt'));
        const srcIdx = items.indexOf(dragSrc);
        const tgtIdx = items.indexOf(div);

        /* Insertar antes o después según la posición relativa */
        if (srcIdx < tgtIdx) div.after(dragSrc);
        else div.before(dragSrc);

        /* Guardar nuevo orden y aplicarlo a la tabla */
        const newOrder = Array.from(list.querySelectorAll('.gt-col-opt')).map(d => d.dataset.col);
        gtSaveOrder(newOrder);
        gtApplyOrder();
      });
    }

    list.appendChild(div);
  });
}

/**
 * Restablece columnas al estado original:
 * - Todas visibles (limpia gt_hidden del localStorage)
 * - Orden original del HTML (limpia gt_col_order del localStorage)
 */
function gtResetCols() {
  gtSaveHidden([]);
  localStorage.removeItem(GT_COL_ORDER_KEY);
  gtApplyVis();
  gtBuildPicker();
  gtApplyOrder();
}


/* ══════════════════════════════════════════════
   SECCIÓN 13: EVENTOS GLOBALES
   ══════════════════════════════════════════════
*/

/**
 * Buscador en tiempo real.
 * Se dispara en cada keystroke. Divide por espacios para búsqueda
 * multi-palabra: "hatsa pend" busca filas con "hatsa" Y "pend".
 */
document.getElementById('gt-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  gtSearchWords = q.trim().split(/\s+/).filter(w => w.length > 0);
  gtApplyCombinedFilter();
});

/**
 * Cierra cualquier panel abierto (columnas, fechas, exportar)
 * cuando el usuario hace click fuera de ellos.
 */
document.addEventListener('click', function (e) {
  /* Panel selector de columnas (···) */
  const colWrap  = document.querySelector('.gt-col-wrap');
  const colPanel = document.getElementById('gt-cp');
  if (colWrap && !colWrap.contains(e.target)) colPanel.classList.remove('open');

  /* Panel de filtro de fechas */
  const dateWrap  = document.querySelector('.gt-date-wrap');
  const datePanel = document.getElementById('gt-date-panel');
  if (dateWrap && !dateWrap.contains(e.target)) datePanel.classList.remove('open');

  /* Panel de exportar */
  const exportWrap  = document.querySelector('.gt-export-wrap');
  const exportPanel = document.getElementById('gt-export-panel');
  const exportBtn   = document.getElementById('gt-export-btn');
  if (exportWrap && !exportWrap.contains(e.target)) {
    exportPanel.classList.remove('open');
    exportBtn.classList.remove('active');
  }
});


/* ══════════════════════════════════════════════
   SECCIÓN 14: INICIALIZACIÓN
   ══════════════════════════════════════════════
   Se ejecuta cuando el DOM está completamente cargado.
   El orden importa:
   1. Construir picker (necesita el DOM de la tabla)
   2. Aplicar orden guardado
   3. Cargar datos (últimos 100 por defecto)
   4. Agregar listeners de ordenamiento a los th
*/
document.addEventListener('DOMContentLoaded', function () {
  /* 1. Construir la lista del panel de configuración de columnas */
  gtBuildPicker();

  /* 2. Reorganizar columnas según el orden guardado en localStorage */
  gtApplyOrder();

  /* 3. Cargar la tabla con los filtros por defecto */
  gtApplyCombinedFilter();

  /* 4. Click en encabezados para ordenar (excepto la columna de acciones) */
  document.querySelectorAll('#gt-table thead th[data-col]').forEach(th => {
    const col = th.dataset.col;
    if (col === 'acciones') return;
    th.addEventListener('click', () => gtSort(col));
  });
});
