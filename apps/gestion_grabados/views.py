import pandas as pd
import json
import os
from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
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

# Función para sincronizar el Excel "Plani" (Vista Previa)
def sincronizar_plani(request):
    excel_path = getattr(settings, 'PLANI_EXCEL_PATH', None)
    
    if not excel_path or not os.path.exists(excel_path):
        return JsonResponse({
            'status': 'error', 
            'message': f'No se encontró el archivo en la ruta: {excel_path}'
        }, status=404)

    try:
        # Definir las hojas que queremos procesar específicamente
        hojas_a_procesar = ['STAMPING', 'EMBOSSING']
        datos_totales = []

        # Cargar el archivo completo para ver qué hojas existen realmente
        xls = pd.ExcelFile(excel_path, engine='openpyxl')
        hojas_reales = [h for h in hojas_a_procesar if h in xls.sheet_names]

        if not hojas_reales:
            return JsonResponse({
                'status': 'error', 
                'message': 'No se encontraron las hojas "STAMPING" o "EMBOSSING" en el archivo.'
            }, status=400)

        for nombre_hoja in hojas_reales:
            # Leer las primeras filas para detectar el encabezado
            df_preview = pd.read_excel(excel_path, engine='openpyxl', sheet_name=nombre_hoja, nrows=10, header=None)
            header_row = 0
            for index, row in df_preview.iterrows():
                # Buscamos la fila que tenga "ORDEN" o "Orden"
                if any(str(val).strip().upper() == "ORDEN" for val in row):
                    header_row = index
                    break
            
            # Leer la hoja desde el encabezado detectado
            df = pd.read_excel(excel_path, engine='openpyxl', sheet_name=nombre_hoja, header=header_row)
            df.columns = [str(c).strip().upper() for c in df.columns]

            # Mapeo específico para estas hojas de producción
            mapeo = {
                'of': ['ORDEN', 'OF', 'ORDEN DE FABRICACIÓN'],
                'referencia': ['REFERENCIA', 'REF'],
                'cliente': ['CLIENTE', 'NOMBRE'],
                'descripcion': ['REFERENCIA'], # En estas hojas la Referencia suele ser la descripción
                'proceso': [nombre_hoja], # El proceso es el nombre de la hoja
                'horas_proceso': ['HORAS PROCESO', 'HORAS', 'PREV HR'],
                'papel': ['PAPEL'],
                'cantidad_formatos': ['CANTIDAD FORMATOS', 'CANTIDAD', 'FORMATOS'],
                'responsable': ['RESPONSABLE', 'MAQUINA']
            }

            columnas_finales = {}
            for campo, opciones in mapeo.items():
                for opcion in opciones:
                    if opcion in df.columns:
                        columnas_finales[campo] = opcion
                        break
            
            if 'of' not in columnas_finales:
                continue # Saltar hoja si no tiene columna de orden

            # Extraer datos de esta hoja
            for _, row in df.iterrows():
                of_val = row[columnas_finales['of']]
                # Ignorar si la OF no es un número o está vacía
                if pd.isna(of_val) or str(of_val).strip() == "" or not str(of_val).strip().isdigit():
                    continue
                
                item = {}
                for campo, col_excel in columnas_finales.items():
                    val = row.get(col_excel)
                    if pd.isna(val): val = None
                    item[campo] = val
                
                # Forzar el nombre del proceso como el nombre de la hoja
                item['proceso'] = nombre_hoja
                datos_totales.append(item)

        if not datos_totales:
            return JsonResponse({
                'status': 'error', 
                'message': 'No se encontraron datos de producción válidos en las hojas procesadas.'
            }, status=400)

        return JsonResponse({
            'status': 'ok',
            'data': datos_totales
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error al procesar el Excel: {str(e)}'
        }, status=500)

# Función para GUARDAR los datos tras la confirmación
@csrf_exempt # Simplificado para el ejemplo, en prod usar CSRF token
def confirmar_sincronizacion(request):
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            datos = body.get('datos', [])

            creados = 0
            actualizados = 0

            for row in datos:
                # Asegurarse de que 'of' tenga un valor
                if not row.get('of') or row['of'] == '—':
                    continue

                obj, created = OrdenFabricacion.objects.update_or_create(
                    of=str(row['of']),
                    defaults={
                        'referencia': row.get('referencia'),
                        'descripcion': row.get('descripcion', 'Sin descripción'),
                        'cliente': row.get('cliente', 'Desconocido'),
                        'proceso': row.get('proceso', 'General'),
                        'horas_proceso': row.get('horas_proceso'),
                        'papel': row.get('papel'),
                        'cantidad_formatos': row.get('cantidad_formatos'),
                        'responsable': row.get('responsable'),
                    }
                )
                if created: creados += 1
                else: actualizados += 1

            return JsonResponse({
                'status': 'ok',
                'message': f'Sincronización exitosa. Creados: {creados}, Actualizados: {actualizados}'
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)