import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Keyboard
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    createOrUpdateDailyNote,
    createToDoNow,
    deleteDailyNote,
    deleteToDoNow,
    getDailyNoteForDate,
    getDateSummaryForToDoNow,
    getToDoNowsForDate,
    initializeToDoNowTables,
    reorderToDoNows,
    toggleToDoNowCompletion,
    updateToDoNow,
    type DailyNoteRecord,
    type ToDoNowRecord
} from '@/database/to_do_now';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width: screenWidth } = Dimensions.get('window');

export default function TodoNowScreen() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [todos, setTodos] = useState<ToDoNowRecord[]>([]);
    const [dailyNote, setDailyNote] = useState<DailyNoteRecord | null>(null);
    const [dateRange, setDateRange] = useState<string[]>([]);

    // Modal states
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTodoModal, setShowTodoModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingTodo, setEditingTodo] = useState<ToDoNowRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'todo', id: number } | { type: 'note' } | null>(null);
    const [todoInput, setTodoInput] = useState('');
    const [todoPriority, setTodoPriority] = useState<'high' | 'medium' | 'low'>('low');
    const [noteInput, setNoteInput] = useState('');

    const todoInputRef = useRef<TextInput>(null);
    const noteInputRef = useRef<TextInput>(null);

    // Theme colors
    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    // Parse YYYY-MM-DD to a local Date object
    const parseLocalDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    // Format a local Date object to YYYY-MM-DD
    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Generate date range (7 days before and after selected date)
    const generateDateRange = (centerDate: string) => {
        const dates: string[] = [];
        const center = parseLocalDate(centerDate);

        // Generate 15 days (7 before, center, 7 after)
        for (let i = -7; i <= 7; i++) {
            const date = new Date(center);
            date.setDate(center.getDate() + i);
            dates.push(formatLocalDate(date));
        }

        return dates;
    };

    // Format date for display
    const formatDateDisplay = (dateString: string) => {
        const date = parseLocalDate(dateString);
        const day = date.getDate().toString();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        return { day, month };
    };

    // Check if date is today
    const isToday = (dateString: string) => {
        const todayStr = formatLocalDate(new Date());
        return dateString === todayStr;
    };

    // Load data for selected date
    const loadDataForDate = (date: string) => {
        initializeToDoNowTables();
        setTodos(getToDoNowsForDate(date));
        setDailyNote(getDailyNoteForDate(date));
    };

    // Initialize and load data
    useEffect(() => {
        // Explicitly initialize the new tables
        initializeToDoNowTables();

        const range = generateDateRange(selectedDate);
        setDateRange(range);
        loadDataForDate(selectedDate);
    }, [selectedDate]);

    // Handle date selection
    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
    };

    // Handle calendar date selection
    const handleCalendarDateSelect = (date: Date) => {
        const dateString = formatLocalDate(date);
        setSelectedDate(dateString);
        setShowCalendarModal(false);

        // Update date range to center around new date
        const newRange = generateDateRange(dateString);
        setDateRange(newRange);
    };

    // Handle date picker change
    const handleDatePickerChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            handleCalendarDateSelect(selectedDate);
        }
    };

    // Todo CRUD operations
    const openAddTodo = () => {
        setEditingTodo(null);
        setTodoInput('');
        setTodoPriority('low');
        setShowTodoModal(true);
        setTimeout(() => todoInputRef.current?.focus(), 100);
    };

    const openEditTodo = (todo: ToDoNowRecord) => {
        setEditingTodo(todo);
        setTodoInput(todo.task);
        setTodoPriority(todo.priority || 'low');
        setShowTodoModal(true);
        setTimeout(() => todoInputRef.current?.focus(), 100);
    };

    const saveTodo = () => {
        if (!todoInput.trim()) return;

        try {
            if (editingTodo) {
                updateToDoNow(editingTodo.id, todoInput.trim(), todoPriority);
            } else {
                createToDoNow(todoInput.trim(), selectedDate, todoPriority);
            }
            loadDataForDate(selectedDate);
            setShowTodoModal(false);
            setTodoInput('');
            setTodoPriority('low');
            setEditingTodo(null);
        } catch (error) {
            console.error('Failed to save todo:', error);
            Alert.alert('Error', 'Failed to save todo');
        }
    };

    const toggleTodoCompletion = (id: number) => {
        try {
            toggleToDoNowCompletion(id);
            loadDataForDate(selectedDate);
        } catch (error) {
            console.error('Failed to toggle todo:', error);
            Alert.alert('Error', 'Failed to update todo');
        }
    };

    const deleteTodo = (id: number) => {
        setDeleteTarget({ type: 'todo', id });
    };

    // Note CRUD operations
    const openNoteModal = () => {
        setNoteInput(dailyNote?.content || '');
        setShowNoteModal(true);
        setTimeout(() => noteInputRef.current?.focus(), 100);
    };

    const saveNote = () => {
        try {
            createOrUpdateDailyNote(noteInput.trim(), selectedDate);
            loadDataForDate(selectedDate);
            setShowNoteModal(false);
            setNoteInput('');
        } catch (error) {
            console.error('Failed to save note:', error);
            Alert.alert('Error', 'Failed to save note');
        }
    };

    const deleteNote = () => {
        setDeleteTarget({ type: 'note' });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        try {
            if (deleteTarget.type === 'todo') {
                deleteToDoNow(deleteTarget.id);
            } else if (deleteTarget.type === 'note') {
                deleteDailyNote(selectedDate);
            }
            loadDataForDate(selectedDate);
        } catch (error) {
            console.error('Failed to delete:', error);
            Alert.alert('Error', 'Failed to delete item');
        }
        setDeleteTarget(null);
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
    };

    // Helper to get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#EF4444'; // Red
            case 'medium': return '#F59E0B'; // Yellow 
            case 'low': return '#10B981'; // Green
            default: return mutedColor;
        }
    };

    // Render todo item
    const renderTodoItem = (item: ToDoNowRecord, index: number) => (
        <View
            key={item.id}
            style={[
                styles.todoItem,
                { 
                    backgroundColor: surfaceColor, 
                    borderWidth: 2, // make border visible
                    borderColor: getPriorityColor(item.priority || 'low')
                }
            ]}
        >
            <TouchableOpacity
                onPress={() => toggleTodoCompletion(item.id)}
                style={styles.checkbox}
            >
                <Ionicons
                    name={item.completed === 1 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={item.completed === 1 ? accentColor : mutedColor}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.todoContent}
                onPress={() => openEditTodo(item)}
            >
                <ThemedText
                    style={[
                        styles.todoText,
                        { color: primaryColor },
                        item.completed === 1 && styles.completedText
                    ]}
                >
                    {item.task}
                </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
                onPress={() => deleteTodo(item.id)}
                style={styles.deleteButton}
            >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <ThemedText type="title" style={styles.headerTitle}>
                    Do It Now
                </ThemedText>
                <TouchableOpacity
                    onPress={() => setShowCalendarModal(true)}
                    style={[styles.goToButton, { borderColor }]}
                >
                    <Ionicons name="calendar-outline" size={20} color={primaryColor} />
                    <ThemedText style={[styles.goToText, { color: primaryColor  }]}>
                        Go to
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
                {/* Date Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dateCardsContainer}
                    contentContainerStyle={styles.dateCardsContent}
                >
                    {dateRange.map((date) => {
                        const summary = getDateSummaryForToDoNow(date);
                        const isSelected = date === selectedDate;
                        const { day, month } = formatDateDisplay(date);

                        return (
                            <TouchableOpacity
                                key={date}
                                onPress={() => handleDateSelect(date)}
                                style={[
                                    styles.dateCard,
                                    {
                                        backgroundColor: isSelected ? accentColor : surfaceColor,
                                        borderColor
                                    }
                                ]}
                            >
                                <ThemedText
                                    style={[
                                        styles.dateCardDay,
                                        {
                                            color: isSelected ? accentTextColor : primaryColor,
                                            fontWeight: isSelected ? '800' : '600'
                                        }
                                    ]}
                                >
                                    {day}
                                </ThemedText>
                                <ThemedText
                                    style={[
                                        styles.dateCardMonth,
                                        {
                                            color: isSelected ? accentTextColor : primaryColor,
                                        }
                                    ]}
                                >
                                    {month}
                                </ThemedText>
                                
                                {summary.total > 0 && (
                                    <View style={[
                                        styles.todoBadge, 
                                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }
                                    ]}>
                                        <ThemedText style={[styles.todoBadgeText, { color: isSelected ? accentTextColor : mutedColor }]}>
                                            {summary.completed}/{summary.total}
                                        </ThemedText>
                                    </View>
                                )}
                                
                                {isToday(date) && (
                                    <View style={[styles.todayBadge, { backgroundColor: accentTextColor }]}>
                                        <ThemedText style={[styles.todayText, { color: accentColor }]}>
                                            Today
                                        </ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Todo List */}
                <View style={styles.todosContainer}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>To-Do Tasks</ThemedText>
                        <TouchableOpacity onPress={openAddTodo} style={styles.addButton}>
                            <Ionicons name="add" size={24} color={primaryColor} />
                        </TouchableOpacity>
                    </View>

                    {todos.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkbox-outline" size={48} color={mutedColor} />
                            <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                                No todos for this day
                            </ThemedText>
                        </View>
                    ) : (
                        <View style={styles.todoList}>
                            {/* High Priority Section */}
                            <View style={styles.prioritySection}>
                                <ThemedText style={[styles.prioritySectionHeader, { color: '#EF4444' }]}>High Priority:</ThemedText>
                                {todos.filter(t => t.priority === 'high').length > 0 ? (
                                    todos.filter(t => t.priority === 'high').map((item, index) => renderTodoItem(item, index))
                                ) : (
                                    <ThemedText style={styles.noTasksText}>No high priority tasks</ThemedText>
                                )}
                            </View>

                            {/* Medium Priority Section */}
                            <View style={styles.prioritySection}>
                                <ThemedText style={[styles.prioritySectionHeader, { color: '#F59E0B' }]}>Medium Priority:</ThemedText>
                                {todos.filter(t => t.priority === 'medium').length > 0 ? (
                                    todos.filter(t => t.priority === 'medium').map((item, index) => renderTodoItem(item, index))
                                ) : (
                                    <ThemedText style={styles.noTasksText}>No medium priority tasks</ThemedText>
                                )}
                            </View>

                            {/* Low Priority Section */}
                            <View style={styles.prioritySection}>
                                <ThemedText style={[styles.prioritySectionHeader, { color: '#10B981' }]}>Low Priority:</ThemedText>
                                {todos.filter(t => (t.priority === 'low' || !t.priority)).length > 0 ? (
                                    todos.filter(t => (t.priority === 'low' || !t.priority)).map((item, index) => renderTodoItem(item, index))
                                ) : (
                                    <ThemedText style={styles.noTasksText}>No low priority tasks</ThemedText>
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Notes Section */}
                <View style={styles.notesSection}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Note for the Day</ThemedText>
                        <View style={styles.noteActions}>
                            {dailyNote && (
                                <TouchableOpacity onPress={deleteNote} style={styles.noteButton}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={openNoteModal} style={styles.noteButton}>
                                <Ionicons
                                    name={dailyNote ? "create-outline" : "add"}
                                    size={20}
                                    color={primaryColor}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {dailyNote ? (
                        <View style={[styles.noteContent, { backgroundColor: surfaceColor, borderColor }]}>
                            <ThemedText style={[styles.noteText, { color: primaryColor }]}>
                                {dailyNote.content}
                            </ThemedText>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={openNoteModal}
                            style={[styles.emptyNote, { backgroundColor: surfaceColor, borderColor }]}
                        >
                            <ThemedText style={[styles.emptyNoteText, { color: mutedColor }]}>
                                Add a note for this day...
                            </ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Calendar Modal */}
            <Modal
                visible={showCalendarModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCalendarModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Select Date</ThemedText>
                            <TouchableOpacity
                                onPress={() => setShowCalendarModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={primaryColor} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => handleCalendarDateSelect(new Date())}
                            style={[styles.todayButton, { backgroundColor: accentColor }]}
                        >
                            <ThemedText style={[styles.todayButtonText, { color: accentTextColor }]}>
                                Go to Today
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            style={[styles.datePickerButton, { borderColor }]}
                        >
                            <Ionicons name="calendar-outline" size={20} color={accentColor} />
                            <ThemedText style={[styles.datePickerButtonText, { color: primaryColor }]}>
                                Pick a Date
                            </ThemedText>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={parseLocalDate(selectedDate)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDatePickerChange}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Todo Modal */}
            <Modal
                visible={showTodoModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTodoModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>
                                {editingTodo ? 'Edit Todo' : 'Add Todo'}
                            </ThemedText>
                            <TouchableOpacity
                                onPress={() => setShowTodoModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={primaryColor} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            ref={todoInputRef}
                            style={[styles.textInput, { color: primaryColor, borderColor }]}
                            value={todoInput}
                            onChangeText={setTodoInput}
                            placeholder="Enter todo..."
                            placeholderTextColor={mutedColor}
                            multiline
                            autoFocus
                        />

                        {/* Priority Selector */}
                        <View style={styles.prioritySelectorContainer}>
                            <ThemedText style={styles.priorityLabel}>Priority:</ThemedText>
                            <View style={styles.priorityButtonsRow}>
                                {/* High Priority */}
                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        todoPriority === 'high' ? styles.priorityButtonSelected : null,
                                        { borderColor: '#EF4444' },
                                        todoPriority === 'high' && { backgroundColor: '#EF4444' }
                                    ]}
                                    onPress={() => setTodoPriority('high')}
                                >
                                    <ThemedText style={[
                                        styles.priorityButtonText,
                                        { color: todoPriority === 'high' ? '#FFF' : '#EF4444' }
                                    ]}>High</ThemedText>
                                </TouchableOpacity>

                                {/* Medium Priority */}
                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        todoPriority === 'medium' ? styles.priorityButtonSelected : null,
                                        { borderColor: '#F59E0B' },
                                        todoPriority === 'medium' && { backgroundColor: '#F59E0B' }
                                    ]}
                                    onPress={() => setTodoPriority('medium')}
                                >
                                    <ThemedText style={[
                                        styles.priorityButtonText,
                                        { color: todoPriority === 'medium' ? '#FFF' : '#F59E0B' }
                                    ]}>Medium</ThemedText>
                                </TouchableOpacity>

                                {/* Low Priority */}
                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        todoPriority === 'low' ? styles.priorityButtonSelected : null,
                                        { borderColor: '#10B981' },
                                        todoPriority === 'low' && { backgroundColor: '#10B981' }
                                    ]}
                                    onPress={() => setTodoPriority('low')}
                                >
                                    <ThemedText style={[
                                        styles.priorityButtonText,
                                        { color: todoPriority === 'low' ? '#FFF' : '#10B981' }
                                    ]}>Low</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={saveTodo}
                            style={[styles.saveButton, { backgroundColor: accentColor }]}
                        >
                            <ThemedText style={[styles.saveButtonText, { color: accentTextColor }]}>
                                Save
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Note Modal */}
            <Modal
                visible={showNoteModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNoteModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Note for {formatDateDisplay(selectedDate).day} {formatDateDisplay(selectedDate).month}</ThemedText>
                            <TouchableOpacity
                                onPress={() => setShowNoteModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={primaryColor} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            ref={noteInputRef}
                            style={[styles.noteInputModal, { color: primaryColor, borderColor }]}
                            value={noteInput}
                            onChangeText={setNoteInput}
                            placeholder="Write your note..."
                            placeholderTextColor={mutedColor}
                            multiline
                            textAlignVertical="top"
                            autoFocus
                        />

                        <TouchableOpacity
                            onPress={saveNote}
                            style={[styles.saveButton, { backgroundColor: accentColor }]}
                        >
                            <ThemedText style={[styles.saveButtonText, { color: accentTextColor }]}>
                                Save Note
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteTarget !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelDelete}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmDialog, { backgroundColor: surfaceColor }]}>
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.confirmIcon} />
                        <ThemedText style={styles.confirmTitle}>
                            {deleteTarget?.type === 'todo' ? 'Delete Todo?' : 'Delete Note?'}
                        </ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            This action cannot be undone. The {deleteTarget?.type === 'todo' ? 'todo' : 'note'} will be permanently deleted.
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    goToButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    goToText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dateCardsContainer: {
        marginBottom: 20,
        flexGrow: 0,
        minHeight: 80,
    },
    dateCardsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    dateCard: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        minWidth: 80,
        height: 90,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dateCardDay: {
        fontSize: 26,
        fontWeight: '700',
        lineHeight: 28,
    },
    dateCardMonth: {
        fontSize: 11,
        fontWeight: '400',
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    todayBadge: {
        position: 'absolute',
        top: -6,
        left: '50%',
        transform: [{ translateX: -15 }],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        width: 40,
        alignItems: 'center',
    },
    todayText: {
        fontSize: 8,
        fontWeight: '700',
    },
    todoBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
    },
    todoBadgeText: {
        fontSize: 9,
        fontWeight: '600',
    },
    todosContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
    },
    todoList: {
        width: '100%',
    },
    prioritySection: {
        marginBottom: 20,
    },
    prioritySectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
        // textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    noTasksText: {
        fontSize: 14,
        fontStyle: 'italic',
        opacity: 0.6,
        marginLeft: 16,
        marginBottom: 8,
    },
    todoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    checkbox: {
        marginRight: 12,
    },
    todoContent: {
        flex: 1,
    },
    todoText: {
        fontSize: 18,
        lineHeight: 22,
        fontWeight: '500',
    },
    completedText: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    deleteButton: {
        padding: 4,
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
    notesSection: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    noteActions: {
        flexDirection: 'row',
        gap: 8,
    },
    noteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteContent: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
    },
    noteText: {
        fontSize: 18,
        lineHeight: 22,
        fontWeight: '400',
    },
    emptyNote: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        alignItems: 'center',
    },
    emptyNoteText: {
        fontSize: 15,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    todayButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
    },
    datePickerButtonText: {
        fontSize: 16,
    },
    textInput: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 16,
        minHeight: 50,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    prioritySelectorContainer: {
        marginBottom: 20,
    },
    priorityLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    priorityButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityButtonSelected: {
        borderWidth: 2,
    },
    priorityButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    noteInputModal: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
