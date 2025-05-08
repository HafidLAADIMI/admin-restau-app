import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../constants/theme';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: COLORS.primary.DEFAULT,
                },
                headerTintColor: COLORS.white,
                tabBarActiveTintColor: COLORS.primary.DEFAULT,
                tabBarInactiveTintColor: COLORS.gray.DEFAULT,
                tabBarStyle: {
                    backgroundColor: COLORS.white,
                    borderTopColor: COLORS.gray.light,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontFamily: FONTS.medium,
                    fontSize: 12,
                    marginTop: -5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarLabel: 'Orders',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cuisines"
                options={{
                    title: 'Cuisines',
                    tabBarLabel: 'Cuisines',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="grid" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="categories"
                options={{
                    title: 'Categories',
                    tabBarLabel: 'Categories',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="layers" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Products',
                    tabBarLabel: 'Products',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="package" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}