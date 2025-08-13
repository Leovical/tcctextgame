package db

import (
	"database/sql"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

type DBManager struct {
	PlayerDB   *sql.DB
	SolutionDB *sql.DB
}

func NewDBManager(playerDBPath, solutionDBPath string) (*DBManager, error) {
	playerDB, err := sql.Open("sqlite3", playerDBPath)
	if err != nil {
		return nil, err
	}
	solutionDB, err := sql.Open("sqlite3", solutionDBPath)
	if err != nil {
		playerDB.Close()
		return nil, err
	}

	schema, err := os.ReadFile("internal/db/schema.sql")
	if err != nil {
		playerDB.Close()
		solutionDB.Close()
		return nil, err
	}

	// Inicializa o banco de dados do jogador e da solução.
	if _, err := playerDB.Exec(string(schema)); err != nil {
		playerDB.Close()
		solutionDB.Close()
		return nil, err
	}

	if _, err := solutionDB.Exec(string(schema)); err != nil {
		playerDB.Close()
		solutionDB.Close()
		return nil, err
	}

	return &DBManager{PlayerDB: playerDB, SolutionDB: solutionDB}, nil
}

func (d *DBManager) Close() {
	if d.PlayerDB != nil {
		d.PlayerDB.Close()
	}
	if d.SolutionDB != nil {
		d.SolutionDB.Close()
	}
}

func (d *DBManager) ExecuteQueryPlayer(query string) (sql.Result, error) {
	return d.PlayerDB.Exec(query)
}

func (d *DBManager) QueryPlayer(query string) (*sql.Rows, error) {
	return d.PlayerDB.Query(query)
}
