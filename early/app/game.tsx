import { View, StyleSheet } from "react-native";
import GameScreen from "../components/GameScreen";

import { useLocalSearchParams } from 'expo-router';

export default function GameRoute() {
    const params = useLocalSearchParams();
    const userType = Array.isArray(params.userType) ? params.userType[0] : params.userType;

    return (
        <View style={styles.container}>
            <GameScreen userType={userType} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
