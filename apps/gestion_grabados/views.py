from django.shortcuts import render

 # Esta función busca el archivo 'grabados_tabla.html' y lo muestra
def grabado_consulta(request):
    return render(request, 'grabados_tabla.html')