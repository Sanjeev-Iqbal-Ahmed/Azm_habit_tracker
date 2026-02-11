import { Appearance } from 'react-native';
import { PropsWithChildren, createContext, useEffect, useMemo, useState } from 'react';

import { ThemeName, ThemePreference } from '@/constants/theme';
import { getThemePreference, setThemePreference } from '@/storage/preferences';

export type ThemeContextValue = {
    colorScheme: ThemeName;
    preference: ThemePreference;
    isHydrated: boolean;
    setPreference: (preference: ThemePreference) => Promise<void>;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const FALLBACK_SCHEME: ThemeName = 'light';

export function AppThemeProvider({ children }: PropsWithChildren) {
    const [preference, setPreferenceState] = useState<ThemePreference>('system');
    const [systemScheme, setSystemScheme] = useState<ThemeName>(FALLBACK_SCHEME);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const loadPreference = async () => {
            try {
                const storedPreference = await getThemePreference();
                if (storedPreference) {
                    setPreferenceState(storedPreference);
                }
            } finally {
                const currentSystem = Appearance.getColorScheme() as ThemeName | null;
                setSystemScheme(currentSystem ?? FALLBACK_SCHEME);
                setIsHydrated(true);
            }
        };

        loadPreference();
    }, []);

    useEffect(() => {
        const subscription = Appearance.addChangeListener((event) => {
            const nextScheme = event.colorScheme as ThemeName | null;
            setSystemScheme(nextScheme ?? FALLBACK_SCHEME);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const resolvedColorScheme: ThemeName =
        preference === 'system' ? systemScheme ?? FALLBACK_SCHEME : preference;

    const handleSetPreference = async (nextPreference: ThemePreference) => {
        setPreferenceState(nextPreference);
        await setThemePreference(nextPreference);
    };

    const value = useMemo<ThemeContextValue>(
        () => ({
            colorScheme: resolvedColorScheme,
            preference,
            isHydrated,
            setPreference: handleSetPreference,
        }),
        [resolvedColorScheme, preference, isHydrated]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
