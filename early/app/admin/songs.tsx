import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { BackgroundDecoration } from '../../components/BackgroundDecoration';
import { getSongs, uploadSong, deleteSong, ApiSong } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';

export default function AdminSongs() {
    const router = useRouter();
    const [songs, setSongs] = useState<ApiSong[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulaire d'upload
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [start, setStart] = useState('30');
    const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const loadSongs = async () => {
        try {
            setSongs(await getSongs());
        } catch (error) {
            console.error(error);
            setStatus('Cannot reach the server.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadSongs();
        }, [])
    );

    const handlePickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
        }
    };

    const handleUpload = async () => {
        if (!title.trim() || !artist.trim() || !file) {
            setStatus('Title, artist and an audio file are required.');
            return;
        }
        setUploading(true);
        setStatus('Separating instruments... this can take a minute.');
        try {
            await uploadSong({
                title: title.trim(),
                artist: artist.trim(),
                file,
                start: Number(start) || 0,
            });
            setStatus('Song added!');
            setTitle('');
            setArtist('');
            setFile(null);
            await loadSongs();
        } catch (e: any) {
            console.error(e);
            setStatus(`Upload failed: ${e?.message ?? 'unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteSong(id);
            loadSongs();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackgroundDecoration />

            <View style={styles.header}>
                <Text style={styles.title}>SONGS</Text>
            </View>

            {/* Upload form */}
            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title"
                    placeholderTextColor="#5C95C6"
                    editable={!uploading}
                />
                <TextInput
                    style={styles.input}
                    value={artist}
                    onChangeText={setArtist}
                    placeholder="Artist"
                    placeholderTextColor="#5C95C6"
                    editable={!uploading}
                />
                <View style={styles.formRow}>
                    <TextInput
                        style={[styles.input, styles.startInput]}
                        value={start}
                        onChangeText={setStart}
                        placeholder="Clip start (sec)"
                        placeholderTextColor="#5C95C6"
                        keyboardType="numeric"
                        editable={!uploading}
                    />
                    <TouchableOpacity style={styles.pickButton} onPress={handlePickFile} disabled={uploading}>
                        <Text style={styles.pickButtonText} numberOfLines={1}>
                            {file ? file.name : 'PICK AUDIO FILE'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.uploadButton, uploading && { opacity: 0.5 }]}
                    onPress={handleUpload}
                    disabled={uploading}
                >
                    {uploading
                        ? <ActivityIndicator color="#0F2441" />
                        : <Text style={styles.uploadButtonText}>+ ADD SONG (auto-split instruments)</Text>}
                </TouchableOpacity>
                {status && <Text style={styles.status}>{status}</Text>}
            </View>

            <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 0.5 }]}>ID</Text>
                <Text style={[styles.columnHeader, { flex: 2 }]}>TITLE</Text>
                <Text style={[styles.columnHeader, { flex: 2 }]}>ARTIST</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>TRACKS</Text>
                <Text style={[styles.columnHeader, { flex: 1 }]}>ACTIONS</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#F29F41" />
            ) : (
                <FlatList
                    data={songs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            <Text style={[styles.cell, { flex: 0.5 }]}>{item.id}</Text>
                            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.artist}</Text>
                            <Text style={[styles.cell, { flex: 1 }]}>{item.tracks.length}</Text>
                            <View style={[styles.actions, { flex: 1 }]}>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>No songs yet. Add one above!</Text>}
                />
            )}

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>BACK TO DASHBOARD</Text>
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

    form: { marginBottom: 20, gap: 10 },
    formRow: { flexDirection: 'row', gap: 10 },
    input: {
        backgroundColor: '#1E3A5F',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
    },
    startInput: { flex: 1 },
    pickButton: {
        flex: 2,
        borderWidth: 1,
        borderColor: '#5C95C6',
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    pickButtonText: { color: '#5C95C6', fontWeight: 'bold', fontSize: 12 },
    uploadButton: {
        backgroundColor: '#F29F41',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
    },
    uploadButtonText: { color: '#0F2441', fontWeight: '900' },
    status: { color: '#E5E5E5', fontStyle: 'italic' },

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
    deleteIcon: { color: '#E94560', fontSize: 18 },
    empty: { color: '#5C95C6', fontStyle: 'italic', marginTop: 10 },

    backButton: { marginTop: 20, alignSelf: 'center' },
    backButtonText: { color: '#5C95C6' },
});
