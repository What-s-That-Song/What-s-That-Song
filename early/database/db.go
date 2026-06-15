package main

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

type User struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Password  string `json:"password,omitempty"` 
	Name      string `json:"name"`
	Role      string `json:"role"`
	HighScore int64  `json:"highScore"`
}

type LeaderboardEntry struct {
	Name      string `json:"name"`
	HighScore int64  `json:"highScore"`
}

func initDatabase() error {
	var err error
	db, err = sql.Open("sqlite3", "./musicquiz.db")
	if err != nil {
		return err
	}

	if _, err := db.Exec(`PRAGMA journal_mode = WAL;`); err != nil {
		return err
	}
	if _, err := db.Exec(`PRAGMA foreign_keys = ON;`); err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			name TEXT NOT NULL,
			role TEXT DEFAULT 'user',
			highScore INTEGER DEFAULT 0
		);
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS songs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			artist TEXT NOT NULL,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS tracks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			songId INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			position INTEGER NOT NULL,
			filePath TEXT NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			token TEXT PRIMARY KEY,
			userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// admin par défaut
	var count int
	err = db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, "admin@admin.com").Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		_, err = db.Exec(
			`INSERT INTO users (email, password, name, role, highScore) VALUES (?, ?, ?, ?, ?)`,
			"admin@admin.com", "admin", "Admin User", "admin", 0,
		)
		if err != nil {
			return err
		}
		log.Println("Default admin created.")
	}

	return nil
}

func getUserByEmail(email string) (*User, error) {
	row := db.QueryRow(`SELECT id, email, password, name, role, highScore FROM users WHERE email = ?`, email)

	var u User
	err := row.Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Role, &u.HighScore)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func createUser(email, password, name, role string) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`,
		email, password, name, role,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func getAllUsers() ([]User, error) {
	rows, err := db.Query(`SELECT id, email, name, role, highScore FROM users ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.HighScore); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func updateUser(id int64, name, email, role string, score int64) error {
	_, err := db.Exec(
		`UPDATE users SET name = ?, email = ?, role = ?, highScore = ? WHERE id = ?`,
		name, email, role, score, id,
	)
	return err
}

func deleteUser(id int64) error {
	_, err := db.Exec(`DELETE FROM users WHERE id = ?`, id)
	return err
}

func updateHighScore(id int64, score int64) error {
	var current int64
	err := db.QueryRow(`SELECT highScore FROM users WHERE id = ?`, id).Scan(&current)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	if score > current {
		_, err = db.Exec(`UPDATE users SET highScore = ? WHERE id = ?`, score, id)
	}
	return err
}

func getLeaderboard() ([]LeaderboardEntry, error) {
	rows, err := db.Query(`SELECT name, highScore FROM users ORDER BY highScore DESC LIMIT 10`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []LeaderboardEntry
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.Name, &e.HighScore); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}