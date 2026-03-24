from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls')), # Ruta principal (Dashboard)
    path('grabados/', include('apps.gestion_grabados.urls')), # Rutas para gestión de grabados
]
