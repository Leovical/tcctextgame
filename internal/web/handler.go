package web

import (
	"casos-de-codigo/internal/db"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

type Handler struct {
	dbManager *db.DBManager
}

func NewHandler(dbManager *db.DBManager) *Handler {
	return &Handler{dbManager: dbManager}
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

	if strings.HasPrefix(strings.TrimSpace(strings.ToUpper(req.SQL)), "SELECT") {
		h.handleSelectQuery(w, r, req.SQL)
	} else {
		h.handleExecStatement(w, r, req.SQL)
	}
}

func (h *Handler) handleSelectQuery(w http.ResponseWriter, r *http.Request, query string) {
	rows, err := h.dbManager.QueryPlayer(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		scanArgs := make([]interface{}, len(columns))
		for i := range values {
			scanArgs[i] = &values[i]
		}
		rows.Scan(scanArgs...)

		row := make(map[string]interface{})
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				row[columns[i]] = string(b)
			} else {
				row[columns[i]] = v
			}
		}
		results = append(results, row)
	}

	response := map[string]interface{}{
		"message": "Consulta executada com sucesso",
		"data":    results,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) handleExecStatement(w http.ResponseWriter, r *http.Request, query string) {
	// TODO: Implementar a validação de segurança aqui para comandos como DROP TABLE.
	result, err := h.dbManager.ExecuteQueryPlayer(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rowsAffected, _ := result.RowsAffected()

	response := map[string]interface{}{
		"message":       "Comando executado com sucesso",
		"rows_affected": rowsAffected,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
