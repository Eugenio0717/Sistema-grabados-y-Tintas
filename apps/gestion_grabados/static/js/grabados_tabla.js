
    /* ============================================================
       2. ESTADO DE LA APLICACIÓN
       Variables que controlan el estado actual de la tabla
    ============================================================ */

    const REGISTROS_POR_PAGINA = 10; // cuántas filas se muestran por página

    let registrosFiltrados = []; // subconjunto de DATOS_REGISTROS tras aplicar filtros
    let paginaActual       = 1;  // página actualmente visible
    let palabrasBusqueda   = []; // palabras ingresadas en el buscador
    let fechaDesdeTs       = null; // timestamp de la fecha "desde"
    let fechaHastaTs       = null; // timestamp de la fecha "hasta"
    let filtroFechaActivo  = false; // true si hay algún filtro de fecha activo
    let columnaOrden       = null;  // columna por la que se está ordenando
    let direccionOrden     = 'asc'; // dirección del orden: 'asc' o 'desc'


    /* ============================================================
       3. CONSTANTES DE CONFIGURACIÓN
    ============================================================ */

    // Columnas que NO se pueden ocultar ni reordenar
    const COLUMNAS_FIJAS = ['of', 'acciones'];

    // Nombre legible de cada columna (para el picker y exportación)
    const NOMBRES_COLUMNAS = {
      of        : 'OF',
      ref       : 'OF Referencia',
      desc      : 'Descripción',
      cliente   : 'Cliente',
      tipo      : 'Tipo de Grabado',
      proceso   : 'Proceso',
      maquina   : 'Máquina',
      estado    : 'Estado',
      fecha     : 'Fecha Prog.',
      ubicacion : 'Ubicación',
      sobre     : 'Sobre',
      acciones  : 'Acciones'
    };

    // Clase CSS de badge según estado
    const CLASE_POR_ESTADO = {
      'Pendiente'  : 'estado--pendiente',
      'En Proceso' : 'estado--en-proceso',
      'Completado' : 'estado--completado',
      'Cancelado'  : 'estado--cancelado',
      'En Revisión': 'estado--en-revision'
    };

    // Ícono SVG de ubicación (pin)
    const SVG_PIN = `<svg viewBox="0 0 24 24" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`;

    // Botones de acción por fila (Ver / Editar / Eliminar)
    const HTML_ACCIONES = `
      <div class="fila-acciones">
        <a class="boton-accion boton-accion--ver" href="#" title="Ver">
          <svg viewBox="0 0 24 24" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </a>
        <a class="boton-accion boton-accion--editar" href="#" title="Editar">
          <svg viewBox="0 0 24 24" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </a>
        <button class="boton-accion boton-accion--eliminar" title="Eliminar">
          <svg viewBox="0 0 24 24" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>`;

    // Claves localStorage
    const CLAVE_COLUMNAS_OCULTAS = 'grabados_columnas_ocultas';
    const CLAVE_ORDEN_COLUMNAS   = 'grabados_orden_columnas';


    /* ============================================================
       4. UTILIDADES
    ============================================================ */

    /**
     * Convierte una fecha en formato "dd/mm/yyyy" a timestamp (medianoche local).
     * Devuelve null si el string no es válido.
     */
    function parsearFecha(str) {
      if (!str || str === '—') return null;
      const partes = str.split('/');
      if (partes.length !== 3) return null;
      const d = parseInt(partes[0], 10);
      const m = parseInt(partes[1], 10) - 1; // los meses en JS van de 0 a 11
      const y = parseInt(partes[2], 10);
      if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
      return new Date(y, m, d).getTime();
    }

    /**
     * Convierte una fecha del input type="date" (formato "yyyy-mm-dd")
     * a timestamp de medianoche local.
     */
    function inputFechaATimestamp(valor) {
      if (!valor) return null;
      const [y, m, d] = valor.split('-').map(Number);
      return new Date(y, m - 1, d).getTime();
    }

    /**
     * Genera una cadena de fecha en formato "yyyymmdd" para nombres de archivo.
     */
    function fechaParaNombreArchivo() {
      const ahora = new Date();
      return `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`;
    }

    /**
     * Ordena un array de registros por fecha descendente (más reciente primero).
     */
    function ordenarPorFechaDesc(arr) {
      return [...arr].sort((a, b) => {
        const ta = parsearFecha(a.fecha) || 0;
        const tb = parsearFecha(b.fecha) || 0;
        return tb - ta;
      });
    }

    /**
     * Envuelve las palabras buscadas con <mark> en el texto.
     * Si no hay palabras, devuelve el texto sin cambios.
     */
    function resaltarTexto(texto, palabras) {
      if (!palabras || palabras.length === 0) return texto;
      let resultado = texto;
      palabras.forEach(palabra => {
        if (!palabra) return;
        const regex = new RegExp(`(${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        resultado = resultado.replace(regex, '<mark class="texto-resaltado">$1</mark>');
      });
      return resultado;
    }

    /**
     * Descarga un contenido como archivo en el navegador.
     * @param {string} contenido  - Texto o HTML a descargar
     * @param {string} nombreArchivo
     * @param {string} tipoMIME
     */
    function descargarArchivo(contenido, nombreArchivo, tipoMIME) {
      const blob = new Blob([contenido], { type: tipoMIME });
      const url  = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href     = url;
      enlace.download = nombreArchivo;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }


    /* ============================================================
       5. RENDERIZADO — Dibujar filas y paginación en el DOM
    ============================================================ */

    /**
     * Dibuja las filas de la página actual en el tbody.
     * @param {Array} datos - Array de registros ya filtrados
     */
    function renderizarFilas(datos) {
      const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
      const pagina = datos.slice(inicio, inicio + REGISTROS_POR_PAGINA);
      const tbody  = document.getElementById('tabla-cuerpo');
      const palabras = palabrasBusqueda;

      if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="tabla-sin-resultados">No se encontraron registros.</td></tr>`;
        return;
      }

      tbody.innerHTML = pagina.map(registro => `
        <tr>
          <td data-label="OF">
            <a class="celda-of-enlace" href="#">${resaltarTexto(registro.of, palabras)}</a>
          </td>
          <td data-label="OF Ref.">
            <span class="celda-of-referencia">${resaltarTexto(registro.ref, palabras)}</span>
          </td>
          <td data-label="Descripción">
            <span class="celda-descripcion" title="${registro.desc}">
              ${resaltarTexto(registro.desc, palabras)}
            </span>
          </td>
          <td data-label="Cliente">
            <span class="celda-cliente">${resaltarTexto(registro.cliente, palabras)}</span>
          </td>
          <td data-label="Tipo">${resaltarTexto(registro.tipo, palabras)}</td>
          <td data-label="Proceso">${resaltarTexto(registro.proceso, palabras)}</td>
          <td data-label="Máquina">
            <span class="celda-maquina">${resaltarTexto(registro.maquina, palabras)}</span>
          </td>
          <td data-label="Estado">
            <button class="celda-estado ${CLASE_POR_ESTADO[registro.estado] || 'estado--pendiente'}">
              ${resaltarTexto(registro.estado, palabras)}
            </button>
          </td>
          <td data-label="Fecha">${resaltarTexto(registro.fecha, palabras)}</td>
          <td data-label="Ubicación">
            <span class="celda-ubicacion">${SVG_PIN}${resaltarTexto(registro.ubicacion, palabras)}</span>
          </td>
          <td data-label="Sobre">
            <span class="celda-ubicacion">${SVG_PIN}${resaltarTexto(registro.sobre || '—', palabras)}</span>
          </td>
          <td data-label="Acciones">${HTML_ACCIONES}</td>
        </tr>
      `).join('');
    }

    /**
     * Dibuja los botones de paginación en el pie de la tabla.
     * @param {number} totalRegistros
     */
    function renderizarPaginacion(totalRegistros) {
      const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
      const contenedor   = document.getElementById('pie-paginacion');

      const botonAnterior = paginaActual > 1
        ? `<button class="paginacion-boton" onclick="irAPagina(${paginaActual - 1})">
             <svg viewBox="0 0 24 24" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
           </button>`
        : '';

      const botonSiguiente = paginaActual < totalPaginas
        ? `<button class="paginacion-boton" onclick="irAPagina(${paginaActual + 1})">
             <svg viewBox="0 0 24 24" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
           </button>`
        : '';

      let numeraciones = '';
      for (let i = 1; i <= totalPaginas; i++) {
        const esActual = i === paginaActual;
        if (i === 1 || i === totalPaginas || Math.abs(i - paginaActual) <= 1) {
          numeraciones += `<button class="paginacion-boton ${esActual ? 'paginacion-boton--activo' : ''}"
            onclick="irAPagina(${i})">${i}</button>`;
        } else if (Math.abs(i - paginaActual) === 2) {
          numeraciones += `<span style="font-size:13px;color:var(--color-texto-suave);padding:0 2px;">...</span>`;
        }
      }

      contenedor.innerHTML = botonAnterior + numeraciones + botonSiguiente;
    }

    /**
     * Actualiza el texto del pie con el rango de registros mostrados.
     * Ej: "Mostrando 1–10 de 100 registros"
     */
    function actualizarInfoPie(totalRegistros) {
      const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA + 1;
      const fin    = Math.min(paginaActual * REGISTROS_POR_PAGINA, totalRegistros);
      document.getElementById('pie-info').innerHTML =
        `Mostrando <strong>${inicio}–${fin}</strong> de <strong>${totalRegistros}</strong> registros`;
    }

    /**
     * Actualiza los íconos de ordenamiento en los encabezados.
     */
    function actualizarIconosOrden() {
      document.querySelectorAll('#tabla-registros thead th[data-col]').forEach(th => {
        const col = th.dataset.col;
        const svg = th.querySelector('svg');
        if (!svg) return;

        if (col === columnaOrden) {
          // Columna activa: ícono de dirección
          svg.style.stroke  = '#fff';
          svg.style.opacity = '1';
          svg.innerHTML = direccionOrden === 'asc'
            ? '<polyline points="7 15 12 20 17 15"/><line x1="12" y1="4" x2="12" y2="20"/>'
            : '<polyline points="7 9 12 4 17 9"/><line x1="12" y1="20" x2="12" y2="4"/>';
        } else {
          // Columna inactiva: ícono neutro
          svg.style.stroke  = 'rgba(255,255,255,0.45)';
          svg.style.opacity = '0.7';
          svg.innerHTML = '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>';
        }
      });
    }

    /**
     * Refresca completamente la tabla:
     * renderiza filas, paginación y actualiza íconos.
     */
    function refrescarTabla() {
      paginaActual = 1;
      renderizarFilas(registrosFiltrados);
      renderizarPaginacion(registrosFiltrados.length);
      actualizarInfoPie(registrosFiltrados.length);
      aplicarVisibilidadColumnas();
      actualizarIconosOrden();
    }


    /* ============================================================
       6. PAGINACIÓN
    ============================================================ */

    /**
     * Navega a la página indicada.
     * @param {number} numeroPagina
     */
    function irAPagina(numeroPagina) {
      const totalPaginas = Math.ceil(registrosFiltrados.length / REGISTROS_POR_PAGINA);
      if (numeroPagina < 1 || numeroPagina > totalPaginas) return;
      paginaActual = numeroPagina;
      renderizarFilas(registrosFiltrados);
      renderizarPaginacion(registrosFiltrados.length);
      actualizarInfoPie(registrosFiltrados.length);
      aplicarVisibilidadColumnas();
    }


    /* ============================================================
       7. FILTROS — Búsqueda de texto y filtro de fecha
    ============================================================ */

    /**
     * Aplica simultáneamente el filtro de texto y el de fecha
     * sobre DATOS_REGISTROS y actualiza registrosFiltrados.
     */
    function aplicarFiltrosCombinados() {
      // Ordenar todos los datos por fecha descendente
      const base = ordenarPorFechaDesc(DATOS_REGISTROS);

      // Sin filtros activos: limitar a los primeros 100 registros
      const pool = (filtroFechaActivo || palabrasBusqueda.length > 0)
        ? base
        : base.slice(0, 100);

      registrosFiltrados = pool.filter(registro => {
        // Filtro por texto: todas las palabras deben estar en algún campo
        if (palabrasBusqueda.length > 0) {
          const textoCompleto = Object.values(registro).join(' ').toLowerCase();
          if (!palabrasBusqueda.every(p => textoCompleto.includes(p))) return false;
        }

        // Filtro por fecha
        if (fechaDesdeTs !== null || fechaHastaTs !== null) {
          const ts = parsearFecha(registro.fecha);
          if (ts === null) return false;
          if (fechaDesdeTs !== null && ts < fechaDesdeTs) return false;
          if (fechaHastaTs !== null && ts > fechaHastaTs) return false;
        }

        return true;
      });

      refrescarTabla();
    }

    /**
     * Lee los valores de los inputs de fecha y actualiza los timestamps del filtro.
     */
    function aplicarFiltroDeFecha() {
      const valorDesde = document.getElementById('fecha-desde').value;
      const valorHasta = document.getElementById('fecha-hasta').value;

      fechaDesdeTs = inputFechaATimestamp(valorDesde);

      if (valorHasta) {
        const [y, m, d] = valorHasta.split('-').map(Number);
        // El "hasta" incluye todo el día, así que tomamos el fin del día
        fechaHastaTs = new Date(y, m - 1, d + 1).getTime() - 1;
      } else {
        fechaHastaTs = null;
      }

      filtroFechaActivo = !!(fechaDesdeTs || fechaHastaTs);

      // Actualizar etiqueta del botón de fecha
      const etiqueta = document.getElementById('etiqueta-fecha');
      const boton    = document.getElementById('boton-fecha');

      if (filtroFechaActivo) {
        const desde = valorDesde ? valorDesde.split('-').reverse().join('/') : '...';
        const hasta = valorHasta ? valorHasta.split('-').reverse().join('/') : '...';
        etiqueta.textContent = `${desde} → ${hasta}`;
        boton.classList.add('activo');
      } else {
        etiqueta.textContent = 'Fecha';
        boton.classList.remove('activo');
      }

      aplicarFiltrosCombinados();
    }

    /**
     * Limpia los filtros de fecha y los timestamps.
     */
    function limpiarFechas() {
      document.getElementById('fecha-desde').value = '';
      document.getElementById('fecha-hasta').value = '';
      fechaDesdeTs      = null;
      fechaHastaTs      = null;
      filtroFechaActivo = false;
      document.getElementById('etiqueta-fecha').textContent = 'Fecha';
      document.getElementById('boton-fecha').classList.remove('activo');
      aplicarFiltrosCombinados();
    }

    /**
     * Alterna la visibilidad del panel de filtro de fecha.
     */
    function alternarFecha() {
      document.getElementById('filtro-fecha-panel').classList.toggle('abierto');
      document.getElementById('boton-fecha').classList.toggle('activo');
    }


    /* ============================================================
       8. ORDENAMIENTO por columna
    ============================================================ */

    /**
     * Ordena registrosFiltrados por la columna indicada.
     * Si ya está ordenada por esa columna, invierte la dirección.
     * @param {string} nombreColumna - Clave del objeto de registro
     */
    function ordenarPorColumna(nombreColumna) {
      if (columnaOrden === nombreColumna) {
        direccionOrden = direccionOrden === 'asc' ? 'desc' : 'asc';
      } else {
        columnaOrden   = nombreColumna;
        direccionOrden = 'asc';
      }

      registrosFiltrados.sort((a, b) => {
        let va = a[nombreColumna] || '';
        let vb = b[nombreColumna] || '';

        // Intentar ordenar numéricamente si los valores son números
        const na = parseFloat(va.toString().replace(/[^0-9.]/g, ''));
        const nb = parseFloat(vb.toString().replace(/[^0-9.]/g, ''));

        if (!isNaN(na) && !isNaN(nb)) {
          return direccionOrden === 'asc' ? na - nb : nb - na;
        }

        // Ordenar alfabéticamente en español
        return direccionOrden === 'asc'
          ? va.toString().localeCompare(vb.toString(), 'es')
          : vb.toString().localeCompare(va.toString(), 'es');
      });

      renderizarFilas(registrosFiltrados);
      renderizarPaginacion(registrosFiltrados.length);
      actualizarInfoPie(registrosFiltrados.length);
      aplicarVisibilidadColumnas();
      actualizarIconosOrden();
    }


    /* ============================================================
       9. EXPORTACIÓN
    ============================================================ */

    /**
     * Alterna la visibilidad del panel de exportación.
     */
    function alternarExportar() {
      document.getElementById('exportar-panel').classList.toggle('abierto');
      document.getElementById('boton-exportar').classList.toggle('activo');
      document.getElementById('exportar-contador').textContent = registrosFiltrados.length;
    }

    /**
     * Devuelve las columnas actualmente visibles (excluye "acciones").
     */
    function obtenerColumnasVisibles() {
      const ocultas = obtenerColumnasOcultas();
      return Array.from(document.querySelectorAll('#tabla-registros thead th'))
        .filter(th => th.dataset.col !== 'acciones' && !ocultas.includes(th.dataset.col))
        .map(th => ({ clave: th.dataset.col, nombre: NOMBRES_COLUMNAS[th.dataset.col] || th.dataset.col }));
    }

    /**
     * Exporta los datos filtrados en el formato indicado.
     * @param {string} formato - 'csv' o 'excel'
     */
    function exportarDatos(formato) {
      const columnas = obtenerColumnasVisibles();
      const filas    = registrosFiltrados;

      if (formato === 'csv') {
        // BOM UTF-8 para que Excel abra correctamente los caracteres especiales
        let csv = '\uFEFF';
        csv += columnas.map(c => `"${c.nombre}"`).join(',') + '\n';
        filas.forEach(r => {
          csv += columnas.map(c => `"${(r[c.clave] || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });
        descargarArchivo(csv, `grabados_${fechaParaNombreArchivo()}.csv`, 'text/csv;charset=utf-8;');

      } else if (formato === 'excel') {
        // HTML table que Excel puede abrir como .xls
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
        html += '<head><meta charset="UTF-8"></head><body><table>';
        html += '<tr>' + columnas.map(c => `<th style="background:#2d8a3e;color:#fff;font-weight:bold">${c.nombre}</th>`).join('') + '</tr>';
        filas.forEach(r => {
          html += '<tr>' + columnas.map(c => `<td>${r[c.clave] || ''}</td>`).join('') + '</tr>';
        });
        html += '</table></body></html>';
        descargarArchivo(html, `grabados_${fechaParaNombreArchivo()}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
      }

      // Cerrar el panel al terminar
      document.getElementById('exportar-panel').classList.remove('abierto');
      document.getElementById('boton-exportar').classList.remove('activo');
    }


    /* ============================================================
       10. COLUMNAS — Visibilidad, orden y drag & drop
    ============================================================ */

    /** Lee las columnas ocultas guardadas en localStorage */
    function obtenerColumnasOcultas() {
      try { return JSON.parse(localStorage.getItem(CLAVE_COLUMNAS_OCULTAS)) || []; }
      catch { return []; }
    }

    /** Guarda las columnas ocultas en localStorage */
    function guardarColumnasOcultas(ocultas) {
      try { localStorage.setItem(CLAVE_COLUMNAS_OCULTAS, JSON.stringify(ocultas)); }
      catch {}
    }

    /** Lee el orden de columnas guardado en localStorage */
    function obtenerOrdenColumnas() {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_ORDEN_COLUMNAS));
        if (guardado && Array.isArray(guardado)) return guardado;
      } catch {}
      // Orden por defecto: el que está en el HTML
      return Array.from(document.querySelectorAll('#tabla-registros thead th'))
        .map(th => th.dataset.col);
    }

    /** Guarda el orden de columnas en localStorage */
    function guardarOrdenColumnas(orden) {
      try { localStorage.setItem(CLAVE_ORDEN_COLUMNAS, JSON.stringify(orden)); }
      catch {}
    }

    /**
     * Aplica la visibilidad de columnas al DOM:
     * muestra u oculta th y td según las columnas ocultas guardadas.
     */
    function aplicarVisibilidadColumnas() {
      const ocultas = obtenerColumnasOcultas();
      const encabezados = document.querySelectorAll('#tabla-registros thead th');

      encabezados.forEach((th, indice) => {
        const col     = th.dataset.col;
        const visible = !ocultas.includes(col);
        th.style.display = visible ? '' : 'none';

        // Ocultar la celda correspondiente en cada fila del cuerpo
        document.querySelectorAll('#tabla-cuerpo tr').forEach(tr => {
          if (tr.cells[indice]) tr.cells[indice].style.display = visible ? '' : 'none';
        });
      });
    }

    /**
     * Aplica el orden de columnas guardado al DOM,
     * reordenando los th y los td de cada fila.
     */
    function aplicarOrdenColumnas() {
      const orden  = obtenerOrdenColumnas();
      const thead  = document.querySelector('#tabla-registros thead tr');
      const cols   = Array.from(thead.querySelectorAll('th'));

      // Reordenar los th
      orden.forEach(col => {
        const th = cols.find(t => t.dataset.col === col);
        if (th) thead.appendChild(th);
      });

      // Reordenar los td en cada fila del cuerpo
      document.querySelectorAll('#tabla-cuerpo tr').forEach(tr => {
        const tds         = Array.from(tr.cells);
        const thsOrdenados = Array.from(thead.querySelectorAll('th'));
        thsOrdenados.forEach(th => {
          const col      = th.dataset.col;
          const indiceOrig = cols.findIndex(t => t.dataset.col === col);
          if (indiceOrig > -1 && tds[indiceOrig]) tr.appendChild(tds[indiceOrig]);
        });
      });

      aplicarVisibilidadColumnas();
    }

    /**
     * Construye la lista de opciones del picker de columnas,
     * con checkbox para visibilidad y drag & drop para reordenar.
     */
    function construirPickerColumnas() {
      const ocultas = obtenerColumnasOcultas();
      const orden   = obtenerOrdenColumnas();
      const lista   = document.getElementById('columnas-lista');
      lista.innerHTML = '';
      let elementoArrastrando = null; // referencia al elemento que se está arrastrando

      orden.forEach(col => {
        const esFija   = COLUMNAS_FIJAS.includes(col);
        const estaVis  = !ocultas.includes(col);
        const nombre   = NOMBRES_COLUMNAS[col] || col;

        const div = document.createElement('div');
        div.className   = 'columna-opcion' + (esFija ? ' columna-opcion--fija' : '');
        div.dataset.col = col;
        div.draggable   = !esFija; // las columnas fijas no se pueden arrastrar

        div.innerHTML = `
          ${!esFija
            ? `<div class="columna-opcion__arrastrar" title="Arrastrar para reordenar">
                 <span></span><span></span><span></span><span></span>
               </div>`
            : '<div style="width:18px;flex-shrink:0"></div>'
          }
          <input type="checkbox" id="chk-col-${col}" ${estaVis ? 'checked' : ''} ${esFija ? 'disabled' : ''}>
          <label for="chk-col-${col}">${nombre}</label>
          ${esFija ? '<span class="columna-opcion__fija">fijo</span>' : ''}
        `;

        // Manejar el checkbox de visibilidad
        if (!esFija) {
          div.querySelector('input').onchange = function () {
            const ocultas = obtenerColumnasOcultas();
            if (this.checked) {
              // Quitar de ocultas
              const idx = ocultas.indexOf(col);
              if (idx > -1) ocultas.splice(idx, 1);
            } else {
              // Agregar a ocultas
              if (!ocultas.includes(col)) ocultas.push(col);
            }
            guardarColumnasOcultas(ocultas);
            aplicarVisibilidadColumnas();
          };

          // Drag & Drop para reordenar columnas
          div.addEventListener('dragstart', e => {
            elementoArrastrando = div;
            div.classList.add('columna-opcion--arrastrando');
            e.dataTransfer.effectAllowed = 'move';
          });

          div.addEventListener('dragend', () => {
            div.classList.remove('columna-opcion--arrastrando');
            lista.querySelectorAll('.columna-opcion').forEach(d => d.classList.remove('columna-opcion--sobre-drop'));
          });

          div.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (elementoArrastrando && elementoArrastrando !== div) {
              lista.querySelectorAll('.columna-opcion').forEach(d => d.classList.remove('columna-opcion--sobre-drop'));
              div.classList.add('columna-opcion--sobre-drop');
            }
          });

          div.addEventListener('dragleave', () => div.classList.remove('columna-opcion--sobre-drop'));

          div.addEventListener('drop', e => {
            e.preventDefault();
            div.classList.remove('columna-opcion--sobre-drop');
            if (!elementoArrastrando || elementoArrastrando === div) return;

            const items   = Array.from(lista.querySelectorAll('.columna-opcion'));
            const idxSrc  = items.indexOf(elementoArrastrando);
            const idxDest = items.indexOf(div);

            // Mover el elemento arrastrado antes o después del destino
            if (idxSrc < idxDest) div.after(elementoArrastrando);
            else div.before(elementoArrastrando);

            // Guardar el nuevo orden
            const nuevoOrden = Array.from(lista.querySelectorAll('.columna-opcion'))
              .map(d => d.dataset.col);
            guardarOrdenColumnas(nuevoOrden);
            aplicarOrdenColumnas();
          });
        }

        lista.appendChild(div);
      });
    }

    /**
     * Restablece la visibilidad y el orden de columnas a los valores por defecto.
     */
    function restablecerColumnas() {
      guardarColumnasOcultas([]);
      localStorage.removeItem(CLAVE_ORDEN_COLUMNAS);
      aplicarVisibilidadColumnas();
      construirPickerColumnas();
      aplicarOrdenColumnas();
    }


    /* ============================================================
       11. EVENTOS — Escuchadores de eventos globales
    ============================================================ */

    // Buscador: actualiza palabrasBusqueda al escribir
    document.getElementById('buscador-input').addEventListener('input', function () {
      const query     = this.value.toLowerCase();
      palabrasBusqueda = query.trim().split(/\s+/).filter(p => p.length > 0);
      aplicarFiltrosCombinados();
    });

    // Cerrar paneles al hacer clic fuera de ellos
    document.addEventListener('click', function (e) {
      // Panel de columnas
      const contenedorColumnas = document.querySelector('.columnas-contenedor');
      const panelColumnas      = document.getElementById('columnas-panel');
      if (contenedorColumnas && !contenedorColumnas.contains(e.target)) {
        panelColumnas.classList.remove('abierto');
      }

      // Panel de fecha
      const contenedorFecha = document.querySelector('.filtro-fecha-contenedor');
      const panelFecha      = document.getElementById('filtro-fecha-panel');
      if (contenedorFecha && !contenedorFecha.contains(e.target)) {
        panelFecha.classList.remove('abierto');
      }

      // Panel de exportación
      const contenedorExportar = document.querySelector('.exportar-contenedor');
      const panelExportar      = document.getElementById('exportar-panel');
      const botonExportar      = document.getElementById('boton-exportar');
      if (contenedorExportar && !contenedorExportar.contains(e.target)) {
        panelExportar.classList.remove('abierto');
        botonExportar.classList.remove('activo');
      }
    });

    // Click en encabezados de columna para ordenar
    document.querySelectorAll('#tabla-registros thead th[data-col]').forEach(th => {
      const col = th.dataset.col;
      if (col === 'acciones') return; // la columna de acciones no es ordenable
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => ordenarPorColumna(col));
    });


    /* ============================================================
       12. INICIALIZACIÓN — Se ejecuta al cargar la página
    ============================================================ */
    construirPickerColumnas();  // construir el picker de columnas
    aplicarOrdenColumnas();     // aplicar el orden guardado
    cargarDatosDesdeDB();       // cargar datos reales desde la Base de Datos
