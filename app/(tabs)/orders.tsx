import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { getOrders, updateOrderStatus, Order } from '../../services/orderService';
import { Feather, Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const router = useRouter();

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const ordersData = await getOrders();
            setOrders(ordersData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            Alert.alert('Erreur', 'Échec du chargement des commandes. Veuillez réessayer.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const handleUpdateStatus = async (order: Order, newStatus: 'pending' | 'in-progress' | 'completed' | 'cancelled') => {
        try {
            await updateOrderStatus(order.userId, order.id, newStatus);

            // Mettre à jour l'état local
            setOrders(prevOrders =>
                prevOrders.map(o =>
                    o.id === order.id ? { ...o, status: newStatus } : o
                )
            );

            Alert.alert('Succès', `Statut de la commande mis à jour: ${getStatusText(newStatus)}`);
        } catch (error) {
            console.error('Error updating order status:', error);
            Alert.alert('Erreur', 'Échec de la mise à jour du statut. Veuillez réessayer.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return COLORS.warning;
            case 'in-progress':
                return COLORS.info;
            case 'completed':
                return COLORS.success;
            case 'cancelled':
                return COLORS.error;
            default:
                return COLORS.gray.DEFAULT;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'En attente';
            case 'in-progress':
                return 'En cours';
            case 'completed':
                return 'Terminée';
            case 'cancelled':
                return 'Annulée';
            default:
                return 'Inconnu';
        }
    };

    const renderItem = ({ item }: { item: Order }) => {
        const orderDate = item.createdAt?.toDate ?
            item.createdAt.toDate() :
            new Date(item.createdAt);

        return (
            <View className="bg-white rounded-xl p-4 mb-4 shadow-md">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-lg font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                        Commande #{item.id.slice(0, 6)}
                    </Text>
                    <View className="flex-row items-center">
                        <View
                            style={{
                                backgroundColor: getStatusColor(item.status),
                                borderRadius: BORDER_RADIUS.full,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                            }}
                        >
                            <Text className="text-white text-xs capitalize" style={{ fontFamily: FONTS.medium }}>
                                {getStatusText(item.status)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mb-2">
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Client: {item.customerName}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Téléphone: {item.customerPhone}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Adresse: {item.address}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Date: {format(orderDate, 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </Text>
                </View>

                <View className="mb-2">
                    <Text className="font-medium mb-1" style={{ fontFamily: FONTS.medium }}>
                        Articles:
                    </Text>
                    {item.items.map((orderItem, index) => (
                        <View key={orderItem.id || index} className="flex-row justify-between">
                            <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                                {orderItem.quantity}x {orderItem.name}
                            </Text>
                            <Text className="text-gray-700" style={{ fontFamily: FONTS.medium }}>
                                {orderItem.price.toFixed(2).replace('.', ',')} €
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-lg font-bold" style={{ fontFamily: FONTS.bold }}>
                        Total: {item.total.toFixed(2).replace('.', ',')} €
                    </Text>

                    <View className="flex-row">
                        {item.status !== 'completed' && item.status !== 'cancelled' && (
                            <>
                                {item.status === 'pending' && (
                                    <TouchableOpacity
                                        onPress={() => handleUpdateStatus(item, 'in-progress')}
                                        className="mr-2 rounded-xl px-3 py-2"
                                        style={{ backgroundColor: COLORS.info }}
                                    >
                                        <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                            En cours
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {item.status === 'in-progress' && (
                                    <TouchableOpacity
                                        onPress={() => handleUpdateStatus(item, 'completed')}
                                        className="mr-2 rounded-xl px-3 py-2"
                                        style={{ backgroundColor: COLORS.success }}
                                    >
                                        <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                            Terminer
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(item, 'cancelled')}
                                    className="rounded-xl px-3 py-2"
                                    style={{ backgroundColor: COLORS.error }}
                                >
                                    <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                        Annuler
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // Modale pour afficher les détails de la commande
    const renderOrderDetailsModal = () => {
        if (!selectedOrder || !statusModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text
                            className="text-xl font-semibold"
                            style={{ fontFamily: FONTS.semiBold }}
                        >
                            Détails de la commande
                        </Text>

                        <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="max-h-80"
                    >
                        <View className="mb-4">
                            <Text className="text-lg font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                                Commande #{selectedOrder.id.slice(0, 6)}
                            </Text>
                            <Text className="text-gray-500" style={{ fontFamily: FONTS.regular }}>
                                {format(
                                    selectedOrder.createdAt?.toDate?.() ?? new Date(selectedOrder.createdAt),
                                    'dd MMM yyyy, HH:mm',
                                    { locale: fr }
                                )}
                            </Text>
                        </View>

                        <View className="mb-4">
                            <Text className="font-medium mb-2" style={{ fontFamily: FONTS.medium }}>
                                Client:
                            </Text>
                            <View className="bg-gray-50 rounded-xl p-3">
                                <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                                    Nom: {selectedOrder.customerName}
                                </Text>
                                <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                                    Téléphone: {selectedOrder.customerPhone}
                                </Text>
                                <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                                    Adresse: {selectedOrder.address}
                                </Text>
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="font-medium mb-2" style={{ fontFamily: FONTS.medium }}>
                                Articles:
                            </Text>
                            <View className="bg-gray-50 rounded-xl p-3">
                                {selectedOrder.items.map((orderItem, index) => (
                                    <View
                                        key={orderItem.id || index}
                                        className={`flex-row justify-between items-center ${
                                            index !== selectedOrder.items.length - 1 ? 'border-b border-gray-200 pb-2 mb-2' : ''
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            <View className="bg-gray-200 w-8 h-8 rounded-full items-center justify-center mr-2">
                                                <Text>{orderItem.quantity}x</Text>
                                            </View>
                                            <Text>{orderItem.name}</Text>
                                        </View>
                                        <Text className="font-medium">
                                            {orderItem.price.toFixed(2).replace('.', ',')} €
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className="mb-6">
                            <View className="bg-gray-50 rounded-xl p-3">
                                <View className="flex-row justify-between items-center">
                                    <Text className="font-bold" style={{ fontFamily: FONTS.bold }}>
                                        Total:
                                    </Text>
                                    <Text className="font-bold text-lg" style={{ fontFamily: FONTS.bold, color: COLORS.primary.DEFAULT }}>
                                        {selectedOrder.total.toFixed(2).replace('.', ',')} €
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text className="font-medium mb-2" style={{ fontFamily: FONTS.medium }}>
                                Changer le statut:
                            </Text>
                            <View className="flex-row flex-wrap gap-2 mb-4">
                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(selectedOrder, 'pending')}
                                    className={`px-3 py-2 rounded-xl ${selectedOrder.status === 'pending' ? 'border-2 border-warning' : 'bg-gray-100'}`}
                                    style={{ borderColor: COLORS.warning }}
                                >
                                    <Text className={`${selectedOrder.status === 'pending' ? 'text-warning' : 'text-gray-700'}`}>
                                        En attente
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(selectedOrder, 'in-progress')}
                                    className={`px-3 py-2 rounded-xl ${selectedOrder.status === 'in-progress' ? 'border-2 border-info' : 'bg-gray-100'}`}
                                    style={{ borderColor: COLORS.info }}
                                >
                                    <Text className={`${selectedOrder.status === 'in-progress' ? 'text-info' : 'text-gray-700'}`}>
                                        En cours
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(selectedOrder, 'completed')}
                                    className={`px-3 py-2 rounded-xl ${selectedOrder.status === 'completed' ? 'border-2 border-success' : 'bg-gray-100'}`}
                                    style={{ borderColor: COLORS.success }}
                                >
                                    <Text className={`${selectedOrder.status === 'completed' ? 'text-success' : 'text-gray-700'}`}>
                                        Terminée
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(selectedOrder, 'cancelled')}
                                    className={`px-3 py-2 rounded-xl ${selectedOrder.status === 'cancelled' ? 'border-2 border-error' : 'bg-gray-100'}`}
                                    style={{ borderColor: COLORS.error }}
                                >
                                    <Text className={`${selectedOrder.status === 'cancelled' ? 'text-error' : 'text-gray-700'}`}>
                                        Annulée
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        );
    };
/*
    // Bouton pour ajouter une nouvelle commande
    const renderAddOrderButton = () => {
        return (
            <TouchableOpacity
                onPress={() => router.push('/dashboard/new-order')}
                className="absolute bottom-6 right-6 bg-primary-600 rounded-full w-16 h-16 items-center justify-center shadow-lg"
                style={{ backgroundColor: COLORS.primary.DEFAULT }}
            >
                <Feather name="plus" size={24} color="white" />
            </TouchableOpacity>
        );
    };
*/
    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Chargement des commandes...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-4">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-xl font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                        Commandes
                    </Text>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        className="p-2 bg-primary-50 rounded-full"
                        style={{ backgroundColor: COLORS.primary.light }}
                    >
                        <Feather name="refresh-cw" size={20} color={COLORS.primary.DEFAULT} />
                    </TouchableOpacity>
                </View>

                {orders.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="receipt-outline" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Aucune commande trouvée
                        </Text>
                        <TouchableOpacity
                            onPress={fetchOrders}
                            className="mt-4 px-4 py-2 rounded-xl"
                            style={{ backgroundColor: COLORS.primary.DEFAULT }}
                        >
                            <Text className="text-white" style={{ fontFamily: FONTS.medium }}>
                                Actualiser
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 80 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}

                {renderOrderDetailsModal()}
                {/*
                 {renderAddOrderButton()}
                */}
            </View>
        </>
    );
}