import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { getCuisines, getCategories, getOrders } from '../../lib/firebase';

// Define types for dashboard stats
interface DashboardStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalCuisines: number;
    totalCategories: number;
    totalProducts: number;
    recentOrders: any[];
}

export default function DashboardScreen() {
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCuisines: 0,
        totalCategories: 0,
        totalProducts: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState<any>(null);

    const router = useRouter();
    const auth = getAuth();
    const db = getFirestore();

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch cuisines, categories, orders
            const [cuisines, categories, orders] = await Promise.all([
                getCuisines(),
                getCategories(),
                getOrders()
            ]);

            // Fetch total products count
            const productsRef = collection(db, 'products');
            const productsSnapshot = await getDocs(productsRef);

            // Calculate stats
            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            const completedOrders = orders.filter(o => o.status === 'completed').length;

            // Get recent orders (last 5)
            const recentOrders = orders
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                })
                .slice(0, 5);

            // Fetch admin details
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                const adminDoc = await getDoc(doc(db, 'users', userId));
                if (adminDoc.exists()) {
                    setAdmin(adminDoc.data());
                }
            }

            // Update stats
            setStats({
                totalOrders: orders.length,
                pendingOrders,
                completedOrders,
                totalCuisines: cuisines.length,
                totalCategories: categories.length,
                totalProducts: productsSnapshot.size,
                recentOrders
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.removeItem('userId');
            router.replace('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleRefresh = () => {
        fetchDashboardData();
    };

    const getOrderStatusColor = (status: string) => {
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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown date';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <ScrollView className="flex-1 bg-gray-50">
                {/* Welcome Section */}
                <View className="bg-primary-600 px-4 pt-4 pb-8" style={{ backgroundColor: COLORS.primary.DEFAULT }}>
                    <View className="flex-row justify-between items-center mb-4">
                        <View>
                            <Text className="text-white text-xl" style={{ fontFamily: FONTS.semiBold }}>
                                Welcome back,
                            </Text>
                            <Text className="text-white opacity-80" style={{ fontFamily: FONTS.regular }}>
                                {admin?.email || 'Admin'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="p-2 bg-white bg-opacity-20 rounded-full"
                        >
                            <Feather name="log-out" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Cards */}
                <View className="px-4 -mt-4">
                    <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <Text className="text-lg mb-4" style={{ fontFamily: FONTS.semiBold }}>
                            Orders Overview
                        </Text>

                        <View className="flex-row justify-between">
                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3 mr-2">
                                <Text className="text-2xl font-bold" style={{ fontFamily: FONTS.bold }}>
                                    {stats.totalOrders}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Total Orders
                                </Text>
                            </View>

                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3 mr-2">
                                <Text
                                    className="text-2xl font-bold"
                                    style={{ fontFamily: FONTS.bold, color: COLORS.warning }}
                                >
                                    {stats.pendingOrders}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Pending
                                </Text>
                            </View>

                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3">
                                <Text
                                    className="text-2xl font-bold"
                                    style={{ fontFamily: FONTS.bold, color: COLORS.success }}
                                >
                                    {stats.completedOrders}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Completed
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <Text className="text-lg mb-4" style={{ fontFamily: FONTS.semiBold }}>
                            Catalog Overview
                        </Text>

                        <View className="flex-row justify-between">
                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3 mr-2">
                                <Text className="text-2xl font-bold" style={{ fontFamily: FONTS.bold }}>
                                    {stats.totalCuisines}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Cuisines
                                </Text>
                            </View>

                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3 mr-2">
                                <Text className="text-2xl font-bold" style={{ fontFamily: FONTS.bold }}>
                                    {stats.totalCategories}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Categories
                                </Text>
                            </View>

                            <View className="items-center flex-1 bg-gray-50 rounded-lg py-3">
                                <Text className="text-2xl font-bold" style={{ fontFamily: FONTS.bold }}>
                                    {stats.totalProducts}
                                </Text>
                                <Text className="text-gray-500 text-sm" style={{ fontFamily: FONTS.medium }}>
                                    Products
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <Text className="text-lg mb-4" style={{ fontFamily: FONTS.semiBold }}>
                            Quick Actions
                        </Text>

                        <View className="flex-row flex-wrap">
                            <TouchableOpacity
                                className="w-1/4 items-center mb-4"
                                onPress={() => router.push('/dashboard/orders')}
                            >
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center mb-1"
                                    style={{ backgroundColor: COLORS.primary.light }}
                                >
                                    <Ionicons name="list" size={22} color={COLORS.primary.DEFAULT} />
                                </View>
                                <Text className="text-xs text-center" style={{ fontFamily: FONTS.medium }}>
                                    Orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-1/4 items-center mb-4"
                                onPress={() => router.push('/dashboard/cuisines')}
                            >
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center mb-1"
                                    style={{ backgroundColor: COLORS.success + '20' }}
                                >
                                    <Feather name="grid" size={22} color={COLORS.success} />
                                </View>
                                <Text className="text-xs text-center" style={{ fontFamily: FONTS.medium }}>
                                    Cuisines
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-1/4 items-center mb-4"
                                onPress={() => router.push('/dashboard/categories')}
                            >
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center mb-1"
                                    style={{ backgroundColor: COLORS.warning + '20' }}
                                >
                                    <Feather name="layers" size={22} color={COLORS.warning} />
                                </View>
                                <Text className="text-xs text-center" style={{ fontFamily: FONTS.medium }}>
                                    Categories
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-1/4 items-center mb-4"
                                onPress={() => router.push('/dashboard/products')}
                            >
                                <View
                                    className="w-12 h-12 rounded-full items-center justify-center mb-1"
                                    style={{ backgroundColor: COLORS.info + '20' }}
                                >
                                    <Feather name="package" size={22} color={COLORS.info} />
                                </View>
                                <Text className="text-xs text-center" style={{ fontFamily: FONTS.medium }}>
                                    Products
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Recent Orders */}
                    <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg" style={{ fontFamily: FONTS.semiBold }}>
                                Recent Orders
                            </Text>

                            <TouchableOpacity onPress={handleRefresh}>
                                <Feather name="refresh-cw" size={18} color={COLORS.primary.DEFAULT} />
                            </TouchableOpacity>
                        </View>

                        {stats.recentOrders.length === 0 ? (
                            <View className="items-center py-6">
                                <Ionicons name="receipt-outline" size={48} color={COLORS.gray.DEFAULT} />
                                <Text className="text-gray-500 mt-2" style={{ fontFamily: FONTS.medium }}>
                                    No recent orders found
                                </Text>
                            </View>
                        ) : (
                            stats.recentOrders.map((order, index) => (
                                <View
                                    key={order.id}
                                    className={`p-3 ${
                                        index < stats.recentOrders.length - 1 ? "border-b border-gray-100" : ""
                                    }`}
                                >
                                    <View className="flex-row justify-between items-center">
                                        <View>
                                            <Text style={{ fontFamily: FONTS.semiBold }}>
                                                Order #{order.id.slice(0, 6)}
                                            </Text>
                                            <Text
                                                className="text-gray-500 text-xs"
                                                style={{ fontFamily: FONTS.regular }}
                                            >
                                                {formatDate(order.createdAt)}
                                            </Text>
                                        </View>

                                        <View className="flex-row items-center">
                                            <Text
                                                className="text-gray-700 mr-2"
                                                style={{ fontFamily: FONTS.medium }}
                                            >
                                                ${order.total.toFixed(2)}
                                            </Text>

                                            <View
                                                className="px-2 py-1 rounded"
                                                style={{ backgroundColor: getOrderStatusColor(order.status) }}
                                            >
                                                <Text
                                                    className="text-white text-xs capitalize"
                                                    style={{ fontFamily: FONTS.medium }}
                                                >
                                                    {order.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}

                        <TouchableOpacity
                            className="mt-3 items-center py-2"
                            onPress={() => router.push('/dashboard/orders')}
                        >
                            <Text
                                className="text-primary-600"
                                style={{
                                    fontFamily: FONTS.medium,
                                    color: COLORS.primary.DEFAULT
                                }}
                            >
                                View All Orders
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </>
    );
}