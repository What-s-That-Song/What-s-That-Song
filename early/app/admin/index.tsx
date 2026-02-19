import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackgroundDecoration } from '../../components/BackgroundDecoration';
import { getAllUsers, deleteUser, initDatabase } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = () => {
        try {
            const allUsers = getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadUsers();
        }, [])
    );

    const handleDelete = (id: number) => {
        // Simple confirm (in real app use Alert)
        deleteUser(id);
        loadUsers();
    };

    const handleEdit = (user: any) => {
        router.push({ pathname: '/admin/edit', params: { id: user.id } });
    };

    const handleAdd = () => {
        router.push('/admin/edit');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            <View style={styles.header}>
                <Text style={styles.title}>ADMIN DASHBOARD</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                    <Text style={styles.addButtonText}>+ ADD USER</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 0.5 }]}>ID</Text>
                <Text style={[styles.columnHeader, { flex: 2 }]}>NAME</Text>
                <Text style={[styles.columnHeader, { flex: 2 }]}>EMAIL</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>ROLE</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>SCORE</Text>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>ACTIONS</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#F29F41" />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            <Text style={[styles.cell, { flex: 0.5 }]}>{item.id}</Text>
                            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.email}</Text>
                            <Text style={[styles.cell, { flex: 1 }]}>{item.role}</Text>
                            <Text style={[styles.cell, { flex: 1 }]}>{item.highScore}</Text>
                            <View style={[styles.actions, { flex: 1.5 }]}>
                                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                                    <Text style={styles.editIcon}>✎</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>BACK TO GAME</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F2441',
        padding: 20,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: { color: '#F29F41', fontSize: 24, fontWeight: '900' },
    addButton: { backgroundColor: '#5C95C6', padding: 10, borderRadius: 8 },
    addButtonText: { color: '#0F2441', fontWeight: 'bold' },

    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#5C95C6',
        marginBottom: 10,
    },
    columnHeader: { color: '#5C95C6', fontWeight: 'bold', fontSize: 12 },

    row: {
        flexDirection: 'row',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(92, 149, 198, 0.2)',
        alignItems: 'center',
    },
    cell: { color: '#fff', fontSize: 14 },
    actions: { flexDirection: 'row', gap: 15 },
    iconBtn: { padding: 5 },
    editIcon: { color: '#F29F41', fontSize: 18 },
    deleteIcon: { color: '#E94560', fontSize: 18 },

    backButton: { marginTop: 20, alignSelf: 'center' },
    backButtonText: { color: '#5C95C6' },
});
