import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BackgroundDecoration } from '@/components/BackgroundDecoration';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            {/* Decoratiive Waves (Simulated with simple views for now, ideally SVGs) */}
            <View style={styles.waveContainer}>
                <View style={styles.waveLineOrange} />
                <View style={styles.waveLineBlue} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {/* Musical Note Representation */}
                    <Text style={styles.musicNote}>♪</Text>
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.title}>WHAT'S THAT</Text>
                    <Text style={styles.titleAccent}>SONG?</Text>
                </View>

                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => router.push('/login')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.playText}>PLAY</Text>
                </TouchableOpacity>
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
        transform: [{ rotate: '-10deg' }, { translateX: -20 }],
        marginBottom: 20,
        borderRadius: 4,
    },
    waveLineBlue: {
        height: 8,
        width: '120%',
        backgroundColor: '#5C95C6', // Light Blue
        transform: [{ rotate: '-10deg' }, { translateX: -10 }],
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
