import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, StatusBar, Animated } from 'react-native';
import { useGame, pointsForRound, WRONG_GUESS_PENALTY } from '../hooks/useGame';
import { useAudio } from '../hooks/useAudio';
import { BackgroundDecoration } from './BackgroundDecoration';
import { updateHighScore, getLeaderboard, getMe, LeaderboardEntry, User } from '../database/db';

const INSTRUMENT_ICONS: Record<string, string> = {
    Drums: '🥁',
    Bass: '🎸',
    Melody: '🎹',
    Vocals: '🎤',
};

// Petites barres d'égaliseur animées pour les pistes actives
const EqBars = ({ playing }: { playing: boolean }) => {
    const anims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0.3))).current;

    useEffect(() => {
        if (!playing) {
            anims.forEach((a) => a.setValue(0.3));
            return;
        }
        const loops = anims.map((a, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(a, { toValue: 1, duration: 200 + i * 60, useNativeDriver: false }),
                    Animated.timing(a, { toValue: 0.25, duration: 230 + i * 45, useNativeDriver: false }),
                ])
            )
        );
        loops.forEach((l) => l.start());
        return () => loops.forEach((l) => l.stop());
    }, [playing]);

    return (
        <View style={styles.eqRow}>
            {anims.map((a, i) => (
                <Animated.View key={i} style={[styles.eqBar, { transform: [{ scaleY: a }] }]} />
            ))}
        </View>
    );
};

// Anneau qui pulse autour du bouton play pendant la lecture
const PulseRing = ({ playing }: { playing: boolean }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!playing) {
            anim.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: false })
        );
        loop.start();
        return () => loop.stop();
    }, [playing]);

    if (!playing) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.pulseRing,
                {
                    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
                },
            ]}
        />
    );
};

export default function GameScreen() {
    const {
        gameState, currentSong, songCount, isLoadingSongs, loadError, reloadSongs,
        addInstrument, handleGuess, skipSong, resetGame,
    } = useGame();
    const { isPlaying, isLoaded, playRound, stop } = useAudio(currentSong, gameState.activeInstrumentCount);
    const [guess, setGuess] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    // Identité vérifiée par le serveur via le token de session (null = invité)
    const [me, setMe] = useState<User | null>(null);

    useEffect(() => {
        getMe().then(setMe).catch(() => setMe(null));
    }, []);

    useEffect(() => {
        if (!gameState.isGameOver) return;
        const onGameOver = async () => {
            try {
                if (me) {
                    await updateHighScore(gameState.score);
                }
                setLeaderboard(await getLeaderboard());
            } catch (e) { console.error(e); }
        };
        onGameOver();
    }, [gameState.isGameOver]);

    const onSubmit = () => {
        if (guess.trim().length === 0) return;
        handleGuess(guess);
        setGuess('');
        stop();
    };

    const onAddInstrument = () => {
        stop();
        addInstrument();
    };

    const onSkip = () => {
        stop();
        skipSong();
    };

    if (isLoadingSongs) return (
        <View style={styles.loadingContainer}>
            <BackgroundDecoration />
            <ActivityIndicator size="large" color="#F29F41" />
            <Text style={styles.loadingText}>Loading songs...</Text>
        </View>
    );

    if (loadError || !currentSong) return (
        <View style={styles.loadingContainer}>
            <BackgroundDecoration />
            <Text style={styles.loadingEmoji}>🎧</Text>
            <Text style={styles.loadingText}>{loadError ?? 'No songs available yet.\nAsk an admin to add some!'}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={reloadSongs}>
                <Text style={styles.primaryButtonText}>RETRY</Text>
            </TouchableOpacity>
        </View>
    );

    const totalTracks = currentSong.tracks.length;
    const activeCount = gameState.activeInstrumentCount;
    const currentWorth = pointsForRound(activeCount, totalTracks);
    const canAddInstrument = activeCount < totalTracks;
    const nextWorth = canAddInstrument ? pointsForRound(activeCount + 1, totalTracks) : null;

    // ---------- Écran de fin de partie ----------
    if (gameState.isGameOver) return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <BackgroundDecoration />
            <View style={styles.topWave} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <View style={styles.gameOverCard}>
                        <Text style={styles.gameOverEmoji}>🏆</Text>
                        <Text style={styles.gameOverTitle}>GAME OVER</Text>

                        <View style={styles.finalScoreCircle}>
                            <Text style={styles.finalScoreValue}>{gameState.score}</Text>
                            <Text style={styles.finalScoreLabel}>PTS</Text>
                        </View>

                        {gameState.message ? (
                            <Text style={styles.gameOverMessage}>{gameState.message}</Text>
                        ) : null}

                        {!me ? (
                            <View style={styles.guestPrompt}>
                                <Text style={styles.guestText}>Sign up to save your score and join the leaderboard!</Text>
                            </View>
                        ) : (
                            <View style={styles.leaderboardContainer}>
                                <Text style={styles.leaderboardTitle}>LEADERBOARD</Text>
                                {leaderboard.map((player, index) => (
                                    <View key={index} style={[styles.leaderboardRow, index === 0 && styles.leaderboardRowFirst]}>
                                        <Text style={styles.leaderboardMedal}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                        </Text>
                                        <Text style={styles.leaderboardName} numberOfLines={1}>{player.name}</Text>
                                        <Text style={styles.leaderboardScore}>{player.highScore} pts</Text>
                                    </View>
                                ))}
                                {leaderboard.length === 0 && <Text style={styles.guestText}>No scores yet!</Text>}
                            </View>
                        )}

                        <TouchableOpacity style={styles.primaryButton} onPress={resetGame} activeOpacity={0.9}>
                            <Text style={styles.primaryButtonText}>▶ PLAY AGAIN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );

    // ---------- Écran de jeu ----------
    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <BackgroundDecoration />
            <View style={styles.topWave} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>

                    {/* Header : logo + score */}
                    <View style={styles.header}>
                        <Text style={styles.logoText}>WHAT'S{'\n'}THAT SONG</Text>
                        <View style={styles.scorePill}>
                            <Text style={styles.scorePillStar}>★</Text>
                            <Text style={styles.scorePillValue}>{gameState.score}</Text>
                            <Text style={styles.scorePillUnit}>PTS</Text>
                        </View>
                    </View>

                    {/* Progression des chansons */}
                    <View style={styles.progressRow}>
                        <Text style={styles.progressText}>SONG {gameState.currentSongIndex + 1} / {songCount}</Text>
                        <View style={styles.progressDots}>
                            {Array.from({ length: songCount }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.progressDot,
                                        i < gameState.currentSongIndex && styles.progressDotDone,
                                        i === gameState.currentSongIndex && styles.progressDotCurrent,
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Scène : bouton play central + mise en jeu */}
                    <View style={styles.stageCard}>
                        <View style={styles.worthRow}>
                            <Text style={styles.worthLabel}>GUESS NOW FOR</Text>
                            <Text style={styles.worthValue}>{currentWorth} <Text style={styles.worthUnit}>PTS</Text></Text>
                        </View>

                        <View style={styles.playArea}>
                            <PulseRing playing={isPlaying} />
                            <TouchableOpacity
                                style={[styles.playButton, isPlaying && styles.playButtonPlaying]}
                                onPress={playRound}
                                disabled={isPlaying || !isLoaded}
                                activeOpacity={0.85}
                            >
                                {!isLoaded
                                    ? <ActivityIndicator color="#0F2441" />
                                    : <Text style={styles.playIcon}>{isPlaying ? '♫' : '▶'}</Text>}
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.playHint}>
                            {isPlaying ? 'Listen carefully...' : 'Tap to play the clip — replays are free'}
                        </Text>
                    </View>

                    {/* Message de feedback */}
                    {gameState.message ? (
                        <View style={[
                            styles.messageContainer,
                            gameState.messageType === 'success' ? styles.messageSuccess :
                                gameState.messageType === 'error' ? styles.messageError : styles.messageInfo,
                        ]}>
                            <Text style={styles.messageText}>{gameState.message}</Text>
                        </View>
                    ) : null}

                    {/* Table de mixage : une rangée par instrument */}
                    <View style={styles.mixer}>
                        {currentSong.tracks.map((track, index) => {
                            const isActive = index < activeCount;
                            const isNext = index === activeCount;

                            if (isNext) {
                                return (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={[styles.channel, styles.channelNext]}
                                        onPress={onAddInstrument}
                                        disabled={isPlaying}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.channelIconBox, styles.channelIconBoxNext]}>
                                            <Text style={styles.channelIcon}>＋</Text>
                                        </View>
                                        <View style={styles.channelInfo}>
                                            <Text style={styles.channelNextTitle}>UNLOCK INSTRUMENT</Text>
                                            <Text style={styles.channelNextSub}>next guess will be worth {nextWorth} pts</Text>
                                        </View>
                                        <Text style={styles.channelLockIcon}>🔓</Text>
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <View key={track.id} style={[styles.channel, isActive ? styles.channelActive : styles.channelLocked]}>
                                    <View style={[styles.channelIconBox, isActive && styles.channelIconBoxActive]}>
                                        <Text style={styles.channelIcon}>{isActive ? (INSTRUMENT_ICONS[track.name] ?? '🎵') : '🔒'}</Text>
                                    </View>
                                    <View style={styles.channelInfo}>
                                        <Text style={[styles.channelName, !isActive && styles.channelNameLocked]}>
                                            {isActive ? track.name.toUpperCase() : '???'}
                                        </Text>
                                        {isActive && <Text style={styles.channelStatus}>ON AIR</Text>}
                                    </View>
                                    {isActive && <EqBars playing={isPlaying} />}
                                </View>
                            );
                        })}
                    </View>

                    {/* Zone de réponse */}
                    <View style={styles.answerCard}>
                        <Text style={styles.answerLabel}>YOUR ANSWER <Text style={styles.answerPenalty}>(wrong = −{WRONG_GUESS_PENALTY} pts)</Text></Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={guess}
                                onChangeText={setGuess}
                                placeholder="Song title..."
                                placeholderTextColor="#5C95C6"
                                autoCapitalize="words"
                                editable={!isPlaying}
                                onSubmitEditing={onSubmit}
                            />
                            <TouchableOpacity
                                style={[styles.submitButton, (isPlaying || guess.length === 0) && styles.submitButtonDisabled]}
                                onPress={onSubmit}
                                disabled={isPlaying || guess.length === 0}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.submitButtonText}>➜</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                            <Text style={styles.skipButtonText}>Give up — reveal the song (0 pts)</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#0F2441' },
    loadingContainer: { flex: 1, backgroundColor: '#0F2441', justifyContent: 'center', alignItems: 'center', padding: 30, gap: 16 },
    loadingEmoji: { fontSize: 48 },
    loadingText: { color: '#F29F41', fontSize: 16, fontWeight: 'bold', textAlign: 'center', lineHeight: 24 },

    topWave: {
        height: 6,
        backgroundColor: '#F29F41',
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 5,
    },

    scrollContent: { padding: 20, paddingBottom: 50, alignItems: 'center' },
    content: { width: '100%', maxWidth: 460 },

    // Header
    header: {
        marginTop: 35,
        marginBottom: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoText: {
        color: '#E5E5E5',
        fontSize: 16,
        lineHeight: 19,
        fontWeight: '900',
        letterSpacing: 2,
    },
    scorePill: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        backgroundColor: '#1E3A5F',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(242, 159, 65, 0.4)',
    },
    scorePillStar: { color: '#F29F41', fontSize: 14 },
    scorePillValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    scorePillUnit: { color: '#5C95C6', fontSize: 11, fontWeight: 'bold' },

    // Progression
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    progressText: { color: '#5C95C6', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    progressDots: { flexDirection: 'row', gap: 6 },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E3A5F' },
    progressDotDone: { backgroundColor: '#5C95C6' },
    progressDotCurrent: { backgroundColor: '#F29F41' },

    // Scène / play
    stageCard: {
        backgroundColor: '#1E3A5F',
        borderRadius: 24,
        paddingVertical: 26,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(92, 149, 198, 0.25)',
    },
    worthRow: { alignItems: 'center', marginBottom: 20 },
    worthLabel: { color: '#5C95C6', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
    worthValue: { color: '#F29F41', fontSize: 34, fontWeight: '900' },
    worthUnit: { fontSize: 16, color: 'rgba(242, 159, 65, 0.7)' },

    playArea: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
    pulseRing: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: '#F29F41',
    },
    playButton: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F29F41',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F29F41',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    playButtonPlaying: { backgroundColor: '#d98830' },
    playIcon: { color: '#0F2441', fontSize: 34, fontWeight: '900', marginLeft: 3 },
    playHint: { color: '#5C95C6', fontSize: 12, marginTop: 14, fontStyle: 'italic' },

    // Message
    messageContainer: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 14,
        width: '100%',
    },
    messageSuccess: { backgroundColor: 'rgba(242, 159, 65, 0.15)', borderWidth: 1, borderColor: '#F29F41' },
    messageError: { backgroundColor: 'rgba(233, 69, 96, 0.15)', borderWidth: 1, borderColor: '#E94560' },
    messageInfo: { backgroundColor: 'rgba(92, 149, 198, 0.15)', borderWidth: 1, borderColor: '#5C95C6' },
    messageText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },

    // Mixer
    mixer: { gap: 8, marginBottom: 14 },
    channel: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 10,
        gap: 12,
    },
    channelActive: {
        backgroundColor: '#1E3A5F',
        borderWidth: 1,
        borderColor: 'rgba(242, 159, 65, 0.5)',
    },
    channelLocked: {
        backgroundColor: 'rgba(30, 58, 95, 0.45)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    channelNext: {
        backgroundColor: 'rgba(92, 149, 198, 0.08)',
        borderWidth: 1.5,
        borderColor: '#5C95C6',
        borderStyle: 'dashed',
    },
    channelIconBox: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: 'rgba(15, 36, 65, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelIconBoxActive: { backgroundColor: 'rgba(242, 159, 65, 0.15)' },
    channelIconBoxNext: { backgroundColor: 'rgba(92, 149, 198, 0.2)' },
    channelIcon: { fontSize: 20, color: '#5C95C6' },
    channelInfo: { flex: 1 },
    channelName: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    channelNameLocked: { color: 'rgba(92, 149, 198, 0.5)' },
    channelStatus: { color: '#F29F41', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
    channelNextTitle: { color: '#5C95C6', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    channelNextSub: { color: 'rgba(92, 149, 198, 0.8)', fontSize: 11, marginTop: 2 },
    channelLockIcon: { fontSize: 16, marginRight: 4 },

    eqRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, marginRight: 6 },
    eqBar: { width: 4, height: 22, borderRadius: 2, backgroundColor: '#F29F41' },

    // Réponse
    answerCard: {
        backgroundColor: '#1E3A5F',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(92, 149, 198, 0.25)',
    },
    answerLabel: { color: '#5C95C6', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
    answerPenalty: { color: 'rgba(233, 69, 96, 0.9)', letterSpacing: 0 },
    inputContainer: { flexDirection: 'row', gap: 8 },
    input: {
        flex: 1,
        backgroundColor: '#0F2441',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(92, 149, 198, 0.3)',
    },
    submitButton: {
        backgroundColor: '#F29F41',
        borderRadius: 12,
        width: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: { opacity: 0.4 },
    submitButtonText: { color: '#0F2441', fontWeight: '900', fontSize: 20 },
    skipButton: { marginTop: 12, alignSelf: 'center', padding: 4 },
    skipButtonText: { color: 'rgba(92, 149, 198, 0.8)', textDecorationLine: 'underline', fontSize: 12 },

    // Game over
    gameOverCard: {
        marginTop: 50,
        backgroundColor: '#1E3A5F',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(242, 159, 65, 0.4)',
    },
    gameOverEmoji: { fontSize: 44, marginBottom: 6 },
    gameOverTitle: { color: '#F29F41', fontSize: 26, fontWeight: '900', letterSpacing: 3, marginBottom: 20 },
    finalScoreCircle: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
        borderColor: '#F29F41',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        backgroundColor: 'rgba(242, 159, 65, 0.08)',
    },
    finalScoreValue: { color: '#fff', fontSize: 40, fontWeight: '900' },
    finalScoreLabel: { color: '#5C95C6', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
    gameOverMessage: { color: '#E5E5E5', fontSize: 14, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },

    guestPrompt: { alignItems: 'center', marginBottom: 20 },
    guestText: { color: '#E5E5E5', marginBottom: 10, fontStyle: 'italic', textAlign: 'center' },

    leaderboardContainer: {
        width: '100%',
        marginBottom: 22,
        backgroundColor: 'rgba(15, 36, 65, 0.6)',
        padding: 14,
        borderRadius: 14,
    },
    leaderboardTitle: { color: '#5C95C6', fontWeight: '800', letterSpacing: 2, fontSize: 12, marginBottom: 12, textAlign: 'center' },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    leaderboardRowFirst: { backgroundColor: 'rgba(242, 159, 65, 0.12)' },
    leaderboardMedal: { width: 28, fontSize: 14, color: '#5C95C6', fontWeight: 'bold' },
    leaderboardName: { flex: 1, color: '#fff', fontWeight: '600' },
    leaderboardScore: { color: '#F29F41', fontWeight: '900' },

    primaryButton: {
        backgroundColor: '#F29F41',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 999,
        alignItems: 'center',
    },
    primaryButtonText: { color: '#0F2441', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});
