import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { useGame } from '../hooks/useGame';
import { useAudio } from '../hooks/useAudio';

export default function GameScreen() {
    const { gameState, currentSong, handleGuess, resetGame } = useGame();
    const { isPlaying, isLoaded, playRound, stop } = useAudio(currentSong, gameState.activeInstrumentCount);
    const [guess, setGuess] = useState('');

    const onSubmit = () => {
        if (guess.trim().length === 0) return;
        handleGuess(guess);
        setGuess('');
        stop();
    };

    if (!currentSong) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={styles.loadingText}>Loading Studio...</Text>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>What's That Song?</Text>

                <View style={styles.card}>
                    <View style={styles.roundInfo}>
                        <Text style={styles.roundLabel}>ROUND</Text>
                        <Text style={styles.roundValue}>{gameState.activeInstrumentCount} <Text style={styles.roundTotal}>/ {currentSong.tracks.length}</Text></Text>
                    </View>

                    <Text style={styles.instruction}>
                        {gameState.activeInstrumentCount === 1
                            ? "Listen closely to the first track"
                            : "Adding another layer..."}
                    </Text>

                    <Text style={styles.score}>Score: {gameState.score}</Text>
                </View>

                <View style={styles.visualizerContainer}>
                    {/* Placeholder for a visualizer - just a static wave for now */}
                    <View style={[styles.visualizerBar, { height: isPlaying ? 60 : 20, backgroundColor: isPlaying ? '#e94560' : '#16213e' }]} />
                    <View style={[styles.visualizerBar, { height: isPlaying ? 90 : 20, backgroundColor: isPlaying ? '#e94560' : '#16213e' }]} />
                    <View style={[styles.visualizerBar, { height: isPlaying ? 50 : 20, backgroundColor: isPlaying ? '#e94560' : '#16213e' }]} />
                    <View style={[styles.visualizerBar, { height: isPlaying ? 80 : 20, backgroundColor: isPlaying ? '#e94560' : '#16213e' }]} />
                    <View style={[styles.visualizerBar, { height: isPlaying ? 40 : 20, backgroundColor: isPlaying ? '#e94560' : '#16213e' }]} />
                </View>

                <View style={styles.controls}>
                    {!isLoaded ? (
                        <ActivityIndicator color="#e94560" />
                    ) : (
                        <TouchableOpacity
                            style={[styles.playButton, isPlaying && styles.playButtonDisabled]}
                            onPress={playRound}
                            disabled={isPlaying}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.playButtonText}>{isPlaying ? "LISTENING..." : "PLAY CLIP (10s)"}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {!gameState.isGameOver ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={guess}
                            onChangeText={setGuess}
                            placeholder="Type song title..."
                            placeholderTextColor="#533483"
                            autoCapitalize="words"
                            editable={!isPlaying}
                        />
                        <TouchableOpacity
                            style={[styles.submitButton, (isPlaying || guess.length === 0) && styles.submitButtonDisabled]}
                            onPress={onSubmit}
                            disabled={isPlaying || guess.length === 0}
                        >
                            <Text style={styles.submitButtonText}>SUBMIT GUESS</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.gameOverContainer}>
                        <Text style={styles.gameOverTitle}>GAME OVER</Text>
                        <Text style={styles.gameOverSubtitle}>The song was:</Text>
                        <Text style={styles.revealText}>{currentSong.title}</Text>
                        <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
                            <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {gameState.message ? (
                    <View style={styles.messageContainer}>
                        <Text style={styles.messageText}>{gameState.message}</Text>
                    </View>
                ) : null}

                <View style={styles.tracksContainer}>
                    <Text style={styles.sectionTitle}>Mixer:</Text>
                    <View style={styles.tracksGrid}>
                        {currentSong.tracks.map((track, index) => (
                            <View key={track.id} style={[
                                styles.trackBadge,
                                index < gameState.activeInstrumentCount ? styles.activeTrack : styles.lockedTrack
                            ]}>
                                <Text style={styles.trackIcon}>
                                    {index < gameState.activeInstrumentCount ? "🎚️" : "🔒"}
                                </Text>
                                <Text style={[
                                    styles.trackName,
                                    index >= gameState.activeInstrumentCount && styles.lockedTrackText
                                ]}>
                                    {index < gameState.activeInstrumentCount ? track.name : "Locked"}
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
    mainContainer: { flex: 1, backgroundColor: '#1a1a2e' },
    loadingContainer: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },

    scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 50 },

    header: { fontSize: 32, fontWeight: '800', marginVertical: 30, color: '#fff', letterSpacing: 1 },

    card: {
        backgroundColor: '#16213e',
        padding: 25,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#0f3460'
    },
    roundInfo: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 },
    roundLabel: { color: '#e94560', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
    roundValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    roundTotal: { color: '#533483', fontSize: 18 },

    instruction: { fontSize: 16, color: '#a0a0a0', marginVertical: 10, fontStyle: 'italic' },
    score: { fontSize: 18, fontWeight: 'bold', color: '#e94560', marginTop: 15 },

    visualizerContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, marginBottom: 30, gap: 8 },
    visualizerBar: { width: 15, borderRadius: 5 },

    controls: { marginBottom: 20, width: '100%', alignItems: 'center' },
    playButton: {
        backgroundColor: '#e94560',
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 50,
        width: '80%',
        alignItems: 'center',
        shadowColor: "#e94560",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    playButtonDisabled: { backgroundColor: '#533483', opacity: 0.8 },
    playButtonText: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

    inputContainer: { width: '100%', marginVertical: 10 },
    input: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 15,
        marginBottom: 15,
        fontSize: 18,
        color: '#1a1a2e',
        fontWeight: '500'
    },
    submitButton: { backgroundColor: '#0f3460', padding: 18, borderRadius: 15, alignItems: 'center' },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    messageContainer: { backgroundColor: 'rgba(233, 69, 96, 0.1)', padding: 15, borderRadius: 10, marginVertical: 10, width: '100%' },
    messageText: { fontSize: 16, color: '#e94560', fontWeight: 'bold', textAlign: 'center' },

    gameOverContainer: { alignItems: 'center', marginVertical: 20, backgroundColor: '#16213e', padding: 20, borderRadius: 15, width: '100%' },
    gameOverTitle: { fontSize: 28, fontWeight: '900', color: '#e94560', marginBottom: 5 },
    gameOverSubtitle: { color: '#fff', fontSize: 16 },
    revealText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 15 },
    restartButton: { backgroundColor: '#e94560', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    restartButtonText: { color: 'white', fontWeight: 'bold' },

    tracksContainer: { marginTop: 20, width: '100%' },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    tracksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    trackBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 8,
        minWidth: '45%'
    },
    activeTrack: { backgroundColor: 'rgba(233, 69, 96, 0.2)', borderWidth: 1, borderColor: '#e94560' },
    lockedTrack: { backgroundColor: '#16213e', borderWidth: 1, borderColor: '#533483' },
    trackIcon: { marginRight: 8, fontSize: 14 },
    trackName: { color: '#fff', fontWeight: '600' },
    lockedTrackText: { color: '#533483' }
});
