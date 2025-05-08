import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '../constants/theme';

export default function Home() {
    const router = useRouter();

    return (
        <View className="flex-1 justify-center items-center bg-white p-4">
            <Text
                className="text-2xl font-bold text-center mb-6"
                style={{ fontFamily: FONTS.bold, color: COLORS.secondary.DEFAULT }}
            >
                Welcome to Restaurant Manager
            </Text>

            <Text
                className="text-base text-center mb-8"
                style={{ fontFamily: FONTS.regular, color: COLORS.gray.DEFAULT }}
            >
                Manage your restaurant operations with ease. View orders, manage menu items, and track performance.
            </Text>

            <TouchableOpacity
                className="bg-primary-DEFAULT py-3 px-6 rounded-lg mb-4 w-full max-w-xs"
                style={{ backgroundColor: COLORS.primary.DEFAULT }}
                onPress={() => router.push('/orders')}
            >
                <Text
                    className="text-white text-center font-medium"
                    style={{ fontFamily: FONTS.medium }}
                >
                    View Orders
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-primary-light py-3 px-6 rounded-lg mb-4 w-full max-w-xs"
                style={{ backgroundColor: COLORS.primary.light }}
                onPress={() => router.push('/cuisines')}
            >
                <Text
                    className="text-white text-center font-medium"
                    style={{ fontFamily: FONTS.medium }}
                >
                    Manage Cuisines
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-secondary-DEFAULT py-3 px-6 rounded-lg w-full max-w-xs"
                style={{ backgroundColor: COLORS.secondary.DEFAULT }}
                onPress={() => router.push('/products')}
            >
                <Text
                    className="text-white text-center font-medium"
                    style={{ fontFamily: FONTS.medium }}
                >
                    Manage Products
                </Text>
            </TouchableOpacity>
        </View>
    );
}