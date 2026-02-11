import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getHabitById, updateHabit, runStatement, formatDateString, type HabitRecord } from '@/database/sqlite';

export default function EditHabitScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [habit, setHabit] = useState<HabitRecord | null>(null);
    const [habitName, setHabitName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('checkmark-circle');
    const [goalPerDay, setGoalPerDay] = useState(1);
    const [unit, setUnit] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    // Available icons for habits
    const availableIcons = [
        // General / Default
        { name: 'checkmark-circle', label: 'Default' },

        // Health & Wellness
        { name: 'water', label: 'Water' },
        { name: 'fitness', label: 'Exercise' },
        { name: 'barbell', label: 'Biceps / Strength' },
        { name: 'walk', label: 'Walk' },
        { name: 'bicycle', label: 'Bike' },
        { name: 'heart', label: 'Health' },
        { name: 'leaf', label: 'Meditate' },
        { name: 'moon', label: 'Sleep' },
        { name: 'pulse', label: 'Cardio' },

        // Learning & Personal Growth
        { name: 'bulb', label: 'Learn' },
        { name: 'school', label: 'Study' },
        { name: 'language', label: 'Language' },

        // Work & Productivity
        { name: 'briefcase', label: 'Work' },
        { name: 'calendar', label: 'Schedule' },
        { name: 'alarm', label: 'Reminder' },

        // Discipline & Habits
        { name: 'shield-checkmark', label: 'Discipline' },
        { name: 'repeat', label: 'Habit' },
        { name: 'timer', label: 'Focus' },
        { name: 'lock-closed', label: 'Self Control' },

        // Tech & Development
        { name: 'code', label: 'Code' },
        { name: 'server', label: 'Backend' },
        { name: 'bug', label: 'Debug' },
        { name: 'git-branch', label: 'Version Control' },

        // Finance & Business
        { name: 'wallet', label: 'Expense' },
        { name: 'trending-up', label: 'Investment' },

        // Creativity & Hobbies
        { name: 'brush', label: 'Art' },
        { name: 'musical-notes', label: 'Music' },
        { name: 'camera', label: 'Photography' },
        { name: 'game-controller', label: 'Gaming' },

        // Social & Lifestyle
        { name: 'people', label: 'Social' },
        { name: 'chatbubbles', label: 'Communication' },
        { name: 'call', label: 'Call' },
        { name: 'heart-circle', label: 'Relationships' },
        { name: 'happy', label: 'Mood' },

        { name: 'flag', label: 'Milestone' },
        { name: 'trophy', label: 'Achievement' },

        // Travel & Outdoors
        { name: 'map', label: 'Navigation' },
        { name: 'sunny', label: 'Outdoor' },

    ];

    useEffect(() => {
        if (!id) return;

        try {
            const habitData = getHabitById(parseInt(id));
            if (!habitData) {
                console.error('Habit not found');
                router.back();
                return;
            }
            setHabit(habitData);
            setHabitName(habitData.name);
            setDescription(habitData.description || '');
            setSelectedIcon(habitData.icon || 'checkmark-circle');
            setGoalPerDay(habitData.goal_per_day || 1);
            setUnit(habitData.unit || '');
            setStartDate(habitData.start_date ? new Date(habitData.start_date) : new Date());
            setFrequency(habitData.frequency || 'daily');
        } catch (error) {
            console.error('Failed to load habit:', error);
            router.back();
        }
    }, [id]);

    const handleUpdateHabit = async () => {
        if (!habit || !habitName.trim()) return;

        setIsLoading(true);
        try {
            await updateHabit(habit.id, {
                name: habitName.trim(),
                description: description.trim() || undefined,
                icon: selectedIcon,
                goalPerDay,
                unit: unit.trim() || undefined,
                startDate: formatDateString(startDate) || undefined,
                frequency,
            });
            router.back();
        } catch (error) {
            console.error('Failed to update habit:', error);
            Alert.alert('Error', 'Failed to update habit. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            setStartDate(selectedDate);
        }
    };

    const showDatePickerModal = () => {
        setShowDatePicker(true);
    };

    const formatDateDisplay = (date: Date) => {
        return formatDateString(date);
    };

    const handleDeleteHabit = () => {
        setIsDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (!habit) return;

        try {
            runStatement('DELETE FROM habits WHERE id = ?', [habit.id]);
            setIsDeleteConfirmVisible(false);
            router.back();
        } catch (error) {
            console.error('Failed to delete habit:', error);
            // Fallback to alert for error only
            Alert.alert('Error', 'Failed to delete habit. Please try again.');
        }
    };

    const cancelDelete = () => {
        setIsDeleteConfirmVisible(false);
    };

    const incrementGoal = () => setGoalPerDay(prev => prev + 1);
    const decrementGoal = () => setGoalPerDay(prev => Math.max(1, prev - 1));

    const isUpdateDisabled = !habitName.trim() || isLoading;

    if (!habit) {
        return (
            <ThemedView style={[styles.container, { backgroundColor }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText type="title" style={styles.title}>Loading...</ThemedText>
                    <View style={styles.placeholder} />
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor }]}>
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={primaryColor} />
                </TouchableOpacity>
                <ThemedText type="title" style={styles.title}>Edit Habit</ThemedText>
                <TouchableOpacity onPress={handleDeleteHabit} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {/* Form Section */}
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                {/* Habit Name (Required) */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Habit Name</ThemedText>
                    <View style={[styles.inputContainer, { borderColor }]}>
                        <TextInput
                            style={[styles.textInput, { color: primaryColor }]}
                            placeholder="Habit name (e.g. Study, Exercise)"
                            placeholderTextColor={mutedColor}
                            value={habitName}
                            onChangeText={setHabitName}
                        />
                    </View>
                    <ThemedText style={[styles.requiredText, { color: accentColor }]}>
                        Required
                    </ThemedText>
                </View>

                {/* Icon Picker */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Choose Icon</ThemedText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.iconPickerScroll}
                    >
                        {availableIcons.map((icon) => (
                            <TouchableOpacity
                                key={icon.name}
                                style={[
                                    styles.iconOption,
                                    {
                                        backgroundColor: selectedIcon === icon.name ? accentColor : surfaceColor,
                                        borderColor: selectedIcon === icon.name ? accentColor : borderColor
                                    }
                                ]}
                                onPress={() => setSelectedIcon(icon.name)}
                            >
                                <Ionicons
                                    name={icon.name as any}
                                    size={28}
                                    color={selectedIcon === icon.name ? accentTextColor : primaryColor}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <ThemedText style={[styles.helperText, { color: mutedColor }]}>
                        Select an icon that represents your habit
                    </ThemedText>
                </View>

                {/* Description (Optional) */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Description</ThemedText>
                    <View style={[styles.textAreaContainer, { borderColor }]}>
                        <TextInput
                            style={[styles.textArea, { color: primaryColor }]}
                            placeholder="Add a short note (optional)"
                            placeholderTextColor={mutedColor}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                    <ThemedText style={[styles.helperText, { color: mutedColor }]}>
                        Optional
                    </ThemedText>
                </View>

                {/* Goal Per Day */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Goal per day</ThemedText>
                    <View style={styles.goalContainer}>
                        <TouchableOpacity
                            style={[styles.goalButton, { backgroundColor: surfaceColor, borderColor }]}
                            onPress={decrementGoal}
                        >
                            <Ionicons name="remove" size={20} color={primaryColor} />
                        </TouchableOpacity>
                        <View style={styles.goalValue}>
                            <ThemedText type="title" style={styles.goalNumber}>{goalPerDay}</ThemedText>
                        </View>
                        <TouchableOpacity
                            style={[styles.goalButton, { backgroundColor: surfaceColor, borderColor }]}
                            onPress={incrementGoal}
                        >
                            <Ionicons name="add" size={20} color={primaryColor} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Unit Input */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Unit</ThemedText>
                    <View style={[styles.inputContainer, { borderColor }]}>
                        <TextInput
                            style={[styles.textInput, { color: primaryColor }]}
                            placeholder="e.g. glasses, sessions, times"
                            placeholderTextColor={mutedColor}
                            value={unit}
                            onChangeText={setUnit}
                        />
                    </View>
                </View>

                {/* Start Date */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Start date</ThemedText>
                    <TouchableOpacity
                        style={[styles.dateSelector, { backgroundColor: surfaceColor, borderColor }]}
                        onPress={showDatePickerModal}
                    >
                        <Ionicons name="calendar" size={20} color={primaryColor} />
                        <ThemedText style={styles.dateText}>{formatDateDisplay(startDate)}</ThemedText>
                        <Ionicons name="chevron-forward" size={16} color={mutedColor} />
                    </TouchableOpacity>
                    <ThemedText style={[styles.helperText, { color: mutedColor }]}>
                        Defaults to today if not selected
                    </ThemedText>
                </View>

                {/* Frequency */}
                <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Frequency</ThemedText>
                    <View style={styles.frequencyContainer}>
                        <TouchableOpacity
                            style={[
                                styles.frequencyOption,
                                frequency === 'daily' && [styles.activeFrequency, { backgroundColor: accentColor }]
                            ]}
                            onPress={() => setFrequency('daily')}
                        >
                            <ThemedText style={[
                                styles.frequencyText,
                                { color: frequency === 'daily' ? accentTextColor : primaryColor }
                            ]}>
                                Daily
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.frequencyOption,
                                frequency === 'weekly' && [styles.activeFrequency, { backgroundColor: accentColor }]
                            ]}
                            onPress={() => setFrequency('weekly')}
                        >
                            <ThemedText style={[
                                styles.frequencyText,
                                { color: frequency === 'weekly' ? accentTextColor : primaryColor }
                            ]}>
                                Weekly
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom spacing for fixed button */}
                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Primary Action Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.updateButton,
                        { backgroundColor: isUpdateDisabled ? borderColor : accentColor }
                    ]}
                    onPress={handleUpdateHabit}
                    disabled={isUpdateDisabled}
                >
                    <ThemedText style={[
                        styles.updateButtonText,
                        { color: isUpdateDisabled ? mutedColor : accentTextColor }
                    ]}>
                        Update Habit
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                />
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                visible={isDeleteConfirmVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelDelete}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmDialog, { backgroundColor: surfaceColor }]}>
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.confirmIcon} />
                        <ThemedText style={styles.confirmTitle}>Delete Habit?</ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            Are you sure you want to delete "{habitName}"? This action cannot be undone.
                        </ThemedText>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={[styles.confirmButton, { borderColor: borderColor, borderWidth: 1 }]}
                                onPress={cancelDelete}
                            >
                                <ThemedText style={{ color: primaryColor }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: '#EF4444' }]}
                                onPress={confirmDelete}
                            >
                                <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>Delete</ThemedText>
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
    deleteButton: {
        padding: 8,
    },
    placeholder: {
        width: 40,
    },
    form: {
        flex: 1,
        paddingHorizontal: 20,
    },
    formSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    inputContainer: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    textInput: {
        fontSize: 16,
        fontWeight: '500',
    },
    requiredText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 8,
    },
    textAreaContainer: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 80,
    },
    textArea: {
        fontSize: 16,
        fontWeight: '500',
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    iconPickerScroll: {
        marginBottom: 12,
    },
    iconOption: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
    },
    goalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    goalButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    goalValue: {
        minWidth: 60,
        alignItems: 'center',
    },
    goalNumber: {
        fontSize: 32,
        fontWeight: '700',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '500',
    },
    frequencyContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    frequencyOption: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeFrequency: {
        shadowColor: '#DDEDEC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    frequencyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    bottomSpacing: {
        height: 120,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    updateButton: {
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    updateButtonText: {
        fontSize: 18,
        fontWeight: '600',
    },
    // Delete Confirmation Styles
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmDialog: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmIcon: {
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
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
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
