import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getOrders, updateOrderStatus, Order } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const ordersData = await getOrders();
            setOrders(ordersData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            Alert.alert('Error', 'Failed to load orders. Please try again.');
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

            // Update local state
            setOrders(prevOrders =>
                prevOrders.map(o =>
                    o.id === order.id ? { ...o, status: newStatus } : o
                )
            );

            Alert.alert('Success', `Order status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating order status:', error);
            Alert.alert('Error', 'Failed to update order status. Please try again.');
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

    const renderItem = ({ item }: { item: Order }) => {
        const orderDate = item.createdAt?.toDate ?
            item.createdAt.toDate() :
            new Date(item.createdAt);

        return (
            <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-lg font-semibold" style={{ fontFamily: FONTS.semiBold }}>
                        Order #{item.id.slice(0, 6)}
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
                                {item.status}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mb-2">
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Customer: {item.customerName}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Phone: {item.customerPhone}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Address: {item.address}
                    </Text>
                    <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                        Date: {format(orderDate, 'MMM d, yyyy h:mm a')}
                    </Text>
                </View>

                <View className="mb-2">
                    <Text className="font-medium mb-1" style={{ fontFamily: FONTS.medium }}>
                        Items:
                    </Text>
                    {item.items.map((orderItem, index) => (
                        <View key={orderItem.id || index} className="flex-row justify-between">
                            <Text className="text-gray-700" style={{ fontFamily: FONTS.regular }}>
                                {orderItem.quantity}x {orderItem.name}
                            </Text>
                            <Text className="text-gray-700" style={{ fontFamily: FONTS.medium }}>
                                ${orderItem.price.toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-lg font-bold" style={{ fontFamily: FONTS.bold }}>
                        Total: ${item.total.toFixed(2)}
                    </Text>

                    <View className="flex-row">
                        {item.status !== 'completed' && item.status !== 'cancelled' && (
                            <>
                                {item.status === 'pending' && (
                                    <TouchableOpacity
                                        onPress={() => handleUpdateStatus(item, 'in-progress')}
                                        className="mr-2 bg-blue-500 rounded-md px-3 py-2"
                                        style={{ backgroundColor: COLORS.info }}
                                    >
                                        <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                            In Progress
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {item.status === 'in-progress' && (
                                    <TouchableOpacity
                                        onPress={() => handleUpdateStatus(item, 'completed')}
                                        className="mr-2 rounded-md px-3 py-2"
                                        style={{ backgroundColor: COLORS.success }}
                                    >
                                        <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                            Complete
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => handleUpdateStatus(item, 'cancelled')}
                                    className="rounded-md px-3 py-2"
                                    style={{ backgroundColor: COLORS.error }}
                                >
                                    <Text className="text-white text-xs" style={{ fontFamily: FONTS.medium }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Loading orders...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-2">
                {orders.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Ionicons name="receipt-outline" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            No orders found
                        </Text>
                        <TouchableOpacity
                            onPress={fetchOrders}
                            className="mt-4 px-4 py-2 rounded-md"
                            style={{ backgroundColor: COLORS.primary.DEFAULT }}
                        >
                            <Text className="text-white" style={{ fontFamily: FONTS.medium }}>
                                Refresh
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingVertical: 16 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>
        </>
    );
}