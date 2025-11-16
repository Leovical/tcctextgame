package game

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
	GetStartNarrative() string
	ProcessCommand(command string, dbm *db.DBManager, puzzleState int) (GameResponse, int)
}
