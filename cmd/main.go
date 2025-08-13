package main

import (
	"casos-de-codigo/internal/web"
	"log"
)

func main() {
	addr := ":8080"

	server := web.NewServer(addr)

	if err := server.Run(); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
