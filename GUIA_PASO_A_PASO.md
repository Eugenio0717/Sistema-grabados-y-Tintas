# Guía de Construcción: Sistema de Grabado y Tintas

Esta guía documenta el progreso y los pasos técnicos para la construcción del sistema.

---

## 📊 Tablero de Control de Implementación

| Fase | Acción Técnica | Estado | % Avance | Detalle |
| :--- | :--- | :--- | :--- | :--- |
| **1. Entorno** | Python Venv, Django v6.0.2 | ✅ Listo | 100% | Entorno aislado y núcleo instalado. |
| **2. Estructura** | Carpeta `apps/` y Módulos | ✅ Listo | 100% | `core`, `gestion_grabados` y `gestion_tintas` creadas. |
| **3. Configuración** | `settings.py` (Apps, Static, Templates) | ✅ Listo | 100% | Rutas base y librerías de terceros vinculadas. |
| **4. Modelado** | Definición de Tablas y Relaciones | ⏳ Pendiente | 0% | Definición de campos para Grabados y Tintas. |
| **5. Base de Datos** | Migraciones y Superusuario | ⏳ Pendiente | 0% | Creación física de tablas y acceso admin. |
| **6. Interfaz (UI)** | Layout Base y Bootstrap 5 | ⏳ Pendiente | 0% | Creación de `base.html` y estilos CSS. |

---

## 🛠️ Detalle de Fases Completadas

### Fase 1: Entorno y Dependencias
1. **Entorno Virtual**: `python -m venv venv`
2. **Activación**: `.\venv\Scripts\activate`
3. **Dependencias Clave**: 
   - `Django==6.0.2`: Núcleo del sistema.
   - `django-crispy-forms`: Para formularios elegantes.
   - `Pillow`: Para manejo de imágenes de grabados.
   - `python-decouple`: Para seguridad de claves API.

### Fase 2: Arquitectura Modular
Hemos separado el proyecto en aplicaciones para facilitar el mantenimiento:
- `apps.core`: Manejo de usuarios y dashboard.
- `apps.gestion_grabados`: Control de pedidos y diseños.
- `apps.gestion_tintas`: Inventario y mezclas de colores.

---

## 📅 Próximos Pasos (Fase 4: Modelado)

Para la siguiente etapa, implementaremos los modelos con seguimiento de estado:

| Modelo | Campo | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **Grabado** | `estado` | Choice | (Pendiente, En Proceso, Finalizado) |
| **Grabado** | `progreso` | Integer | Porcentaje de avance de la producción (0-100%) |
| **Tinta** | `stock_kg` | Float | Cantidad actual en almacén. |
| **Tinta** | `alerta` | Boolean | Activa si el porcentaje de stock es menor al 20%. |
