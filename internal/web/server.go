package web

import (
	"casos-de-codigo/internal/game"
	"log"
	"net/http"
)

type Server struct {
	addr    string
	handler *Handler
}

func NewServer(addr string, engine *game.GameEngine) *Server {
	return &Server{
		addr:    addr,
		handler: NewHandler(engine),
	}
}

func (s *Server) Run() error {
	http.HandleFunc("/api/execute-sql", s.handler.HandleExecuteSQL)

	fs := http.FileServer(http.Dir("web"))
	http.Handle("/", fs)

	log.Printf("Servidor iniciado em http://localhost%s", s.addr)
	return http.ListenAndServe(s.addr, nil)
}
