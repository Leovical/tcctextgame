package web

import (
	"log"
	"net/http"
)

type Server struct {
	addr string
}

func NewServer(addr string) *Server {
	return &Server{addr: addr}
}

func (s *Server) Run() error {
	fileServer := http.FileServer(http.Dir("web"))

	http.Handle("/", fileServer)

	log.Printf("Servidor iniciado em http://localhost%s", s.addr)
	return http.ListenAndServe(s.addr, nil)
}
