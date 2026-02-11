import { useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    type NoteRecord
} from '@/database/sqlite';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 20 padding sides + 20 gap

export default function NotesScreen() {
    const router = useRouter();
    const [notes, setNotes] = useState<NoteRecord[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const loadNotes = () => {
        try {
            const allNotes = getNotes();
            setNotes(allNotes);
        } catch (error) {
            console.error('Failed to load notes:', error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadNotes();
        }, [])
    );

    const handleAddNote = () => {
        setEditingNote(null);
        setTitle('');
        setContent('');
        setIsModalVisible(true);
    };

    const handleEditNote = (note: NoteRecord) => {
        setEditingNote(note);
        setTitle(note.title);
        setContent(note.content);
        setIsModalVisible(true);
    };

    const handleSaveNote = () => {
        if (!title.trim() && !content.trim()) {
            setIsModalVisible(false);
            return;
        }

        if (editingNote) {
            updateNote(editingNote.id, title, content);
        } else {
            createNote(title, content);
        }

        setIsModalVisible(false);
        loadNotes();
    };

    const handleDeleteNote = () => {
        setIsDeleteConfirmVisible(true);
    };

    const confirmDelete = () => {
        if (editingNote) {
            deleteNote(editingNote.id);
            setIsDeleteConfirmVisible(false);
            setIsModalVisible(false);
            loadNotes();
        }
    };

    const cancelDelete = () => {
        setIsDeleteConfirmVisible(false);
    };

    // Format date relative (e.g. "Today", "Yesterday", or "Jan 25")
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Filter notes based on search query (searches both title and content)
    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <ScrollView style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <ThemedText style={styles.title}>Notes</ThemedText>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: surfaceColor, borderColor }]}>
                        <Ionicons name="search-outline" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: primaryColor }]}
                            placeholder="Search notes..."
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={mutedColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {notes.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: surfaceColor, borderColor }]}>
                        <Ionicons name="document-text-outline" size={48} color={mutedColor} />
                        <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                            No notes yet
                        </ThemedText>
                        <ThemedText style={[styles.emptySubtext, { color: mutedColor }]}>
                            Tap the + button to create a note
                        </ThemedText>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {filteredNotes.map((note) => (
                            <TouchableOpacity
                                key={note.id}
                                style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
                                onPress={() => handleEditNote(note)}
                            >
                                <ThemedText style={styles.cardTitle} numberOfLines={2}>
                                    {note.title || 'Untitled'}
                                </ThemedText>
                                <ThemedText style={[styles.cardContent, { color: mutedColor }]} numberOfLines={4}>
                                    {note.content || 'No content'}
                                </ThemedText>
                                <ThemedText style={[styles.cardDate, { color: mutedColor }]}>
                                    {formatDate(note.updated_at)}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Bottom padding for FAB */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: accentColor }]}
                onPress={handleAddNote}
            >
                <Ionicons name="add" size={32} color={accentTextColor} />
            </TouchableOpacity>

            {/* Note Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(false)}
                                style={styles.modalHeaderButton}
                            >
                                <ThemedText style={{ color: mutedColor }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <ThemedText style={styles.modalTitle}>
                                {editingNote ? 'Edit Note' : 'New Note'}
                            </ThemedText>
                            <TouchableOpacity
                                onPress={handleSaveNote}
                                style={styles.modalHeaderButton}
                            >
                                <ThemedText style={{ color: mutedColor, fontWeight: '600' }}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <TextInput
                                style={[styles.inputTitle, { color: primaryColor }]}
                                placeholder="Title"
                                placeholderTextColor={mutedColor}
                                value={title}
                                onChangeText={setTitle}
                            />
                            <TextInput
                                style={[styles.inputContent, { color: primaryColor }]}
                                placeholder="Start typing..."
                                placeholderTextColor={mutedColor}
                                value={content}
                                onChangeText={setContent}
                                multiline
                                textAlignVertical="top"
                            />
                        </ScrollView>

                        {editingNote && (
                            <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={handleDeleteNote}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    <ThemedText style={{ color: '#EF4444', marginLeft: 8 }}>Delete Note</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
                        <ThemedText style={styles.confirmTitle}>Delete Note?</ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            This action cannot be undone. The note will be permanently deleted.
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
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    searchContainer: {
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: CARD_WIDTH,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        minHeight: 140,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    cardContent: {
        fontSize: 14,
        flex: 1,
        marginBottom: 12,
    },
    cardDate: {
        fontSize: 12,
        marginTop: 'auto',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 40,
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
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
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
        height: '90%',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalHeaderButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalScroll: {
        flex: 1,
        padding: 20,
    },
    inputTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
    },
    inputContent: {
        fontSize: 16,
        lineHeight: 24,
        minHeight: 200,
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
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