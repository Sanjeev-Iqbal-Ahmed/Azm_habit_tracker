import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Modal } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { exportDatabase, importDatabase } from '@/database/backup';
import { resetDatabase, resetQuotes } from '@/database/sqlite';
import { useTheme } from '@/hooks/use-theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {
    const router = useRouter();
    const { colorScheme, setPreference } = useTheme();
    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const [isResetConfirmVisible, setIsResetConfirmVisible] = useState(false);

    const handleThemeChange = (theme: 'light' | 'dark') => {
        setPreference(theme);
    };

    const mainSettings = [
        { id: 'account', icon: 'person-outline', label: 'Account' },
        { id: 'notes', icon: 'document-text-outline', label: 'Notes' },
        { id: 'pomodoro', icon: 'timer-outline', label: 'Pomodoro' },
        { id: 'passwords', icon: 'key-outline', label: 'Passwords' },
        { id: 'theme', icon: 'color-palette-outline', label: 'Theme' },
    ];

    const handleResetDatabase = () => {
        setIsResetConfirmVisible(true);
    };

    const cancelResetDatabase = () => {
        setIsResetConfirmVisible(false);
    };

    const confirmResetDatabase = () => {
        resetDatabase();
        setIsResetConfirmVisible(false);
        Alert.alert('Success', 'Database has been reset. Please restart the app.');
    };

    const handleExportData = () => {
        exportDatabase();
    };

    const handleImportData = () => {
        Alert.alert(
            'Import Data',
            'This will overwrite all your current data with the selected backup. Make sure you have exported your current data if you wish to keep it. Do you want to proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Select File', 
                    onPress: () => importDatabase() 
                }
            ]
        );
    };

    const handleRefreshQuotes = () => {
        Alert.alert(
            'Refresh Motivational Quotes',
            'This will update the quote collection with new inspirational content. Your habits, notes, and other data will not be affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Refresh',
                    onPress: () => {
                        try {
                            resetQuotes();
                            Alert.alert('Success', 'Motivational quotes have been refreshed!');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to refresh quotes. Please try again.');
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
            onPress={() => {
                if (item.id === 'passwords') {
                    router.push('/habit-features/passwords');
                } else if (item.id === 'notes') {
                    router.push('/(tabs)/notes');
                } else if (item.id === 'pomodoro') {
                    router.push('/(tabs)/pomodoro');
                }
            }}
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

                {/* Data Management Section */}
                <View style={styles.section}>
                    <ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>Data Management</ThemedText>

                    {/* Export Data Button */}
                    <TouchableOpacity
                        style={[styles.settingItem, { backgroundColor: surfaceColor, borderColor }]}
                        onPress={handleExportData}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="cloud-upload-outline" size={24} color={primaryColor} />
                            <ThemedText style={styles.settingLabel}>Export Data</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                    </TouchableOpacity>

                    {/* Import Data Button */}
                    <TouchableOpacity
                        style={[styles.settingItem, { backgroundColor: surfaceColor, borderColor }]}
                        onPress={handleImportData}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="cloud-download-outline" size={24} color={primaryColor} />
                            <ThemedText style={styles.settingLabel}>Import Data</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                    </TouchableOpacity>
                </View>

                {/* Caution Zone */}
                <View style={styles.dangerSection}>
                    <ThemedText style={[styles.dangerTitle, { color: mutedColor }]}>Caution</ThemedText>

                    {/* Refresh Quotes Button */}
                    <TouchableOpacity
                        style={[styles.settingItem, { backgroundColor: surfaceColor, borderColor: accentColor }]}
                        onPress={handleRefreshQuotes}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="refresh-outline" size={24} color={accentColor} />
                            <ThemedText style={styles.settingLabel}>Refresh Motivational Quotes</ThemedText>
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

            <Modal
                visible={isResetConfirmVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelResetDatabase}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmDialog, { backgroundColor: surfaceColor }]}>
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.confirmIcon} />
                        <ThemedText style={styles.confirmTitle}>Reset Database?</ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            This will delete ALL data including habits, payments, notes, and to-dos. This action cannot be undone. Continue?
                        </ThemedText>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={[styles.confirmButton, { borderColor: borderColor, borderWidth: 1 }]}
                                onPress={cancelResetDatabase}
                            >
                                <ThemedText style={{ color: primaryColor }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: '#EF4444' }]}
                                onPress={confirmResetDatabase}
                            >
                                <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>Reset</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        marginLeft: 4,
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
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmDialog: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    confirmIcon: {
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
});
