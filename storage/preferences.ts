import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemePreference } from '@/constants/theme';

const THEME_KEY = 'theme-preference';

export async function getThemePreference(): Promise<ThemePreference | null> {
    try {
        const value = await AsyncStorage.getItem(THEME_KEY);
        if (!value) return null;
        if (value === 'light' || value === 'dark' || value === 'system') {
            return value;
        }
        return null;
    } catch (error) {
        console.warn('Unable to read theme preference', error);
        return null;
    }
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
    try {
        await AsyncStorage.setItem(THEME_KEY, preference);
    } catch (error) {
        console.warn('Unable to save theme preference', error);
    }
}
