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
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
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
                    title: 'Tableau de Bord',
                    tabBarLabel: 'Tableau',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Commandes',
                    tabBarLabel: 'Commandes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt-outline" size={size} color={color} />
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
                    title: 'Catégories',
                    tabBarLabel: 'Catégories',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="layers" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Produits',
                    tabBarLabel: 'Produits',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="package" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}