import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    TextInput,
    Alert,
    Switch,
    ScrollView
} from 'react-native';

import {getCuisines, Cuisine} from '../../services/cuisineService';
import {getCategories, Category} from '../../services/categoryService';
import {addProduct, updateProduct} from "../../services/productService"
import {Product} from '../../services/productService';
import {Feather, Ionicons, MaterialIcons} from '@expo/vector-icons';
import {COLORS, FONTS, BORDER_RADIUS} from '../../constants/theme';
import {useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {getStorage, ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {doc, getFirestore, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs} from 'firebase/firestore';
import {BlurView} from 'expo-blur';
import {uploadToCloudinary} from "../../services/cloudinaryService";

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

    // Champs du formulaire
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [price, setPrice] = useState('');
    const [isVeg, setIsVeg] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [selectedCuisineId, setSelectedCuisineId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [variations, setVariations] = useState<Array<{id: string; name: string; price: number}>>([]);
    const [newVariationName, setNewVariationName] = useState('');
    const [newVariationPrice, setNewVariationPrice] = useState('');

    const [addons, setAddons] = useState<Array<{id: string; name: string; price: number}>>([]);
    const [newAddonName, setNewAddonName] = useState('');
    const [newAddonPrice, setNewAddonPrice] = useState('');
    // États de visibilité des modales
    const [cuisineModalVisible, setCuisineModalVisible] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Filtres
    const [selectedCuisineFilter, setSelectedCuisineFilter] = useState<string | null>(null);
    const [vegFilter, setVegFilter] = useState<boolean | null>(null);

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

            // Récupérer les produits de toutes les cuisines
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
                        discountPrice: data.discountPrice,
                        description: data.description || '',
                        image: data.image || '',
                        rating: data.rating || 0,
                        reviewCount: data.reviewCount || 0,
                        category: data.category || '',
                        subCategory: data.subCategory || '',
                        isVeg: data.isVeg || false,
                        isDisponible: data.isDisponible || false,
                        cuisineId: data.cuisineId || ''
                    });
                });
            }

            setProducts(productsData);
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

    // Mettre à jour les catégories filtrées lorsque la cuisine change
    useEffect(() => {
        if (selectedCuisineId) {
            const filtered = categories.filter(cat => cat.cuisineId === selectedCuisineId);
            setFilteredCategories(filtered);

            // Réinitialiser la sélection de catégorie si la sélection actuelle n'est pas dans la liste filtrée
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
        setDiscountPrice(product.discountPrice.toString());
        setPrice(product.price?.toString() || product.price.toString());
        setDescription(product.description);
        setIsVeg(product.isVeg);
        setIsAvailable(product.isAvailable);
        setSelectedCuisineId(product.cuisineId);

        // Load variations if they exist
        if (product.variations && Array.isArray(product.variations)) {
            setVariations(product.variations);
        } else {
            setVariations([]);
        }

        // Load addons if they exist
        if (product.addons && Array.isArray(product.addons)) {
            setAddons(product.addons);
        } else {
            setAddons([]);
        }

        // Find category (keep your existing code)
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
        setDiscountPrice('');
        setDescription('');
        setIsVeg(false);
        setIsAvailable(false);
        setSelectedCuisineId(null);
        setSelectedCategoryId(null);
        setImage(null);
        setVariations([]);
        setNewVariationName('');
        setNewVariationPrice('');
        setAddons([]);
        setNewAddonName('');
        setNewAddonPrice('');
    };
    const addVariation = () => {
        if (!newVariationName.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom de variation');
            return;
        }

        if (!newVariationPrice.trim() || isNaN(Number(newVariationPrice)) || Number(newVariationPrice) <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer un prix valide pour la variation');
            return;
        }

        const newVariation = {
            id: Date.now().toString(), // Generate a temporary ID
            name: newVariationName,
            price: Number(newVariationPrice)
        };

        setVariations([...variations, newVariation]);
        setNewVariationName('');
        setNewVariationPrice('');
    };

    const removeVariation = (id: string) => {
        setVariations(variations.filter(v => v.id !== id));
    };
    const addAddon = () => {
        if (!newAddonName.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom de supplément');
            return;
        }

        if (!newAddonPrice.trim() || isNaN(Number(newAddonPrice)) || Number(newAddonPrice) <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer un prix valide pour le supplément');
            return;
        }

        const newAddon = {
            id: Date.now().toString(), // Generate a temporary ID
            name: newAddonName,
            price: Number(newAddonPrice)
        };

        setAddons([...addons, newAddon]);
        setNewAddonName('');
        setNewAddonPrice('');
    };

    const removeAddon = (id: string) => {
        setAddons(addons.filter(a => a.id !== id));
    };
    const handleDeleteProduct = async (productId: string) => {
        Alert.alert(
            'Supprimer le produit',
            'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
            [
                {text: 'Annuler', style: 'cancel'},
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'products', productId));
                            setProducts(products.filter(p => p.id !== productId));
                            Alert.alert('Succès', 'Produit supprimé avec succès');
                        } catch (error) {
                            console.error('Error deleting product:', error);
                            Alert.alert('Erreur', 'Échec de la suppression du produit. Veuillez réessayer.');
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

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un nom de produit');
            return false;
        }

        if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer un prix valide');
            return false;
        }

        if (price.trim() && (isNaN(Number(price)) || Number(price) <= 0)) {
            Alert.alert('Erreur', 'Veuillez entrer un prix original valide');
            return false;
        }

        if (!selectedCuisineId) {
            Alert.alert('Erreur', 'Veuillez sélectionner une cuisine');
            return false;
        }

        /* if (!selectedCategoryId) {
             Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
             return false;
         }
     */
        return true;
    };

    const handleSaveProduct = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            let imageUrl = image;

            // Upload image to Cloudinary if it's a local file
            if (image && image.startsWith('file://')) {
                try {
                    imageUrl = await uploadToCloudinary(image, 'products');
                    console.log('Image uploaded to Cloudinary:', imageUrl);
                } catch (cloudinaryError) {
                    console.error('Error uploading image to Cloudinary:', cloudinaryError);
                    Alert.alert('Erreur', 'Échec du téléchargement de l\'image. Veuillez réessayer.');
                    setLoading(false);
                    return;
                }
            }

            // Handle category
            let categoryName = '';
            if (selectedCategoryId) {
                const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
                if (selectedCategory) {
                    categoryName = selectedCategory.name;
                } else {
                    console.log('Selected category not found, using empty category name');
                }
            } else {
                console.log('No category selected, using empty category name');
            }

            // Parse prices
            const priceNum = Number(price);
            let discountPriceNum = null;

            // Only set discountPrice if it's a valid number and less than the price
            if (discountPrice && discountPrice.trim() && !isNaN(Number(discountPrice))) {
                const discountNum = Number(discountPrice);
                if (discountNum < priceNum) {
                    discountPriceNum = discountNum;
                }
            }

            // Prepare product data including variations and addons
            const productData = {
                name,
                price: priceNum,
                discountPrice: discountPriceNum,
                description,
                image: imageUrl,
                isVeg,
                isAvailable,
                cuisineId: selectedCuisineId,
                category: categoryName,
                variations: variations,
                addons: addons,
            };

            console.log('Product data being saved:', JSON.stringify(productData, null, 2));

            // Continue with update/add operations
            if (editMode && currentProduct) {
                // Update existing product
                try {
                    const success = await updateProduct(
                        currentProduct.id,
                        productData,
                        undefined
                    );

                    if (success) {
                        // Update local state
                        setProducts(products.map(p =>
                            p.id === currentProduct.id
                                ? {
                                    ...p,
                                    ...productData,
                                    id: currentProduct.id
                                }
                                : p
                        ));
                        Alert.alert('Succès', 'Produit mis à jour avec succès');
                    } else {
                        throw new Error('Failed to update product');
                    }
                } catch (error) {
                    console.error('Error updating product:', error);
                    Alert.alert('Erreur', 'Échec de la mise à jour du produit. Veuillez réessayer.');
                    setLoading(false);
                    return;
                }
            } else {
                // Add new product
                try {
                    const newProductId = await addProduct(productData, imageUrl);

                    if (newProductId) {
                        // Add to local state including variations and addons
                        // @ts-ignore
                        setProducts([
                            ...products,
                            {
                                id: newProductId,
                                ...productData,
                                rating: 0,
                                reviewCount: 0,
                                subCategory: '',
                            }
                        ]);
                        Alert.alert('Succès', 'Produit ajouté avec succès');
                    } else {
                        throw new Error('Failed to add product');
                    }
                } catch (error) {
                    console.error('Error adding product:', error);
                    Alert.alert('Erreur', 'Échec de l\'ajout du produit. Veuillez réessayer.');
                    setLoading(false);
                    return;
                }
            }

            setModalVisible(false);
            resetForm();
        } catch (error) {
            console.error('Error in handleSaveProduct:', error, error.stack);
            Alert.alert('Erreur', 'Une erreur inattendue s\'est produite. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };
    const getCuisineName = (cuisineId: string | null) => {
        if (!cuisineId) return 'Aucune';
        const cuisine = cuisines.find(c => c.id === cuisineId);
        return cuisine ? cuisine.name : 'Inconnue';
    };

    const getCategoryName = (categoryId: string | null) => {
        if (!categoryId) return 'Aucune';
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : 'Inconnue';
    };

    const getDiscountPercentage = (price: number, discountPrice: number) => {
        if (!price || !discountPrice || discountPrice >= price) return null;
        const discount = Math.round(((price - discountPrice) / price) * 100);
        return discount > 0 ? discount : null;
    };

    const filteredProducts = products.filter(product => {
        // Filtre par cuisine
        if (selectedCuisineFilter && product.cuisineId !== selectedCuisineFilter) {
            return false;
        }

        // Filtre végétarien
        if (vegFilter !== null && product.isVeg !== vegFilter) {
            return false;
        }

        return true;
    });

    const renderItem = ({item}: { item: Product }) => {
        const discountPercentage = getDiscountPercentage(
            item.price, // Original price
            item.discountPrice // Discounted price
        );

        // @ts-ignore
        return (
            <View className="bg-white rounded-xl overflow-hidden mb-4 shadow-md">
                <View className="relative">
                    {item.image ? (
                        <Image
                            source={{uri: item.image}}
                            className="w-full h-48"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-48 bg-gray-200 justify-center items-center">
                            <Feather name="image" size={48} color={COLORS.gray.DEFAULT}/>
                        </View>
                    )}

                    {/* Indicateur Végétarien/Non-Végétarien */}
                    <View
                        className="absolute top-3 left-3 p-1 rounded-lg shadow-sm"
                        style={{backgroundColor: item.isVeg ? COLORS.success : COLORS.error}}
                    >
                        <Text className="text-white text-xs px-2 py-1 font-medium" style={{fontFamily: FONTS.medium}}>
                            {item.isVeg ? 'VÉG' : 'NON-VÉG'}
                        </Text>
                    </View>

                    {/* Badge de disponibilité */}
                    <View
                        className="absolute top-3 right-3 p-1 rounded-lg shadow-sm"
                        style={{backgroundColor: item.isAvailable ? COLORS.success : COLORS.error}}
                    >
                        <Text className="text-white text-xs px-2 py-1 font-medium"
                              style={{fontFamily: FONTS.medium}}>
                            {item.isAvailable ? 'DISPONIBLE' : 'ÉPUISÉ'}
                        </Text>
                    </View>

                    {/* Badge de réduction (move down if isAvailable badge is shown) */}
                    {discountPercentage && (
                        <View
                            className="absolute top-12 right-3 p-1 rounded-lg shadow-sm"
                            style={{backgroundColor: COLORS.primary.DEFAULT}}
                        >
                            <Text className="text-white text-xs px-2 py-1 font-medium"
                                  style={{fontFamily: FONTS.medium}}>
                                -{discountPercentage}%
                            </Text>
                        </View>
                    )}

                    {/* Nom du produit sur l'image */}
                    <BlurView intensity={80} className="absolute bottom-0 w-full p-3">
                        <Text
                            className="text-lg font-bold text-white"
                            style={{fontFamily: FONTS.semiBold}}
                        >
                            {item.name}
                        </Text>
                    </BlurView>
                </View>

                <View className="p-4">
                    {item.description && (
                        <Text
                            className="text-gray-700 mb-3"
                            style={{fontFamily: FONTS.regular}}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}

                    <View className="flex-row items-center mb-3">
                        <View className="flex-row flex-wrap">
                            <View className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-1">
                                <Text className="text-gray-600 text-xs" style={{fontFamily: FONTS.medium}}>
                                    {getCuisineName(item.cuisineId)}
                                </Text>
                            </View>
                            <View className="bg-gray-100 px-3 py-1 rounded-full mb-1">
                                <Text className="text-gray-600 text-xs" style={{fontFamily: FONTS.medium}}>
                                    {item.category}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center">
                            {/* Show discounted price as main price if available */}
                            <Text
                                className="text-lg font-bold"
                                style={{fontFamily: FONTS.bold, color: COLORS.primary.DEFAULT}}
                            >
                                {(item.discountPrice || item.price).toFixed(2).replace('.', ',')
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}€
                            </Text>

                            {/* Show original price as strikethrough if discount available */}
                            {item.discountPrice && item.discountPrice < item.price && (
                                <Text
                                    className="text-gray-500 ml-2 line-through text-sm"
                                    style={{fontFamily: FONTS.regular}}
                                >
                                    {item.price.toFixed(2).replace('.', ',')
                                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}€
                                </Text>
                            )}
                        </View>

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => handleEditProduct(item)}
                                className="mr-2 p-3 rounded-full"
                                style={{backgroundColor: COLORS.info}}
                            >
                                <Feather name="edit-2" size={16} color="white"/>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDeleteProduct(item.id)}
                                className="p-3 rounded-full"
                                style={{backgroundColor: COLORS.error}}
                            >
                                <Feather name="trash-2" size={16} color="white"/>
                            </TouchableOpacity>
                        </View>
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
                            style={{fontFamily: FONTS.semiBold}}
                        >
                            Sélectionner une cuisine
                        </Text>

                        <TouchableOpacity onPress={() => setCuisineModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT}/>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={cuisines}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
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
                                    style={{fontFamily: FONTS.medium}}
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

    // Modale de sélection de catégorie
    const renderCategoryModal = () => {
        if (!categoryModalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-20">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md max-h-96">

                    <View className="flex-row justify-between items-center mb-4">
                        <Text
                            className="text-xl font-semibold"
                            style={{fontFamily: FONTS.semiBold}}
                        >
                            Sélectionner une catégorie
                        </Text>

                        <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT}/>
                        </TouchableOpacity>
                    </View>


                    {filteredCategories.length > 0 ? (
                        <FlatList
                            data={filteredCategories}
                            keyExtractor={(item) => item.id}
                            renderItem={({item}) => (
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
                                        style={{fontFamily: FONTS.medium}}
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
                                style={{fontFamily: FONTS.medium}}
                            >
                                {selectedCuisineId
                                    ? "Aucune catégorie trouvée pour cette cuisine"
                                    : "Veuillez d'abord sélectionner une cuisine"}
                            </Text>
                        </View>
                    )}
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
                            style={{fontFamily: FONTS.semiBold}}
                        >
                            Filtrer les produits
                        </Text>

                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Feather name="x" size={24} color={COLORS.gray.DEFAULT}/>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-4">
                        <Text
                            className="text-gray-700 mb-2"
                            style={{fontFamily: FONTS.medium}}
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
                                style={{fontFamily: FONTS.regular}}
                                className={selectedCuisineFilter ? "text-gray-800" : "text-gray-400"}
                            >
                                {selectedCuisineFilter ? getCuisineName(selectedCuisineFilter) : "Toutes les cuisines"}
                            </Text>
                            <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT}/>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-6">
                        <Text
                            className="text-gray-700 mb-2"
                            style={{fontFamily: FONTS.medium}}
                        >
                            Type de produit
                        </Text>
                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => setVegFilter(null)}
                                className={`p-3 rounded-xl mr-2 ${vegFilter === null ? 'bg-primary-100 border border-primary-600' : 'bg-gray-100'}`}
                            >
                                <Text
                                    className={`${vegFilter === null ? 'text-primary-600' : 'text-gray-700'}`}
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Tous
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setVegFilter(true)}
                                className={`p-3 rounded-xl mr-2 ${vegFilter === true ? 'bg-primary-100 border border-primary-600' : 'bg-gray-100'}`}
                            >
                                <Text
                                    className={`${vegFilter === true ? 'text-primary-600' : 'text-gray-700'}`}
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Végétarien
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setVegFilter(false)}
                                className={`p-3 rounded-xl ${vegFilter === false ? 'bg-primary-100 border border-primary-600' : 'bg-gray-100'}`}
                            >
                                <Text
                                    className={`${vegFilter === false ? 'text-primary-600' : 'text-gray-700'}`}
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Non-végétarien
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row justify-end space-x-3">
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedCuisineFilter(null);
                                setVegFilter(null);
                                setFilterModalVisible(false);
                            }}
                            className="px-5 py-3 rounded-xl"
                            style={{
                                backgroundColor: COLORS.gray.light,
                            }}
                        >
                            <Text
                                className="text-gray-700"
                                style={{fontFamily: FONTS.medium}}
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
                                style={{fontFamily: FONTS.medium}}
                            >
                                Appliquer
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Modale de produit
    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4 z-10">
                <View className="bg-white w-full rounded-2xl p-6 max-w-md max-h-[90%]">
                    {loading ? (
                        <View className="items-center justify-center py-10">
                            <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
                            <Text className="mt-4 text-gray-600" style={{fontFamily: FONTS.medium}}>
                                {editMode ? 'Mise à jour du produit...' : 'Ajout du produit...'}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="flex-row justify-between items-center mb-6">
                                <Text
                                    className="text-xl font-semibold"
                                    style={{fontFamily: FONTS.semiBold}}
                                >
                                    {editMode ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
                                </Text>

                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Feather name="x" size={24} color={COLORS.gray.DEFAULT}/>
                                </TouchableOpacity>
                            </View>

                            {/* Image Picker (existing code) */}
                            <TouchableOpacity
                                onPress={pickImage}
                                className="w-full h-48 rounded-xl mb-4 justify-center items-center border-2 border-dashed border-gray-300"
                            >
                                {image ? (
                                    <Image
                                        source={{uri: image}}
                                        className="w-full h-full rounded-xl"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="items-center">
                                        <Feather name="image" size={48} color={COLORS.gray.DEFAULT}/>
                                        <Text
                                            className="text-gray-500 mt-2"
                                            style={{fontFamily: FONTS.medium}}
                                        >
                                            Appuyez pour sélectionner une image
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Basic Info (name, prices, etc.) - Existing code */}
                            <View className="mb-4">
                                <Text
                                    className="text-gray-700 mb-1"
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Nom
                                </Text>
                                <TextInput
                                    className="border border-gray-300 rounded-xl p-3"
                                    style={{fontFamily: FONTS.regular}}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Entrez le nom du produit"
                                />
                            </View>

                            <View className="flex-row mb-4">
                                <View className="flex-1 mr-2">
                                    <Text
                                        className="text-gray-700 mb-1"
                                        style={{fontFamily: FONTS.medium}}
                                    >
                                        Prix standard (MAD)
                                    </Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-xl p-3"
                                        style={{fontFamily: FONTS.regular}}
                                        value={price}
                                        onChangeText={setPrice}
                                        placeholder="0,00"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text
                                        className="text-gray-700 mb-1"
                                        style={{fontFamily: FONTS.medium}}
                                    >
                                        Prix réduit (MAD)
                                    </Text>
                                    <TextInput
                                        className="border border-gray-300 rounded-xl p-3"
                                        style={{fontFamily: FONTS.regular}}
                                        value={discountPrice}
                                        onChangeText={setDiscountPrice}
                                        placeholder="0,00 (optionnel)"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                            <View className="mb-4">
                                <Text
                                    className="text-gray-700 mb-1"
                                    style={{fontFamily: FONTS.medium}}
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
                                    placeholder="Entrez la description du produit"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View className="mb-4">
                                <Text
                                    className="text-gray-700 mb-1"
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Cuisine
                                </Text>
                                <TouchableOpacity
                                    className="border border-gray-300 rounded-xl p-3 flex-row justify-between items-center"
                                    onPress={() => setCuisineModalVisible(true)}
                                >
                                    <Text
                                        style={{fontFamily: FONTS.regular}}
                                        className={selectedCuisineId ? "text-gray-800" : "text-gray-400"}
                                    >
                                        {selectedCuisineId ? getCuisineName(selectedCuisineId) : "Sélectionner une cuisine"}
                                    </Text>
                                    <Feather name="chevron-down" size={20} color={COLORS.gray.DEFAULT}/>
                                </TouchableOpacity>
                            </View>

                            {/* Category selection (keep your existing code if needed) */}

                            <View className="mb-6 flex-row items-center justify-between">
                                <Text
                                    className="text-gray-700"
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Végétarien
                                </Text>
                                <Switch
                                    value={isVeg}
                                    onValueChange={setIsVeg}
                                    trackColor={{false: COLORS.gray.light, true: COLORS.success}}
                                    thumbColor={COLORS.white}
                                />
                            </View>
                            <View className="mb-6 flex-row items-center justify-between">
                                <Text
                                    className="text-gray-700"
                                    style={{fontFamily: FONTS.medium}}
                                >
                                    Disponible
                                </Text>
                                <Switch
                                    value={isAvailable}
                                    onValueChange={setIsAvailable}
                                    trackColor={{false: COLORS.gray.light, true: COLORS.success}}
                                    thumbColor={COLORS.white}
                                />
                            </View>

                            {/* NEW SECTION: Variations */}
                            <View className="mb-6">
                                <Text
                                    className="text-xl font-semibold mb-3"
                                    style={{fontFamily: FONTS.semiBold}}
                                >
                                    Variations
                                </Text>

                                {/* List of existing variations */}
                                {variations.map((variation, index) => (
                                    <View key={variation.id} className="flex-row justify-between items-center bg-gray-100 rounded-xl p-3 mb-2">
                                        <View className="flex-1">
                                            <Text className="font-medium" style={{fontFamily: FONTS.medium}}>
                                                {variation.name}
                                            </Text>
                                            <Text className="text-gray-600" style={{fontFamily: FONTS.regular}}>
                                                {variation.price.toFixed(2)} €
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => removeVariation(variation.id)}
                                            className="p-2 rounded-full bg-red-100"
                                        >
                                            <Feather name="trash-2" size={16} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* Add new variation form */}
                                <View className="bg-gray-50 rounded-xl p-3 mb-2">
                                    <Text className="text-gray-700 mb-2" style={{fontFamily: FONTS.medium}}>
                                        Ajouter une variation
                                    </Text>
                                    <View className="mb-2">
                                        <TextInput
                                            className="border border-gray-300 bg-white rounded-xl p-3 mb-2"
                                            style={{fontFamily: FONTS.regular}}
                                            value={newVariationName}
                                            onChangeText={setNewVariationName}
                                            placeholder="Nom de la variation"
                                        />
                                        <View className="flex-row">
                                            <TextInput
                                                className="border border-gray-300 bg-white rounded-xl p-3 flex-1 mr-2"
                                                style={{fontFamily: FONTS.regular}}
                                                value={newVariationPrice}
                                                onChangeText={setNewVariationPrice}
                                                placeholder="Prix (€)"
                                                keyboardType="decimal-pad"
                                            />
                                            <TouchableOpacity
                                                onPress={addVariation}
                                                className="bg-primary-100 rounded-xl px-4 justify-center"
                                            >
                                                <Text
                                                    style={{
                                                        fontFamily: FONTS.medium,
                                                        color: COLORS.primary.DEFAULT
                                                    }}
                                                >
                                                    Ajouter
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* NEW SECTION: Addons/Supplements */}
                            <View className="mb-6">
                                <Text
                                    className="text-xl font-semibold mb-3"
                                    style={{fontFamily: FONTS.semiBold}}
                                >
                                    Suppléments
                                </Text>

                                {/* List of existing addons */}
                                {addons.map((addon, index) => (
                                    <View key={addon.id} className="flex-row justify-between items-center bg-gray-100 rounded-xl p-3 mb-2">
                                        <View className="flex-1">
                                            <Text className="font-medium" style={{fontFamily: FONTS.medium}}>
                                                {addon.name}
                                            </Text>
                                            <Text className="text-gray-600" style={{fontFamily: FONTS.regular}}>
                                                {addon.price.toFixed(2)} €
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => removeAddon(addon.id)}
                                            className="p-2 rounded-full bg-red-100"
                                        >
                                            <Feather name="trash-2" size={16} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* Add new addon form */}
                                <View className="bg-gray-50 rounded-xl p-3 mb-2">
                                    <Text className="text-gray-700 mb-2" style={{fontFamily: FONTS.medium}}>
                                        Ajouter un supplément
                                    </Text>
                                    <View className="mb-2">
                                        <TextInput
                                            className="border border-gray-300 bg-white rounded-xl p-3 mb-2"
                                            style={{fontFamily: FONTS.regular}}
                                            value={newAddonName}
                                            onChangeText={setNewAddonName}
                                            placeholder="Nom du supplément"
                                        />
                                        <View className="flex-row">
                                            <TextInput
                                                className="border border-gray-300 bg-white rounded-xl p-3 flex-1 mr-2"
                                                style={{fontFamily: FONTS.regular}}
                                                value={newAddonPrice}
                                                onChangeText={setNewAddonPrice}
                                                placeholder="Prix (€)"
                                                keyboardType="decimal-pad"
                                            />
                                            <TouchableOpacity
                                                onPress={addAddon}
                                                className="bg-primary-100 rounded-xl px-4 justify-center"
                                            >
                                                <Text
                                                    style={{
                                                        fontFamily: FONTS.medium,
                                                        color: COLORS.primary.DEFAULT
                                                    }}
                                                >
                                                    Ajouter
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Action buttons */}
                            <View className="flex-row justify-end space-x-3 mt-2 mb-4">
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    className="px-5 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: COLORS.gray.light,
                                    }}
                                >
                                    <Text
                                        className="text-gray-700"
                                        style={{fontFamily: FONTS.medium}}
                                    >
                                        Annuler
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSaveProduct}
                                    className="px-5 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: COLORS.primary.DEFAULT,
                                    }}
                                >
                                    <Text
                                        className="text-white"
                                        style={{fontFamily: FONTS.medium}}
                                    >
                                        Enregistrer
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary.DEFAULT}/>
                <Text className="mt-2" style={{fontFamily: FONTS.medium}}>Chargement des produits...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar style="light"/>
            <View className="flex-1 bg-gray-50 px-4 pt-4">
                <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity
                        onPress={handleAddProduct}
                        className="p-4 rounded-xl flex-row items-center justify-center shadow-sm flex-1 mr-2"
                        style={{backgroundColor: COLORS.primary.DEFAULT}}
                    >
                        <Feather name="plus" size={18} color="white"/>
                        <Text
                            className="text-white ml-2 font-medium"
                            style={{fontFamily: FONTS.medium}}
                        >
                            Ajouter un produit
                        </Text>
                    </TouchableOpacity>


                </View>

                {filteredProducts.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Feather name="package" size={64} color={COLORS.gray.DEFAULT}/>
                        <Text
                            className="text-lg text-gray-500 mt-4 text-center"
                            style={{fontFamily: FONTS.medium}}
                        >
                            Aucun produit trouvé
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{paddingBottom: 20}}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>

            {renderModal()}
            {renderCuisineModal()}
            {renderCategoryModal()}
            {renderFilterModal()}
        </>
    );
}