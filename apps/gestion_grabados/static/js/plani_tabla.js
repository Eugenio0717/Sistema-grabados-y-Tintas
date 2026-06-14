
/* ============================================================
   Lógica para la Tabla PLANI - SINCRONIZACIÓN AUTOMÁTICA
   ============================================================ */

let DATOS_PLANI = [];
let registrosFiltrados = [];
let paginaActual = 1;
const REGISTROS_POR_PAGINA = 15;

// Función que dispara la sincronización desde el servidor
function sincronizarConExcel() {
    const btn = document.getElementById('btn-sincronizar');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = 'Buscando archivo...';
    btn.disabled = true;

    fetch('/grabados/api/sincronizar/')
        .then(response => response.json())
        .then(res => {
            if (res.status === 'ok') {
                DATOS_PLANI = res.data;
                registrosFiltrados = [...DATOS_PLANI];
                paginaActual = 1;
                renderizarTabla();
                
                // Mostrar botón de confirmar
                document.getElementById('btn-confirmar').style.display = 'flex';
                alert('Vista previa cargada desde el servidor. Revise los datos antes de confirmar.');
            } else {
                alert('Error: ' + res.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión con el servidor.');
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

// Función para confirmar y guardar en la Base de Datos
function confirmarGuardado() {
    const btn = document.getElementById('btn-confirmar');
    if (!DATOS_PLANI.length) return;

    if (!confirm('¿Está seguro de que desea guardar estos ' + DATOS_PLANI.length + ' registros en la base de datos?')) {
        return;
    }

    btn.innerHTML = 'Guardando...';
    btn.disabled = true;

    fetch('/grabados/api/confirmar/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // El CSRF token se maneja con la cookie si es necesario, 
            // pero usamos @csrf_exempt por simplicidad en este paso
        },
        body: JSON.stringify({ datos: DATOS_PLANI })
    })
    .then(response => response.json())
    .then(res => {
        if (res.status === 'ok') {
            alert(res.message);
            // Ocultar botón tras éxito
            btn.style.display = 'none';
        } else {
            alert('Error al guardar: ' + res.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al procesar la solicitud.');
    })
    .finally(() => {
        btn.innerHTML = '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Confirmar y Guardar en DB';
        btn.disabled = false;
    });
}

function renderizarTabla() {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const pagina = registrosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
    const tbody = document.getElementById('tabla-cuerpo');
    
    if (pagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="tabla-sin-resultados">Haga clic en "Actualizar" para ver la vista previa.</td></tr>';
        return;
    }

    tbody.innerHTML = pagina.map(reg => `
        <tr>
            <td><strong>${reg.of || '—'}</strong></td>
            <td>${reg.referencia || '—'}</td>
            <td>${reg.descripcion || '—'}</td>
            <td>${reg.cliente || '—'}</td>
            <td>${reg.tipo_grabado || '—'}</td>
            <td><span class="celda-estado estado--en-revision">${reg.proceso || 'General'}</span></td>
            <td>${reg.maquina || '—'}</td>
            <td>${reg.fecha_programada || '—'}</td>
        </tr>
    `).join('');
    actualizarInfoPie();
}

function actualizarInfoPie() {
    const total = registrosFiltrados.length;
    const info = document.getElementById('pie-info');
    if (info) {
        info.innerHTML = `Vista Previa (Total: ${total} registros encontrados en Excel)`;
    }
}

// Búsqueda simple
document.getElementById('buscador-input').addEventListener('input', function(e) {
    const busqueda = e.target.value.toLowerCase();
    registrosFiltrados = DATOS_PLANI.filter(reg => 
        String(reg.of).toLowerCase().includes(busqueda) ||
        String(reg.cliente).toLowerCase().includes(busqueda) ||
        String(reg.referencia).toLowerCase().includes(busqueda)
    );
    paginaActual = 1;
    renderizarTabla();
});

renderizarTabla();
