import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { getCuisines, Cuisine } from '../../lib/firebase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getFirestore, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';

export default function CuisinesScreen() {
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCuisine, setCurrentCuisine] = useState<Cuisine | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const router = useRouter();
    const db = getFirestore();
    const storage = getStorage();

    const fetchCuisines = async () => {
        try {
            setLoading(true);
            const cuisinesData = await getCuisines();
            setCuisines(cuisinesData);
        } catch (error) {
            console.error('Error fetching cuisines:', error);
            Alert.alert('Error', 'Failed to load cuisines. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCuisines();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCuisines();
    };

    const handleAddCuisine = () => {
        setEditMode(false);
        setCurrentCuisine(null);
        setName('');
        setDescription('');
        setImage(null);
        setModalVisible(true);
    };

    const handleEditCuisine = (cuisine: Cuisine) => {
        setEditMode(true);
        setCurrentCuisine(cuisine);
        setName(cuisine.name);
        setDescription(cuisine.description || '');
        setImage(cuisine.image);
        setModalVisible(true);
    };

    const handleDeleteCuisine = async (cuisineId: string) => {
        Alert.alert(
            'Delete Cuisine',
            'Are you sure you want to delete this cuisine? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete the cuisine from Firestore
                            await deleteDoc(doc(db, 'cuisines', cuisineId));

                            // Update the local state
                            setCuisines(cuisines.filter(c => c.id !== cuisineId));

                            Alert.alert('Success', 'Cuisine deleted successfully');
                        } catch (error) {
                            console.error('Error deleting cuisine:', error);
                            Alert.alert('Error', 'Failed to delete cuisine. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string, path: string): Promise<string> => {
        // Fetch the image
        const response = await fetch(uri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob);

        // Get the download URL
        return getDownloadURL(storageRef);
    };

    const handleSaveCuisine = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a cuisine name');
            return;
        }

        try {
            let imageUrl = image;

            // If it's a local image, upload it first
            if (image && image.startsWith('file://')) {
                const path = `cuisines/${Date.now()}.jpg`;
                imageUrl = await uploadImage(image, path);
            }

            if (editMode && currentCuisine) {
                // Update existing cuisine
                await updateDoc(doc(db, 'cuisines', currentCuisine.id), {
                    name,
                    description,
                    image: imageUrl,
                    updatedAt: new Date(),
                });

                // Update local state
                setCuisines(cuisines.map(c =>
                    c.id === currentCuisine.id
                        ? { ...c, name, description, image: imageUrl || '' }
                        : c
                ));

                Alert.alert('Success', 'Cuisine updated successfully');
            } else {
                // Add new cuisine
                const newCuisineRef = doc(collection(db, 'cuisines'));
                await setDoc(newCuisineRef, {
                    name,
                    description,
                    image: imageUrl,
                    restaurantCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Update local state
                setCuisines([
                    ...cuisines,
                    {
                        id: newCuisineRef.id,
                        name,
                        description,
                        image: imageUrl || '',
                        restaurantCount: 0
                    }
                ]);

                Alert.alert('Success', 'Cuisine added successfully');
            }

            // Reset form and close modal
            setModalVisible(false);
            setName('');
            setDescription('');
            setImage(null);
            setCurrentCuisine(null);

        } catch (error) {
            console.error('Error saving cuisine:', error);
            Alert.alert('Error', 'Failed to save cuisine. Please try again.');
        }
    };

    const renderItem = ({ item }: { item: Cuisine }) => {
        return (
            <View className="bg-white rounded-lg overflow-hidden mb-4 shadow-sm">
                {item.image ? (
                    <Image
                        source={{ uri: item.image }}
                        className="w-full h-40"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-full h-40 bg-gray-200 justify-center items-center">
                        <Feather name="image" size={48} color={COLORS.gray.DEFAULT} />
                    </View>
                )}

                <View className="p-4">
                    <Text
                        className="text-lg font-semibold mb-1"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        {item.name}
                    </Text>

                    {item.description && (
                        <Text
                            className="text-gray-700 mb-2"
                            style={{ fontFamily: FONTS.regular }}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}

                    <View className="flex-row justify-between items-center mt-2">
                        <Text
                            className="text-gray-500"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            {item.restaurantCount || 0} Restaurants
                        </Text>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => handleEditCuisine(item)}
                                className="mr-2 p-2 rounded-full"
                                style={{ backgroundColor: COLORS.info }}
                            >
                                <Feather name="edit-2" size={16} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDeleteCuisine(item.id)}
                                className="p-2 rounded-full"
                                style={{ backgroundColor: COLORS.error }}
                            >
                                <Feather name="trash-2" size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Modal Component
    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-10">
                <View className="bg-white w-full rounded-lg p-6 max-w-md">
                    <Text
                        className="text-xl font-semibold mb-4"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        {editMode ? 'Edit Cuisine' : 'Add New Cuisine'}
                    </Text>

                    <TouchableOpacity
                        onPress={pickImage}
                        className="w-full h-40 rounded-lg mb-4 justify-center items-center border-2 border-dashed border-gray-300"
                        style={{ borderRadius: BORDER_RADIUS.md }}
                    >
                        {image ? (
                            <Image
                                source={{ uri: image }}
                                className="w-full h-full rounded-lg"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="items-center">
                                <Feather name="image" size={48} color={COLORS.gray.DEFAULT} />
                                <Text
                                    className="text-gray-500 mt-2"
                                    style={{ fontFamily: FONTS.medium }}
                                >
                                    Tap to select image
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View className="mb-4">
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Name
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3"
                            style={{
                                fontFamily: FONTS.regular,
                                borderRadius: BORDER_RADIUS.md
                            }}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter cuisine name"
                        />
                    </View>

                    <View className="mb-4">
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Description
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3"
                            style={{
                                fontFamily: FONTS.regular,
                                borderRadius: BORDER_RADIUS.md,
                                minHeight: 80,
                                textAlignVertical: 'top'
                            }}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Enter cuisine description"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View className="flex-row justify-end mt-2">
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            className="mr-2 px-4 py-2 rounded-lg"
                            style={{
                                backgroundColor: COLORS.gray.light,
                                borderRadius: BORDER_RADIUS.md
                            }}
                        >
                            <Text
                                className="text-gray-700"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSaveCuisine}
                            className="px-4 py-2 rounded-lg"
                            style={{
                                backgroundColor: COLORS.primary.DEFAULT,
                                borderRadius: BORDER_RADIUS.md
                            }}
                        >
                            <Text
                                className="text-white"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Save
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Loading cuisines...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-2">
                {cuisines.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="grid" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            No cuisines found
                        </Text>
                        <TouchableOpacity
                            onPress={handleAddCuisine}
                            className="mt-4 px-4 py-2 rounded-md flex-row items-center"
                            style={{ backgroundColor: COLORS.primary.DEFAULT }}
                        >
                            <Feather name="plus" size={18} color="white" />
                            <Text
                                className="text-white ml-2"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Add Cuisine
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={cuisines}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingVertical: 16 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>

            {renderModal()}
        </>
    );
}