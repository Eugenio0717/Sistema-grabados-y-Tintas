from django.urls import path
from . import views


app_name = 'grabados'

urlpatterns = [
    # Vistas de Tablas
    path('consulta/', views.grabado_consulta, name='grabado_consulta'),
    path('plani/', views.plani_consulta, name='plani_consulta'),

    # Endpoints de API
    path('api/registros/', views.api_obtener_registros, name='api_registros'),
    path('api/sincronizar/', views.sincronizar_plani, name='api_sincronizar'),
]