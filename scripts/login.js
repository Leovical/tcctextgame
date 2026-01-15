document.addEventListener('DOMContentLoaded', () => {
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
});