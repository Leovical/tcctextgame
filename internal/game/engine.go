package game

import (
	"casos-de-codigo/internal/core"
	"casos-de-codigo/internal/db"
	"fmt"
	"log"
	"strconv"
	"strings"
)

type PlayerState struct {
	CurrentCaseID string
	CurrentPuzzle int
	CurrentFocus  string
}

type GameEngine struct {
	dbManager       *db.DBManager
	playerState     *PlayerState
	activeCase      core.Case
	isAwaitingReset bool
}

func NewGameEngine(dbm *db.DBManager, initialCase core.Case) (*GameEngine, error) {
	engine := &GameEngine{
		dbManager:       dbm,
		playerState:     &PlayerState{},
		activeCase:      initialCase,
		isAwaitingReset: false,
	}

	puzzleState, err := dbm.ReadState("current_puzzle")
	if err != nil {
		log.Printf("Erro ao ler estado do puzzle, iniciando do zero: %v", err)
		puzzleState = 1
	}

	focusState, err := dbm.ReadStringState("current_focus")
	if err != nil {
		log.Printf("Erro ao ler estado de foco, iniciando do zero: %v", err)
		focusState = "none"
	}

	engine.playerState.CurrentCaseID = initialCase.GetID()
	engine.playerState.CurrentPuzzle = puzzleState
	engine.playerState.CurrentFocus = focusState
	log.Printf("Caso '%s' carregado. Puzzle: %d. Foco: %s.", initialCase.GetID(), puzzleState, focusState)

	return engine, nil
}

func (e *GameEngine) ProcessCommand(command string) core.GameResponse {
	trimmedCommand := strings.TrimSpace(command)
	upperCommand := strings.ToUpper(trimmedCommand)

	if e.isAwaitingReset {
		e.isAwaitingReset = false
		switch upperCommand {
		case "Y", "YES", "S", "SIM":
			schema := e.activeCase.GetSchema()
			err := e.dbManager.ResetDatabase(schema)
			if err != nil {
				log.Printf("ERRO CRÍTICO: Falha ao resetar o banco de dados: %v", err)
				return core.GameResponse{Error: "Falha ao resetar o banco."}
			}
			e.playerState.CurrentPuzzle = 1
			e.playerState.CurrentFocus = "none"
			log.Println("Progresso do jogador resetado.")
			return core.GameResponse{Narrative: "Progresso resetado.\n\n" + e.activeCase.GetLoadNarrative(e.playerState.CurrentPuzzle)}
		default:
			return core.GameResponse{Narrative: "Reset cancelado."}
		}
	}
	if upperCommand == "RESET" || upperCommand == "REINICIAR" {
		e.isAwaitingReset = true
		return core.GameResponse{Narrative: "Tem certeza que deseja apagar todo o seu progresso neste caso e começar do zero? (y/n)"}
	}

	if trimmedCommand == "START_GAME" {
		return core.GameResponse{Narrative: e.activeCase.GetLoadNarrative(e.playerState.CurrentPuzzle)}
	}

	if response, handled := e.handleDebugCommands(command); handled {
		return response
	}

	response, nextPuzzleState, nextFocusState := e.activeCase.ProcessCommand(
		command,
		e.dbManager,
		e.playerState.CurrentPuzzle,
		e.playerState.CurrentFocus,
	)

	if nextPuzzleState != e.playerState.CurrentPuzzle {
		err := e.dbManager.WriteState("current_puzzle", nextPuzzleState)
		if err != nil {
			log.Printf("ERRO CRÍTICO: Não foi possível salvar o estado do puzzle: %v", err)
		}
		e.playerState.CurrentPuzzle = nextPuzzleState
	}

	if nextFocusState != e.playerState.CurrentFocus {
		err := e.dbManager.WriteStringState("current_focus", nextFocusState)
		if err != nil {
			log.Printf("ERRO CRÍTICO: Não foi possível salvar o estado de foco: %v", err)
		}
		e.playerState.CurrentFocus = nextFocusState
	}

	return response
}

func (e *GameEngine) handleDebugCommands(command string) (core.GameResponse, bool) {
	upperCommand := strings.ToUpper(strings.TrimSpace(command))

	if strings.HasPrefix(upperCommand, "SETPUZZLE ") {
		targetPuzzleStr := strings.TrimPrefix(upperCommand, "SETPUZZLE ")
		targetPuzzle, err := strconv.Atoi(targetPuzzleStr)
		if err != nil {
			return core.GameResponse{Error: "Formato de debug inválido. Use SETPUZZLE <numero>"}, true
		}

		err = e.dbManager.WriteState("current_puzzle", targetPuzzle)
		if err != nil {
			log.Printf("ERRO CRÍTICO: Não foi possível salvar o estado (debug): %v", err)
		}

		err = e.dbManager.WriteStringState("current_focus", "none")
		if err != nil {
			log.Printf("ERRO CRÍTICO: Não foi possível salvar o estado (debug): %v", err)
		}

		e.playerState.CurrentPuzzle = targetPuzzle
		e.playerState.CurrentFocus = "none"

		narrativa := fmt.Sprintf("DEBUG: Estado do jogo forçado para Puzzle %d.\n\n%s", targetPuzzle, e.activeCase.GetLoadNarrative(targetPuzzle))
		return core.GameResponse{Narrative: narrativa}, true
	}

	return core.GameResponse{}, false
}
