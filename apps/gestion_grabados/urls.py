from django.urls import path
from . import views


app_name = 'grabados'

urlpatterns = [
     # Dirección: /grabados/consulta/
    path('consulta/', views.grabado_consulta, name='grabado_consulta'),
]