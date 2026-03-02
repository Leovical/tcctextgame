import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('team-modal');
    const tournamentBtn = document.getElementById('tournament-btn');
    const cancelBtn = document.getElementById('team-modal-cancel');
    const confirmBtn = document.getElementById('team-modal-confirm');
    const codeInput = document.getElementById('team-code-input');
    const errorP = document.getElementById('team-modal-error');

    tournamentBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        codeInput.value = '';
        errorP.style.display = 'none';
        codeInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    confirmBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
            errorP.textContent = 'Digite um código.';
            errorP.style.display = 'block';
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'VALIDANDO...';

        try {
            const result = await api.validateTeam(code);
            if (result.ok && result.data.valid) {
                sessionStorage.setItem('team_code', result.data.team_code);
                sessionStorage.setItem('team_members', JSON.stringify(result.data.members));
                sessionStorage.setItem('tournament_cases', JSON.stringify(result.data.cases));
                window.location.href = 'team-select-case.html';
            } else {
                errorP.textContent = result.data.error || 'time não encontrado';
                errorP.style.display = 'block';
            }
        } catch (error) {
            errorP.textContent = 'Erro de conexão.';
            errorP.style.display = 'block';
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'VALIDAR';
        }
    });
});