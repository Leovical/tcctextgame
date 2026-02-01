const API_BASE_URL = "https://casosdecodigo-5l0x.onrender.com/api";

document.addEventListener('DOMContentLoaded', () => {
    
    // ocultar/mostrar senha
    function setupToggle(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (input && icon) {
            icon.addEventListener('click', function() {
                const currentType = input.getAttribute('type');
                const newType = currentType === 'password' ? 'text' : 'password';
                
                input.setAttribute('type', newType);

                if (newType === 'text') {
                    this.src = 'images/eye-open.png';
                } else {
                    this.src = 'images/eye-slash.png';
                }
            });
        }
    }

    setupToggle('pass-1', 'toggle-1');
    setupToggle('pass-2', 'toggle-2');

    // registro api
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('pass-1');
    const confirmPasswordInput = document.getElementById('pass-2');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (password !== confirmPassword) {
                alert("ERRO: As senhas não coincidem!");
                confirmPasswordInput.style.border = "2px solid red";
                return;
            } else {
                confirmPasswordInput.style.border = ""; 
            }

            if (password.length < 6) {
                alert("A senha precisa ter pelo menos 6 caracteres.");
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "REGISTRANDO...";
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
                    alert("Agente credenciado com sucesso!");
                    
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    localStorage.removeItem('guest_id');

                    window.location.href = "login.html";
                } else {
                    alert(`Erro: ${data.error || "Falha no registro"}`);
                }

            } catch (error) {
                console.error("Erro:", error);
                alert("Erro de conexão com o servidor.");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});