import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Song } from '../constants/Songs';

export const useAudio = (currentSong: Song, activeInstrumentCount: number) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const soundsRef = useRef<{ [key: string]: Audio.Sound }>({});

    // Unload sounds helper
    const unloadSounds = async () => {
        const sounds = soundsRef.current;
        if (sounds) {
            await Promise.all(
                Object.values(sounds).map(async (sound) => {
                    await sound.unloadAsync();
                })
            );
        }
        soundsRef.current = {};
        setIsLoaded(false);
    };

    // Load sounds when song changes
    useEffect(() => {
        const loadSounds = async () => {
            await unloadSounds();

            try {
                // Enable audio playback in silent mode
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });

                const newSounds: { [key: string]: Audio.Sound } = {};

                const loadPromises = currentSong.tracks.map(async (track) => {
                    // Check if uri is a number (require) or string (url)
                    const source = typeof track.uri === 'string' ? { uri: track.uri } : track.uri;

                    const { sound } = await Audio.Sound.createAsync(
                        source,
                        { shouldPlay: false, volume: 0, isLooping: false }
                    );
                    newSounds[track.id] = sound;
                });

                await Promise.all(loadPromises);
                soundsRef.current = newSounds;
                setIsLoaded(true);
            } catch (error) {
                console.error("Error loading sounds", error);
            }
        };

        loadSounds();

        return () => {
            unloadSounds();
        };
    }, [currentSong]);

    const playRound = useCallback(async () => {
        if (!isLoaded) return;

        const sounds = soundsRef.current;

        // Stop anything playing
        await Promise.all(Object.values(sounds).map(s => s.stopAsync()));

        // Set volumes
        const setConfigPromises = currentSong.tracks.map(async (track, index) => {
            const sound = sounds[track.id];
            if (!sound) return;

            // Mute inactive tracks, unmute active ones
            const volume = index < activeInstrumentCount ? 1.0 : 0.0;
            await sound.setVolumeAsync(volume);
            await sound.setPositionAsync(0);
        });

        await Promise.all(setConfigPromises);

        // Play all simultaneously to keep sync
        await Promise.all(Object.values(sounds).map(s => s.playAsync()));
        setIsPlaying(true);

        // Stop after 10s
        setTimeout(async () => {
            await Promise.all(Object.values(sounds).map(async (s) => {
                // Check status properly in a real app, strict mode might have issues if already unloaded
                try {
                    await s.stopAsync();
                } catch (e) {
                    // ignore
                }
            }));
            setIsPlaying(false);
        }, 10000);

    }, [isLoaded, currentSong, activeInstrumentCount]);

    const stop = useCallback(async () => {
        const sounds = soundsRef.current;
        await Promise.all(Object.values(sounds).map(async (s) => {
            try {
                await s.stopAsync();
            } catch (e) { }
        }));
        setIsPlaying(false);
    }, []);

    return { isPlaying, isLoaded, playRound, stop };
};
