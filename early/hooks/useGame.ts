import { useState, useCallback, useEffect } from 'react';
import { Song } from '../constants/Songs';
import { getSongs } from '../database/db';

export const WRONG_GUESS_PENALTY = 10;

// Points gagnés si on trouve avec k instruments actifs sur n pistes :
// 100 pts avec 1 instrument, dégressif jusqu'à 100/n pts avec toutes les pistes.
export const pointsForRound = (activeCount: number, totalTracks: number) =>
    Math.round((100 * (totalTracks - activeCount + 1)) / totalTracks);

// Comparaison insensible à la casse, aux espaces superflus et aux accents
const normalizeTitle = (s: string) =>
    s
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

export interface GameState {
    currentSongIndex: number;
    activeInstrumentCount: number; // 1 à tracks.length
    score: number;
    isGameOver: boolean;
    message: string;
    messageType: 'info' | 'success' | 'error';
}

const initialState: GameState = {
    currentSongIndex: 0,
    activeInstrumentCount: 1,
    score: 0,
    isGameOver: false,
    message: 'Listen carefully!',
    messageType: 'info',
};

export const useGame = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState>(initialState);

    const loadSongs = useCallback(async () => {
        setIsLoadingSongs(true);
        setLoadError(null);
        try {
            const apiSongs = await getSongs();
            const mapped: Song[] = apiSongs
                .filter((s) => s.tracks.length > 0)
                .map((s) => ({
                    id: String(s.id),
                    title: s.title,
                    artist: s.artist,
                    tracks: s.tracks.map((t) => ({
                        id: String(t.id),
                        name: t.name,
                        uri: t.url,
                    })),
                }));
            setSongs(mapped);
            setGameState(initialState);
        } catch (e) {
            console.error(e);
            setLoadError('Cannot reach the server. Is the backend running?');
        } finally {
            setIsLoadingSongs(false);
        }
    }, []);

    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

    const currentSong: Song | undefined = songs[gameState.currentSongIndex];

    // Avance à la chanson suivante (ou termine la partie)
    const advance = (prev: GameState, extra: Partial<GameState>): GameState => {
        const isLast = prev.currentSongIndex + 1 >= songs.length;
        return {
            ...prev,
            ...extra,
            currentSongIndex: isLast ? prev.currentSongIndex : prev.currentSongIndex + 1,
            isGameOver: isLast,
            activeInstrumentCount: 1,
        };
    };

    // Choix 1 du joueur : ajouter un instrument (la réécoute est gratuite via le bouton play)
    const addInstrument = useCallback(() => {
        if (!currentSong) return;
        setGameState((prev) => {
            if (prev.isGameOver || prev.activeInstrumentCount >= currentSong.tracks.length) {
                return prev;
            }
            return {
                ...prev,
                activeInstrumentCount: prev.activeInstrumentCount + 1,
                message: 'New instrument unlocked. Listen again!',
                messageType: 'info',
            };
        });
    }, [currentSong]);

    // Choix 2 : proposer une réponse. Bonne réponse = points dégressifs,
    // mauvaise réponse = pénalité, la manche continue.
    const handleGuess = useCallback(
        (guess: string) => {
            if (!currentSong || gameState.isGameOver) return;

            const isCorrect = normalizeTitle(guess) === normalizeTitle(currentSong.title);

            if (isCorrect) {
                const earned = pointsForRound(
                    gameState.activeInstrumentCount,
                    currentSong.tracks.length
                );
                setGameState((prev) =>
                    advance(prev, {
                        score: prev.score + earned,
                        message: `Correct! +${earned} pts`,
                        messageType: 'success',
                    })
                );
            } else {
                setGameState((prev) => ({
                    ...prev,
                    score: Math.max(0, prev.score - WRONG_GUESS_PENALTY),
                    message: `Wrong! -${WRONG_GUESS_PENALTY} pts. Try again, add an instrument or skip.`,
                    messageType: 'error',
                }));
            }
        },
        [currentSong, gameState.isGameOver, gameState.activeInstrumentCount, songs.length]
    );

    // Choix 3 : abandonner la chanson (0 point, titre révélé)
    const skipSong = useCallback(() => {
        if (!currentSong || gameState.isGameOver) return;
        setGameState((prev) =>
            advance(prev, {
                message: `It was "${currentSong.title}" by ${currentSong.artist}.`,
                messageType: 'error',
            })
        );
    }, [currentSong, gameState.isGameOver, songs.length]);

    const resetGame = useCallback(() => {
        setGameState(initialState);
    }, []);

    return {
        gameState,
        currentSong,
        songCount: songs.length,
        isLoadingSongs,
        loadError,
        reloadSongs: loadSongs,
        addInstrument,
        handleGuess,
        skipSong,
        resetGame,
    };
};
