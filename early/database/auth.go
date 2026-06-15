package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"
)

func createSession(userID int64) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	if _, err := db.Exec(`INSERT INTO sessions (token, userId) VALUES (?, ?)`, token, userID); err != nil {
		return "", err
	}
	return token, nil
}

func deleteSession(token string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	return err
}

func tokenFromRequest(r *http.Request) string {
	token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return token
}

// userFromRequest renvoie l'utilisateur associé au token de session, ou nil
// si la requête n'est pas authentifiée.
func userFromRequest(r *http.Request) (*User, error) {
	token := tokenFromRequest(r)
	if token == "" {
		return nil, nil
	}
	row := db.QueryRow(`
		SELECT u.id, u.email, u.name, u.role, u.highScore
		FROM sessions s JOIN users u ON u.id = s.userId
		WHERE s.token = ?`, token)
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.HighScore)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// requireUser écrit une réponse d'erreur et renvoie nil si la requête
// n'est pas authentifiée.
func requireUser(w http.ResponseWriter, r *http.Request) *User {
	u, err := userFromRequest(r)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return nil
	}
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{"authentication required"})
		return nil
	}
	return u
}

func requireAdmin(w http.ResponseWriter, r *http.Request) *User {
	u, err := userFromRequest(r)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return nil
	}
	if u == nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{"authentication required"})
		return nil
	}
	if u.Role != "admin" {
		writeJSON(w, http.StatusForbidden, errorResponse{"admin only"})
		return nil
	}
	return u
}
