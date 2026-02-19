import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BackgroundDecoration } from '@/components/BackgroundDecoration';

const { width } = Dimensions.get('window');

const AVATAR_COLORS = [
    '#F29F41', // Orange (Default)
    '#5C95C6', // Light Blue
    '#E94560', // Red/Pink
    '#50C878', // Emerald Green
    '#9B59B6', // Purple
];

import { db } from '@/database/db';

export default function AvatarScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (params.userType === 'user' && params.userId) {
            try {
                const user = db.getAllSync('SELECT role FROM users WHERE id = ?', [params.userId])[0] as any;
                if (user && user.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Error checking admin status:", e);
            }
        }
    }, [params]);

    const handleStartGame = () => {
        // Pass userType & userId param to Game
        router.replace({ pathname: '/game', params: { userType: params.userType, userId: params.userId } });
    };

    const handleAdmin = () => {
        router.push('/admin');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            {/* Title */}
            {isAdmin && (
                <TouchableOpacity style={styles.adminButton} onPress={handleAdmin}>
                    <Text style={styles.adminText}>ADMIN PANEL</Text>
                </TouchableOpacity>
            )}
            <View style={styles.header}>
                <Text style={styles.title}>CUSTOMIZE</Text>
                <Text style={styles.subtitle}>YOUR AVATAR</Text>
            </View>

            {/* Avatar Preview */}
            <View style={styles.previewContainer}>
                <View style={[styles.avatarCircle, { backgroundColor: selectedColor }]}>
                    <Text style={styles.avatarInitials}>P1</Text>
                </View>
                <View style={styles.pedestal} />
            </View>

            {/* Color Picker */}
            <View style={styles.optionsContainer}>
                <Text style={styles.sectionTitle}>CHOOSE COLOR</Text>
                <View style={styles.colorGrid}>
                    {AVATAR_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                selectedColor === color && styles.selectedOption
                            ]}
                            onPress={() => setSelectedColor(color)}
                            activeOpacity={0.8}
                        />
                    ))}
                </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity
                style={[styles.startButton, { backgroundColor: selectedColor }]}
                onPress={handleStartGame}
            >
                <Text style={styles.startButtonText}>START GAME</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2441',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
    },
    adminButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: '#E94560',
        padding: 8,
        borderRadius: 8,
        zIndex: 10,
    },
    adminText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    title: {
        color: '#5C95C6',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        color: '#E5E5E5',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 5,
    },

    previewContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    avatarCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 2,
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    pedestal: {
        width: 100,
        height: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 50,
        marginTop: 20,
        transform: [{ scaleX: 1.5 }],
    },

    optionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    sectionTitle: {
        color: '#5C95C6',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 20,
    },
    colorGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedOption: {
        borderColor: '#fff',
        transform: [{ scale: 1.2 }],
    },

    startButton: {
        width: '100%',
        paddingVertical: 20,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
