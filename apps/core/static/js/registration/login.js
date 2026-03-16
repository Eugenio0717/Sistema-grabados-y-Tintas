document.addEventListener('DOMContentLoaded', function() {

    // Referencias DOM
    const loginForm = document.getElementById('loginForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('id_password'); // Changed from #password
    const usernameInput = document.getElementById('id_username'); // Changed from #username
    const messageContainer = document.getElementById('messageContainer');

    // Toggle mostrar/ocultar contraseña
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Funciones para los enlaces del footer
    window.forgotPassword = function() {
        alert('Funcionalidad "Olvidé mi contraseña"\n\nEn producción, aquí se abriría un modal o se redirigiría a una página para recuperar la contraseña.');
    }

    window.showHelp = function() {
        alert('Centro de Ayuda\n\nAquí encontrarías:\n- Guías de usuario\n- Preguntas frecuentes\n- Soporte técnico\n- Tutoriales del sistema');
    }

    window.showPrivacy = function() {
        alert('Política de Privacidad\n\nInformación sobre:\n- Recolección de datos\n- Uso de cookies\n- Protección de información\n- Derechos del usuario');
    }

    window.showTerms = function() {
        alert('Términos y Condiciones\n\nIncluye:\n- Términos de uso\n- Licencias de software\n- Limitaciones de responsabilidad\n- Acuerdos de servicio');
    }

    // Auto-focus en el campo de usuario al cargar la página
    if (usernameInput) {
        usernameInput.focus();
    }

    // Manejo de Enter en los inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                if (this.id === 'id_username') {
                    if(passwordInput) passwordInput.focus();
                } else if (this.id === 'id_password') {
                    if(loginForm) loginForm.submit();
                }
            }
        });
    });

    // Limpiar mensajes de error de Django al hacer focus en inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', function() {
            if (messageContainer) {
                messageContainer.innerHTML = '';
            }
        });
    });

    // Animación de entrada
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
        loginContainer.style.opacity = '0';
        loginContainer.style.transform = 'translateY(50px) scale(0.9)';
        
        setTimeout(() => {
            loginContainer.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            loginContainer.style.opacity = '1';
            loginContainer.style.transform = 'translateY(0) scale(1)';
        }, 100);
    }
});
