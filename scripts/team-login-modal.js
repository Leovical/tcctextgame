import { api } from './api.js';
import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const teamModal = document.getElementById('team-modal');
    const memberModal = document.getElementById('member-modal');
    const tournamentBtn = document.getElementById('tournament-btn');
    const cancelTeamBtn = document.getElementById('team-modal-cancel');
    const confirmTeamBtn = document.getElementById('team-modal-confirm');
    const codeInput = document.getElementById('team-code-input');
    const teamErrorP = document.getElementById('team-modal-error');

    const memberListDiv = document.getElementById('member-list');
    const cancelMemberBtn = document.getElementById('member-modal-cancel');
    const confirmMemberBtn = document.getElementById('member-modal-confirm');
    const memberErrorP = document.getElementById('member-modal-error');

    let selectedMatricula = null;
    let teamData = null;
    let memberEventSource = null;

    tournamentBtn.addEventListener('click', () => {
        teamModal.classList.remove('hidden');
        codeInput.value = '';
        teamErrorP.style.display = 'none';
        codeInput.focus();
    });

    cancelTeamBtn.addEventListener('click', () => {
        teamModal.classList.add('hidden');
    });

    teamModal.addEventListener('click', (e) => {
        if (e.target === teamModal) {
            teamModal.classList.add('hidden');
        }
    });

    confirmTeamBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
            teamErrorP.textContent = 'Digite um código.';
            teamErrorP.style.display = 'block';
            return;
        }

        confirmTeamBtn.disabled = true;
        confirmTeamBtn.textContent = 'VALIDANDO...';

        try {
            const result = await api.validateTeam(code);
            if (result.ok && result.data.valid) {
                teamData = result.data;
                teamModal.classList.add('hidden');
                showMemberSelection();
            } else {
                teamErrorP.textContent = result.data.error || 'time não encontrado';
                teamErrorP.style.display = 'block';
            }
        } catch (error) {
            teamErrorP.textContent = 'Erro de conexão.';
            teamErrorP.style.display = 'block';
        } finally {
            confirmTeamBtn.disabled = false;
            confirmTeamBtn.textContent = 'VALIDAR';
        }
    });

    function showMemberSelection() {
        memberListDiv.innerHTML = '';
        teamData.members.forEach(member => {
            const btn = document.createElement('button');
            btn.className = 'member-option';
            btn.dataset.matricula = member.matricula;
            btn.innerHTML = `${member.nome} (${member.matricula})`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.member-option').forEach(el => el.classList.remove('selected'));
                btn.classList.add('selected');
                selectedMatricula = member.matricula;
            });
            memberListDiv.appendChild(btn);
        });

        // Conectar SSE para atualizações em tempo real
        if (memberEventSource) memberEventSource.close();
        memberEventSource = new EventSource(`${API_URL}/tournament/subscribe-members?team_code=${teamData.team_code}`);
        memberEventSource.addEventListener('member-status', (e) => {
            const data = JSON.parse(e.data);
            updateMemberButtons(data.matricula, data.status === 'occupied');
        });
        memberEventSource.onerror = () => {
            console.warn('SSE member error, retrying...');
            memberEventSource.close();
            setTimeout(() => showMemberSelection(), 5000);
        };

        memberModal.classList.remove('hidden');
        memberErrorP.style.display = 'none';
    }

    function updateMemberButtons(matricula, occupied) {
        const btns = document.querySelectorAll('.member-option');
        btns.forEach(btn => {
            if (btn.dataset.matricula === matricula) {
                if (occupied) {
                    btn.disabled = true;
                    btn.classList.add('occupied');
                    if (btn.classList.contains('selected')) {
                        btn.classList.remove('selected');
                        selectedMatricula = null;
                    }
                } else {
                    btn.disabled = false;
                    btn.classList.remove('occupied');
                }
            }
        });
    }

    cancelMemberBtn.addEventListener('click', () => {
        if (memberEventSource) memberEventSource.close();
        memberModal.classList.add('hidden');
        teamModal.classList.remove('hidden');
        selectedMatricula = null;
    });

    confirmMemberBtn.addEventListener('click', async () => {
        if (!selectedMatricula) {
            memberErrorP.textContent = 'Selecione uma matrícula.';
            memberErrorP.style.display = 'block';
            return;
        }

        confirmMemberBtn.disabled = true;
        confirmMemberBtn.textContent = 'RESERVANDO...';

        try {
            const reserveResult = await api.request('/tournament/reserve', 'POST', {
                team_code: teamData.team_code,
                matricula: selectedMatricula
            });
            if (reserveResult.ok) {
                if (memberEventSource) memberEventSource.close();
                sessionStorage.setItem('team_code', teamData.team_code);
                sessionStorage.setItem('team_members', JSON.stringify(teamData.members));
                sessionStorage.setItem('tournament_cases', JSON.stringify(teamData.cases));
                sessionStorage.setItem('my_matricula', selectedMatricula);
                window.location.href = 'team-select-case.html';
            } else {
                memberErrorP.textContent = reserveResult.data.error || 'Erro ao reservar';
                memberErrorP.style.display = 'block';
            }
        } catch (error) {
            memberErrorP.textContent = 'Erro de conexão.';
            memberErrorP.style.display = 'block';
        } finally {
            confirmMemberBtn.disabled = false;
            confirmMemberBtn.textContent = 'SELECIONAR';
        }
    });

    memberModal.addEventListener('click', (e) => {
        if (e.target === memberModal) {
            cancelMemberBtn.click();
        }
    });
});