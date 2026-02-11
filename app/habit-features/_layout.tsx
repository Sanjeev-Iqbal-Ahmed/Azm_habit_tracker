import { Stack } from 'expo-router';

export default function HabitFeaturesLayout() {
    return (
        <Stack>
            <Stack.Screen name="add-habit" options={{ headerShown: false }} />
            <Stack.Screen name="habit-details" options={{ headerShown: false }} />
            <Stack.Screen name="edit-habit" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="calendar" options={{ headerShown: false }} />
            <Stack.Screen name="add-payment" options={{ headerShown: false }} />
        </Stack>
    );
}
