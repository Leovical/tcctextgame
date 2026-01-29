const API_BASE_URL = "http://localhost:8080/api";

document.addEventListener('DOMContentLoaded', () => {
    
    // ocultar/mostrar senha
    const passwordInput = document.getElementById('password-input');
    const toggleIcon = document.getElementById('toggle-password');

    if (passwordInput && toggleIcon) {
        toggleIcon.addEventListener('click', function() {
            const currentType = passwordInput.getAttribute('type');
            const newType = currentType === 'password' ? 'text' : 'password';
            
            passwordInput.setAttribute('type', newType);

            if (newType === 'text') {
                this.src = 'images/eye-open.png'; 
            } else {
                this.src = 'images/eye-slash.png';
            }
        });
    }

    // conexão com api
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username-input'); 

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const username = usernameInput.value;
            const password = passwordInput.value;

            if (!username || !password) {
                alert("Por favor, preencha usuário e senha.");
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "ENTRANDO...";
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("Login realizado:", data);

                    localStorage.setItem('auth_token', data.token);
                    
                    localStorage.setItem('user_data', JSON.stringify(data.user));

                    localStorage.removeItem('guest_id');

                    window.location.href = "index.html";
                } else {
                    alert(`Erro: ${data.error || "Falha no login"}`);
                }

            } catch (error) {
                console.error("Erro na requisição:", error);
                alert("Erro de conexão com o servidor. O API está rodando?");
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});