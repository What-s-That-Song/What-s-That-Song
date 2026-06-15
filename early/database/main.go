package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
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

	token, err := createSession(user.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}

	user.Password = ""
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

// POST /logout — invalide le token de session courant
func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	if token := tokenFromRequest(r); token != "" {
		if err := deleteSession(token); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GET /me — l'utilisateur associé au token de session
func handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	user := requireUser(w, r)
	if user == nil {
		return
	}
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

	// L'inscription publique crée toujours un simple "user" ; seul un admin
	// connecté peut attribuer un autre rôle.
	if body.Role == "" {
		body.Role = "user"
	}
	if body.Role != "user" {
		caller, err := userFromRequest(r)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
			return
		}
		if caller == nil || caller.Role != "admin" {
			writeJSON(w, http.StatusForbidden, errorResponse{"only admins can set roles"})
			return
		}
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
	if requireAdmin(w, r) == nil {
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
	if requireAdmin(w, r) == nil {
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
	if requireAdmin(w, r) == nil {
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

// POST /highscore { score } — l'utilisateur vient du token de session,
// jamais du client, pour qu'on ne puisse pas écrire le score d'un autre.
func handleUpdateHighScore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		return
	}
	user := requireUser(w, r)
	if user == nil {
		return
	}
	var body struct {
		Score int64 `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON"})
		return
	}
	if err := updateHighScore(user.ID, body.Score); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GET /songs
func handleGetSongs(w http.ResponseWriter, r *http.Request) {
	songs, err := getSongs()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, songs)
}

// POST /songs — multipart: title, artist, file (audio), start (sec, défaut 30), duration (sec, défaut 10)
func handleCreateSong(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid multipart form"})
		return
	}

	title := r.FormValue("title")
	artist := r.FormValue("artist")
	if title == "" || artist == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{"title and artist are required"})
		return
	}

	startSec := 30.0
	if v := r.FormValue("start"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil && parsed >= 0 {
			startSec = parsed
		}
	}
	duration := 10.0
	if v := r.FormValue("duration"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil && parsed > 0 && parsed <= 30 {
			duration = parsed
		}
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"file is required"})
		return
	}
	defer file.Close()

	tmp, err := os.CreateTemp("", "wts-upload-*"+filepath.Ext(header.Filename))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"cannot store upload"})
		return
	}
	defer os.Remove(tmp.Name())
	if _, err := io.Copy(tmp, file); err != nil {
		tmp.Close()
		writeJSON(w, http.StatusInternalServerError, errorResponse{"cannot store upload"})
		return
	}
	tmp.Close()

	// La séparation demucs prend de quelques secondes à ~1 min sur CPU.
	id, err := processSong(tmp.Name(), title, artist, startSec, duration)
	if err != nil {
		log.Printf("processSong failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

// DELETE /songs/{id}
func handleDeleteSong(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}
	idStr := r.URL.Path[len("/songs/"):]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid id"})
		return
	}
	if err := deleteSong(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{"db error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
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
	mux.HandleFunc("/logout", handleLogout)
	mux.HandleFunc("/me", handleMe)

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

	// Chansons + pistes audio
	mux.HandleFunc("/songs", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetSongs(w, r)
		case http.MethodPost:
			handleCreateSong(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		}
	})
	mux.HandleFunc("/songs/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteSong(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
		}
	})

	// Fichiers audio des stems
	mux.Handle("/media/", http.StripPrefix("/media/", http.FileServer(http.Dir(mediaDir))))

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