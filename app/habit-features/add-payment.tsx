import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { createPayment } from '@/database/payments';

export default function AddPaymentModal() {
    const router = useRouter();
    const [name, setName] = useState('');
    const inputRef = useRef<TextInput>(null);

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    useEffect(() => {
        // Auto-focus input when modal opens
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }, []);

    const handleSubmit = () => {
        if (!name.trim()) return;

        try {
            console.log('=== Creating payment ===');
            console.log('Name:', name.trim());
            const id = createPayment({ name: name.trim() });
            console.log('Created payment with ID:', id);
            router.back();
        } catch (error) {
            console.error('Failed to create payment:', error);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ThemedView style={[styles.container, { backgroundColor }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText type="title" style={styles.title}>
                        Add Payment
                    </ThemedText>
                    <View style={styles.closeButton} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View
                        style={[
                            styles.inputContainer,
                            { backgroundColor: surfaceColor, borderColor },
                        ]}
                    >
                        <Ionicons name="person-outline" size={20} color={mutedColor} />
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: primaryColor }]}
                            placeholder="Enter name"
                            placeholderTextColor={mutedColor}
                            value={name}
                            onChangeText={setName}
                            onSubmitEditing={handleSubmit}
                            returnKeyType="done"
                        />
                    </View>

                    <ThemedText style={[styles.hint, { color: mutedColor }]}>
                        Enter the name of the person you're tracking payments with
                    </ThemedText>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        {
                            backgroundColor: name.trim() ? accentColor : surfaceColor,
                            borderColor,
                        },
                    ]}
                    onPress={handleSubmit}
                    disabled={!name.trim()}
                >
                    <ThemedText
                        style={[
                            styles.submitButtonText,
                            { color: name.trim() ? accentTextColor : mutedColor },
                        ]}
                    >
                        Create Payment
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </KeyboardAvoidingView>
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
        marginBottom: 30,
    },
    closeButton: {
        padding: 8,
        width: 44,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    hint: {
        fontSize: 13,
        marginTop: 12,
        lineHeight: 18,
    },
    submitButton: {
        marginHorizontal: 20,
        marginTop: 30,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
