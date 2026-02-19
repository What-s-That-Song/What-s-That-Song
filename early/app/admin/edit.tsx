import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackgroundDecoration } from '../../components/BackgroundDecoration';
import { db, createUser, updateUser } from '../../database/db';

export default function EditUser() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditing = !!params.id;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [score, setScore] = useState('0');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (isEditing) {
            const user = db.getAllSync('SELECT * FROM users WHERE id = ?', [params.id])[0] as any;
            if (user) {
                setName(user.name);
                setEmail(user.email);
                setPassword(user.password);
                setScore(user.highScore.toString());
                setIsAdmin(user.role === 'admin');
            }
        }
    }, [params.id]);

    const handleSave = () => {
        if (!name || !email || !password) return;

        const role = isAdmin ? 'admin' : 'user';
        const highScore = parseInt(score) || 0;

        try {
            if (isEditing) {
                updateUser(Number(params.id), name, email, role, highScore);
                // Also update password if needed (separate query for simplicity in this demo I didn't verify password change logic strictly)
                db.runSync('UPDATE users SET password = ? WHERE id = ?', [password, params.id]);
            } else {
                createUser(email, password, name, role);
            }
            router.back();
        } catch (error) {
            console.error(error);
            alert("Error saving user. Email might be taken.");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            <Text style={styles.title}>{isEditing ? "EDIT USER" : "NEW USER"}</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Player Name" placeholderTextColor="#5C95C6" />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#5C95C6" autoCapitalize="none" />

                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Secret" placeholderTextColor="#5C95C6" />

                {isEditing && (
                    <>
                        <Text style={styles.label}>High Score</Text>
                        <TextInput style={styles.input} value={score} onChangeText={setScore} keyboardType="numeric" />
                    </>
                )}

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Is Admin?</Text>
                    <Switch value={isAdmin} onValueChange={setIsAdmin} trackColor={{ false: "#767577", true: "#F29F41" }} thumbColor={isAdmin ? "#fff" : "#f4f3f4"} />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>SAVE USER</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2441',
        padding: 30,
        justifyContent: 'center',
    },
    title: { color: '#F29F41', fontSize: 24, fontWeight: '900', marginBottom: 30, textAlign: 'center' },
    form: { width: '100%' },
    label: { color: '#5C95C6', marginBottom: 5, fontWeight: 'bold' },
    input: {
        backgroundColor: '#1E3A5F',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#5C95C6',
    },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    saveButton: { backgroundColor: '#F29F41', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    saveButtonText: { color: '#0F2441', fontWeight: 'bold', fontSize: 16 },
    cancelButton: { alignItems: 'center' },
    cancelButtonText: { color: '#E94560' },
});
