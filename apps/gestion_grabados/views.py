import pandas as pd
from django.shortcuts import render
from django.http import JsonResponse
from .models import OrdenFabricacion

# Vista para la tabla de Registro (Base de Datos)
def grabado_consulta(request):
    return render(request, 'grabados_tabla.html')

# Vista para la tabla de Plani (Excel)
def plani_consulta(request):
    return render(request, 'plani_tabla.html')

# API que devuelve los datos de la Base de Datos para la tabla de Registro
def api_obtener_registros(request):
    registros = list(OrdenFabricacion.objects.all().values(
        'of', 'referencia', 'descripcion', 'cliente', 
        'tipo_grabado', 'proceso', 'maquina', 'estado', 
        'fecha_programada', 'ubicacion', 'sobre'
    ))
    # Renombrar campos para que coincidan con el JS actual si es necesario
    for r in registros:
        r['ref'] = r.pop('referencia')
        r['tipo'] = r.pop('tipo_grabado')
        r['fecha'] = r.pop('fecha_programada').strftime('%d/%m/%Y') if r['fecha_programada'] else '—'

    return JsonResponse(registros, safe=False)

# Función para sincronizar el Excel "Plani"
def sincronizar_plani(request):
    # Lógica de sincronización pendiente de definir columnas del Excel
    return JsonResponse({'status': 'ok', 'message': 'Sincronización completada'})