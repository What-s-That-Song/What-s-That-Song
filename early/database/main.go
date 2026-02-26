package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/rs/cors"
)

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// POST /login { email, password }
func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON"})
		return
	}

	user, err := getUserByEmail(body.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	if user == nil || user.Password != body.Password {
		writeJSON(w, http.StatusUnauthorized, errorResponse{"invalid credentials"})
		return
	}

	user.Password = "" 
	writeJSON(w, http.StatusOK, user)
}


func handleCreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON"})
		return
	}
	if body.Role == "" {
		body.Role = "user"
	}

	id, err := createUser(body.Email, body.Password, body.Name, body.Role)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}


func handleGetUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	users, err := getAllUsers()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, users)
}


func handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}

	idStr := r.URL.Path[len("/users/"):]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid id"})
		return
	}

	var body struct {
		Name      string `json:"name"`
		Email     string `json:"email"`
		Role      string `json:"role"`
		HighScore int64  `json:"highScore"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON"})
		return
	}

	if err := updateUser(id, body.Name, body.Email, body.Role, body.HighScore); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}


func handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	idStr := r.URL.Path[len("/users/"):]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid id"})
		return
	}
	if err := deleteUser(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// POST /highscore { userId, score }
func handleUpdateHighScore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	var body struct {
		UserID int64 `json:"userId"`
		Score  int64 `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON"})
		return
	}
	if err := updateHighScore(body.UserID, body.Score); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GET /leaderboard
func handleLeaderboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	entries, err := getLeaderboard()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func main() {
	if err := initDatabase(); err != nil {
		log.Fatalf("failed to init db: %v", err)
	}
	log.Println("Database initialized")

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("/login", handleLogin)

	// Users
	mux.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetUsers(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateUser(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		}
	})
	mux.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			handleUpdateUser(w, r)
		case http.MethodDelete:
			handleDeleteUser(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		}
	})

	// Score + leaderboard
	mux.HandleFunc("/highscore", handleUpdateHighScore)
	mux.HandleFunc("/leaderboard", handleLeaderboard)

	// CORS pour l’app Expo (localhost:19006, etc.)
	handler := cors.New(cors.Options{
		AllowOriginFunc: func(origin string) bool { return true },
		AllowedMethods:  []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:  []string{"*"},
	}).Handler(mux)

	addr := ":8080"
	log.Printf("Go backend listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}