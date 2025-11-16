package web

import (
	"casos-de-codigo/internal/game"
	"encoding/json"
	"log"
	"net/http"
)

type Handler struct {
	engine *game.GameEngine
}

func NewHandler(engine *game.GameEngine) *Handler {
	return &Handler{
		engine: engine,
	}
}

type ExecuteRequest struct {
	SQL string `json:"sql"`
}

func (h *Handler) HandleExecuteSQL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método não permitido", http.StatusMethodNotAllowed)
		return
	}

	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Requisição inválida: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("Comando recebido: %s", req.SQL)

	response := h.engine.ProcessCommand(req.SQL)

	w.Header().Set("Content-Type", "application/json")
	if response.Error != "" {
		w.WriteHeader(http.StatusBadRequest)
	}
	json.NewEncoder(w).Encode(response)
}
