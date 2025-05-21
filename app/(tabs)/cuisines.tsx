import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert, StyleSheet } from 'react-native';
import {getCuisines, Cuisine, addCuisine, updateCuisine} from '../../services/cuisineService';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getFirestore, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { BlurView } from 'expo-blur';
import {uploadToCloudinary} from "../../services/cloudinaryService";

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
            Alert.alert('Erreur', 'Impossible de charger les cuisines. Veuillez réessayer.');
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
            'Supprimer la cuisine',
            'Êtes-vous sûr de vouloir supprimer cette cuisine ? Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'cuisines', cuisineId));
                            setCuisines(cuisines.filter(c => c.id !== cuisineId));
                            Alert.alert('Succès', 'Cuisine supprimée avec succès');
                        } catch (error) {
                            console.error('Error deleting cuisine:', error);
                            Alert.alert('Erreur', 'Échec de la suppression de la cuisine. Veuillez réessayer.');
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

    // Updated handleSaveCuisine function for better error handling and loading state
    const handleSaveCuisine = async () => {
        if (!name.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom de cuisine');
            return;
        }

        // Initialize loading state
        setLoading(true);

        try {
            let imageUrl = image;

            // Step 1: Upload image to Cloudinary if it's a local file
            if (image && image.startsWith('file://')) {
                try {
                    console.log('Démarrage du téléchargement vers Cloudinary...');
                    // Use the cloudinaryService directly for better error handling
                    imageUrl = await uploadToCloudinary(image, 'cuisines');
                    console.log('Image téléchargée sur Cloudinary:', imageUrl);
                } catch (cloudinaryError) {
                    console.error('Erreur lors du téléchargement de l\'image vers Cloudinary:', cloudinaryError);
                    Alert.alert('Erreur', 'Échec du téléchargement de l\'image. Veuillez réessayer.');
                    setLoading(false);
                    return;
                }
            }

            // Step 2: Save data to Firebase using the service functions
            if (editMode && currentCuisine) {
                // Update existing cuisine
                try {
                    console.log('Mise à jour d\'une cuisine existante:', currentCuisine.id);
                    const success = await updateCuisine(
                        currentCuisine.id,
                        {
                            name,
                            description
                        },
                        image && image.startsWith('file://') ? image : undefined // Only pass image if it's a new local file
                    );

                    if (success) {
                        // Update local state
                        setCuisines(cuisines.map(c =>
                            c.id === currentCuisine.id
                                ? { ...c, name, description, image: imageUrl || '' }
                                : c
                        ));

                        Alert.alert('Succès', 'Cuisine mise à jour avec succès');
                        setModalVisible(false);
                        resetForm();
                    } else {
                        throw new Error('Échec de la mise à jour de la cuisine');
                    }
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de la cuisine:', error);
                    Alert.alert('Erreur', 'Échec de la mise à jour de la cuisine. Veuillez réessayer.');
                }
            } else {
                // Add new cuisine
                try {
                    console.log('Ajout d\'une nouvelle cuisine...');
                    const newCuisineId = await addCuisine(
                        name,
                        description,
                        imageUrl || ''
                    );

                    if (newCuisineId) {
                        // Add to local state
                        setCuisines([
                            ...cuisines,
                            {
                                id: newCuisineId,
                                name,
                                description,
                                image: imageUrl || '',
                            }
                        ]);

                        Alert.alert('Succès', 'Cuisine ajoutée avec succès');
                        setModalVisible(false);
                        resetForm();
                    } else {
                        throw new Error('Échec de l\'ajout de la cuisine');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de la cuisine:', error);
                    Alert.alert('Erreur', 'Échec de l\'ajout de la cuisine. Veuillez réessayer.');
                }
            }
        } catch (error) {
            console.error('Erreur globale dans handleSaveCuisine:', error);
            Alert.alert('Erreur', 'Une erreur inattendue s\'est produite. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

// Helper function to reset the form
    const resetForm = () => {
        setName('');
        setDescription('');
        setImage(null);
        setCurrentCuisine(null);
        setEditMode(false);
    };

    const renderItem = ({ item }: { item: Cuisine }) => {
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

                    <BlurView intensity={70} className="absolute bottom-0 w-full p-4">
                        <Text
                            className="text-xl font-bold text-white mb-1"
                            style={{ fontFamily: FONTS.bold }}
                        >
                            {item.name}
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

                    <View className="flex-row justify-between items-center mt-2">
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
                                {editMode ? 'Mise à jour de la cuisine...' : 'Ajout de la cuisine...'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View className="flex-row justify-between items-center mb-6">
                                <Text
                                    className="text-xl font-semibold"
                                    style={{ fontFamily: FONTS.semiBold }}
                                >
                                    {editMode ? 'Modifier la cuisine' : 'Ajouter une nouvelle cuisine'}
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
                                    placeholder="Entrez le nom de la cuisine"
                                />
                            </View>

                            <View className="mb-6">
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
                                    placeholder="Entrez la description de la cuisine"
                                    multiline
                                    numberOfLines={3}
                                />
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
                                    onPress={handleSaveCuisine}
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
                <Text className="mt-2" style={{ fontFamily: FONTS.medium }}>Chargement des cuisines...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light" />
            <View className="flex-1 bg-gray-50 px-4 pt-4">
                <TouchableOpacity
                    onPress={handleAddCuisine}
                    className="mb-6 p-4 rounded-xl flex-row items-center justify-center shadow-sm"
                    style={{ backgroundColor: COLORS.primary.DEFAULT }}
                >
                    <Feather name="plus" size={18} color="white" />
                    <Text
                        className="text-white ml-2 font-medium"
                        style={{ fontFamily: FONTS.medium }}
                    >
                        Ajouter une Cuisine
                    </Text>
                </TouchableOpacity>

                {cuisines.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="grid" size={64} color={COLORS.gray.DEFAULT} />
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{ fontFamily: FONTS.medium }}
                        >
                            Aucune cuisine trouvée
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={cuisines}
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
        </>
    );
}