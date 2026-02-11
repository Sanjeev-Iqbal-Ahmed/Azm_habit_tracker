import { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
    getHabitsForDate,
    getToDosForDate,
    getMonthActivity,
    getTodayDateString,
    formatDateString,
    type HabitRecord,
    type ToDoRecord
} from '@/database/sqlite';

export default function CalendarScreen() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateString, setSelectedDateString] = useState(getTodayDateString());
    const [selectedDayHabits, setSelectedDayHabits] = useState<Array<HabitRecord & { completed: boolean; progress: number }>>([]);
    const [selectedDayTasks, setSelectedDayTasks] = useState<ToDoRecord[]>([]);
    const [monthActivity, setMonthActivity] = useState<Record<string, { habitsCompleted: number; tasksCompleted: number }>>({});
    const [isLoading, setIsLoading] = useState(false);

    const selectedDateRef = useRef(selectedDateString);
    const currentDateRef = useRef(currentDate);

    useEffect(() => {
        selectedDateRef.current = selectedDateString;
    }, [selectedDateString]);

    useEffect(() => {
        currentDateRef.current = currentDate;
    }, [currentDate]);

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const loadSelectedDateData = useCallback((dateString: string) => {
        setIsLoading(true);

        try {
            const habits = getHabitsForDate(dateString);
            const tasks = getToDosForDate(dateString);

            console.log('Loaded habits:', habits.length, habits.map(h => h.name));
            console.log('Loaded tasks:', tasks.length, tasks.map(t => t.task));

            setSelectedDayHabits([...habits]);
            setSelectedDayTasks([...tasks]);
        } catch (error) {
            console.error('Failed to load selected date data:', error);
            setSelectedDayHabits([]);
            setSelectedDayTasks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMonthActivity = useCallback((date: Date) => {
        try {
            const activity = getMonthActivity(
                date.getFullYear(),
                date.getMonth()
            );
            setMonthActivity(activity);
        } catch (error) {
            console.error('Failed to load month activity:', error);
            setMonthActivity({});
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSelectedDateData(selectedDateRef.current);
            loadMonthActivity(currentDateRef.current);
        }, [loadSelectedDateData, loadMonthActivity])
    );

    useEffect(() => {
        loadSelectedDateData(selectedDateString);
    }, [selectedDateString, loadSelectedDateData]);

    useEffect(() => {
        loadMonthActivity(currentDate);
    }, [currentDate, loadMonthActivity]);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDateKey = (year: number, month: number, day: number) => {
        return formatDateString(new Date(year, month, day));
    };

    const formatDisplayDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const hasActivity = (day: number) => {
        const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
        const activity = monthActivity[dateKey];
        return activity && (activity.habitsCompleted > 0 || activity.tasksCompleted > 0);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        const todayString = getTodayDateString();
        setSelectedDateString(todayString);
        setCurrentDate(today);
    };

    const handleDayPress = (day: number) => {
        const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDateString(dateKey);
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        dayNames.forEach((day, index) => {
            days.push(
                <View key={`header-${index}`} style={styles.dayHeader}>
                    <ThemedText style={[styles.dayHeaderText, { color: mutedColor }]}>
                        {day}
                    </ThemedText>
                </View>
            );
        });

        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const activity = hasActivity(day);
            const today = isToday(day);
            const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSelected = dateKey === selectedDateString;

            days.push(
                <TouchableOpacity
                    key={`day-${day}`}
                    onPress={() => handleDayPress(day)}
                    style={[
                        styles.dayCell,
                        today && [styles.todayCell, { borderColor: primaryColor }],
                        isSelected && [styles.selectedCell, { backgroundColor: accentColor }],
                        activity && !isSelected && [styles.activityDay, { backgroundColor: accentColor + '30' }]
                    ]}
                >
                    <ThemedText style={[
                        styles.dayText,
                        { color: mutedColor },
                        today && { color: primaryColor, fontWeight: '700' },
                        isSelected && { color: primaryColor, fontWeight: '700' },
                        activity && !isSelected && { color: mutedColor, fontWeight: '700' }
                    ]}>
                        {day}
                    </ThemedText>
                    {activity && !isSelected && (
                        <View style={[styles.activityDot, { backgroundColor: accentColor }]} />
                    )}
                </TouchableOpacity>
            );
        }

        return days;
    };

    const renderHabitItem = (habit: HabitRecord & { completed: boolean; progress: number }, index: number) => {
        const isFirst = index === 0;
        const isLast = index === selectedDayHabits.length - 1;

        let statusText = 'Missed';
        let statusColor = mutedColor;
        let statusBg = mutedColor + '20';

        if (habit.completed) {
            statusText = 'Completed';
            statusColor = accentColor;
            statusBg = accentColor + '20';
        } else if (habit.progress > 0) {
            statusText = `${habit.progress}/${habit.goal_per_day || 1}`;
            statusColor = primaryColor;
            statusBg = primaryColor + '15';
        } else if (isTodaySelected) {
            statusText = 'Pending';
            statusColor = mutedColor;
            statusBg = mutedColor + '15';
        }

        return (
            <View
                key={`habit-${habit.id}`}
                style={[
                    styles.listItem,
                    isFirst && { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
                    isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
                    !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor }
                ]}
            >
                <View style={styles.listItemLeft}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: habit.completed ? accentColor : (habit.progress > 0 ? accentColor + '80' : borderColor) }
                    ]}>
                        {habit.completed && (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                        {!habit.completed && habit.progress > 0 && (
                            <ThemedText style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>
                                {Math.round((habit.progress / (habit.goal_per_day || 1)) * 100)}%
                            </ThemedText>
                        )}
                    </View>
                    <View style={styles.habitInfo}>
                        <ThemedText style={[
                            styles.listItemText,
                            { color: primaryColor },
                            !habit.completed && habit.progress === 0 && { opacity: 0.7 }
                        ]}>
                            {habit.name}
                        </ThemedText>
                        <ThemedText style={[styles.habitFrequency, { color: mutedColor }]}>
                            {habit.frequency === 'daily' ? 'Daily' : 'Weekly'} • {habit.goal_per_day || 1}x
                        </ThemedText>
                    </View>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: statusBg }
                ]}>
                    <ThemedText style={[
                        styles.statusText,
                        { color: statusColor }
                    ]}>
                        {statusText}
                    </ThemedText>
                </View>
            </View>
        );
    };

    const renderTaskItem = (task: ToDoRecord, index: number) => {
        const isLast = index === selectedDayTasks.length - 1;
        const isCompleted = task.completed === 1;

        return (
            <View
                key={`task-${task.id}`}
                style={[
                    styles.listItem,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor }
                ]}
            >
                <View style={styles.listItemLeft}>
                    <Ionicons
                        name={isCompleted ? "checkbox" : "square-outline"}
                        size={22}
                        color={isCompleted ? accentColor : mutedColor}
                    />
                    <View style={{ flex: 1 }}>
                        <ThemedText style={[
                            styles.listItemText,
                            { color: primaryColor },
                            isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 }
                        ]}>
                            {task.task}
                        </ThemedText>
                    </View>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: isCompleted ? accentColor + '20' : mutedColor + '20' }
                ]}>
                    <ThemedText style={[
                        styles.statusText,
                        { color: isCompleted ? accentColor : mutedColor }
                    ]}>
                        {isCompleted ? 'Done' : 'Pending'}
                    </ThemedText>
                </View>
            </View>
        );
    };

    const completedHabitsCount = selectedDayHabits.filter(h => h.completed).length;
    const completedTasksCount = selectedDayTasks.filter(t => t.completed === 1).length;
    const isTodaySelected = selectedDateString === getTodayDateString();
    const hasHabits = selectedDayHabits.length > 0;
    const hasTasks = selectedDayTasks.length > 0;

    return (
        <ThemedView style={[styles.container, { backgroundColor }]}>
            {/* Top Section */}
            <View style={styles.topSection}>
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                        <Ionicons name="chevron-back" size={20} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText type="title" style={styles.monthTitle}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </ThemedText>
                    <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                        <Ionicons name="chevron-forward" size={20} color={primaryColor} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={goToToday}>
                    <Ionicons name="today-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarContainer, { backgroundColor: surfaceColor }]}>
                <View style={styles.calendarGrid}>
                    {renderCalendarGrid()}
                </View>
            </View>

            {/* Progress Summary - Scrollable Section */}
            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <ThemedText type="subtitle" style={styles.progressTitle}>
                        {isTodaySelected ? "Today's Overview" : formatDisplayDate(selectedDateString)}
                    </ThemedText>
                    {isLoading && (
                        <ActivityIndicator size="small" color={accentColor} />
                    )}
                </View>

                <ScrollView
                    style={styles.overviewScrollView}
                    contentContainerStyle={styles.overviewScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Habits Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="repeat-outline" size={18} color={accentColor} />
                                <ThemedText style={[styles.sectionSubtitle, { color: primaryColor }]}>
                                    Habits
                                </ThemedText>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: accentColor + '20' }]}>
                                <ThemedText style={[styles.countText, { color: accentColor }]}>
                                    {completedHabitsCount}/{selectedDayHabits.length}
                                </ThemedText>
                            </View>
                        </View>

                        {!hasHabits ? (
                            <View style={[styles.emptyCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <Ionicons name="calendar-outline" size={28} color={mutedColor} />
                                <ThemedText style={[styles.emptyCardText, { color: mutedColor }]}>
                                    No habits scheduled for this day
                                </ThemedText>
                            </View>
                        ) : (
                            <View style={[styles.listCard, { backgroundColor: surfaceColor }]}>
                                {selectedDayHabits.map((habit, index) => renderHabitItem(habit, index))}
                            </View>
                        )}
                    </View>

                    {/* Tasks Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="checkbox-outline" size={18} color={accentColor} />
                                <ThemedText style={[styles.sectionSubtitle, { color: primaryColor }]}>
                                    Tasks
                                </ThemedText>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: accentColor + '20' }]}>
                                <ThemedText style={[styles.countText, { color: accentColor }]}>
                                    {completedTasksCount}/{selectedDayTasks.length}
                                </ThemedText>
                            </View>
                        </View>

                        {!hasTasks ? (
                            <View style={[styles.emptyCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <Ionicons name="list-outline" size={28} color={mutedColor} />
                                <ThemedText style={[styles.emptyCardText, { color: mutedColor }]}>
                                    No tasks created on this day
                                </ThemedText>
                            </View>
                        ) : (
                            <View style={[styles.listCard, { backgroundColor: surfaceColor }]}>
                                {selectedDayTasks.map((task, index) => renderTaskItem(task, index))}
                            </View>
                        )}
                    </View>

                    {/* Summary Card */}
                    {(hasHabits || hasTasks) && (
                        <View style={[styles.summaryCard, { backgroundColor: surfaceColor }]}>
                            <ThemedText style={[styles.summaryTitle, { color: primaryColor }]}>
                                Daily Summary
                            </ThemedText>
                            <View style={styles.summaryStats}>
                                <View style={styles.summaryStat}>
                                    <ThemedText style={[styles.summaryNumber, { color: accentColor }]}>
                                        {completedHabitsCount + completedTasksCount}
                                    </ThemedText>
                                    <ThemedText style={[styles.summaryLabel, { color: mutedColor }]}>
                                        Completed
                                    </ThemedText>
                                </View>
                                <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
                                <View style={styles.summaryStat}>
                                    <ThemedText style={[styles.summaryNumber, { color: primaryColor }]}>
                                        {selectedDayHabits.length + selectedDayTasks.length}
                                    </ThemedText>
                                    <ThemedText style={[styles.summaryLabel, { color: mutedColor }]}>
                                        Total
                                    </ThemedText>
                                </View>
                                <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
                                <View style={styles.summaryStat}>
                                    <ThemedText style={[styles.summaryNumber, { color: accentColor }]}>
                                        {selectedDayHabits.length + selectedDayTasks.length > 0
                                            ? Math.round(((completedHabitsCount + completedTasksCount) / (selectedDayHabits.length + selectedDayTasks.length)) * 100)
                                            : 0}%
                                    </ThemedText>
                                    <ThemedText style={[styles.summaryLabel, { color: mutedColor }]}>
                                        Rate
                                    </ThemedText>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    navButton: {
        padding: 8,
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    filterButton: {
        padding: 8,
    },
    calendarContainer: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayHeader: {
        width: '14.28%',
        alignItems: 'center',
        marginBottom: 12,
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyDay: {
        width: '14.28%',
        height: 44,
    },
    dayCell: {
        width: '14.28%',
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        overflow: 'hidden',
    },
    todayCell: {
        borderWidth: 2,
    },
    selectedCell: {},
    activityDay: {},
    activityDot: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    progressSection: {
        flex: 1,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    overviewScrollView: {
        flex: 1,
    },
    overviewScrollContent: {
        paddingBottom: 20,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionSubtitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyCardText: {
        fontSize: 14,
        fontWeight: '500',
    },
    listCard: {
        borderRadius: 16,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    habitInfo: {
        flex: 1,
    },
    statusIndicator: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    habitFrequency: {
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    summaryCard: {
        borderRadius: 16,
        padding: 20,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryStat: {
        alignItems: 'center',
        flex: 1,
    },
    summaryNumber: {
        fontSize: 24,
        fontWeight: '700',
    },
    summaryLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    summaryDivider: {
        width: 1,
        height: 40,
    },
});