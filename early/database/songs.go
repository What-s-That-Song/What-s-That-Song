package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Track struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Position int64  `json:"position"`
	URL      string `json:"url"`
}

type SongWithTracks struct {
	ID     int64   `json:"id"`
	Title  string  `json:"title"`
	Artist string  `json:"artist"`
	Tracks []Track `json:"tracks"`
}

const mediaDir = "./media"

// Ordre de déblocage : du moins reconnaissable au plus reconnaissable.
var stemOrder = []string{"drums", "bass", "other", "vocals"}

var stemDisplayNames = map[string]string{
	"drums":  "Drums",
	"bass":   "Bass",
	"other":  "Melody",
	"vocals": "Vocals",
}

func getSongs() ([]SongWithTracks, error) {
	rows, err := db.Query(`SELECT id, title, artist FROM songs ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	songs := []SongWithTracks{}
	byID := map[int64]int{}
	for rows.Next() {
		var s SongWithTracks
		if err := rows.Scan(&s.ID, &s.Title, &s.Artist); err != nil {
			return nil, err
		}
		s.Tracks = []Track{}
		byID[s.ID] = len(songs)
		songs = append(songs, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	trackRows, err := db.Query(`SELECT id, songId, name, position, filePath FROM tracks ORDER BY songId, position`)
	if err != nil {
		return nil, err
	}
	defer trackRows.Close()

	for trackRows.Next() {
		var t Track
		var songID int64
		var filePath string
		if err := trackRows.Scan(&t.ID, &songID, &t.Name, &t.Position, &filePath); err != nil {
			return nil, err
		}
		t.URL = "/media/" + filepath.ToSlash(filePath)
		if idx, ok := byID[songID]; ok {
			songs[idx].Tracks = append(songs[idx].Tracks, t)
		}
	}
	return songs, trackRows.Err()
}

func deleteSong(id int64) error {
	if _, err := db.Exec(`DELETE FROM songs WHERE id = ?`, id); err != nil {
		return err
	}
	return os.RemoveAll(filepath.Join(mediaDir, "songs", fmt.Sprint(id)))
}

// processSong découpe un extrait de `duration` secondes à partir de `startSec`,
// sépare les instruments avec demucs, convertit chaque stem en mp3 dans
// media/songs/{id}/ et insère la chanson + ses pistes en base.
func processSong(uploadPath, title, artist string, startSec, duration float64) (int64, error) {
	workDir, err := os.MkdirTemp("", "wts-process-*")
	if err != nil {
		return 0, err
	}
	defer os.RemoveAll(workDir)

	// 1. Extrait de 10 s (wav stéréo 44.1 kHz, ce que demucs attend)
	extractPath := filepath.Join(workDir, "extract.wav")
	cut := exec.Command("ffmpeg",
		"-ss", fmt.Sprintf("%.2f", startSec),
		"-t", fmt.Sprintf("%.2f", duration),
		"-i", uploadPath,
		"-ac", "2", "-ar", "44100",
		"-y", extractPath,
	)
	if out, err := cut.CombinedOutput(); err != nil {
		return 0, fmt.Errorf("ffmpeg cut failed: %v: %s", err, lastLines(out))
	}

	// 2. Séparation des instruments
	stemsDir := filepath.Join(workDir, "stems")
	demucs := exec.Command("demucs", "-o", stemsDir, extractPath)
	if out, err := demucs.CombinedOutput(); err != nil {
		return 0, fmt.Errorf("demucs failed: %v: %s", err, lastLines(out))
	}

	stemFiles, err := findStems(stemsDir)
	if err != nil {
		return 0, err
	}

	// 3. Insertion en base + conversion mp3
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	res, err := tx.Exec(`INSERT INTO songs (title, artist) VALUES (?, ?)`, title, artist)
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	songID, err := res.LastInsertId()
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	songDir := filepath.Join(mediaDir, "songs", fmt.Sprint(songID))
	if err := os.MkdirAll(songDir, 0o755); err != nil {
		tx.Rollback()
		return 0, err
	}

	cleanup := func() {
		tx.Rollback()
		os.RemoveAll(songDir)
	}

	position := int64(1)
	for _, stem := range stemOrder {
		src, ok := stemFiles[stem]
		if !ok {
			continue
		}
		mp3Path := filepath.Join(songDir, stem+".mp3")
		conv := exec.Command("ffmpeg", "-i", src, "-codec:a", "libmp3lame", "-q:a", "4", "-y", mp3Path)
		if out, err := conv.CombinedOutput(); err != nil {
			cleanup()
			return 0, fmt.Errorf("ffmpeg mp3 conversion failed: %v: %s", err, lastLines(out))
		}

		relPath := filepath.ToSlash(filepath.Join("songs", fmt.Sprint(songID), stem+".mp3"))
		if _, err := tx.Exec(
			`INSERT INTO tracks (songId, name, position, filePath) VALUES (?, ?, ?, ?)`,
			songID, stemDisplayNames[stem], position, relPath,
		); err != nil {
			cleanup()
			return 0, err
		}
		position++
	}

	if position == 1 {
		cleanup()
		return 0, fmt.Errorf("no stems produced by demucs")
	}

	if err := tx.Commit(); err != nil {
		os.RemoveAll(songDir)
		return 0, err
	}
	return songID, nil
}

// findStems cherche les fichiers drums/bass/other/vocals produits par demucs,
// quel que soit le sous-dossier dans lequel il les écrit.
func findStems(root string) (map[string]string, error) {
	stems := map[string]string{}
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		base := strings.TrimSuffix(info.Name(), filepath.Ext(info.Name()))
		for _, stem := range stemOrder {
			if base == stem {
				stems[stem] = path
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(stems) == 0 {
		return nil, fmt.Errorf("no stem files found in demucs output")
	}
	return stems, nil
}

func lastLines(out []byte) string {
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) > 5 {
		lines = lines[len(lines)-5:]
	}
	return strings.Join(lines, " | ")
}
