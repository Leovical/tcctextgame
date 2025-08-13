package main

import (
	"casos-de-codigo/internal/db"
	"casos-de-codigo/internal/web"
	"log"
)

func main() {
	addr := ":8080"
	playerDBPath := "./player.db"
	solutionDBPath := "./solution.db"

	dbManager, err := db.NewDBManager(playerDBPath, solutionDBPath)
	if err != nil {
		log.Fatalf("Erro ao iniciar os bancos de dados: %v", err)
	}
	defer dbManager.Close()

	server := web.NewServer(addr, dbManager)

	if err := server.Run(); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
