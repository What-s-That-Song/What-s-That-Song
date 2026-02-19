import { useState, useCallback } from 'react';
import { Song, SONGS } from '../constants/Songs';

export interface GameState {
    currentSongIndex: number;
    activeInstrumentCount: number; // 1 to total tracks
    score: number;
    isGameOver: boolean;
    message: string;
}

export const useGame = () => {
    const [gameState, setGameState] = useState<GameState>({
        currentSongIndex: 0,
        activeInstrumentCount: 1,
        score: 0,
        isGameOver: false,
        message: 'Listen carefully!',
    });

    const currentSong = SONGS[gameState.currentSongIndex];

    const handleGuess = useCallback((guess: string) => {
        if (gameState.isGameOver) return;

        const isCorrect = guess.toLowerCase().trim() === currentSong.title.toLowerCase().trim();

        if (isCorrect) {
            setGameState(prev => ({
                ...prev,
                score: prev.score + (5 - prev.activeInstrumentCount) * 10, // More points for fewer instruments
                message: 'Correct! Next song...',
                // Advance to next song or end game
                currentSongIndex: prev.currentSongIndex + 1 < SONGS.length ? prev.currentSongIndex + 1 : prev.currentSongIndex,
                isGameOver: prev.currentSongIndex + 1 >= SONGS.length,
                activeInstrumentCount: 1, // Reset for next song
            }));
        } else {
            // Incorrect guess
            if (gameState.activeInstrumentCount < currentSong.tracks.length) {
                setGameState(prev => ({
                    ...prev,
                    activeInstrumentCount: prev.activeInstrumentCount + 1,
                    message: 'Wrong! Adding an instrument...',
                }));
            } else {
                setGameState(prev => ({
                    ...prev,
                    message: `Game Over! The song was ${currentSong.title}`,
                    isGameOver: true,
                }));
            }
        }
    }, [currentSong, gameState.isGameOver, gameState.activeInstrumentCount]);

    const resetGame = useCallback(() => {
        setGameState({
            currentSongIndex: 0,
            activeInstrumentCount: 1,
            score: 0,
            isGameOver: false,
            message: 'Listen carefully!',
        });
    }, []);

    return {
        gameState,
        currentSong,
        handleGuess,
        resetGame,
    };
};
