import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert, Switch } from 'react-native';
import { getCuisines, getCategories, Cuisine, Category, Product } from '../../lib/firebase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getFirestore, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function ProductsScreen() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [description, setDescription] = useState('');
    const [isVeg, setIsVeg] = useState(false);
    const [selectedCuisineId, setSelectedCuisineId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [image, setImage] = useState<string | null>(null);

    // Modal visibility states
    const [cuisineModalVisible, setCuisineModalVisible] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);

    const router = useRouter();
    const db = getFirestore();
    const storage = getStorage();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cuisinesData, categoriesData] = await Promise.all([
                getCuisines(),
                getCategories()
            ]);

            setCuisines(cuisinesData);
            setCategories(categoriesData);

            // Fetch products from all cuisines
            const productsData: Product[] = [];

            for (const cuisine of cuisinesData) {
                const productsRef = collection(db, 'products');
                const q = query(productsRef, where('cuisineId', '==', cuisine.id));
                const snapshot = await getDocs(q);

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    productsData.push({
                        id: doc.id,
                        name: data.name || '',
                        price: data.price || 0,
                        originalPrice: data.originalPrice,
                        discountedPrice: data.discountedPrice,
                        description: data.description || '',
                        image: data.image || '',
                        rating: data.rating || 0,
                        reviewCount: data.reviewCount || 0,
                        category: data.category || '',
                        subCategory: data.subCategory || '',
                        isVeg: data.isVeg || false,
                        cuisineId: data.cuisineId || ''
                    });
                });
            }

            setProducts(productsData);
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

    // Update filtered categories when cuisine changes
    useEffect(() => {
        if (selectedCuisineId) {
            const filtered = categories.filter(cat => cat.cuisineId === selectedCuisineId);
            setFilteredCategories(filtered);

            // Reset category selection if current selection is not in the filtered list
            if (selectedCategoryId) {
                const categoryStillValid = filtered.some(cat => cat.id === selectedCategoryId);
                if (!categoryStillValid) {
                    setSelectedCategoryId(null);
                }
            }
        } else {
            setFilteredCategories([]);
            setSelectedCategoryId(null);
        }
    }, [selectedCuisineId, categories]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddProduct = () => {
        setEditMode(false);
        setCurrentProduct(null);
        resetForm();
        setModalVisible(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditMode(true);
        setCurrentProduct(product);
        setName(product.name);
        setPrice(product.price.toString());
        setOriginalPrice(product.originalPrice?.toString() || product.price.toString());
        setDescription(product.description);
        setIsVeg(product.isVeg);
        setSelectedCuisineId(product.cuisineId);

        // Find the category based on the product's category name
        const category = categories.find(cat =>
            cat.name === product.category && cat.cuisineId === product.cuisineId
        );

        if (category) {
            setSelectedCategoryId(category.id);
        } else {
            setSelectedCategoryId(null);
        }

        setImage(product.image);
        setModalVisible(true);
    };

    const resetForm = () => {
        setName('');
        setPrice('');
        setOriginalPrice('');
        setDescription('');
        setIsVeg(false);
        setSelectedCuisineId(null);
        setSelectedCategoryId(null);
        setImage(null);
    };

    const handleDeleteProduct = async (productId: string) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete the product from Firestore
                            await deleteDoc(doc(db, 'products', productId));

                            // Update the local state
                            setProducts(products.filter(p => p.id !== productId));

                            Alert.alert('Success', 'Product deleted successfully');
                        } catch (error) {
                            console.error('Error deleting product:', error);
                            Alert.alert('Error', 'Failed to delete product. Please try again.');
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

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a product name');
            return false;
        }

        if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
            Alert.alert('Error', 'Please enter a valid price');
            return false;
        }

        if (originalPrice.trim() && (isNaN(Number(originalPrice)) || Number(originalPrice) <= 0)) {
            Alert.alert('Error', 'Please enter a valid original price');
            return false;
        }

        if (!selectedCuisineId) {
            Alert.alert('Error', 'Please select a cuisine');
            return false;
        }

        if (!selectedCategoryId) {
            Alert.alert('Error', 'Please select a category');
            return false;
        }

        return true;
    };

    const handleSaveProduct = async () => {
        if (!validateForm()) return;

        try {
            let imageUrl = image;

            // If it's a local image, upload it first
            if (image && image.startsWith('file://')) {
                const path = `products/${Date.now()}.jpg`;
                imageUrl = await uploadImage(image, path);
            }

            // Get category name from category ID
            const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
            if (!selectedCategory) {
                Alert.alert('Error', 'Selected category not found');
                return;
            }

            const priceNum = Number(price);
            const originalPriceNum = originalPrice.trim() ? Number(originalPrice) : priceNum;
            const discountedPriceNum = priceNum < originalPriceNum ? priceNum : null;

            // Prepare product data
            const productData = {
                name,
                price: priceNum,
                originalPrice: originalPriceNum,
                discountedPrice: discountedPriceNum,
                description,
                image: imageUrl,
                isVeg,
                cuisineId: selectedCuisineId,
                category: selectedCategory.name,
                updatedAt: new Date()
            };

            if (editMode && currentProduct) {
                // Update existing product
                await updateDoc(doc(db, 'products', currentProduct.id), productData);

                // Update local state
                setProducts(products.map(p =>
                    p.id === currentProduct.id
                        ? {
                            ...p,
                            ...productData,
                            image: imageUrl || ''
                        }
                        : p
                ));

                Alert.alert('Success', 'Product updated successfully');
            } else {
                // Add new product
                const newProductRef = doc(collection(db, 'products'));
                await setDoc(newProductRef, {
                    ...productData,
                    rating: 0,
                    reviewCount: 0,
                    createdAt: new Date()
                });

                // Update local state
                setProducts([
                    ...products,
                    {
                        id: newProductRef.id,
                        name,
                        price: priceNum,
                        originalPrice: originalPriceNum,
                        discountedPrice: discountedPriceNum,
                        description,
                        image: imageUrl || '',
                        rating: 0,
                        reviewCount: 0,
                        isVeg,
                        cuisineId: selectedCuisineId,
                        category: selectedCategory.name,
                        subCategory: ''
                    }
                ]);

                Alert.alert('Success', 'Product added successfully');
            }

            // Reset form and close modal
            setModalVisible(false);
            resetForm();

        } catch (error) {
            console.error('Error saving product:', error);
            Alert.alert('Error', 'Failed to save product. Please try again.');
        }
    };

    const getCuisineName = (cuisineId: string | null) => {
        if (!cuisineId) return 'None';
        const cuisine = cuisines.find(c => c.id === cuisineId);
        return cuisine ? cuisine.name : 'Unknown';
    };

    const getCategoryName = (categoryId: string | null) => {
        if (!categoryId) return 'None';
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown';
    };

    const getDiscountPercentage = (original: number, discounted: number) => {
        if (!original || !discounted || original <= discounted) return null;
        const discount = Math.round(((original - discounted) / original) * 100);
        return discount > 0 ? discount : null;
    };

    const renderItem = ({ item }: { item: Product }) => {
        const discountPercentage = getDiscountPercentage(
            item.originalPrice || item.price,
            item.price
        );

        return (
            <View className="bg-white rounded-lg overflow-hidden mb-4 shadow-sm">
                <View className="relative">
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            className="w-full h-48"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-48 bg-gray-200 justify-center items-center">
                            <Feather name="image" size={48} color={COLORS.gray.DEFAULT} />
                        </View>
                    )}

                    {/* Veg/Non-Veg Indicator */}
                    <View
                        className="absolute top-2 left-2 p-1 rounded"
                        style={{ backgroundColor: item.isVeg ? COLORS.success : COLORS.error }}
                    >
                        <Text className="text-white text-xs px-1" style={{ fontFamily: FONTS.medium }}>
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                        </Text>
                    </View>

                    {/* Discount Badge */}
                    {discountPercentage && (
                        <View
                            className="absolute top-2 right-2 p-1 rounded"
                            style={{ backgroundColor: COLORS.primary.DEFAULT }}
                        >
                            <Text className="text-white text-xs px-1" style={{ fontFamily: FONTS.medium }}>
                                {discountPercentage}% OFF
                            </Text>
                        </View>
                    )}
                </View>

                <View className="p-4">
                    <Text
                        className="text-lg font-semibold"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        {item.name}
                    </Text>

                    {item.description && (
                        <Text
                            className="text-gray-700 mt-1 mb-2"
                            style={{ fontFamily: FONTS.regular }}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}

                    <View className="flex-row items-center mb-2">
                        <Text
                            className="text-gray-500 text-sm"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            {getCuisineName(item.cuisineId)} • {item.category}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center mt-1">
                        <View className="flex-row items-center">
                            <Text
                                className="text-lg font-bold"
                                style={{ fontFamily: FONTS.bold }}
                            >
                                ${item.price.toFixed(2)}
                            </Text>

                            {item.originalPrice && item.originalPrice > item.price && (
                                <Text
                                    className="text-gray-500 ml-2 line-through text-sm"
                                    style={{ fontFamily: FONTS.regular }}
                                >
                                    ${item.originalPrice.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => handleEditProduct(item)}
                                className="mr-2 p-2 rounded-full"
                                style={{ backgroundColor: COLORS.info }}
                            >
                                <Feather name="edit-2" size={16} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDeleteProduct(item.id)}
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

    // Category Selection Modal
    const renderCategoryModal = () => {
        if (!categoryModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-lg p-6 max-w-md max-h-96">
                    <Text
                        className="text-xl font-semibold mb-4"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        Select Category
                    </Text>

                    {filteredCategories.length > 0 ? (
                        <FlatList
                            data={filteredCategories}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-3 border-b border-gray-200"
                                    onPress={() => {
                                        setSelectedCategoryId(item.id);
                                        setCategoryModalVisible(false);
                                    }}
                                >
                                    <Text
                                        className={`${
                                            selectedCategoryId === item.id ? 'text-primary-600' : 'text-gray-800'
                                        }`}
                                        style={{ fontFamily: FONTS.medium }}
                                    >
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View className="items-center justify-center py-8">
                            <Text
                                className="text-gray-500 text-center"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                {selectedCuisineId
                                    ? "No categories found for this cuisine"
                                    : "Please select a cuisine first"}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => setCategoryModalVisible(false)}
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

    // Product Modal
    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-10">
                <View className="bg-white w-full rounded-lg p-6 max-w-md">
                    <Text
                        className="text-xl font-semibold mb-4"
                        style={{ fontFamily: FONTS.semiBold }}
                    >
                        {editMode ? 'Edit Product' : 'Add New Product'}
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
                            placeholder="Enter product name"
                        />
                    </View>

                    <View className="flex-row mb-4">
                        <View className="flex-1 mr-2">
                            <Text
                                className="text-gray-700 mb-1"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Price ($)
                            </Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg p-3"
                                style={{
                                    fontFamily: FONTS.regular,
                                    borderRadius: BORDER_RADIUS.md
                                }}
                                value={price}
                                onChangeText={setPrice}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-gray-700 mb-1"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Original Price ($)
                            </Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg p-3"
                                style={{
                                    fontFamily: FONTS.regular,
                                    borderRadius: BORDER_RADIUS.md
                                }}
                                value={originalPrice}
                                onChangeText={setOriginalPrice}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                            />
                        </View>
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
                            placeholder="Enter product description"
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

                    <View className="mb-4">
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Category
                        </Text>
                        <TouchableOpacity
                            className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                            style={{
                                borderRadius: BORDER_RADIUS.md,
                                backgroundColor: selectedCuisineId ? 'white' : COLORS.gray.lighter
                            }}
                            onPress={() => {
                                if (selectedCuisineId) {
                                    setCategoryModalVisible(true);
                                } else {
                                    Alert.alert('Select Cuisine', 'Please select a cuisine first');
                                }
                            }}
                            disabled={!selectedCuisineId}
                        >
                            <Text
                                style={{ fontFamily: FONTS.regular }}
                                className={selectedCategoryId ? "text-gray-800" : "text-gray-400"}
                            >
                                {selectedCategoryId
                                    ? getCategoryName(selectedCategoryId)
                                    : (selectedCuisineId ? "Select a category" : "Select cuisine first")}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
                    </View>

                    <View className="mb-4 flex-row items-center justify-between">
                        <Text
                            className="text-gray-700"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Vegetarian
                        </Text>
                        <Switch
                            value={isVeg}
                            onValueChange={setIsVeg}
                            trackColor={{ false: COLORS.gray.light, true: COLORS.success }}
                            thumbColor={COLORS.white}
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
                            onPress={handleSaveProduct}
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
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Loading products...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-2">
                <TouchableOpacity
                    onPress={handleAddProduct}
                    className="mb-4 p-3 rounded-lg flex-row items-center justify-center"
                    style={{ backgroundColor: COLORS.primary.DEFAULT }}
                >
                    <Feather name="plus" size={18} color="white" />
                    <Text
                        className="text-white ml-2"
                        style={{ fontFamily: FONTS.medium }}
                    >
                        Add Product
                    </Text>
                </TouchableOpacity>

                {products.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="package" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            No products found
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={products}
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
            {renderCategoryModal()}
        </>
    );
}