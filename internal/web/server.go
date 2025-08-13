package web

import (
	"casos-de-codigo/internal/db"
	"log"
	"net/http"
)

type Server struct {
	addr    string
	handler *Handler
}

func NewServer(addr string, dbManager *db.DBManager) *Server {
	return &Server{
		addr:    addr,
		handler: NewHandler(dbManager),
	}
}

func (s *Server) Run() error {
	fs := http.FileServer(http.Dir("web"))
	http.Handle("/", fs)

	http.HandleFunc("/api/execute-sql", s.handler.HandleExecuteSQL)

	log.Printf("Servidor iniciado em http://localhost%s", s.addr)
	return http.ListenAndServe(s.addr, nil)
}
