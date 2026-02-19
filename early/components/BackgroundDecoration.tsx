import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Simple scattered positions for decoration
const DECORATIONS = [
    { text: '♪', top: '10%', left: '5%', size: 40, rotate: '-15deg', opacity: 0.1 },
    { text: '♫', top: '25%', right: '10%', size: 60, rotate: '15deg', opacity: 0.05 },
    { text: '♩', top: '45%', left: '15%', size: 30, rotate: '30deg', opacity: 0.08 },
    { text: '♬', top: '60%', right: '5%', size: 50, rotate: '-10deg', opacity: 0.06 },
    { text: '♪', top: '80%', left: '8%', size: 45, rotate: '20deg', opacity: 0.08 },
    { text: '🎸', top: '15%', right: '25%', size: 35, rotate: '45deg', opacity: 0.04 }, // Emoji instrument as placeholder
    { text: '🎹', top: '70%', left: '25%', size: 40, rotate: '-5deg', opacity: 0.04 },
    { text: '🎷', top: '85%', right: '15%', size: 35, rotate: '10deg', opacity: 0.04 },
];

export const BackgroundDecoration = () => {
    return (
        <View style={styles.container} pointerEvents="none">
            {DECORATIONS.map((item, index) => (
                <Text
                    key={index}
                    style={[
                        styles.decoration,
                        {
                            top: item.top as any,
                            left: item.left as any,
                            right: item.right as any,
                            fontSize: item.size,
                            transform: [{ rotate: item.rotate }],
                            opacity: item.opacity,
                        }
                    ]}
                >
                    {item.text}
                </Text>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        overflow: 'hidden',
    },
    decoration: {
        position: 'absolute',
        color: '#fff',
        fontWeight: 'bold',
    },
});
