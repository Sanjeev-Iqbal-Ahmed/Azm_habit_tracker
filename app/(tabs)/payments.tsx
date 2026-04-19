import React, { useState, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    Button,
    Modal,
} from 'react-native';
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
    getAllPayments,
    updatePaymentAmounts,
    deletePayment,
    reorderPayments,
    type PaymentRecord,
} from '@/database/payments';

export default function PaymentsScreen() {
    const router = useRouter();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<{ id: number, name: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const backgroundColor = useThemeColor({}, 'background');
    const surfaceColor = useThemeColor({}, 'surface');
    const primaryColor = useThemeColor({}, 'text');
    const accentColor = useThemeColor({}, 'accent');
    const accentTextColor = useThemeColor({}, 'accentText');
    const mutedColor = useThemeColor({}, 'muted');
    const borderColor = useThemeColor({}, 'border');

    const loadPayments = () => {
        try {
            const allPayments = getAllPayments();
            setPayments(allPayments);
        } catch (error) {
            console.error('Failed to load payments:', error);
        }
    };

    useEffect(() => {
        loadPayments();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadPayments();
        }, [])
    );


    const handleDeletePayment = (id: number, name: string) => {
        setPaymentToDelete({ id, name });
        setIsDeleteConfirmVisible(true);
    };

    const confirmDelete = () => {
        if (paymentToDelete) {
            try {
                deletePayment(paymentToDelete.id);
                loadPayments();
                setIsDeleteConfirmVisible(false);
                setPaymentToDelete(null);
            } catch (error) {
                console.error('Failed to delete payment:', error);
                Alert.alert('Error', 'Failed to delete payment');
            }
        }
    };

    const cancelDelete = () => {
        setIsDeleteConfirmVisible(false);
        setPaymentToDelete(null);
    };

    const calculateNet = (payment: PaymentRecord) => {
        return payment.to_get - payment.to_pay;
    };

    const handleDragEnd = ({ data }: { data: PaymentRecord[] }) => {
        setPayments(data);
        // Save the new order to database
        try {
            const paymentIds = data.map(p => p.id);
            reorderPayments(paymentIds);
        } catch (error) {
            console.error('Failed to save payment order:', error);
        }
    };

    // Filter payments based on search query
    const filteredPayments = payments.filter(payment =>
        payment.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPaymentCard = ({ item: payment, drag, isActive }: RenderItemParams<PaymentRecord>) => {
        const netAmount = calculateNet(payment);
        const netColor =
            netAmount > 0 ? '#10B981' : netAmount < 0 ? '#EF4444' : mutedColor;

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    onPress={() => router.push(`/habit-features/payment-details/${payment.id}` as any)}
                    disabled={isActive}
                    style={[
                        styles.paymentCard,
                        { backgroundColor: surfaceColor, borderColor },
                        isActive && styles.draggedCard,
                    ]}
                >
                    {/* Header with name and delete button */}
                    <View style={styles.cardHeader}>
                        <View style={styles.nameContainer}>
                            <Ionicons name="menu" size={20} color={mutedColor} />
                            <View
                                style={[
                                    styles.avatarCircle,
                                    { backgroundColor: accentColor },
                                ]}
                            >
                                <ThemedText
                                    style={[
                                        styles.avatarText,
                                        { color: accentTextColor },
                                    ]}
                                >
                                    {payment.name.charAt(0).toUpperCase()}
                                </ThemedText>
                            </View>
                            <ThemedText
                                style={[styles.paymentName, { color: primaryColor }]}
                            >
                                {payment.name}
                            </ThemedText>
                        </View>
                        <TouchableOpacity
                            onPress={() =>
                                handleDeletePayment(payment.id, payment.name)
                            }
                        >
                            <Ionicons name="trash-outline" size={20} color={mutedColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Payment inputs */}
                    <View style={styles.amountsContainer}>
                        {/* To Pay */}
                        <View style={styles.amountRow}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="arrow-up-circle"
                                    size={18}
                                    color="#EF4444" />
                                <ThemedText
                                    style={[styles.amountLabel, { color: mutedColor }]}
                                >
                                    To_Pay
                                </ThemedText>
                            </View>
                            <ThemedText
                                style={[
                                    styles.amountValue,
                                    { color: '#EF4444' },
                                ]}
                            >
                                ₹{payment.to_pay.toFixed(2)}
                            </ThemedText>
                        </View>

                        {/* To Get */}
                        <View style={styles.amountRow}>
                            <View style={styles.labelContainer}>
                                <Ionicons
                                    name="arrow-down-circle"
                                    size={18}
                                    color="#10B981"
                                />
                                <ThemedText
                                    style={[styles.amountLabel, { color: mutedColor }]}
                                >
                                    To_Get
                                </ThemedText>
                            </View>
                            <ThemedText
                                style={[
                                    styles.amountValue,
                                    { color: '#10B981' },
                                ]}
                            >
                                ₹{payment.to_get.toFixed(2)}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Net balance */}
                    <View
                        style={[
                            styles.netContainer,
                            { borderTopColor: borderColor },
                        ]}
                    >
                        <ThemedText style={[styles.netLabel, { color: mutedColor }]}>
                            Net Balance
                        </ThemedText>
                        <ThemedText
                            style={[styles.netAmount, { color: netColor }]}
                        >
                            {netAmount >= 0 ? '+' : ''}₹{Math.abs(netAmount).toFixed(2)}
                        </ThemedText>
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
                    <ThemedText type="title" style={styles.title}>
                        Payments
                    </ThemedText>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.push('/habit-features/add-payment')}
                    >
                        <Ionicons name="add" size={24} color={primaryColor} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: surfaceColor, borderColor }]}>
                        <Ionicons name="search-outline" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: primaryColor }]}
                            placeholder="Search payments..."
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

                {/* Payment List */}
                {payments.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <View
                            style={[
                                styles.emptyState,
                                { backgroundColor: surfaceColor, borderColor },
                            ]}
                        >
                            <Ionicons name="wallet-outline" size={48} color={mutedColor} />
                            <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
                                No payments yet
                            </ThemedText>
                            <ThemedText style={[styles.emptySubtext, { color: mutedColor }]}>
                                Tap the + button below to track your first payment
                            </ThemedText>
                        </View>
                    </View>
                ) : (
                    <DraggableFlatList
                        data={filteredPayments}
                        onDragEnd={handleDragEnd}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderPaymentCard}
                        containerStyle={styles.listContainer}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    />
                )}

                {/* Add Button */}
                <TouchableOpacity
                    style={[
                        styles.addButton,
                        { backgroundColor: accentColor, borderColor },
                    ]}
                    onPress={() => router.push('/habit-features/add-payment' as any)}
                >
                    <Ionicons name="add" size={22} color={accentTextColor} />
                    <ThemedText
                        numberOfLines={1}
                        style={[styles.addButtonText, { color: accentTextColor }]}
                    >
                        Add Payment
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>

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
                        <ThemedText style={styles.confirmTitle}>Delete Payment?</ThemedText>
                        <ThemedText style={[styles.confirmMessage, { color: mutedColor }]}>
                            Are you sure you want to delete "{paymentToDelete?.name}"?
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
    paymentsList: {
        flex: 1,
        paddingHorizontal: 20,
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
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
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
    listContainer: {
        flex: 1,
    },
    paymentCard: {
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    paymentName: {
        fontSize: 18,
        fontWeight: '600',
    },
    amountsContainer: {
        gap: 12,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    amountLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    amountValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    netContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    netLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    netAmount: {
        fontSize: 20,
        fontWeight: '700',
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
