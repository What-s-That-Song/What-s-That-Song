import { View, Text, StyleSheet, Pressable, Image, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BackgroundDecoration } from '@/components/BackgroundDecoration';

export default function WelcomeScreen() {
    const router = useRouter();
    const noteBounce = useRef(new Animated.Value(0)).current;
    const orangeWave = useRef(new Animated.Value(0)).current;
    const blueWave = useRef(new Animated.Value(0)).current;
    const playScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const noteAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(noteBounce, {
                    toValue: -10,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(noteBounce, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        );

        noteAnimation.start();

        return () => {
            noteAnimation.stop();
        };
    }, [noteBounce]);

    useEffect(() => {
        const createWaveAnimation = (value: Animated.Value, initialDelay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(initialDelay),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: -1,
                        duration: 400,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.delay(1200),
                ])
            );

        const orangeAnim = createWaveAnimation(orangeWave, 0);
        const blueAnim = createWaveAnimation(blueWave, 400);

        orangeAnim.start();
        blueAnim.start();

        return () => {
            orangeAnim.stop();
            blueAnim.stop();
        };
    }, [orangeWave, blueWave]);

    const animatePlayScale = (toValue: number) => {
        Animated.spring(playScale, {
            toValue,
            useNativeDriver: true,
            friction: 6,
            tension: 150,
        }).start();
    };

    const handlePlayHoverIn = () => animatePlayScale(1.08);
    const handlePlayHoverOut = () => animatePlayScale(1);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            {/* Decoratiive Waves (Simulated with simple views for now, ideally SVGs) */}
            <View style={styles.waveContainer}>
                <Animated.View
                    style={[
                        styles.waveLineOrange,
                        {
                            transform: [
                                { rotate: '-10deg' },
                                { translateX: -20 },
                                {
                                    translateY: orangeWave.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [-8, 0, 8],
                                    }),
                                },
                                {
                                    scaleY: orangeWave.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [1.05, 1, 1.08],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.waveLineBlue,
                        {
                            transform: [
                                { rotate: '-10deg' },
                                { translateX: -10 },
                                {
                                    translateY: blueWave.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [-6, 0, 6],
                                    }),
                                },
                                {
                                    scaleY: blueWave.interpolate({
                                        inputRange: [-1, 0, 1],
                                        outputRange: [1.03, 1, 1.08],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            </View>

            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { transform: [{ translateY: noteBounce }] },
                    ]}
                >
                    {/* Musical Note Representation */}
                    <Text style={styles.musicNote}>♪</Text>
                </Animated.View>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>WHAT'S THAT</Text>
                    <Text style={styles.titleAccent}>SONG?</Text>
                </View>

                <Pressable
                    style={styles.playButton}
                    onPress={() => router.push('/login')}
                    onHoverIn={handlePlayHoverIn}
                    onHoverOut={handlePlayHoverOut}
                    onPressIn={handlePlayHoverIn}
                    onPressOut={handlePlayHoverOut}
                >
                    <Animated.View style={{ transform: [{ scale: playScale }] }}>
                        <Text style={styles.playText}>PLAY</Text>
                    </Animated.View>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2441', // Deep Navy Blue
        alignItems: 'center',
        justifyContent: 'center',
    },
    waveContainer: {
        position: 'absolute',
        top: '30%',
        left: 0,
        right: 0,
        height: 100,
        justifyContent: 'center',
        zIndex: 0,
    },
    waveLineOrange: {
        height: 8,
        width: '120%',
        backgroundColor: '#F29F41', // Orange
        marginBottom: 20,
        borderRadius: 4,
    },
    waveLineBlue: {
        height: 8,
        width: '120%',
        backgroundColor: '#5C95C6', // Light Blue
        borderRadius: 4,
    },
    content: {
        flex: 1,
        justifyContent: 'space-evenly', // Spaced out
        alignItems: 'center',
        paddingVertical: 80,
        width: '100%',
        zIndex: 1,
    },
    iconContainer: {
        marginBottom: 20,
    },
    musicNote: {
        fontSize: 120,
        color: '#F29F41',
        fontWeight: 'bold',
        transform: [{ rotate: '15deg' }]
    },
    titleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#E5E5E5',
        letterSpacing: 2,
    },
    titleAccent: {
        fontSize: 54,
        fontWeight: '900',
        color: '#F29F41',
        letterSpacing: 4,
        marginTop: -5,
    },
    playButton: {
        backgroundColor: '#F29F41',
        paddingVertical: 18,
        paddingHorizontal: 60,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    playText: {
        color: '#0F2441',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
