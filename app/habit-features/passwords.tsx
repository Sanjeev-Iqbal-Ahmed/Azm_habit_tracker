import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    createPasswordEntry,
    deletePasswordEntry,
    getPasswordEntries,
    initializePasswordsTable,
    updatePasswordEntry,
    type PasswordEntryRecord,
} from '@/database/passwords';
import { useThemeColor } from '@/hooks/use-theme-color';

type FormState = {
    id?: number;
    name: string;
    username: string;
    password: string;
    note: string;
};

const emptyForm: FormState = {
    name: '',
    username: '',
    password: '',
    note: '',
};

export default function PasswordsScreen() {
    const router = useRouter();

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');

    const [entries, setEntries] = useState<PasswordEntryRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<PasswordEntryRecord | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    const nameRef = useRef<TextInput>(null);

    const loadEntries = () => {
        initializePasswordsTable();
        setEntries(getPasswordEntries());
    };

    useEffect(() => {
        loadEntries();
    }, []);

    const filteredEntries = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return entries;

        return entries.filter((e) => {
            const haystack = [e.name, e.username ?? '', e.note ?? ''].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [entries, searchQuery]);

    const openCreate = () => {
        setForm(emptyForm);
        setShowPasswordInput(false);
        setModalVisible(true);
        setTimeout(() => nameRef.current?.focus(), 100);
    };

    const openEdit = (entry: PasswordEntryRecord) => {
        setForm({
            id: entry.id,
            name: entry.name,
            username: entry.username ?? '',
            password: entry.password,
            note: entry.note ?? '',
        });
        setShowPasswordInput(false);
        setModalVisible(true);
        setTimeout(() => nameRef.current?.focus(), 100);
    };

    const closeModal = () => {
        setModalVisible(false);
        setForm(emptyForm);
    };

    const handleSave = () => {
        const name = form.name.trim();
        const password = form.password;

        if (!name) {
            Alert.alert('Validation', 'Name is required.');
            return;
        }
        if (!password) {
            Alert.alert('Validation', 'Password is required.');
            return;
        }

        try {
            if (form.id) {
                updatePasswordEntry(form.id, {
                    name,
                    username: form.username.trim() ? form.username.trim() : null,
                    password: form.password,
                    note: form.note.trim() ? form.note.trim() : null,
                });
            } else {
                createPasswordEntry({
                    name,
                    username: form.username.trim() ? form.username.trim() : null,
                    password: form.password,
                    note: form.note.trim() ? form.note.trim() : null,
                });
            }
            closeModal();
            loadEntries();
        } catch {
            Alert.alert('Error', 'Failed to save entry.');
        }
    };

    const handleDelete = (entry: PasswordEntryRecord) => {
        setEntryToDelete(entry);
        setIsDeleteConfirmVisible(true);
    };

    const cancelDelete = () => {
        setIsDeleteConfirmVisible(false);
        setEntryToDelete(null);
    };

    const confirmDelete = () => {
        if (!entryToDelete) return;

        try {
            deletePasswordEntry(entryToDelete.id);
            loadEntries();
            setIsDeleteConfirmVisible(false);
            setEntryToDelete(null);
        } catch {
            setIsDeleteConfirmVisible(false);
            Alert.alert('Error', 'Failed to delete entry.');
        }
    };

    const toggleShowPassword = (id: number) => {
        setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderItem = ({ item }: { item: PasswordEntryRecord }) => {
        const showPassword = !!visiblePasswords[item.id];

        return (
            <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                        {!!item.username && (
                            <ThemedText style={[styles.cardSubtitle, { color: mutedColor }]}>
                                {item.username}
                            </ThemedText>
                        )}
                    </View>

                    <View style={styles.rowActions}>
                        <TouchableOpacity
                            onPress={() => toggleShowPassword(item.id)}
                            style={[styles.iconButton, { borderColor }]}
                        >
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={primaryColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => openEdit(item)}
                            style={[styles.iconButton, { borderColor }]}
                        >
                            <Ionicons name="create-outline" size={18} color={primaryColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDelete(item)}
                            style={[styles.iconButton, { borderColor }]}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.passwordRow}>
                    <Ionicons name="key-outline" size={18} color={mutedColor} />
                    <ThemedText style={[styles.passwordText, { color: primaryColor }]}>
                        {showPassword ? item.password : '••••••••'}
                    </ThemedText>
                </View>

                {!!item.note && (
                    <ThemedText style={[styles.noteText, { color: mutedColor }]}>{item.note}</ThemedText>
                )}
            </View>
        );
    };

    return (
        <ThemedView style={[styles.container, { backgroundColor }]}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={primaryColor} />
                </TouchableOpacity>
                <ThemedText type="title" style={styles.title}>Passwords</ThemedText>
                <TouchableOpacity style={styles.backButton} onPress={openCreate}>
                    <Ionicons name="add" size={26} color={primaryColor} />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: surfaceColor, borderColor }]}>
                <Ionicons name="search" size={18} color={mutedColor} />
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search"
                    placeholderTextColor={mutedColor}
                    style={[styles.searchInput, { color: primaryColor }]}
                    returnKeyType="search"
                />
                {!!searchQuery && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={mutedColor} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <ThemedText style={[styles.emptyTitle, { color: primaryColor }]}>No passwords yet</ThemedText>
                        <ThemedText style={[styles.emptySubtitle, { color: mutedColor }]}>Tap + to add your first entry.</ThemedText>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalCard, { backgroundColor: backgroundColor, borderColor }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal} style={styles.modalHeaderButton}>
                                <Ionicons name="close" size={26} color={primaryColor} />
                            </TouchableOpacity>
                            <ThemedText type="title" style={styles.modalTitle}>
                                {form.id ? 'Edit Entry' : 'Add_Entry'}
                            </ThemedText>
                            <View style={styles.modalHeaderButton} />
                        </View>

                        <View style={styles.modalContent}>
                            <View style={[styles.inputContainer, { backgroundColor: surfaceColor, borderColor }]}>
                                <Ionicons name="globe-outline" size={20} color={mutedColor} />
                                <TextInput
                                    ref={nameRef}
                                    value={form.name}
                                    onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                                    placeholder="Account / website"
                                    placeholderTextColor={mutedColor}
                                    style={[styles.input, { color: primaryColor }]}
                                    returnKeyType="next"
                                />
                            </View>

                            <View style={[styles.inputContainer, { backgroundColor: surfaceColor, borderColor }]}>
                                <Ionicons name="person-outline" size={20} color={mutedColor} />
                                <TextInput
                                    value={form.username}
                                    onChangeText={(t) => setForm((p) => ({ ...p, username: t }))}
                                    placeholder="Username / email"
                                    placeholderTextColor={mutedColor}
                                    style={[styles.input, { color: primaryColor }]}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                            </View>

                            <View style={[styles.inputContainer, { backgroundColor: surfaceColor, borderColor }]}>
                                <Ionicons name="key-outline" size={20} color={mutedColor} />
                                <TextInput
                                    value={form.password}
                                    onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
                                    placeholder="Password"
                                    placeholderTextColor={mutedColor}
                                    style={[styles.input, { color: primaryColor }]}
                                    secureTextEntry={!showPasswordInput}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPasswordInput((v) => !v)}
                                    style={styles.eyeButton}
                                >
                                    <Ionicons
                                        name={showPasswordInput ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={mutedColor}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.noteContainer, { backgroundColor: surfaceColor, borderColor }]}>
                                <TextInput
                                    value={form.note}
                                    onChangeText={(t) => setForm((p) => ({ ...p, note: t }))}
                                    placeholder="Note"
                                    placeholderTextColor={mutedColor}
                                    style={[styles.noteInput, { color: primaryColor }]}
                                    multiline
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                style={[styles.saveButton, { backgroundColor: accentColor }]}
                            >
                                <ThemedText style={[styles.saveButtonText, { color: accentTextColor }]}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={isDeleteConfirmVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelDelete}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmDialog, { backgroundColor: surfaceColor }]}
                    >
                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={styles.confirmIcon} />
                        <ThemedText style={styles.confirmTitle}>Delete Entry?</ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            Are you sure you want to delete "{entryToDelete?.name}"?
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
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardSubtitle: {
        marginTop: 4,
        fontSize: 13,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    passwordText: {
        fontSize: 15,
        fontWeight: '500',
    },
    noteText: {
        marginTop: 10,
        fontSize: 13,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        paddingBottom: 22,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    modalHeaderButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        gap: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 15,
    },
    noteContainer: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 100,
    },
    noteInput: {
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        marginTop: 6,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },

    eyeButton: {
        padding: 4,
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
