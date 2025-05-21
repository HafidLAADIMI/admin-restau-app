// lib/firebase/productService.ts
import { collection, doc, getDocs, getDoc, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/config';
import { getCategoryById } from './categoryService';
import { uploadToCloudinary } from './cloudinaryService';

export interface Product {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    description: string;
    image: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    subCategory?: string;
    isVeg: boolean;
    isAvailable: boolean;
    cuisineId: string;
    variations?: Array<{id: string; name: string; price: number}>;
    addons?: Array<{id: string; name: string; price: number}>;
    createdAt:Date,
    updatedAt:Date
}

/**
 * Récupère les produits par ID de cuisine avec filtrage approprié
 * @param cuisineId L'ID de la cuisine
 * @returns Array des produits associés à la cuisine
 */
export const getProductsByCuisine = async (cuisineId: string): Promise<Product[]> => {
    try {
        console.log(`Récupération des produits pour la cuisine ID: ${cuisineId}`);

        if (!cuisineId) {
            console.error('ID de cuisine invalide fourni');
            return [];
        }

        // Requête des produits par champ cuisineId
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('cuisineId', '==', cuisineId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn(`Aucun produit trouvé pour la cuisine ID: ${cuisineId}`);
            return [];
        }

        console.log(`${snapshot.docs.length} produits trouvés pour la cuisine ${cuisineId}`);

        // Mapper les produits à un format cohérent
        const products = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id:doc.id,
                name: data.name,
                price: data.price || 0,
                discountPrice: data.discountPrice || null,
                description: data.description || '',
                image: data.image,
                rating: 0,
                reviewCount: 0,
                category: data.category || '',
                subCategory: data.subCategory || '',
                isVeg: data.isVeg || false,
                isAvailable: data.isAvailable || false,
                cuisineId: data.cuisineId,
                variations: data.variations || [],
                addons: data.addons || [],
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };
        });

        return products;
    } catch (error) {
        console.error(`Erreur lors de la récupération des produits pour la cuisine ${cuisineId}:`, error);
        return [];
    }
};

/**
 * Récupère un produit spécifique par ID
 * @param productId ID du produit
 * @returns Le produit ou null si non trouvé
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
    try {
        console.log(`Récupération du produit avec l'ID: ${productId}`);

        if (!productId) {
            console.error('ID de produit invalide fourni');
            return null;
        }

        const productDoc = doc(db, 'products', productId);
        const snapshot = await getDoc(productDoc);

        if (snapshot.exists()) {
            console.log(`Produit trouvé par ID direct: ${productId}`);
            const data = snapshot.data();
            return {
                id:data.id,
                name: data.name,
                price: data.price || 0,
                discountPrice: data.discountPrice || null,
                description: data.description || '',
                image: data.image,
                rating: 0,
                reviewCount: 0,
                category: data.category || '',
                subCategory: data.subCategory || '',
                isVeg: data.isVeg || false,
                isAvailable: data.isAvailable || false,
                cuisineId: data.cuisineId,
                variations: data.variations || [],
                addons: data.addons || [],
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };
        }

        console.log(`Aucun produit trouvé avec l'ID: ${productId}`);
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération du produit avec l'ID ${productId}:`, error);
        return null;
    }
};

/**
 * Récupère les produits par catégorie
 * @param categoryId L'ID de la catégorie
 * @returns Array des produits associés à la catégorie
 */
export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
    try {
        console.log(`Récupération des produits pour la catégorie ID: ${categoryId}`);

        if (!categoryId) {
            console.error('ID de catégorie invalide fourni');
            return [];
        }

        // D'abord, obtenir la catégorie pour trouver son cuisineId associé
        const category = await getCategoryById(categoryId);

        if (!category || !category.cuisineId) {
            console.error(`Aucun ID de cuisine valide trouvé pour la catégorie: ${categoryId}`);
            return [];
        }

        const cuisineId = category.cuisineId;
        console.log(`ID de cuisine associé trouvé: ${cuisineId} pour la catégorie: ${categoryId}`);

        // Maintenant récupérer les produits par cuisineId
        const products = await getProductsByCuisine(cuisineId);

        // Filtrer pour ne garder que les produits de cette catégorie
        return products.filter(product => product.category === category.name);
    } catch (error) {
        console.error(`Erreur lors de la récupération des produits pour la catégorie ${categoryId}:`, error);
        return [];
    }
};

/**
 * Ajoute un nouveau produit en téléchargeant l'image sur Cloudinary
 * @param productData Données du produit
 * @param imageUri URI local de l'image à télécharger
 * @returns ID du nouveau produit créé
 */
export const addProduct = async (
    productData: Partial<Product>,
    imageUrl: string
): Promise<string | null> => {
    try {
        // Validate required fields
        if (!productData.name) {
            console.error('Nom de produit manquant');
            return null;
        }

        if (!productData.cuisineId) {
            console.error('ID de cuisine manquant');
            return null;
        }

        if (!imageUrl) {
            console.error('URL d\'image manquante');
            return null;
        }

        console.log('Ajout d\'un nouveau produit avec les données:', JSON.stringify(productData, null, 2));

        // Créer la référence du document
        const productsRef = collection(db, 'products');
        const newProductRef = doc(productsRef);

        // Ensure all fields match the schema
        const productToSave = {
            name: productData.name,
            price: productData.price || 0,
            discountPrice: productData.discountPrice || null,
            description: productData.description || '',
            image: imageUrl,
            rating: 0,
            reviewCount: 0,
            category: productData.category || '',
            subCategory: productData.subCategory || '',
            isVeg: productData.isVeg || false,
            isAvailable: productData.isAvailable || false,
            cuisineId: productData.cuisineId,
            variations: productData.variations || [],
            addons: productData.addons || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Sauvegarder dans Firestore
        await setDoc(newProductRef, productToSave);
        console.log(`Nouveau produit créé avec l'ID: ${newProductRef.id}`);

        return newProductRef.id;
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'un produit:', error);
        return null;
    }
};
/**
 * Met à jour un produit existant
 * @param productId ID du produit à mettre à jour
 * @param data Données à mettre à jour
 * @param newImageUri Nouvelle image (optionnel)
 * @returns true si la mise à jour a réussi
 */
export const updateProduct = async (
    productId: string,
    data: Partial<Product>,
    newImageUri?: string
): Promise<boolean> => {
    try {
        if (!productId) {
            console.error('ID de produit manquant pour la mise à jour');
            return false;
        }

        console.log('Début de la mise à jour du produit:', { productId, data });

        // Create a clean object without undefined values
        const updateData: any = {
            updatedAt: new Date()
        };

        // Only add defined properties
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (typeof data.price === 'number') updateData.price = data.price;
        if (data.discountPrice !== undefined) updateData.discountPrice = data.discountPrice;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.subCategory !== undefined) updateData.subCategory = data.subCategory;
        if (data.cuisineId !== undefined) updateData.cuisineId = data.cuisineId;

        // Boolean values need special handling
        if (typeof data.isVeg === 'boolean') updateData.isVeg = data.isVeg;
        if (typeof data.isAvailable === 'boolean') updateData.isAvailable = data.isAvailable;

        // Arrays require different handling
        if (Array.isArray(data.variations)) updateData.variations = data.variations;
        if (Array.isArray(data.addons)) updateData.addons = data.addons;

        // Fix for the discountPrice field - if it exists in the data
        if (data.discountPrice !== undefined) {
            updateData.discountedPrice = data.discountPrice;

            // Remove the property to avoid duplicate fields
            delete data.discountPrice;
        }

        // Si une nouvelle image est fournie, la télécharger
        if (newImageUri && newImageUri.startsWith('file://')) {
            console.log(`Téléchargement de la nouvelle image pour le produit ${productId}`);
            try {
                updateData.image = await uploadToCloudinary(newImageUri, 'products');
                console.log('Image téléchargée sur Cloudinary:', updateData.image);
            } catch (cloudinaryError) {
                console.error('Erreur lors du téléchargement de l\'image vers Cloudinary:', cloudinaryError);
                throw cloudinaryError;
            }
        } else if (data.image) {
            updateData.image = data.image;
        }

        console.log('Données finales pour la mise à jour (sans undefined):', updateData);

        // Mettre à jour dans Firestore
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, updateData);
        console.log(`Produit ${productId} mis à jour avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du produit ${productId}:`, error);
        return false;
    }
};
/**
 * Supprime un produit
 * @param productId ID du produit à supprimer
 * @returns true si la suppression a réussi
 */
export const deleteProduct = async (productId: string): Promise<boolean> => {
    try {
        if (!productId) {
            console.error('ID de produit manquant pour la suppression');
            return false;
        }

        // Supprimer de Firestore
        const productRef = doc(db, 'products', productId);
        await deleteDoc(productRef);
        console.log(`Produit ${productId} supprimé avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression du produit ${productId}:`, error);
        return false;
    }
};