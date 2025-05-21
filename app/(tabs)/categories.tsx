import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import {getCategories, Category, addCategory, updateCategory} from '../../services/categoryService';
import { getCuisines, Cuisine } from '../../services/cuisineService';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getFirestore, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { BlurView } from 'expo-blur';
import {uploadToCloudinary} from "../../services/cloudinaryService";

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
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedCuisineFilter, setSelectedCuisineFilter] = useState<string | null>(null);

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
            Alert.alert('Erreur', 'Échec du chargement des données. Veuillez réessayer.');
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
            'Supprimer la catégorie',
            'Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'categories', categoryId));
                            setCategories(categories.filter(c => c.id !== categoryId));
                            Alert.alert('Succès', 'Catégorie supprimée avec succès');
                        } catch (error) {
                            console.error('Error deleting category:', error);
                            Alert.alert('Erreur', 'Échec de la suppression de la catégorie. Veuillez réessayer.');
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
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob);
        return getDownloadURL(storageRef);
    };

    // Updated handleSaveCategory function for better error handling and loading state
    const handleSaveCategory = async () => {
        if (!name.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
            return;
        }

        if (!selectedCuisineId) {
            Alert.alert('Erreur', 'Veuillez sélectionner une cuisine');
            return;
        }

        // Set loading state to show loading indicator
        setLoading(true);

        try {
            let imageUrl = image;

            // Step 1: Upload image to Cloudinary if it's a local file
            if (image && image.startsWith('file://')) {
                try {
                    console.log('Démarrage du téléchargement de l\'image vers Cloudinary...');
                    // Use the cloudinaryService directly for better error handling
                    imageUrl = await uploadToCloudinary(image, 'categories');
                    console.log('Image téléchargée sur Cloudinary:', imageUrl);
                } catch (cloudinaryError) {
                    console.error('Erreur lors du téléchargement de l\'image vers Cloudinary:', cloudinaryError);
                    Alert.alert('Erreur', 'Échec du téléchargement de l\'image. Veuillez réessayer.');
                    setLoading(false);
                    return;
                }
            }

            // Step 2: Save data to Firebase using the service functions
            if (editMode && currentCategory) {
                // Update existing category
                try {
                    console.log('Mise à jour d\'une catégorie existante:', currentCategory.id);
                    const success = await updateCategory(
                        currentCategory.id,
                        {
                            name,
                            description,
                            cuisineId: selectedCuisineId
                        },
                        image && image.startsWith('file://') ? image : undefined // Only pass image if it's a new local file
                    );

                    if (success) {
                        // Update local state
                        setCategories(categories.map(c =>
                            c.id === currentCategory.id
                                ? {
                                    ...c,
                                    name,
                                    description,
                                    image: imageUrl || '',
                                    cuisineId: selectedCuisineId
                                }
                                : c
                        ));

                        Alert.alert('Succès', 'Catégorie mise à jour avec succès');
                        setModalVisible(false);
                        resetForm();
                    } else {
                        throw new Error('Échec de la mise à jour de la catégorie');
                    }
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de la catégorie:', error);
                    Alert.alert('Erreur', 'Échec de la mise à jour de la catégorie. Veuillez réessayer.');
                }
            } else {
                // Add new category
                try {
                    console.log('Ajout d\'une nouvelle catégorie...');
                    const newCategoryId = await addCategory(
                        name,
                        description,
                        selectedCuisineId,
                        imageUrl || ''
                    );

                    if (newCategoryId) {
                        // Add to local state
                        setCategories([
                            ...categories,
                            {
                                id: newCategoryId,
                                name,
                                description,
                                image: imageUrl || '',
                                cuisineId: selectedCuisineId,
                                itemCount: 0
                            }
                        ]);

                        Alert.alert('Succès', 'Catégorie ajoutée avec succès');
                        setModalVisible(false);
                        resetForm();
                    } else {
                        throw new Error('Échec de l\'ajout de la catégorie');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de la catégorie:', error);
                    Alert.alert('Erreur', 'Échec de l\'ajout de la catégorie. Veuillez réessayer.');
                }
            }
        } catch (error) {
            console.error('Erreur globale dans handleSaveCategory:', error);
            Alert.alert('Erreur', 'Une erreur inattendue s\'est produite. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

// Helper function to reset the form
    const resetForm = () => {
        setName('');
        setDescription('');
        setSelectedCuisineId(null);
        setImage(null);
        setCurrentCategory(null);
        setEditMode(false);
    };

    const getCuisineName = (cuisineId: string | null) => {
        if (!cuisineId) return 'Aucune';
        const cuisine = cuisines.find(c => c.id === cuisineId);
        return cuisine ? cuisine.name : 'Inconnue';
    };

    const filteredCategories = categories.filter(category => {
        if (selectedCuisineFilter && category.cuisineId !== selectedCuisineFilter) {
            return false;
        }
        return true;
    });

    const renderItem = ({ item }: { item: Category }) => {
        return (
            <View className="bg-white rounded-xl overflow-hidden mb-4 shadow-md">
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

                    <BlurView intensity={80} className="absolute bottom-0 w-full p-3">
                        <Text
                            className="text-lg font-bold text-white"
                            style={{ fontFamily: FONTS.semiBold }}
                        >
                            {item.name}
                        </Text>
                        <Text
                            className="text-white text-sm opacity-90"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Cuisine: {getCuisineName(item.cuisineId)}
                        </Text>
                    </BlurView>
                </View>

                <View className="p-4">
                    {item.description && (
                        <Text
                            className="text-gray-700 mb-3"
                            style={{ fontFamily: FONTS.regular }}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}

                    <View className="flex-row justify-between items-center mt-1">
                        <View className="bg-gray-100 px-3 py-1 rounded-full">
                            <Text
                                className="text-gray-600"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                {item.itemCount || 0} Produits
                            </Text>
                        </View>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => handleEditCategory(item)}
                                className="mr-2 p-3 rounded-full"
                                style={{ backgroundColor: COLORS.info }}
                            >
                                <Feather name="edit-2" size={16} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDeleteCategory(item.id)}
                                className="p-3 rounded-full"
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

    // Modale de filtres
    const renderFilterModal = () => {
        if (!filterModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text
                            className="text-xl font-semibold"
                            style={{ fontFamily: FONTS.semiBold }}
                        >
                            Filtrer les catégories
                        </Text>

                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
                    </View>

                    <View className="mb-6">
                        <Text
                            className="text-gray-700 mb-2"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Cuisine
                        </Text>
                        <TouchableOpacity
                            className="border border-gray-300 rounded-xl p-3 flex-row justify-between items-center"
                            onPress={() => {
                                setCuisineModalVisible(true);
                                setFilterModalVisible(false);
                            }}
                        >
                            <Text
                                style={{ fontFamily: FONTS.regular }}
                                className={selectedCuisineFilter ? "text-gray-800" : "text-gray-400"}
                            >
                                {selectedCuisineFilter ? getCuisineName(selectedCuisineFilter) : "Toutes les cuisines"}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-end space-x-3">
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedCuisineFilter(null);
                                setFilterModalVisible(false);
                            }}
                            className="px-5 py-3 rounded-xl"
                            style={{
                                backgroundColor: COLORS.gray.light,
                            }}
                        >
                            <Text
                                className="text-gray-700"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Réinitialiser
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setFilterModalVisible(false)}
                            className="px-5 py-3 rounded-xl"
                            style={{
                                backgroundColor: COLORS.primary.DEFAULT,
                            }}
                        >
                            <Text
                                className="text-white"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                Appliquer
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Modale de sélection de cuisine
    const renderCuisineModal = () => {
        if (!cuisineModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md max-h-96">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text
                            className="text-xl font-semibold"
                            style={{ fontFamily: FONTS.semiBold }}
                        >
                            Sélectionner une cuisine
                        </Text>

                        <TouchableOpacity onPress={() => setCuisineModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cuisines}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="p-3 border-b border-gray-200"
                                onPress={() => {
                                    if (filterModalVisible) {
                                        setSelectedCuisineFilter(item.id);
                                        setCuisineModalVisible(false);
                                        setFilterModalVisible(true);
                                    } else {
                                        setSelectedCuisineId(item.id);
                                        setCuisineModalVisible(false);
                                    }
                                }}
                            >
                                <Text
                                    className={`${
                                        (filterModalVisible ? selectedCuisineFilter : selectedCuisineId) === item.id
                                            ? 'text-primary-600'
                                            : 'text-gray-800'
                                    }`}
                                    style={{ fontFamily: FONTS.medium }}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        );
    };

    // Modale de catégorie
    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-10">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md">
                    {loading ? (
                        <View className="items-center justify-center py-10">
                            <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                            <Text
                                className="mt-4 text-gray-600"
                                style={{ fontFamily: FONTS.medium }}
                            >
                                {editMode ? 'Mise à jour de la catégorie...' : 'Ajout de la catégorie...'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View className="flex-row justify-between items-center mb-6">
                                <Text
                                    className="text-xl font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    {editMode ? 'Modifier la catégorie' : 'Ajouter une nouvelle catégorie'}
                                </Text>

                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Feather name="x" size={24} color={COLORS.gray.DEFAULT} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={pickImage}
                                className="w-full h-48 rounded-xl mb-4 justify-center items-center border-2 border-dashed border-gray-300"
                            >
                                {image ? (
                                    <Image
                                        source={{ uri: image }}
                                        className="w-full h-full rounded-xl"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="items-center">
                                        <Feather name="image" size={48} color={COLORS.gray.DEFAULT} />
                                        <Text
                                            className="text-gray-500 mt-2"
                                            style={{ fontFamily: FONTS.medium }}
                                        >
                                            Appuyez pour sélectionner une image
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View className="mb-4">
                                <Text
                                    className="text-gray-700 mb-1"
                                    style={{ fontFamily: FONTS.medium }}
                                >
                                    Nom
                                </Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-3"
                                    style={{ fontFamily: FONTS.regular }}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Entrez le nom de la catégorie"
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
                                    className="border border-gray-300 rounded-xl p-3"
                                    style={{
                                        fontFamily: FONTS.regular,
                                        minHeight: 80,
                                        textAlignVertical: 'top'
                                    }}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Entrez la description de la catégorie"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View className="mb-6">
                                <Text
                                    className="text-gray-700 mb-1"
                                    style={{ fontFamily: FONTS.medium }}
                                >
                                    Cuisine
                                </Text>
                                <TouchableOpacity
                                    className="border border-gray-300 rounded-xl p-3 flex-row justify-between items-center"
                                    style={{ borderRadius: BORDER_RADIUS.md }}
                                    onPress={() => setCuisineModalVisible(true)}
                                >
                                    <Text
                                        style={{ fontFamily: FONTS.regular }}
                                        className={selectedCuisineId ? "text-gray-800" : "text-gray-400"}
                                    >
                                        {selectedCuisineId ? getCuisineName(selectedCuisineId) : "Sélectionnez une cuisine"}
                                    </Text>
                                    <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT} />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-end space-x-3">
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    className="px-5 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: COLORS.gray.light,
                                    }}
                                >
                                    <Text
                                        className="text-gray-700"
                                        style={{ fontFamily: FONTS.medium }}
                                    >
                                        Annuler
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSaveCategory}
                                    className="px-5 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: COLORS.primary.DEFAULT,
                                    }}
                                >
                                    <Text
                                        className="text-white"
                                        style={{ fontFamily: FONTS.medium }}
                                    >
                                        Enregistrer
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        );
    };
    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Chargement des catégories...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-4">
                <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity
                        onPress={handleAddCategory}
                        className="p-4 rounded-xl flex-row items-center justify-center shadow-sm flex-1 mr-2"
                        style={{ backgroundColor: COLORS.primary.DEFAULT }}
                    >
                        <Feather name="plus" size={18} color="white" />
                        <Text
                            className="text-white ml-2 font-medium"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Ajouter une catégorie
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setFilterModalVisible(true)}
                        className="p-4 rounded-xl items-center justify-center shadow-sm"
                        style={{ backgroundColor: COLORS.white }}
                    >
                        <Feather name="filter" size={22} color={COLORS.primary.DEFAULT} />
                    </TouchableOpacity>
                </View>

                {filteredCategories.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="layers" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Aucune catégorie trouvée
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredCategories}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>

            {renderModal()}
            {renderCuisineModal()}
            {renderFilterModal()}
        </>
    );
}