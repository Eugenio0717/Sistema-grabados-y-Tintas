# Sistema de Grabados y Tintas - Cigar Rings

Este es un sistema basado en Django para la gestión de grabados y tintas. Incluye funcionalidades de sincronización con archivos Excel de producción.

## Requisitos Previos

- Python 3.10 o superior
- Git

## Instalación y Configuración

Sigue estos pasos para configurar el proyecto localmente:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Eugenio0717/Sistema-grabados-y-Tintas.git
   cd Sistema-grabados-y-Tintas
   ```

2. **Crear el entorno virtual:**
   ```bash
   python -m venv venv
   ```

3. **Activar el entorno virtual:**
   - En Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - En macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Instalar las dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configurar las variables de entorno:**
   - Copia el archivo `.env.example` a uno nuevo llamado `.env`.
   - Edita el archivo `.env` con tus configuraciones locales.

6. **Realizar las migraciones de la base de datos:**
   ```bash
   python manage.py migrate
   ```

7. **Crear un superusuario (opcional):**
   ```bash
   python manage.py createsuperuser
   ```

8. **Iniciar el servidor de desarrollo:**
   ```bash
   python manage.py runserver
   ```

## Notas adicionales

- Asegúrate de configurar la ruta del archivo Excel en el archivo `.env` o en `config/settings.py` (variable `PLANI_EXCEL_PATH`).
