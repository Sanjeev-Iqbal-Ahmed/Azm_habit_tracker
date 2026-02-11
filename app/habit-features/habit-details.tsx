import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Svg, Circle, Text as SvgText, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getHabitById, getHabitStats, getHabitLogs, getHabitCompletionsForDateRange, getTodayDateString, formatDateString, type HabitRecord } from '@/database/sqlite';
import { styles } from '@/components/habit-details-styles';

export default function HabitDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [habit, setHabit] = useState<HabitRecord | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [todayProgress, setTodayProgress] = useState<any>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    // Navigation states for charts
    const [weeklyPatternMonth, setWeeklyPatternMonth] = useState(new Date()); // For 4-week period in this month
    const [monthlyProgressMonth, setMonthlyProgressMonth] = useState(new Date()); // For monthly progress

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const highlightColor = useThemeColor({}, 'accent');
    const highlightTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    // Chart colors based on theme
    const chartColors = {
        success: '#0ac285ff', // Green
        failure: '#980808ff', // Red
        warning: '#F59E0B', // Yellow
        danger: '#EF4444', // Red
        primary: accentColor,
        secondary: surfaceColor,
        text: primaryColor,
        muted: mutedColor,
        mint: '#DDEDEC',
        beige: '#FBEBCC',
    };

    const screenWidth = Dimensions.get('window').width;

    const loadHabitData = () => {
        if (!id) return;

        try {
            // Load habit details
            const habitData = getHabitById(parseInt(id));
            if (!habitData) {
                console.error('Habit not found');
                router.back();
                return;
            }
            setHabit(habitData);

            // Load habit stats
            const habitStats = getHabitStats(parseInt(id));
            setStats(habitStats);

            // Load today's progress
            const today = getTodayDateString();
            const logs = getHabitLogs(parseInt(id));
            const todayLog = logs.find(log => log.log_date === today);
            setTodayProgress({
                completed: todayLog?.completed === 1,
                progress: todayLog?.note ? parseInt(todayLog?.note) || 1 : 0,
                maxProgress: habitData.goal_per_day || 1
            });
        } catch (error) {
            console.error('Failed to load habit details:', error);
        }
    };

    // Chart data processing functions
    const getStreakHistoryData = () => {
        if (!habit || !id) return { labels: [], datasets: [{ data: [0] }] };

        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completions = getHabitCompletionsForDateRange(
            parseInt(id),
            formatDateString(thirtyDaysAgo),
            formatDateString(today)
        );

        const labels = [];
        const data = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = formatDateString(date);

            if (i % 5 === 0) {
                labels.push(date.getDate().toString());
            } else {
                labels.push('');
            }

            data.push(completions[dateStr].completed ? 1 : 0);
        }

        return {
            labels,
            datasets: [{
                data,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 2
            }]
        };
    };

    const getWeeklyPatternData = () => {
        if (!habit || !id) return { labels: [], datasets: [{ data: [0] }] };

        const year = weeklyPatternMonth.getFullYear();
        const month = weeklyPatternMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const completions = getHabitCompletionsForDateRange(
            parseInt(id),
            formatDateString(firstDay),
            formatDateString(lastDay)
        );

        const dayStats = [0, 0, 0, 0, 0, 0, 0];
        Object.entries(completions).forEach(([date, data]) => {
            const dayOfWeek = new Date(date).getDay();
            if (data.count > 0) {
                dayStats[dayOfWeek] += data.count;
            }
        });

        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return {
            labels: dayLabels,
            datasets: [{
                data: dayStats.length > 0 ? dayStats : [0],
                color: (opacity = 1) => chartColors.primary
            }]
        };
    };

    const getMonthlyProgressData = () => {
        if (!habit || !id) return { labels: [], datasets: [{ data: [0] }], totalDays: 0 };

        const year = monthlyProgressMonth.getFullYear();
        const month = monthlyProgressMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // If viewing current month, only show up to today
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const endDay = isCurrentMonth ? today.getDate() : daysInMonth;

        const completions = getHabitCompletionsForDateRange(
            parseInt(id),
            formatDateString(firstDay),
            formatDateString(isCurrentMonth ? today : lastDay)
        );

        const labels = [];
        const data = [];

        for (let day = 1; day <= endDay; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDateString(date);

            if (day % 5 === 0 || day === 1) {
                labels.push(day.toString());
            } else {
                labels.push('');
            }

            data.push(completions[dateStr].count);
        }

        return {
            labels,
            datasets: [{
                data: data.length > 0 ? data : [0]
            }],
            totalDays: endDay
        };
    };

    // Load data when component mounts
    useEffect(() => {
        loadHabitData();
    }, [id]);

    // Refresh data when screen comes into focus (after navigation back)
    useFocusEffect(
        React.useCallback(() => {
            loadHabitData();
        }, [id])
    );

    const getHabitIcon = (habit: HabitRecord) => {
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

    const getMotivationalMessage = (stats: any) => {
        if (!stats) return 'Keep building your habit!';

        const { currentStreak, completionRate } = stats;

        if (currentStreak >= 21) return 'Amazing consistency! You\'ve built a strong habit.';
        if (currentStreak >= 7) return 'Great progress! Keep the momentum going.';
        if (completionRate >= 80) return 'Excellent consistency! You\'re doing great.';
        if (completionRate >= 60) return 'Good effort! Every completion counts.';
        return 'Keep building your habit!';
    };

    // Circular Progress Component
    const CircularProgress = ({ percentage, size = 120 }: { percentage: number; size?: number }) => {
        const strokeWidth = 10;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const progress = (percentage / 100) * circumference;

        return (
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={chartColors.success} stopOpacity="1" />
                        <Stop offset="100%" stopColor={chartColors.primary} stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={borderColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
                {/* Percentage text */}
                <SvgText
                    x={size / 2}
                    y={size / 2}
                    textAnchor="middle"
                    dy=".3em"
                    fontSize="24"
                    fontWeight="bold"
                    fill={primaryColor}
                >
                    {percentage}%
                </SvgText>
            </Svg>
        );
    };

    // Area Chart Component (custom implementation)
    const AreaChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
        if (!data || data.length < 2) {
            return (
                <View style={styles.areaChartContainer}>
                    <ThemedText style={{ color: mutedColor }}>
                        Not enough data to display chart
                    </ThemedText>
                </View>
            );
        }

        const chartWidth = screenWidth - 80;
        const chartHeight = 180;
        const padding = 20;
        const maxValue = Math.max(...data, 1);

        const xStep = (chartWidth - 2 * padding) / (data.length - 1);
        const yScale = (chartHeight - 2 * padding) / maxValue;

        let pathData = `M ${padding} ${chartHeight - padding}`;

        data.forEach((value, index) => {
            const x = padding + index * xStep;
            const y = chartHeight - padding - value * yScale;
            if (index === 0) {
                pathData += ` L ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });

        pathData += ` L ${padding + (data.length - 1) * xStep} ${chartHeight - padding}`;
        pathData += ' Z';

        return (
            <View style={styles.areaChartContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                        <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor={chartColors.beige} stopOpacity="0.8" />
                            <Stop offset="100%" stopColor={chartColors.beige} stopOpacity="0.1" />
                        </LinearGradient>
                    </Defs>

                    {/* Area fill */}
                    <Path
                        d={pathData}
                        fill="url(#areaGradient)"
                        stroke={chartColors.warning}
                        strokeWidth={2}
                    />

                    {/* Data points */}
                    {data.map((value, index) => {
                        const x = padding + index * xStep;
                        const y = chartHeight - padding - value * yScale;
                        return (
                            <Circle
                                key={index}
                                cx={x}
                                cy={y}
                                r={4}
                                fill={chartColors.warning}
                            />
                        );
                    })}
                </Svg>

                {/* Labels */}
                <View style={styles.chartLabels}>
                    {labels.map((label, index) => (
                        <ThemedText key={index} style={[styles.chartLabel, { color: mutedColor }]}>
                            {label}
                        </ThemedText>
                    ))}
                </View>
            </View>
        );
    };

    // Completion Calendar Component
    const CompletionCalendar = () => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();

        // Get first and last day of the month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        // Get completions for the month
        const completions = id ? getHabitCompletionsForDateRange(
            parseInt(id),
            formatDateString(firstDay),
            formatDateString(lastDay)
        ) : {};

        // Build calendar grid
        const calendarDays = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarDays.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDateString(date);
            const isCompleted = completions[dateStr]?.completed || false;
            calendarDays.push({ day, date, dateStr, isCompleted });
        }

        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const goToPreviousMonth = () => {
            setCalendarMonth(new Date(year, month - 1, 1));
        };

        const goToNextMonth = () => {
            setCalendarMonth(new Date(year, month + 1, 1));
        };

        const goToCurrentMonth = () => {
            setCalendarMonth(new Date());
        };

        const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

        return (
            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                {/* Header with month navigation */}
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
                        <Ionicons name="chevron-back" size={20} color={primaryColor} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={goToCurrentMonth}>
                        <ThemedText style={styles.calendarMonthTitle}>
                            {monthNames[month]} {year}
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={goToNextMonth}
                        style={styles.calendarNavButton}
                        disabled={isCurrentMonth}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={isCurrentMonth ? mutedColor : primaryColor}
                        />
                    </TouchableOpacity>
                </View>

                {/* Day headers */}
                <View style={styles.calendarDayHeaders}>
                    {dayHeaders.map((header, idx) => (
                        <View key={idx} style={styles.calendarDayHeader}>
                            <ThemedText style={[styles.calendarDayHeaderText, { color: mutedColor }]}>
                                {header}
                            </ThemedText>
                        </View>
                    ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.calendarGrid}>
                    {calendarDays.map((dayData, idx) => {
                        if (!dayData) {
                            return <View key={`empty-${idx}`} style={styles.calendarDay} />;
                        }

                        const { day, isCompleted } = dayData;
                        const isToday = dayData.dateStr === getTodayDateString();

                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.calendarDay,
                                    isToday && { backgroundColor: borderColor }
                                ]}
                            >
                                {/* X/O marker - centered and large */}
                                <ThemedText style={[
                                    styles.calendarDayMarker,
                                    { color: isCompleted ? chartColors.success : chartColors.failure }
                                ]}>
                                    {isCompleted ? 'X' : 'O'}
                                </ThemedText>

                                {/* Date number - bottom right corner */}
                                <ThemedText style={[
                                    styles.calendarDayNumber,
                                    { color: mutedColor }
                                ]}>
                                    {day}
                                </ThemedText>
                            </View>
                        );
                    })}
                </View>

                {/* Legend */}
                <View style={styles.calendarLegend}>
                    <View style={styles.calendarLegendItem}>
                        <ThemedText style={[styles.calendarDayMarker, { color: chartColors.success }]}>
                            X
                        </ThemedText>
                        <ThemedText style={[styles.calendarLegendText, { color: mutedColor }]}>
                            Completed
                        </ThemedText>
                    </View>
                    <View style={styles.calendarLegendItem}>
                        <ThemedText style={[styles.calendarDayMarker, { color: chartColors.failure }]}>
                            O
                        </ThemedText>
                        <ThemedText style={[styles.calendarLegendText, { color: mutedColor }]}>
                            Incomplete
                        </ThemedText>
                    </View>
                </View>
            </View>
        );
    };

    if (!habit || !stats) {
        return (
            <ThemedView style={[styles.container, { backgroundColor }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText style={styles.title}>Loading...</ThemedText>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={primaryColor} />
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }

    // Check if habit has any logs/data (completed or partial progress today)
    const hasData = stats.totalCompletions > 0 || stats.currentStreak > 0 || (todayProgress && todayProgress.progress > 0);

    return (
        <ThemedView style={[styles.container, { backgroundColor }]}>
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={primaryColor} />
                </TouchableOpacity>
                <ThemedText style={styles.title}>{habit.name}</ThemedText>
                <TouchableOpacity style={styles.menuButton} onPress={() => router.push(`/habit-features/edit-habit?id=${id}`)}>
                    <Ionicons name="create" size={24} color={primaryColor} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* HABIT CONFIGURATION SECTION - MOVED TO TOP */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Habit Configuration</ThemedText>
                    <View style={[styles.configCard, { backgroundColor: surfaceColor, borderColor }]}>
                        <View style={styles.configHeader}>
                            <View style={[styles.configIcon, { backgroundColor: accentColor }]}>
                                <Ionicons name={getHabitIcon(habit)} size={20} color={accentTextColor} />
                            </View>
                            <View style={styles.configInfo}>
                                <ThemedText style={styles.configName}>{habit.name}</ThemedText>
                                {habit.description && (
                                    <ThemedText style={[styles.configDescription, { color: mutedColor }]}>
                                        {habit.description}
                                    </ThemedText>
                                )}
                            </View>
                        </View>
                        <View style={styles.configDetails}>
                            <View style={styles.configDetail}>
                                <ThemedText style={styles.configLabel}>Goal per day</ThemedText>
                                <ThemedText style={styles.configValue}>{habit.goal_per_day || 1}</ThemedText>
                            </View>
                            <View style={styles.configDetail}>
                                <ThemedText style={styles.configLabel}>Frequency</ThemedText>
                                <ThemedText style={styles.configValue}>{habit.frequency}</ThemedText>
                            </View>
                            <View style={styles.configDetail}>
                                <ThemedText style={styles.configLabel}>Start date</ThemedText>
                                <ThemedText style={styles.configValue}>
                                    {habit.start_date || 'Not set'}
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                {hasData ? (
                    // Show detailed stats and charts for habits with data
                    <>
                        {/* PRIMARY STATS SECTION */}
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Performance Overview</ThemedText>

                            {/* Completion Calendar - Moved to top */}
                            <CompletionCalendar />

                            {/* Circular Progress Chart for Completion Rate */}
                            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <ThemedText style={styles.chartTitle}>Completion Rate</ThemedText>
                                <View style={styles.circularProgressContainer}>
                                    <CircularProgress percentage={Math.round(stats.completionRate)} />
                                </View>
                                <ThemedText style={[styles.chartSubtitle, { color: mutedColor }]}>
                                    {stats?.completionRate >= 80 ? 'Excellent!' : stats?.completionRate >= 60 ? 'Good Progress' : 'Keep Going!'}
                                </ThemedText>
                            </View>

                            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <ThemedText style={styles.chartTitle}>Streak Comparison</ThemedText>
                                <View style={styles.streakComparison}>
                                    <View style={styles.streakItem}>
                                        <ThemedText style={[styles.streakLabel, { color: mutedColor }]}>Current</ThemedText>
                                        <ThemedText style={[styles.streakValue, { color: chartColors.success }]}>
                                            {stats?.currentStreak || 0}
                                        </ThemedText>
                                    </View>
                                    <View style={styles.streakDivider} />
                                    <View style={styles.streakItem}>
                                        <ThemedText style={[styles.streakLabel, { color: mutedColor }]}>Best</ThemedText>
                                        <ThemedText style={[styles.streakValue, { color: chartColors.warning }]}>
                                            {stats?.bestStreak || 0}
                                        </ThemedText>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* TODAY'S STATUS SECTION */}
                        <View style={styles.section}>
                            <View style={[styles.todayCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <View style={styles.todayHeader}>
                                    <ThemedText style={styles.sectionTitle}>Today's Status</ThemedText>
                                    {todayProgress?.completed ? (
                                        <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                                    ) : (
                                        <Ionicons name="radio-button-off" size={20} color={mutedColor} />
                                    )}
                                </View>
                                <ThemedText style={styles.todayProgress}>
                                    {todayProgress?.completed
                                        ? 'Completed today'
                                        : `${todayProgress?.progress || 0} / ${todayProgress?.maxProgress || 1} completed`
                                    }
                                </ThemedText>
                                {!todayProgress?.completed && (
                                    <View style={styles.progressBar}>
                                        <View style={[
                                            styles.progressFill,
                                            {
                                                width: `${(todayProgress?.progress || 0) / (todayProgress?.maxProgress || 1) * 100}%`,
                                                backgroundColor: accentColor
                                            }
                                        ]} />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* TIME-BASED STATS & HISTORY SECTION */}
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Analytics & Trends</ThemedText>

                            {/* Line Chart - Streak History (Last 30 Days) */}
                            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                                <ThemedText style={styles.chartTitle}>Streak History (Last 30 Days)</ThemedText>
                                <LineChart
                                    data={getStreakHistoryData()}
                                    width={screenWidth - 80}
                                    height={200}
                                    chartConfig={{
                                        backgroundColor: surfaceColor,
                                        backgroundGradientFrom: surfaceColor,
                                        backgroundGradientTo: surfaceColor,
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                                        labelColor: (opacity = 1) => mutedColor,
                                        style: {
                                            borderRadius: 16
                                        },
                                        propsForDots: {
                                            r: "4",
                                            strokeWidth: "2",
                                            stroke: chartColors.success
                                        },
                                        propsForBackgroundLines: {
                                            strokeDasharray: "",
                                            stroke: borderColor,
                                            strokeWidth: 1
                                        }
                                    }}
                                    bezier
                                    style={styles.chart}
                                    withInnerLines={true}
                                    withOuterLines={false}
                                    withVerticalLabels={true}
                                    withHorizontalLabels={true}
                                    fromZero={true}
                                    segments={1}
                                />
                                <ThemedText style={[styles.chartSubtitle, { color: mutedColor }]}>
                                    Daily completion tracking
                                </ThemedText>
                            </View>

                            {/* Bar Chart - Weekly Pattern (Last 4 Weeks) */}
                            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                                {/* Navigation Header */}
                                <View style={styles.calendarHeader}>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            const year = weeklyPatternMonth.getFullYear();
                                            const month = weeklyPatternMonth.getMonth();
                                            setWeeklyPatternMonth(new Date(year, month - 1, 1));
                                        }} 
                                        style={styles.calendarNavButton}
                                    >
                                        <Ionicons name="chevron-back" size={20} color={primaryColor} />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setWeeklyPatternMonth(new Date())}>
                                        <ThemedText style={styles.chartTitle}>Weekly Pattern - {new Date(weeklyPatternMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            const year = weeklyPatternMonth.getFullYear();
                                            const month = weeklyPatternMonth.getMonth();
                                            setWeeklyPatternMonth(new Date(year, month + 1, 1));
                                        }}
                                        style={styles.calendarNavButton}
                                        disabled={weeklyPatternMonth >= new Date()}
                                    >
                                        <Ionicons
                                            name="chevron-forward"
                                            size={20}
                                            color={weeklyPatternMonth.getFullYear() >= new Date().getFullYear() && weeklyPatternMonth.getMonth() >= new Date().getMonth() ? mutedColor : primaryColor}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <BarChart
                                    data={getWeeklyPatternData()}
                                    width={screenWidth - 80}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    chartConfig={{
                                        backgroundColor: surfaceColor,
                                        backgroundGradientFrom: surfaceColor,
                                        backgroundGradientTo: surfaceColor,
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => chartColors.primary,
                                        labelColor: (opacity = 1) => mutedColor,
                                        style: {
                                            borderRadius: 16
                                        },
                                        propsForBackgroundLines: {
                                            strokeDasharray: "",
                                            stroke: borderColor,
                                            strokeWidth: 1
                                        },
                                        barPercentage: 0.6,
                                    }}
                                    style={styles.chart}
                                    withInnerLines={true}
                                    withHorizontalLabels={true}
                                    fromZero={true}
                                    showValuesOnTopOfBars={true}
                                />
                                <ThemedText style={[styles.chartSubtitle, { color: mutedColor }]}>
                                    Completions by day of week
                                </ThemedText>
                            </View>

                            {/* Area Chart - Monthly Progress */}
                            <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
                                {/* Navigation Header */}
                                <View style={styles.calendarHeader}>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            const year = monthlyProgressMonth.getFullYear();
                                            const month = monthlyProgressMonth.getMonth();
                                            setMonthlyProgressMonth(new Date(year, month - 1, 1));
                                        }} 
                                        style={styles.calendarNavButton}
                                    >
                                        <Ionicons name="chevron-back" size={20} color={primaryColor} />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setMonthlyProgressMonth(new Date())}>
                                        <ThemedText style={styles.chartTitle}>Monthly Progress - {new Date(monthlyProgressMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            const year = monthlyProgressMonth.getFullYear();
                                            const month = monthlyProgressMonth.getMonth();
                                            setMonthlyProgressMonth(new Date(year, month + 1, 1));
                                        }}
                                        style={styles.calendarNavButton}
                                        disabled={monthlyProgressMonth >= new Date()}
                                    >
                                        <Ionicons
                                            name="chevron-forward"
                                            size={20}
                                            color={monthlyProgressMonth.getFullYear() >= new Date().getFullYear() && monthlyProgressMonth.getMonth() >= new Date().getMonth() ? mutedColor : primaryColor}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <AreaChart
                                    data={getMonthlyProgressData().datasets[0].data}
                                    labels={getMonthlyProgressData().labels}
                                />
                                <ThemedText style={[styles.chartSubtitle, { color: mutedColor }]}>
                                    {getMonthlyProgressData().datasets[0].data.reduce((a, b) => a + b, 0)} completions in {new Date(monthlyProgressMonth).toLocaleDateString('en-US', { month: 'long' })}
                                </ThemedText>
                            </View>
                        </View>

                        {/* ACTIONABLE INSIGHTS SECTION */}
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Insights</ThemedText>
                            <View style={[styles.insightsCard, { backgroundColor: highlightColor }]}>
                                <View style={styles.insightItem}>
                                    <Ionicons name="flag" size={16} color={highlightTextColor} />
                                    <ThemedText style={[styles.insightText, { color: highlightTextColor }]}>
                                        {Math.max(0, 10 - stats.currentStreak)} days until 10-{habit.frequency === 'daily' ? 'day' : 'week'} streak
                                    </ThemedText>
                                </View>
                                <View style={styles.insightItem}>
                                    <Ionicons name="heart" size={16} color={highlightTextColor} />
                                    <ThemedText style={[styles.insightText, { color: highlightTextColor }]}>
                                        {getMotivationalMessage(stats)}
                                    </ThemedText>
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    // Show simple message for new habits with no data
                    <View style={styles.noDataContainer}>
                        <View style={[styles.noDataCard, { backgroundColor: surfaceColor, borderColor }]}>
                            <View style={[styles.noDataIcon, { backgroundColor: accentColor }]}>
                                <Ionicons name={getHabitIcon(habit)} size={32} color={accentTextColor} />
                            </View>
                            <ThemedText style={styles.noDataTitle}>Start Your Journey!</ThemedText>
                            <ThemedText style={[styles.noDataMessage, { color: mutedColor }]}>
                                You haven't completed this habit yet. Start tracking to see your progress and insights here.
                            </ThemedText>
                            <ThemedText style={[styles.noDataSubMessage, { color: mutedColor }]}>
                                Complete your habit daily to build streaks and unlock detailed analytics.
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Bottom spacing */}
                <View style={styles.bottomSpacing} />
            </ScrollView>
        </ThemedView>
    );
}