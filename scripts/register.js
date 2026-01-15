document.addEventListener('DOMContentLoaded', () => {
    
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
});