import { api } from './api.js';
import { API_URL } from './config.js';

async function checkExistingSession(teamCode, matricula) {
    try {
        const progressRes = await api.request(`/game/progress?team_code=${teamCode}`, 'GET');
        if (progressRes.ok && progressRes.data) {
            const progression = progressRes.data.find(p => p.matricula === matricula && p.active);
            if (progression) {
                window.location.href = `game.html?id=${progression.case_id}&team_code=${teamCode}&matricula=${matricula}`;
                return true;
            }
        }
        window.location.href = 'team-select-case.html';
        return true;
    } catch (error) {
        console.error('Erro ao verificar progressão:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {

    const existingTeamCode = sessionStorage.getItem('team_code');
    const existingMatricula = sessionStorage.getItem('my_matricula');

    if (existingTeamCode && existingMatricula && existingMatricula !== 'null') {
        const handled = await checkExistingSession(existingTeamCode, existingMatricula);
        if (handled) return;
    }

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
    let memberWs = null;

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

                const myMatriculaRes = await api.request(`/tournament/my-matricula?team_code=${teamData.team_code}`, 'GET');
                if (myMatriculaRes.ok && myMatriculaRes.data.matricula && myMatriculaRes.data.matricula !== 'null') {
                    sessionStorage.setItem('team_code', teamData.team_code);
                    sessionStorage.setItem('team_members', JSON.stringify(teamData.members));
                    sessionStorage.setItem('tournament_cases', JSON.stringify(teamData.cases));
                    sessionStorage.setItem('my_matricula', myMatriculaRes.data.matricula);
                    checkExistingSession(teamData.team_code, myMatriculaRes.data.matricula);
                    return;
                }

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

        if (memberWs) memberWs.close();
        const wsUrl = API_URL.replace('http', 'ws') + `/game/team/ws?team_code=${teamData.team_code}`;
        memberWs = new WebSocket(wsUrl);
        memberWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.matricula) {
                updateMemberButtons(data.matricula, data.status === 'occupied', data.sessionId);
            }
        };
        memberWs.onclose = () => {
            console.warn('WebSocket member fechado. Tentando reconectar...');
            setTimeout(() => showMemberSelection(), 5000);
        };

        memberModal.classList.remove('hidden');
        memberErrorP.style.display = 'none';
    }

    function updateMemberButtons(matricula, occupied, sessionId) {
        const mySessionId = localStorage.getItem('session_id');
        const btns = document.querySelectorAll('.member-option');
        btns.forEach(btn => {
            if (btn.dataset.matricula === matricula) {
                if (occupied) {
                    if (sessionId && sessionId !== mySessionId) {
                        btn.disabled = true;
                        btn.classList.add('occupied');
                    } else {
                        btn.disabled = false;
                        btn.classList.remove('occupied');
                    }
                } else {
                    btn.disabled = false;
                    btn.classList.remove('occupied');
                }
            }
        });
    }

    cancelMemberBtn.addEventListener('click', () => {
        if (memberWs) memberWs.close();
        memberModal.classList.add('hidden');
        teamModal.classList.remove('hidden');
        selectedMatricula = null;
    });

    confirmMemberBtn.addEventListener('click', async () => {
        const selectedElement = document.querySelector('.member-option.selected');
        if (!selectedElement) {
            memberErrorP.textContent = 'Selecione uma matrícula.';
            memberErrorP.style.display = 'block';
            return;
        }
        const matriculaEscolhida = selectedElement.dataset.matricula;

        confirmMemberBtn.disabled = true;
        confirmMemberBtn.textContent = 'RESERVANDO...';

        try {
            const reserveResult = await api.request('/tournament/reserve', 'POST', {
                team_code: teamData.team_code,
                matricula: matriculaEscolhida
            });

            if (reserveResult.status === 409 && reserveResult.data.error?.includes('sessão já possui uma matrícula reservada')) {
                const myRes = await api.request(`/tournament/my-matricula?team_code=${teamData.team_code}`, 'GET');
                if (myRes.ok && myRes.data.matricula && myRes.data.matricula !== 'null') {
                    sessionStorage.setItem('team_code', teamData.team_code);
                    sessionStorage.setItem('team_members', JSON.stringify(teamData.members));
                    sessionStorage.setItem('tournament_cases', JSON.stringify(teamData.cases));
                    sessionStorage.setItem('my_matricula', myRes.data.matricula);
                    checkExistingSession(teamData.team_code, myRes.data.matricula);
                    return;
                }
            }

            if (reserveResult.ok) {
                if (memberWs) memberWs.close();
                sessionStorage.setItem('team_code', teamData.team_code);
                sessionStorage.setItem('team_members', JSON.stringify(teamData.members));
                sessionStorage.setItem('tournament_cases', JSON.stringify(teamData.cases));
                sessionStorage.setItem('my_matricula', matriculaEscolhida);
                checkExistingSession(teamData.team_code, matriculaEscolhida);
                return;
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