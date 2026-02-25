import { API_URL } from './config.js';
import { getGuestId, setGuestId, getAuthToken } from './storage.js';

class ApiService {
    constructor() {
        this.state = null;
    }

    async request(endpoint, method = "POST", body = null, extraHeaders = {}) {
        const headers = { "Content-Type": "application/json", ...extraHeaders };
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

    async getGameProgress() {
        return await this.request("/game/progress", "GET");
    }

    async executeSQL(caseId, sql) {
        return await this.request("/game/execute", "POST", { case_id: caseId, sql });
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
}

export const api = new ApiService();