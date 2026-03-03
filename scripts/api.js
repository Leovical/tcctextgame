import { API_URL } from './config.js';
import { getGuestId, setGuestId, getAuthToken } from './storage.js';

class ApiService {
    constructor() {
        this.state = null;
    }

    async request(endpoint, method = "POST", body = null, extraHeaders = {}) {

        let sessionId = localStorage.getItem('session_id') || '';
        const headers = { "Content-Type": "application/json", ...extraHeaders };

        if (sessionId) {
            headers["X-Session-ID"] = sessionId;
        }

        const guestId = getGuestId();
        if (guestId) headers["X-Guest-ID"] = guestId;

        const token = getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            const newSessionId = response.headers.get("X-Session-ID");
            if (newSessionId && newSessionId !== sessionId) {
                localStorage.setItem('session_id', newSessionId);
            }

            const newGuestId = response.headers.get("X-Guest-ID");
            if (newGuestId) setGuestId(newGuestId);

            const data = await response.json();
            return { ok: response.ok, data, status: response.status };
        } catch (error) {
            return { ok: false, data: { error: "FALHA DE CONEXÃO COM O SERVIDOR." } };
        }
    }

    async initializeGame(caseId) {
        return await this.request("/cases/initialize", "POST", { case_id: caseId });
    }

    async initializeTournamentCase(caseId, teamCode, matricula) {
        return await this.request("/cases/initialize", "POST", {
            case_id: caseId,
            team_code: teamCode,
            matricula: matricula
        });
    }

    async getGameProgress() {
        return await this.request("/game/progress", "GET");
    }

    async executeSQL(caseId, sql) {
        return await this.request("/game/execute", "POST", { case_id: caseId, sql });
    }

    async executeTournamentSQL(caseId, sql, teamCode, matricula) {
        return await this.request("/game/execute", "POST", {
            case_id: caseId,
            sql: sql,
            team_code: teamCode,
            matricula: matricula
        });
    }

    async tournamentStatus(teamCode) {
        return await this.request(`/game/tournament/status?team_code=${teamCode}`, "GET");
    }

    async getCases() {
        const res = await this.request("/cases", "GET");
        if (res.status === 401) {
            alert("Sessão expirada. Faça login novamente.");
            window.location.href = 'login.html';
            return null;
        }
        return res.data;
    }

    async validateTeam(code) {
        console.log('validateTeam chamado com código:', code);
        const url = `/game/team/validate?code=${code}`;
        console.log('URL da requisição:', `${API_URL}${url}`);
        const result = await this.request(url, "GET");
        console.log('Resultado da validação:', result);
        return result;
    }
}

export const api = new ApiService();