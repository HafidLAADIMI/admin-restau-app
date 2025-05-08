import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { getCategories, getCuisines, Category, Cuisine } from '../../lib/firebase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getFirestore, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';

export default function CategoriesScreen() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCuisineId, setSelectedCuisineId] = useState<string | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [cuisineModalVisible, setCuisineModalVisible] = useState(false);

    const router = useRouter();
    const db = getFirestore();
    const storage = getStorage();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [categoriesData, cuisinesData] = await Promise.all([
                getCategories(),
                getCuisines()
            ]);
            setCategories(categoriesData);
            setCuisines(cuisinesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddCategory = () => {
        setEditMode(false);
        setCurrentCategory(null);
        setName('');
        setDescription('');
        setSelectedCuisineId(null);
        setImage(null);
        setModalVisible(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditMode(true);
        setCurrentCategory(category);
        setName(category.name);
        setDescription(category.description || '');
        setSelectedCuisineId(category.cuisineId);
        setImage(category.image);
        setModalVisible(true);
    };

    const handleDeleteCategory = async (categoryId: string) => {
        Alert.alert(
            'Delete Category',
            'Are you sure you want to delete this category? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete the category from Firestore
                            await deleteDoc(doc(db, 'categories', categoryId));

                            // Update the local state
                            setCategories(categories.filter(c => c.id !== categoryId));

                            Alert.alert('Success', 'Category deleted successfully');
                        } catch (error) {
                            console.error('Error deleting category:', error);
                            Alert.alert('Error', 'Failed to delete category. Please try again.');
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

    const handleSaveCategory = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }

        if (!selectedCuisineId) {
            Alert.alert('Error', 'Please select a cuisine');
            return;
        }

        try {
            let imageUrl = image;

            // If it's a local image, upload it first
            if (image && image.startsWith('file://')) {
                const path = `categories/${Date.now()}.jpg`;
                imageUrl = await uploadImage(image, path);
            }

            if (editMode && currentCategory) {
                // Update existing category
                await updateDoc(doc(db, 'categories', currentCategory.id), {
                    name,
                    description,
                    image: imageUrl,
                    cuisineId: selectedCuisineId,
                    updatedAt: new Date(),
                });

                // Update local state
                setCategories(categories.map(c =>
                    c.id === currentCategory.id
                        ? { ...c, name, description, image: imageUrl || '', cuisineId: selectedCuisineId }
                        : c
                ));

                Alert.alert('Success', 'Category updated successfully');
            } else {
                // Add new category
                const newCategoryRef = doc(collection(db, 'categories'));
                await setDoc(newCategoryRef, {
                    name,
                    description,
                    image: imageUrl,
                    cuisineId: selectedCuisineId,
                    itemCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Update local state
                setCategories([
                    ...categories,
                    {
                        id: newCategoryRef.id,
                        name,
                        description,
                        image: imageUrl || '',
                        cuisineId: selectedCuisineId,
                        itemCount: 0
                    }
                ]);

                Alert.alert('Success', 'Category added successfully');
            }

            // Reset form and close modal
            setModalVisible(false);
            setName('');
            setDescription('');
            setSelectedCuisineId(null);
            setImage(null);
            setCurrentCategory(null);

        } catch (error) {
            console.error('Error saving category:', error);
            Alert.alert('Error', 'Failed to save category. Please try again.');
        }
    };

    const getCuisineName = (cuisineId: string | null) => {
        if (!cuisineId) return 'None';
        const cuisine = cuisines.find(c => c.id === cuisineId);
        return cuisine ? cuisine.name : 'Unknown';
    };

    const renderItem = ({ item }: { item: Category }) => {
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
                        <View>
                            <Text
                                className="text-gray-500"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                {item.itemCount || 0} Items
                            </Text>
                            <Text
                                className="text-gray-500"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Cuisine: {getCuisineName(item.cuisineId)}
                            </Text>
                        </View>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => handleEditCategory(item)}
                                className="mr-2 p-2 rounded-full"
                                style={{ backgroundColor: COLORS.info }}
                            >
                                <Feather name="edit-2" size={16} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDeleteCategory(item.id)}
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

    // Cuisine Selection Modal
    const renderCuisineModal = () => {
        if (!cuisineModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-lg p-6 max-w-md max-h-96">
                    <Text
                        className="text-xl font-semibold mb-4"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        Select Cuisine
                    </Text>

                    <FlatList
                        data={cuisines}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="p-3 border-b border-gray-200"
                                onPress={() => {
                                    setSelectedCuisineId(item.id);
                                    setCuisineModalVisible(false);
                                }}
                            >
                                <Text
                                    className={`${
                                        selectedCuisineId === item.id ? 'text-primary-600' : 'text-gray-800'
                                    }`}
                                    style={{ fontFamily: FONTS.medium }}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        onPress={() => setCuisineModalVisible(false)}
                        className="mt-4 px-4 py-2 self-end rounded-lg"
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
                </View>
            </View>
        );
    };

    // Category Modal
    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-10">
                <View className="bg-white w-full rounded-lg p-6 max-w-md">
                    <Text
                        className="text-xl font-semibold mb-4"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        {editMode ? 'Edit Category' : 'Add New Category'}
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
                            placeholder="Enter category name"
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
                            placeholder="Enter category description"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View className="mb-4">
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Cuisine
                        </Text>
                        <TouchableOpacity
                            className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                            style={{ borderRadius: BORDER_RADIUS.md }}
                            onPress={() => setCuisineModalVisible(true)}
                        >
                            <Text
                                style={{ fontFamily: FONTS.regular }}
                                className={selectedCuisineId ? "text-gray-800" : "text-gray-400"}
                            >
                                {selectedCuisineId ? getCuisineName(selectedCuisineId) : "Select a cuisine"}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
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
                            onPress={handleSaveCategory}
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
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Loading categories...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-2">
                <TouchableOpacity
                    onPress={handleAddCategory}
                    className="mb-4 p-3 rounded-lg flex-row items-center justify-center"
                    style={{ backgroundColor: COLORS.primary.DEFAULT }}
                >
                    <Feather name="plus" size={18} color="white" />
                    <Text
                        className="text-white ml-2"
                        style={{ fontFamily: FONTS.medium }}
                    >
                        Add Category
                    </Text>
                </TouchableOpacity>

                {categories.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="layers" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            No categories found
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={categories}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>

            {renderModal()}
            {renderCuisineModal()}
        </>
    );
}