import React from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../constants/theme';
import { Feather } from '@expo/vector-icons';

export default function Home() {
    const router = useRouter();

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            <View className="flex-1 bg-white p-6">
                {/* En-tête */}
                <View className="items-center mb-8 pt-6">
                    <View className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-4"
                          style={{ backgroundColor: COLORS.primary.light + '30' }}>
                        <Feather name="shopping-bag" size={36} color={COLORS.primary.DEFAULT} />
                    </View>
                    <Text
                        className="text-3xl font-bold text-center"
                        style={{ fontFamily: FONTS.bold, color: COLORS.secondary.DEFAULT }}
                    >
                        Gestionnaire de Restaurant
                    </Text>
                    <Text
                        className="text-base text-center mt-2 mx-4"
                        style={{ fontFamily: FONTS.regular, color: COLORS.gray.DEFAULT }}
                    >
                        Gérez facilement vos opérations de restaurant. Consultez les commandes, gérez les articles du menu et suivez les performances.
                    </Text>
                </View>

                {/* Menu principal */}
                <View className="flex-1 justify-center">
                    <TouchableOpacity
                        className="bg-white mb-4 rounded-xl overflow-hidden shadow-sm border border-gray-100"
                        onPress={() => router.push('/orders')}
                    >
                        <View className="flex-row items-center p-4">
                            <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                  style={{ backgroundColor: COLORS.primary.DEFAULT }}>
                                <Feather name="clipboard" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    Commandes
                                </Text>
                                <Text
                                    className="text-gray-500"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    Gérer et suivre les commandes
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={22} color={COLORS.gray.DEFAULT} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white mb-4 rounded-xl overflow-hidden shadow-sm border border-gray-100"
                        onPress={() => router.push('/cuisines')}
                    >
                        <View className="flex-row items-center p-4">
                            <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                  style={{ backgroundColor: COLORS.success }}>
                                <Feather name="grid" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    Cuisines
                                </Text>
                                <Text
                                    className="text-gray-500"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    Gérer les types de cuisine
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={22} color={COLORS.gray.DEFAULT} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white mb-4 rounded-xl overflow-hidden shadow-sm border border-gray-100"
                        onPress={() => router.push('/categories')}
                    >
                        <View className="flex-row items-center p-4">
                            <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                  style={{ backgroundColor: COLORS.warning }}>
                                <Feather name="layers" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    Catégories
                                </Text>
                                <Text
                                    className="text-gray-500"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    Gérer les catégories de produits
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={22} color={COLORS.gray.DEFAULT} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white mb-4 rounded-xl overflow-hidden shadow-sm border border-gray-100"
                        onPress={() => router.push('/products')}
                    >
                        <View className="flex-row items-center p-4">
                            <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                  style={{ backgroundColor: COLORS.info }}>
                                <Feather name="package" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    Produits
                                </Text>
                                <Text
                                    className="text-gray-500"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    Gérer les plats et produits
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={22} color={COLORS.gray.DEFAULT} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
                        onPress={() => router.push('/(tabs)')}
                    >
                        <View className="flex-row items-center p-4">
                            <View className="w-12 h-12 rounded-full items-center justify-center mr-4"
                                  style={{ backgroundColor: COLORS.secondary.DEFAULT }}>
                                <Feather name="pie-chart" size={22} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    Tableau de bord
                                </Text>
                                <Text
                                    className="text-gray-500"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    Voir les statistiques et performances
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={22} color={COLORS.gray.DEFAULT} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Pied de page */}
                <View className="pb-4 pt-6 items-center">
                    <Text
                        className="text-gray-400 text-xs"
                        style={{ fontFamily: FONTS.regular }}
                    >
                        © 2025 Restaurant Manager • v1.0.0
                    </Text>
                </View>
            </View>
        </>
    );
}