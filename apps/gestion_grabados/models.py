from django.db import models

class OrdenFabricacion(models.Model):
    # --- Datos que vendrán del Excel "Plani" ---
    of = models.CharField(max_length=20, unique=True, verbose_name="Número de OF")
    referencia = models.CharField(max_length=20, blank=True, null=True, verbose_name="OF Referencia")
    descripcion = models.TextField(verbose_name="Descripción del trabajo")
    cliente = models.CharField(max_length=150)
    tipo_grabado = models.CharField(max_length=50, verbose_name="Tipo de Grabado")
    proceso = models.CharField(max_length=50)
    maquina = models.CharField(max_length=100, verbose_name="Máquina")
    fecha_programada = models.DateField(null=True, blank=True, verbose_name="Fecha Prog.")

    # --- Datos de Control Interno (Tu Base de Datos Local) ---
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROCESO', 'En Proceso'),
        ('COMPLETADO', 'Completado'),
        ('REVISION', 'En Revisión'),
        ('CANCELADO', 'Cancelado'),
    ]
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    ubicacion = models.CharField(max_length=200, blank=True, null=True, verbose_name="Ubicación Física")
    sobre = models.CharField(max_length=100, blank=True, null=True, verbose_name="Número de Sobre/Caja")
    
    # Metadatos
    actualizado_el = models.DateTimeField(auto_now=True)
    creado_el = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"OF {self.of} - {self.cliente}"

    class Meta:
        verbose_name = "Orden de Fabricación"
        verbose_name_plural = "Órdenes de Fabricación"
        ordering = ['-fecha_programada']

