import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, {
    ScaleDecorator,
    RenderItemParams,
} from 'react-native-draggable-flatlist';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getTodaysHabits, getHabits, getHabitStats, reorderHabits, type HabitRecord } from '@/database/sqlite';

export default function HabitsScreen() {
    const router = useRouter();
    const [habits, setHabits] = useState<HabitRecord[]>([]);
    const [habitsStats, setHabitsStats] = useState<Map<number, any>>(new Map());

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const loadHabitsData = () => {
        // Load all active habits
        try {
            const allHabits = getHabits({ includeArchived: false });
            setHabits(allHabits);

            // Load stats for each habit
            const statsMap = new Map();
            allHabits.forEach(habit => {
                try {
                    const stats = getHabitStats(habit.id);
                    statsMap.set(habit.id, stats);
                } catch (error) {
                    console.error(`Failed to load stats for habit ${habit.id}:`, error);
                }
            });
            setHabitsStats(statsMap);
        } catch (error) {
            console.error('Failed to load habits:', error);
        }
    };

    // Load data when component mounts
    useEffect(() => {
        loadHabitsData();
    }, []);

    // Refresh data when screen comes into focus (after navigation back)
    useFocusEffect(
        React.useCallback(() => {
            loadHabitsData();
        }, [])
    );

    const getHabitIcon = (habit: HabitRecord): any => {
        if (habit.icon && habit.icon !== 'checkmark-circle') return habit.icon;

        const name = habit.name.toLowerCase();
        if (name.includes('water')) return 'water';
        if (name.includes('exercise') || name.includes('workout')) return 'fitness';
        if (name.includes('read') || name.includes('book')) return 'book';
        if (name.includes('meditate') || name.includes('mindful')) return 'leaf';
        if (name.includes('sleep')) return 'moon';
        if (name.includes('coffee') || name.includes('caffeine')) return 'cafe';
        return 'checkmark-circle';
    };

    const formatTarget = (habit: HabitRecord) => {
        if (habit.goal_per_day && habit.goal_per_day > 1) {
            return `${habit.goal_per_day}x daily`;
        }
        return 'Daily';
    };

    const handleDragEnd = ({ data }: { data: HabitRecord[] }) => {
        setHabits(data);
        // Save the new order to database
        try {
            const habitIds = data.map(h => h.id);
            reorderHabits(habitIds);
        } catch (error) {
            console.error('Failed to save habit order:', error);
        }
    };

    const renderHabitCard = ({ item: habit, drag, isActive }: RenderItemParams<HabitRecord>) => {
        const stats = habitsStats.get(habit.id);
        const streak = stats ? stats.currentStreak : 0;

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    style={[
                        styles.habitCard,
                        { backgroundColor: surfaceColor, borderColor },
                        isActive && styles.draggedCard
                    ]}
                    onPress={() => router.push(`/habit-features/habit-details?id=${habit.id}`)}
                >
                    <View style={styles.cardContent}>
                        {/* Drag Handle */}
                        <View style={{ marginRight: 12 }}>
                            <Ionicons name="menu" size={20} color={mutedColor} />
                        </View>

                        {/* Left: Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15' }]}>
                            <Ionicons
                                name={getHabitIcon(habit)}
                                size={24}
                                color={primaryColor}
                            />
                        </View>

                        {/* Middle: Name & Goal */}
                        <View style={styles.cardMiddle}>
                            <ThemedText style={[styles.habitName, { color: primaryColor }]}>
                                {habit.name}
                            </ThemedText>
                            <ThemedText style={[styles.habitGoal, { color: mutedColor }]}>
                                Goal: {formatTarget(habit)}
                            </ThemedText>
                        </View>

                        {/* Right: Streak */}
                        <View style={styles.streakContainer}>
                            <Ionicons
                                name="flame"
                                size={16}
                                color={streak > 0 ? primaryColor : mutedColor}
                            />
                            <View style={styles.streakRow}>
                                <ThemedText
                                    style={[
                                        styles.streakText,
                                        { color: streak > 0 ? primaryColor : mutedColor },
                                    ]}
                                >
                                    {streak > 0 ? streak : 'No Streak'}
                                </ThemedText>
                                {streak > 0 && (
                                    <ThemedText
                                        style={[
                                            styles.streakText,
                                            { color: streak > 0 ? primaryColor : mutedColor },
                                        ]}
                                    >
                                        {' '}day
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={[styles.container, { backgroundColor }]}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText type="title" style={styles.title}>Habits</ThemedText>
                    <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => router.push('/habit-features/calendar')}
                    >
                        <Ionicons name="calendar" size={24} color={primaryColor} />
                    </TouchableOpacity>
                </View>

                {/* Habit List */}
                {habits.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <View style={[styles.emptyState, { backgroundColor: surfaceColor, borderColor }]}>
                            <Ionicons name="list-outline" size={48} color={mutedColor} />
                            <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                                No habits yet
                            </ThemedText>
                            <ThemedText style={[styles.emptySubtext, { color: mutedColor }]}>
                                Tap the + button below to create your first habit
                            </ThemedText>
                        </View>
                    </View>
                ) : (
                    <DraggableFlatList
                        data={habits}
                        onDragEnd={handleDragEnd}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderHabitCard}
                        containerStyle={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    />
                )}

                {/* Bottom Action */}
                <TouchableOpacity
                    style={[
                        styles.addButton,
                        { backgroundColor: accentColor, borderColor }
                    ]}
                    onPress={() => router.push('/habit-features/add-habit')}
                >
                    <Ionicons name="add" size={22} color={accentTextColor} />
                    <ThemedText
                        numberOfLines={1}
                        style={[styles.addButtonText, { color: accentTextColor }]}
                    >
                        Add Habit
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </GestureHandlerRootView>
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
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        width: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    settingsButton: {
        padding: 8,
    },
    habitsList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    habitCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardMiddle: {
        flex: 1,
        justifyContent: 'center',
    },
    habitName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    habitGoal: {
        fontSize: 13,
        fontWeight: '500',
    },
    streakContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 60,
        borderRadius: 16,
        borderWidth: 1,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 20,
    },
    draggedCard: {
        transform: [{ scale: 1.05 }],
        elevation: 8,
        shadowOpacity: 0.3,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});