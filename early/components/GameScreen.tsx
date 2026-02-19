import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { useGame } from '../hooks/useGame';
import { useAudio } from '../hooks/useAudio';
import { BackgroundDecoration } from './BackgroundDecoration';
import { updateHighScore, getLeaderboard } from '../database/db';

export default function GameScreen(props: { userType?: string, userId?: number }) {
    const { gameState, currentSong, handleGuess, resetGame } = useGame();
    const { isPlaying, isLoaded, playRound, stop } = useAudio(currentSong, gameState.activeInstrumentCount);
    const [guess, setGuess] = useState('');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        if (gameState.isGameOver) {
            if (props.userType === 'user' && props.userId) {
                updateHighScore(props.userId, gameState.score);
            }
            // Load leaderboard
            try {
                const lb = getLeaderboard();
                setLeaderboard(lb);
            } catch (e) { console.error(e); }
        }
    }, [gameState.isGameOver]);

    const onSubmit = () => {
        if (guess.trim().length === 0) return;
        handleGuess(guess);
        setGuess('');
        stop();
    };

    if (!currentSong) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F29F41" />
            <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <BackgroundDecoration />

            {/* Top Wave Decor */}
            <View style={styles.topWave} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Navbar */}
                <View style={styles.navbar}>
                    <Text style={styles.logoText}>WHAT'S THAT SONG</Text>
                </View>

                {/* Score Panel */}
                <View style={styles.scorePanel}>
                    <Text style={styles.scoreLabel}>POINTS</Text>
                    <Text style={styles.scoreValue}>{gameState.score}</Text>
                </View>

                {/* Main Game Card */}
                <View style={styles.gameCard}>
                    <View style={styles.roundIndicator}>
                        <Text style={styles.roundText}>ROUND {gameState.activeInstrumentCount} <Text style={styles.roundTotal}>/ {currentSong.tracks.length}</Text></Text>
                    </View>

                    <Text style={styles.instruction}>
                        {gameState.activeInstrumentCount === 1
                            ? "Listen to the first track"
                            : "Adding another layer..."}
                    </Text>

                    {/* Controls */}
                    <View style={styles.controls}>
                        {!isLoaded ? (
                            <ActivityIndicator color="#F29F41" />
                        ) : (
                            <TouchableOpacity
                                style={[styles.playButton, isPlaying && styles.playButtonDisabled]}
                                onPress={playRound}
                                disabled={isPlaying}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.playButtonText}>{isPlaying ? "PLAYING..." : "PLAY CLIP (10s)"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Input Area */}
                {!gameState.isGameOver ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={guess}
                            onChangeText={setGuess}
                            placeholder="Type title..."
                            placeholderTextColor="#5C95C6"
                            autoCapitalize="words"
                            editable={!isPlaying}
                        />
                        <TouchableOpacity
                            style={[styles.submitButton, (isPlaying || guess.length === 0) && styles.submitButtonDisabled]}
                            onPress={onSubmit}
                            disabled={isPlaying || guess.length === 0}
                        >
                            <Text style={styles.submitButtonText}>SUBMIT</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.gameOverContainer}>
                        <Text style={styles.gameOverTitle}>GAME OVER</Text>
                        <Text style={styles.revealText}>{currentSong.title}</Text>

                        {/* Leaderboard / Guest Prompt */}
                        {props.userType === 'guest' ? (
                            <View style={styles.guestPrompt}>
                                <Text style={styles.guestText}>Sign up to see the Leaderboard!</Text>
                                <TouchableOpacity style={styles.SignUpButton} onPress={() => {/* Navigate to Signup? For now just text */ }}>
                                    <Text style={styles.SignUpButtonText}>CREATE ACCOUNT</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.leaderboardContainer}>
                                <Text style={styles.leaderboardTitle}>LEADERBOARD</Text>
                                {leaderboard.map((player, index) => (
                                    <View key={index} style={styles.leaderboardRow}>
                                        <Text style={styles.rank}>{index + 1}. {player.name}</Text>
                                        <Text style={styles.score}>{player.highScore} pts</Text>
                                    </View>
                                ))}
                                {leaderboard.length === 0 && <Text style={styles.guestText}>No scores yet!</Text>}
                            </View>
                        )}

                        <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
                            <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {gameState.message ? (
                    <View style={[styles.messageContainer, gameState.message.includes('Correct') ? styles.messageSuccess : styles.messageError]}>
                        <Text style={styles.messageText}>{gameState.message}</Text>
                    </View>
                ) : null}

                {/* Mixer UI */}
                <View style={styles.mixerSection}>
                    <Text style={styles.sectionTitle}>TRACKS</Text>
                    <View style={styles.tracksGrid}>
                        {currentSong.tracks.map((track, index) => (
                            <View key={track.id} style={[
                                styles.trackPill,
                                index < gameState.activeInstrumentCount ? styles.activePill : styles.lockedPill
                            ]}>
                                <View style={[
                                    styles.trackDot,
                                    index < gameState.activeInstrumentCount ? styles.activeDot : styles.lockedDot
                                ]} />
                                <Text style={[
                                    styles.trackName,
                                    index >= gameState.activeInstrumentCount && styles.lockedTrackText
                                ]}>
                                    {index < gameState.activeInstrumentCount ? track.name : "LOCKED"}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#0F2441' },
    loadingContainer: { flex: 1, backgroundColor: '#0F2441', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#F29F41', marginTop: 10, fontSize: 16, fontWeight: 'bold' },

    topWave: {
        height: 10,
        backgroundColor: '#F29F41',
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 5,
    },

    scrollContent: { padding: 20, paddingBottom: 50, alignItems: 'center' },

    navbar: {
        marginTop: 40,
        marginBottom: 20,
    },
    logoText: {
        color: '#E5E5E5',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },

    scorePanel: {
        alignItems: 'center',
        marginBottom: 30,
    },
    scoreLabel: { color: '#5C95C6', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    scoreValue: { color: '#fff', fontSize: 36, fontWeight: '900' },

    gameCard: {
        width: '100%',
        backgroundColor: '#1E3A5F',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#F29F41', // Orange accent border
    },
    roundIndicator: { marginBottom: 10 },
    roundText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    roundTotal: { color: '#5C95C6' },
    instruction: { color: '#E5E5E5', fontSize: 16, textAlign: 'center', marginBottom: 20, opacity: 0.8 },

    controls: { width: '100%' },
    playButton: {
        backgroundColor: '#F29F41', // Orange
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    playButtonDisabled: { backgroundColor: '#5C95C6', opacity: 0.5 },
    playButtonText: { color: '#0F2441', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

    inputContainer: { width: '100%', marginBottom: 20, flexDirection: 'row', gap: 10 },
    input: {
        flex: 1,
        backgroundColor: '#1E3A5F',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#1E3A5F',
    },
    submitButton: {
        backgroundColor: '#5C95C6',
        borderRadius: 12,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#0F2441', fontWeight: '900', fontSize: 14 },

    messageContainer: {
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        width: '100%',
    },
    messageSuccess: { backgroundColor: 'rgba(242, 159, 65, 0.2)', borderWidth: 1, borderColor: '#F29F41' },
    messageError: { backgroundColor: 'rgba(233, 69, 96, 0.2)', borderWidth: 1, borderColor: '#e94560' },
    messageText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },

    gameOverContainer: {
        width: '100%',
        backgroundColor: '#1E3A5F',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    gameOverTitle: { color: '#F29F41', fontSize: 24, fontWeight: '900', marginBottom: 10 },
    revealText: { color: '#fff', fontSize: 20, marginBottom: 20, fontWeight: 'bold' },
    restartButton: { backgroundColor: '#5C95C6', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    restartButtonText: { color: '#0F2441', fontWeight: 'bold' },

    mixerSection: { width: '100%' },
    sectionTitle: { color: '#5C95C6', fontSize: 12, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
    tracksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    trackPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E3A5F',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        minWidth: '45%'
    },
    activePill: { backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#F29F41' },
    lockedPill: { opacity: 0.5 },
    trackDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    activeDot: { backgroundColor: '#F29F41' },
    lockedDot: { backgroundColor: '#5C95C6' },
    trackName: { color: '#fff', fontWeight: '600' },
    lockedTrackText: { color: '#5C95C6' },

    // Guest / Leaderboard Styles
    guestPrompt: { alignItems: 'center', marginBottom: 20 },
    guestText: { color: '#E5E5E5', marginBottom: 10, fontStyle: 'italic' },
    SignUpButton: { borderWidth: 1, borderColor: '#F29F41', padding: 10, borderRadius: 8, marginBottom: 10 },
    SignUpButtonText: { color: '#F29F41', fontWeight: 'bold' },

    leaderboardContainer: { width: '100%', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 10 },
    leaderboardTitle: { color: '#5C95C6', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    rank: { color: '#fff' },
    score: { color: '#F29F41', fontWeight: 'bold' },
});
