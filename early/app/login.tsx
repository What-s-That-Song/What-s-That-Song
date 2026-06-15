import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BackgroundDecoration } from '@/components/BackgroundDecoration';

import { login, logout, createUser } from '@/database/db';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) return;
        setLoading(true);

        try {
            if (isRegistering) {
                if (!name) {
                    alert("Please enter your name.");
                    setLoading(false);
                    return;
                }
                await createUser(email, password, name);
            }

            // Le backend vérifie le mot de passe et renvoie un token de session ;
            // l'identité n'apparaît plus dans l'URL.
            await login(email, password);
            router.replace('/avatar');
        } catch (e: any) {
            console.error(e);
            const message =
                typeof e?.message === 'string' && e.message.includes('UNIQUE constraint failed')
                    ? 'Cet email est déjà utilisé. Choisis-en un autre.'
                    : 'Authentication failed. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        // Invité = aucune session
        await logout();
        router.replace('/avatar');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>{isRegistering ? "CREATE ACCOUNT" : "WELCOME BACK"}</Text>
                    <View style={styles.separator} />
                    <Text style={styles.subtext}>
                        {isRegistering ? "Sign up to join the leaderboard" : "Sign in to your account"}
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    {isRegistering && (
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>NAME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Player 1"
                                placeholderTextColor="#5C95C6"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>EMAIL</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="user@example.com"
                            placeholderTextColor="#5C95C6"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#5C95C6"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, (!email || !password) && styles.disabledButton]}
                        onPress={handleAuth}
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <ActivityIndicator color="#0F2441" />
                        ) : (
                            <Text style={styles.loginButtonText}>
                                {isRegistering ? "SIGN UP" : "LOG IN"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Toggle Login/Sign Up */}
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setIsRegistering(!isRegistering)}
                    >
                        <Text style={styles.toggleText}>
                            {isRegistering ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                        </Text>
                    </TouchableOpacity>

                    {/* Guest Button */}
                    <TouchableOpacity
                        style={styles.guestButton}
                        onPress={handleGuest}
                    >
                        <Text style={styles.guestButtonText}>PLAY AS GUEST</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2441', // Deep Navy
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 350,
        padding: 20,
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: 'flex-start',
    },
    header: {
        fontSize: 28,
        fontWeight: '900',
        color: '#E5E5E5',
        letterSpacing: 2,
    },
    separator: {
        height: 6,
        width: 60,
        backgroundColor: '#F29F41', // Orange accent
        marginVertical: 10,
        borderRadius: 3,
    },
    subtext: {
        fontSize: 16,
        color: '#5C95C6', // Light Blue
        fontWeight: '500',
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: 25,
    },
    label: {
        color: '#5C95C6',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1E3A5F', // Slightly lighter navy for inputs
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#1E3A5F',
    },
    loginButton: {
        backgroundColor: '#F29F41',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#2A4B75', // Muted blue-grey
    },
    loginButtonText: {
        color: '#0F2441',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    toggleButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    toggleText: {
        color: '#5C95C6',
        fontSize: 14,
        fontWeight: '600',
    },
    guestButton: {
        marginTop: 30,
        alignItems: 'center',
        paddingVertical: 15,
        borderWidth: 2,
        borderColor: '#5C95C6',
        borderRadius: 12,
    },
    guestButtonText: {
        color: '#5C95C6',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
});
