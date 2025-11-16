package core

import (
	"casos-de-codigo/internal/db"
)

type GameResponse struct {
	Narrative string      `json:"narrative"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
}

type Case interface {
	GetID() string
	GetLoadNarrative(puzzleState int) string
	GetSchema() string
	ProcessCommand(command string, dbm *db.DBManager, puzzleState int, currentFocus string) (GameResponse, int, string)
}
