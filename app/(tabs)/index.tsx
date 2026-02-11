import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
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
import {
  getTodaysHabits,
  toggleHabitCompletion,
  getHabitLogs,
  updateHabitProgress,
  getHabitProgressForDate,
  calculateHabitStreak,
  getToDos,
  createToDo,
  updateToDo,
  toggleToDoCompletion,
  deleteToDo,
  reorderToDos,
  getTodayDateString,
  getHabits,
  type HabitRecord,
  type ToDoRecord
} from '@/database/sqlite';
import { getRandomQuote, type QuoteRecord } from '@/database/quote_table';

export default function HomeScreen() {
  const router = useRouter();
  const [todayHabits, setTodayHabits] = useState<Array<HabitRecord & { completed: boolean }>>([]);
  const [habitProgress, setHabitProgress] = useState<Map<number, number>>(new Map());
  const [tasks, setTasks] = useState<ToDoRecord[]>([]);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ToDoRecord | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [dailyVerse, setDailyVerse] = useState<QuoteRecord | null>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const primaryColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const accentTextColor = useThemeColor({}, 'accentText');
  const highlightColor = accentColor; // Using accent as highlight
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');

  const loadHabitsAndProgress = () => {
    try {
      const today = getTodayDateString();

      // Get all habits ordered by display_order
      const allHabits = getHabits({ includeArchived: false });

      // Filter for today's habits and add completion status
      const todaysHabitIds = new Set(getTodaysHabits().map(h => h.id));

      const habitsWithStatus = allHabits
        .filter(habit => todaysHabitIds.has(habit.id))
        .map(habit => {
          const logs = getHabitLogs(habit.id);
          const todayLog = logs.find(log => log.log_date === today);
          return {
            ...habit,
            completed: todayLog?.completed === 1
          };
        });

      setTodayHabits(habitsWithStatus);

      // Load progress for each habit
      const progressMap = new Map<number, number>();
      habitsWithStatus.forEach(habit => {
        const progress = getHabitProgressForDate(habit.id, today);
        progressMap.set(habit.id, progress);
      });
      setHabitProgress(progressMap);
    } catch (error) {
      console.error('Failed to load habits:', error);
    }
  };

  useEffect(() => {
    loadHabitsAndProgress();
    loadDailyVerse();
  }, []);

  // Refresh habits when screen comes into focus (after navigation)
  useFocusEffect(
    React.useCallback(() => {
      loadHabitsAndProgress();
      loadTasks();
    }, [])
  );

  const loadDailyVerse = () => {
    try {
      const verse = getRandomQuote();
      setDailyVerse(verse);
    } catch (error) {
      console.error('Failed to load verse:', error);
    }
  };

  const loadTasks = () => {
    try {
      const today = getTodayDateString();
      const allTasks = getToDos(today);
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskInput('');
    setIsTaskModalVisible(true);
  };

  const handleEditTask = (task: ToDoRecord) => {
    setEditingTask(task);
    setTaskInput(task.task);
    setIsTaskModalVisible(true);
  };

  const handleSaveTask = () => {
    if (!taskInput.trim()) return;
    if (editingTask) {
      updateToDo(editingTask.id, taskInput.trim());
    } else {
      createToDo(taskInput.trim());
    }
    setIsTaskModalVisible(false);
    loadTasks();
  };

  const handleToggleTask = (id: number) => {
    toggleToDoCompletion(id);
    loadTasks();
  };

  const handleDeleteTask = (id: number) => {
    deleteToDo(id);
    setIsTaskModalVisible(false);
    loadTasks();
  };

  const handleDragEnd = ({ data }: { data: ToDoRecord[] }) => {
    setTasks(data);
    // Save the new order to database
    try {
      const todoIds = data.map(t => t.id);
      reorderToDos(todoIds);
    } catch (error) {
      console.error('Failed to save to-do order:', error);
    }
  };

  const incrementProgress = (habitId: number) => {
    const today = getTodayDateString();
    const habit = todayHabits.find(h => h.id === habitId);
    if (!habit) return;

    const currentProgress = habitProgress.get(habitId) || 0;
    const goalPerDay = habit.goal_per_day || 1;

    if (currentProgress >= goalPerDay) return; // Already at max

    const newProgress = currentProgress + 1;
    updateHabitProgress(habitId, today, newProgress);

    setHabitProgress(prev => new Map(prev).set(habitId, newProgress));

    // Update completion status
    if (newProgress >= goalPerDay) {
      setTodayHabits(prevHabits =>
        prevHabits.map(h =>
          h.id === habitId ? { ...h, completed: true } : h
        )
      );
    }
  };

  const decrementProgress = (habitId: number) => {
    const today = getTodayDateString();
    const currentProgress = habitProgress.get(habitId) || 0;

    if (currentProgress <= 0) return; // Already at zero

    const newProgress = currentProgress - 1;
    updateHabitProgress(habitId, today, newProgress);

    setHabitProgress(prev => new Map(prev).set(habitId, newProgress));

    // Update completion status
    setTodayHabits(prevHabits =>
      prevHabits.map(h =>
        h.id === habitId ? { ...h, completed: false } : h
      )
    );
  };

  const getHabitIcon = (habit: HabitRecord): any => {
    // Use the icon from database if available
    if (habit.icon && habit.icon !== 'checkmark-circle') {
      return habit.icon;
    }

    // Fallback to name-based detection
    const name = habit.name.toLowerCase();
    if (name.includes('water')) return 'water';
    if (name.includes('exercise') || name.includes('workout')) return 'fitness';
    if (name.includes('read') || name.includes('book')) return 'book';
    if (name.includes('meditate') || name.includes('mindful')) return 'leaf';
    if (name.includes('sleep')) return 'moon';
    if (name.includes('coffee') || name.includes('caffeine')) return 'cafe';
    return 'checkmark-circle';
  };

  const getStreakForHabit = (habitId: number): number => {
    try {
      const streakData = calculateHabitStreak(habitId);
      return streakData.streak;
    } catch (error) {
      return 0;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <View style={[styles.avatar, { backgroundColor: accentColor }]}>
              <Ionicons name="person" size={24} color={accentTextColor} />
            </View>
            <View style={styles.greetingText}>
              <ThemedText style={styles.greetingTitle}>Hello ME!!</ThemedText>
              {/* <ThemedText style={[styles.greetingSubtitle, { color: mutedColor }]}>
                Let's build some habits
              </ThemedText> */}
            </View>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/habit-features/settings')}
          >
            <Ionicons name="settings" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>

        <ThemedText type="title" style={styles.headline}>
          Track Your Habits
        </ThemedText>

        {/* Daily Quranic Verse */}
        {dailyVerse && (
          <View style={[styles.verseCard, { backgroundColor: highlightColor, borderColor }]}>
            <View style={styles.verseHeaderRow}>
              <View style={styles.verseHeader}>
                <Ionicons name="book-outline" size={20} color={accentTextColor} />
                <ThemedText style={[styles.verseLabel, { color: accentTextColor }]}>Daily Verse</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.verseReloadButton}
                onPress={loadDailyVerse}
              >
                <Ionicons name="refresh-outline" size={18} color={accentTextColor} />
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.verseText, { color: accentTextColor }]}>
              "{dailyVerse.verse}"
            </ThemedText>
            <ThemedText style={[styles.verseReference, { color: accentTextColor }]}>
              - Quran {dailyVerse.verse_no}
            </ThemedText>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              To-Do List
            </ThemedText>
            <TouchableOpacity
              style={[styles.sectionAddButton, { backgroundColor: accentColor }]}
              onPress={handleAddTask}
            >
              <Ionicons name="add" size={20} color={accentTextColor} />
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View style={[styles.emptyTaskState, { backgroundColor: surfaceColor, borderColor }]}>
              <Ionicons name="list-outline" size={32} color={mutedColor} />
              <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                No tasks yet
              </ThemedText>
            </View>
          ) : (
            <DraggableFlatList
              data={tasks}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: task, drag, isActive }: RenderItemParams<ToDoRecord>) => (
                <ScaleDecorator>
                  <View
                    style={[
                      styles.taskItem,
                      { backgroundColor: surfaceColor, borderColor },
                      isActive && styles.draggedItem
                    ]}
                  >
                    <TouchableOpacity onLongPress={drag} disabled={isActive} style={{ marginRight: 8 }}>
                      <Ionicons name="menu" size={20} color={mutedColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.taskLeft}
                      onPress={() => handleToggleTask(task.id)}
                    >
                      <View style={[
                        styles.taskCheckbox,
                        { backgroundColor: task.completed ? accentColor : 'transparent', borderColor: task.completed ? accentColor : borderColor }
                      ]}>
                        {task.completed === 1 && (
                          <Ionicons name="checkmark" size={14} color={accentTextColor} />
                        )}
                      </View>
                      <ThemedText style={[
                        styles.taskText,
                        task.completed === 1 && { textDecorationLine: 'line-through', opacity: 0.6 }
                      ]}>
                        {task.task}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.taskEditButton}
                      onPress={() => handleEditTask(task)}
                    >
                      <Ionicons name="pencil" size={18} color={mutedColor} />
                    </TouchableOpacity>
                  </View>
                </ScaleDecorator>
              )}
              scrollEnabled={false}
              getItemLayout={(data, index) => ({
                length: 60,
                offset: 60 * index,
                index,
              })}
            />
          )}
        </View>


        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            My Habits
          </ThemedText>

          {todayHabits.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: surfaceColor, borderColor }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={mutedColor} />
              <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                No habits for today
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: mutedColor }]}>
                Tap the + button to add your first habit
              </ThemedText>
            </View>
          ) : (
            todayHabits.map((habit) => {
              const currentProgress = habitProgress.get(habit.id) || 0;
              const goalPerDay = habit.goal_per_day || 1;
              const progressPercentage = (currentProgress / goalPerDay) * 100;
              const streak = getStreakForHabit(habit.id);

              return (
                <View
                  key={habit.id}
                  style={[styles.habitCard, { backgroundColor: surfaceColor, borderColor }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: accentColor }]}>
                      <Ionicons name={getHabitIcon(habit)} size={24} color={accentTextColor} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <ThemedText type="subtitle">{habit.name}</ThemedText>
                      <ThemedText style={[styles.cardSubtext, { color: mutedColor }]}>
                        Daily goal: {goalPerDay} {habit.unit || 'times'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <ThemedText type="title" style={styles.progressNumber}>
                        {currentProgress}
                      </ThemedText>
                      <ThemedText style={[styles.progressUnit, { color: mutedColor }]}>
                        / {goalPerDay}
                      </ThemedText>
                    </View>
                    <View style={styles.progressControls}>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          {
                            backgroundColor: currentProgress > 0 ? accentColor : borderColor,
                            opacity: currentProgress > 0 ? 1 : 0.5
                          }
                        ]}
                        onPress={() => decrementProgress(habit.id)}
                        disabled={currentProgress === 0}
                      >
                        <Ionicons name="remove" size={20} color={accentTextColor} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          {
                            backgroundColor: currentProgress < goalPerDay ? accentColor : borderColor,
                            opacity: currentProgress < goalPerDay ? 1 : 0.5
                          }
                        ]}
                        onPress={() => incrementProgress(habit.id)}
                        disabled={currentProgress >= goalPerDay}
                      >
                        <Ionicons name="add" size={20} color={accentTextColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {streak > 0 && (
                    <View style={styles.streakInfo}>
                      <Ionicons name="flame" size={16} color={accentTextColor} />
                      <ThemedText style={styles.streakText}>{streak} day streak</ThemedText>
                    </View>
                  )}

                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(progressPercentage, 100)}%`, backgroundColor: accentColor }
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Task Modal */}
      <Modal
        visible={isTaskModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingTask ? 'Edit Task' : 'Add Task'}
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { borderColor, color: primaryColor }]}
              placeholder="Enter task..."
              placeholderTextColor={mutedColor}
              value={taskInput}
              onChangeText={setTaskInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor }]}
                onPress={() => setIsTaskModalVisible(false)}
              >
                <ThemedText style={{ color: mutedColor }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: accentColor }]}
                onPress={handleSaveTask}
              >
                <ThemedText style={{ color: accentTextColor }}>Save</ThemedText>
              </TouchableOpacity>
            </View>
            {editingTask && (
              <TouchableOpacity
                style={[styles.modalDeleteButton]}
                onPress={() => handleDeleteTask(editingTask.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <ThemedText style={{ color: '#EF4444', marginLeft: 6 }}>Delete Task</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: {
    gap: 2,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  greetingSubtitle: {
    fontSize: 14,
  },
  addButton: {
    width: 48,
    height: 48,
    // borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 3,
  },
  headline: {
    marginBottom: 24,
    fontSize: 30,
    fontWeight: '700',
  },
  pillsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuredCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    gap: 2,
  },
  cardSubtext: {
    fontSize: 14,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressUnit: {
    flexDirection: 'row',
    fontSize: 14,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: '600',
  },
  habitCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  progressControls: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // To-Do List Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTaskState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  taskEditButton: {
    padding: 8,
  },
  draggedItem: {
    transform: [{ scale: 1.05 }],
    elevation: 8,
    shadowOpacity: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  // Verse Card Styles
  verseCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verseReloadButton: {
    padding: 4,
    opacity: 0.7,
  },
  verseLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  verseReference: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
});