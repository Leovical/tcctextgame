package main

import (
	"casos-de-codigo/internal/cases"
	"casos-de-codigo/internal/db"
	"casos-de-codigo/internal/game"
	"casos-de-codigo/internal/web"
	"fmt"
	"log"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	casoParaJogar := &cases.Case1{}

	playerDBPath := fmt.Sprintf("./player_%s.db", casoParaJogar.GetID())
	dbSchema := casoParaJogar.GetSchema()

	dbManager, err := db.NewDBManager(playerDBPath, dbSchema)
	if err != nil {
		log.Fatalf("Erro ao iniciar o banco de dados: %v", err)
	}
	defer dbManager.Close()

	gameEngine, err := game.NewGameEngine(dbManager, casoParaJogar)
	if err != nil {
		log.Fatalf("Erro ao iniciar o motor do jogo: %v", err)
	}

	server := web.NewServer(addr, gameEngine)

	if err := server.Run(); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
