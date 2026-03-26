
/* ============================================================
   Lógica para la Tabla PLANI (Configurada para tus columnas reales)
   ============================================================ */

let WORKBOOK_ACTUAL = null;
let DATOS_EXCEL_BRUTOS = [];
let COLUMNAS_EXCEL = [];
let DATOS_PLANI = [];
let registrosFiltrados = [];
let paginaActual = 1;
const REGISTROS_POR_PAGINA = 15;

/**
 * Diccionario de mapeo EXACTO basado en tus columnas (Actualizado)
 */
const DICCIONARIO_MAPEO = {
    of:          ['orden', 'of', 'nro'],
    ref:         ['referencia', 'ref'],
    cliente:     ['cliente', 'nombre'],
    proceso:     ['proceso', 'operacion', 'metodo'],
    horas:       ['horas proceso', 'horas'],
    papel:       ['papel'],
    formatos:    ['cantidad formatos', 'formatos'],
    responsable: ['responsable']
};

function sincronizarConExcel() {
    document.getElementById('input-excel').click();
}

function procesarArchivoExcel(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        WORKBOOK_ACTUAL = XLSX.read(data, { type: 'array' });
        
        const selectorHoja = document.getElementById('selector-hoja');
        selectorHoja.innerHTML = '';

        WORKBOOK_ACTUAL.SheetNames.forEach(nombre => {
            const opcion = document.createElement('option');
            opcion.value = nombre;
            opcion.textContent = nombre;
            selectorHoja.appendChild(opcion);
        });

        actualizarColumnasPorHoja();
        document.getElementById('modal-mapeo').style.display = 'flex';
    };
    lector.readAsArrayBuffer(archivo);
}

function actualizarColumnasPorHoja() {
    const nombreHoja = document.getElementById('selector-hoja').value;
    const hoja = WORKBOOK_ACTUAL.Sheets[nombreHoja];
    DATOS_EXCEL_BRUTOS = XLSX.utils.sheet_to_json(hoja);
    
    if (DATOS_EXCEL_BRUTOS.length === 0) {
        document.getElementById('contenedor-mapeo').innerHTML = '<p style="color:red">Esta hoja está vacía.</p>';
        return;
    }

    COLUMNAS_EXCEL = Object.keys(DATOS_EXCEL_BRUTOS[0]);
    renderizarPrevisualizacion();
    generarSelectoresMapeo();
}

function renderizarPrevisualizacion() {
    const contenedor = document.getElementById('previsualizacion-excel');
    const filasPreview = DATOS_EXCEL_BRUTOS.slice(0, 3);
    let html = '<table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#eee;">';
    COLUMNAS_EXCEL.forEach(col => { html += `<th style="border:1px solid #ddd; padding:4px;">${col}</th>`; });
    html += '</tr></thead><tbody>';
    filasPreview.forEach(fila => {
        html += '<tr>';
        COLUMNAS_EXCEL.forEach(col => { html += `<td style="border:1px solid #ddd; padding:4px;">${fila[col] || ''}</td>`; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    contenedor.innerHTML = `<p style="margin:5px; font-weight:bold; color:#666;">Vista previa:</p>` + html;
}

function generarSelectoresMapeo() {
    const contenedor = document.getElementById('contenedor-mapeo');
    contenedor.innerHTML = '<p style="font-weight:bold; color:#2d8a3e; margin-bottom:15px;">Confirmar Asignación:</p>';

    const camposRequeridos = [
        { id: 'of', label: 'ORDEN' },
        { id: 'ref', label: 'REFERENCIA' },
        { id: 'cliente', label: 'CLIENTE' },
        { id: 'proceso', label: 'PROCESO' },
        { id: 'horas', label: 'HORAS PROCESO' },
        { id: 'papel', label: 'PAPEL' },
        { id: 'formatos', label: 'CANTIDAD FORMATOS' },
        { id: 'responsable', label: 'RESPONSABLE' }
    ];

    camposRequeridos.forEach(campo => {
        const fila = document.createElement('div');
        fila.className = 'mapeo-fila';
        let opciones = `<option value="">-- No importar --</option>`;
        let encontrada = false;

        COLUMNAS_EXCEL.forEach(col => {
            const colLower = col.toLowerCase().trim();
            const esMatch = DICCIONARIO_MAPEO[campo.id].some(keyword => colLower === keyword || colLower.includes(keyword));
            const seleccionado = (esMatch && !encontrada) ? 'selected' : '';
            if (esMatch) encontrada = true;
            opciones += `<option value="${col}" ${seleccionado}>${col}</option>`;
        });

        fila.innerHTML = `
            <label>${campo.label}:</label>
            <select id="map-${campo.id}" style="${encontrada ? 'border-color:#2d8a3e; background:#f0fff4;' : ''}">${opciones}</select>
        `;
        contenedor.appendChild(fila);
    });
}

function confirmarMapeo() {
    const mapeo = {
        of: document.getElementById('map-of').value,
        ref: document.getElementById('map-ref').value,
        cliente: document.getElementById('map-cliente').value,
        proceso: document.getElementById('map-proceso').value,
        horas: document.getElementById('map-horas').value,
        papel: document.getElementById('map-papel').value,
        formatos: document.getElementById('map-formatos').value,
        responsable: document.getElementById('map-responsable').value
    };

    DATOS_PLANI = DATOS_EXCEL_BRUTOS.map(fila => ({
        of: fila[mapeo.of] || '—',
        ref: fila[mapeo.ref] || '—',
        cliente: fila[mapeo.cliente] || '—',
        proceso: fila[mapeo.proceso] || '—',
        horas: fila[mapeo.horas] || '—',
        papel: fila[mapeo.papel] || '—',
        formatos: fila[mapeo.formatos] || '—',
        responsable: fila[mapeo.responsable] || '—'
    }));

    registrosFiltrados = [...DATOS_PLANI];
    paginaActual = 1;
    renderizarTabla();
    document.getElementById('modal-mapeo').style.display = 'none';
    alert('¡Datos de producción cargados correctamente!');
}

function renderizarTabla() {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const pagina = registrosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
    const tbody = document.getElementById('tabla-cuerpo');
    
    if (pagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="tabla-sin-resultados">Cargue una hoja para ver los datos.</td></tr>';
        return;
    }

    tbody.innerHTML = pagina.map(reg => `
        <tr>
            <td><strong>${reg.of}</strong></td>
            <td>${reg.ref}</td>
            <td>${reg.cliente}</td>
            <td><span class="celda-estado estado--en-revision">${reg.proceso}</span></td>
            <td>${reg.horas}</td>
            <td>${reg.papel}</td>
            <td>${reg.formatos}</td>
            <td>${reg.responsable}</td>
        </tr>
    `).join('');
    actualizarInfoPie();
}

function actualizarInfoPie() {
    const total = registrosFiltrados.length;
    document.getElementById('pie-info').innerHTML = `Mostrando registros del Excel (Total: ${total})`;
}

function cerrarModalMapeo() {
    document.getElementById('modal-mapeo').style.display = 'none';
    document.getElementById('input-excel').value = '';
}

renderizarTabla();
