package db

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

type DBManager struct {
	PlayerDB *sql.DB
}

func NewDBManager(playerDBPath string, schema string) (*DBManager, error) {
	playerDB, err := sql.Open("sqlite3", playerDBPath)
	if err != nil {
		return nil, err
	}

	if _, err := playerDB.Exec(schema); err != nil {
		playerDB.Close()
		return nil, err
	}

	return &DBManager{PlayerDB: playerDB}, nil
}

func (d *DBManager) Close() {
	if d.PlayerDB != nil {
		d.PlayerDB.Close()
	}
}

func (d *DBManager) ExecuteQueryPlayer(query string) (sql.Result, error) {
	return d.PlayerDB.Exec(query)
}

func (d *DBManager) QueryPlayer(query string) (*sql.Rows, error) {
	return d.PlayerDB.Query(query)
}

func (d *DBManager) ReadState(key string) (int, error) {
	var value int
	row := d.PlayerDB.QueryRow("SELECT value FROM player_state WHERE key = ?", key)
	err := row.Scan(&value)
	if err != nil {
		return 0, err
	}
	return value, nil
}

func (d *DBManager) WriteState(key string, value int) error {
	_, err := d.PlayerDB.Exec("INSERT OR REPLACE INTO player_state (key, value) VALUES (?, ?)", key, value)
	return err
}

func (d *DBManager) ResetDatabase(schema string) error {
	rows, err := d.PlayerDB.Query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
	if err != nil {
		return err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		tables = append(tables, name)
	}
	rows.Close()

	tx, err := d.PlayerDB.Begin()
	if err != nil {
		return err
	}

	for _, table := range tables {
		if _, err := tx.Exec("DROP TABLE IF EXISTS " + table); err != nil {
			tx.Rollback()
			return err
		}
	}

	if _, err := tx.Exec(schema); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
