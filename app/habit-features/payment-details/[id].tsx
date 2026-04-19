import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { 
    getPaymentById, 
    getPaymentItems, 
    addPaymentItem, 
    updatePaymentItem, 
    deletePaymentItem,
    type PaymentRecord,
    type PaymentItemRecord
} from '@/database/payments';

export default function PaymentDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const paymentId = Number(id);
    const router = useRouter();

    const [payment, setPayment] = useState<PaymentRecord | null>(null);
    const [items, setItems] = useState<PaymentItemRecord[]>([]);

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const loadData = useCallback(() => {
        if (!paymentId) return;
        try {
            const p = getPaymentById(paymentId);
            if (p) setPayment(p);
            const fetchedItems = getPaymentItems(paymentId);
            setItems(fetchedItems);
        } catch (error) {
            console.error('Failed to load payment details:', error);
        }
    }, [paymentId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleAddItem = () => {
        try {
            addPaymentItem(paymentId, '', 0, 'to_pay');
            loadData();
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const handleUpdateItemName = (itemId: number, newName: string) => {
        try {
            updatePaymentItem(itemId, paymentId, { itemName: newName });
            loadData();
        } catch (error) {
            console.error('Failed to update name:', error);
        }
    };

    const handleUpdateItemAmount = (itemId: number, amountStr: string) => {
        try {
            // Remove all whitespace
            const clean = amountStr.replace(/\s/g, '');
            // Evaluate basic expressions if possible, fallback to parseFloat
            let finalValue = parseFloat(clean) || 0;
            if (/^[0-9+.\-]+$/.test(clean)) {
                try {
                    // Small local evaluate implementation matching payments.tsx
                    const tokens: string[] = [];
                    let currentNumber = '';
                    for (let i = 0; i < clean.length; i++) {
                        const char = clean[i];
                        if (char === '+' || char === '-') {
                            if (i === 0 || clean[i - 1] === '+' || clean[i - 1] === '-') {
                                currentNumber += char;
                            } else {
                                if (currentNumber) tokens.push(currentNumber);
                                currentNumber = '';
                                tokens.push(char);
                            }
                        } else {
                            currentNumber += char;
                        }
                    }
                    if (currentNumber) tokens.push(currentNumber);
                    let result = 0;
                    let currentOp = '+';
                    for (const token of tokens) {
                        if (token === '+' || token === '-') {
                            currentOp = token;
                        } else {
                            const num = parseFloat(token);
                            if (!isNaN(num)) result = currentOp === '+' ? result + num : result - num;
                        }
                    }
                    finalValue = isNaN(result) ? 0 : result;
                } catch {
                    finalValue = parseFloat(clean) || 0;
                }
            }
            updatePaymentItem(itemId, paymentId, { amount: finalValue });
            loadData();
        } catch (error) {
            console.error('Failed to update amount:', error);
        }
    };

    const handleToggleType = (item: PaymentItemRecord) => {
        try {
            const newType = item.type === 'to_pay' ? 'to_get' : 'to_pay';
            updatePaymentItem(item.id, paymentId, { type: newType });
            loadData();
        } catch (error) {
            console.error('Failed to toggle type:', error);
        }
    };

    const handleDelete = (itemId: number) => {
        try {
            deletePaymentItem(itemId, paymentId);
            loadData();
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const renderItem = ({ item }: { item: PaymentItemRecord }) => {
        const isToGet = item.type === 'to_get';
        return (
            <View style={[styles.row, { backgroundColor: surfaceColor, borderColor }]}>
                <TextInput
                    style={[styles.itemInput, { color: primaryColor }]}
                    placeholder="Item name"
                    placeholderTextColor={mutedColor}
                    defaultValue={item.item_name}
                    onEndEditing={(e) => handleUpdateItemName(item.id, e.nativeEvent.text)}
                />
                
                <TouchableOpacity 
                    style={[styles.toggleBtn, { backgroundColor: isToGet ? '#10B981' + '20' : '#EF4444' + '20' }]} 
                    onPress={() => handleToggleType(item)}
                >
                    <Ionicons 
                        name={isToGet ? 'arrow-down-circle' : 'arrow-up-circle'} 
                        size={18} 
                        color={isToGet ? '#10B981' : '#EF4444'} 
                    />
                </TouchableOpacity>

                <TextInput
                    style={[styles.amountInput, { color: isToGet ? '#10B981' : '#EF4444' }]}
                    placeholder="0"
                    placeholderTextColor={mutedColor}
                    keyboardType="numeric"
                    defaultValue={item.amount === 0 ? '' : item.amount.toString()}
                    onEndEditing={(e) => handleUpdateItemAmount(item.id, e.nativeEvent.text)}
                />

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={18} color={mutedColor} />
                </TouchableOpacity>
            </View>
        );
    };

    if (!payment) return null;

    const netAmount = payment.to_get - payment.to_pay;
    const netColor = netAmount > 0 ? '#10B981' : netAmount < 0 ? '#EF4444' : mutedColor;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ThemedView style={[styles.container, { backgroundColor }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={primaryColor} />
                    </TouchableOpacity>
                    <ThemedText type="title" style={styles.title}>{payment.name}</ThemedText>
                    <View style={styles.headerRight}>
                        <ThemedText style={{ color: mutedColor, fontSize: 13 }}>
                            Total To Pay: <ThemedText style={{ color: '#EF4444' }}>₹{payment.to_pay}</ThemedText>
                        </ThemedText>
                        <ThemedText style={{ color: mutedColor, fontSize: 13 }}>
                            Total To Get: <ThemedText style={{ color: '#10B981' }}>₹{payment.to_get}</ThemedText>
                        </ThemedText>
                    </View>
                </View>

                {/* Ledger Header */}
                <View style={[styles.listHeader, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
                    <ThemedText style={[styles.headerCell, { flex: 1, color: mutedColor }]}>Item</ThemedText>
                    <ThemedText style={[styles.headerCell, { width: 44, color: mutedColor, textAlign: 'center' }]}>Type</ThemedText>
                    <ThemedText style={[styles.headerCell, { width: 80, color: mutedColor, textAlign: 'right' }]}>Amount</ThemedText>
                    <ThemedText style={[styles.headerCell, { width: 34 }]}></ThemedText>
                </View>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="list-outline" size={48} color={mutedColor} />
                            <ThemedText style={{ color: mutedColor, marginTop: 12 }}>No items yet</ThemedText>
                            <ThemedText style={{ color: mutedColor, fontSize: 13, marginTop: 4 }}>Tap "Add Row" below to start tracking</ThemedText>
                        </View>
                    }
                />

                <View style={[styles.footer, { backgroundColor: surfaceColor, borderTopColor: borderColor }]}>
                    <View style={styles.netAmountContainer}>
                        <ThemedText style={{ color: mutedColor, fontSize: 14 }}>Net Balance</ThemedText>
                        <ThemedText style={[styles.netAmount, { color: netColor }]}>
                             {netAmount >= 0 ? '+' : ''}₹{Math.abs(netAmount).toFixed(2)}
                        </ThemedText>
                    </View>
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentColor }]} onPress={handleAddItem}>
                        <Ionicons name="add" size={20} color={accentTextColor} />
                        <ThemedText style={{ color: accentTextColor, fontWeight: '600' }}>Add_Row</ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
    backBtn: { width: 40, padding: 8, marginLeft: -8 },
    title: { fontSize: 20, fontWeight: '600', flex: 1, marginLeft: 8 },
    headerRight: { alignItems: 'flex-end' },
    listHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
    headerCell: { fontSize: 13, fontWeight: '500' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 8, paddingTop: 12 },
    row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 50, gap: 8 },
    itemInput: { flex: 1, fontSize: 16, height: '100%' },
    amountInput: { width: 80, fontSize: 16, fontWeight: '600', height: '100%', textAlign: 'right' },
    toggleBtn: { width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    footer: { padding: 20, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    netAmountContainer: { },
    netAmount: { fontSize: 22, fontWeight: '700', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 6 }
});
