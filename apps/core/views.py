from django.shortcuts import render
from django.contrib.auth.decorators import login_required # Importamos el decorador

def dashboard(request):
    return render(request, 'dashboard.html')
@login_required # ¡Aquí está el guardia de seguridad!
def dashboard(request):
    return render(request, 'dashboard.html')