import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/hooks/use-theme';
import { resetDatabase, resetQuotes } from '@/database/sqlite';

export default function SettingsScreen() {
    const router = useRouter();
    const { colorScheme, setPreference } = useTheme();
    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const handleThemeChange = (theme: 'light' | 'dark') => {
        setPreference(theme);
    };

    const mainSettings = [
        { id: 'account', icon: 'person-outline', label: 'Account' },
        { id: 'notifications', icon: 'notifications-outline', label: 'Notifications' },
        { id: 'reminders', icon: 'alarm-outline', label: 'Reminders' },
        { id: 'theme', icon: 'color-palette-outline', label: 'Theme' },
        { id: 'rate', icon: 'star-outline', label: 'Rate This App' },
        { id: 'support', icon: 'help-circle-outline', label: 'Support' },
    ];

    const footerSettings = [
        { id: 'privacy', icon: 'lock-closed-outline', label: 'Privacy Policy' },
        { id: 'about', icon: 'information-circle-outline', label: 'About & Help' },
    ];

    const handleResetDatabase = () => {
        Alert.alert(
            'Reset Database',
            'This will delete ALL data including habits, payments, notes, and to-dos. This action cannot be undone. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        resetDatabase();
                        Alert.alert('Success', 'Database has been reset. Please restart the app.');
                    },
                },
            ]
        );
    };

    const handleRefreshVerses = () => {
        Alert.alert(
            'Refresh Quranic Verses',
            'This will update the verse collection with new verses. Your habits, notes, and other data will not be affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Refresh',
                    onPress: () => {
                        try {
                            resetQuotes();
                            Alert.alert('Success', 'Quranic verses have been refreshed!');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to refresh verses. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const renderSettingItem = (item: any, isTheme = false) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.settingItem, { backgroundColor: surfaceColor, borderColor }]}
        >
            <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={24} color={primaryColor} />
                <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
            </View>
            {isTheme ? (
                <View style={styles.themeSelector}>
                    <TouchableOpacity
                        style={[
                            styles.themeOption,
                            colorScheme === 'light' && [styles.activeTheme, { backgroundColor: accentColor }]
                        ]}
                        onPress={() => handleThemeChange('light')}
                    >
                        <ThemedText style={[
                            styles.themeOptionText,
                            { color: colorScheme === 'light' ? primaryColor : mutedColor }
                        ]}>
                            Light
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.themeOption,
                            colorScheme === 'dark' && [styles.activeTheme, { backgroundColor: accentColor }]
                        ]}
                        onPress={() => handleThemeChange('dark')}
                    >
                        <ThemedText style={[
                            styles.themeOptionText,
                            { color: colorScheme === 'dark' ? primaryColor : mutedColor }
                        ]}>
                            Dark
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={20} color={mutedColor} />
            )}
        </TouchableOpacity>
    );

    return (
        <ThemedView style={[styles.container, { backgroundColor }]}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton}
                    onPress={() => router.push('/(tabs)')}>
                    <Ionicons name="chevron-back" size={24} color={primaryColor} />
                </TouchableOpacity>
                <ThemedText type="title" style={styles.title}>Settings</ThemedText>
                <View style={styles.placeholder} />
            </View>

            {/* Settings List */}
            <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
                {/* Main Settings */}
                <View style={styles.section}>
                    {mainSettings.map((item) =>
                        renderSettingItem(item, item.id === 'theme')
                    )}
                </View>

                {/* Footer Settings */}
                <View style={styles.footerSection}>
                    {footerSettings.map((item) => renderSettingItem(item))}
                </View>

                {/* Caution Zone */}
                <View style={styles.dangerSection}>
                    <ThemedText style={[styles.dangerTitle, { color: mutedColor }]}>Caution</ThemedText>

                    {/* Refresh Verses Button */}
                    <TouchableOpacity
                        style={[styles.settingItem, { backgroundColor: surfaceColor, borderColor: accentColor }]}
                        onPress={handleRefreshVerses}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="refresh-outline" size={24} color={accentColor} />
                            <ThemedText style={styles.settingLabel}>Refresh Quranic Verses</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                    </TouchableOpacity>

                    {/* Reset Database Button */}
                    <TouchableOpacity
                        style={[styles.settingItem, styles.dangerItem, { backgroundColor: surfaceColor, borderColor: '#EF4444' }]}
                        onPress={handleResetDatabase}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                            <ThemedText style={[styles.settingLabel, { color: '#EF4444' }]}>Reset Database</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    placeholder: {
        width: 40,
    },
    settingsList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 32,
    },
    footerSection: {
        paddingBottom: 40,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    themeSelector: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    themeOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    activeTheme: {
        shadowColor: '#DDEDEC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    themeOptionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dangerSection: {
        marginBottom: 40,
    },
    dangerTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    dangerItem: {
        borderWidth: 1,
    },
});
