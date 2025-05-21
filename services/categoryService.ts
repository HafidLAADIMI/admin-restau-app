import {uploadToCloudinary} from './cloudinaryService';
import {collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc} from 'firebase/firestore';
import {db, handleFirestoreOperation} from '../lib/config';
import {getCuisineById} from './cuisineService';

/**
 * Récupère toutes les catégories avec journalisation supplémentaire
 * @returns Array de toutes les catégories
 */

export interface Category {
    id: string;
    name: string;
    image: string;
    description?: string;
    cuisineId: string | null;
    itemCount?: number;
}

// lib/firebase/categoryService.ts


/**
 * Récupère toutes les catégories avec journalisation supplémentaire
 * @returns Array de toutes les catégories
 */
export const getCategories = async (): Promise<Category[]> => {
    return handleFirestoreOperation(async () => {
        console.log('Récupération de toutes les catégories...');
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(categoriesRef);

        if (snapshot.empty) {
            console.warn('Aucune catégorie trouvée dans la collection !');
            return [];
        }

        console.log(`${snapshot.docs.length} catégories trouvées`);

        // Debug: Afficher toutes les catégories
        snapshot.docs.forEach(doc => {
            console.log(`Document catégorie - ID: ${doc.id}, Nom: ${doc.data().name || 'sans nom'}`);
        });

        const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            image: doc.data().image || '',
            description: doc.data().description || '',
            cuisineId: doc.data().cuisineId || null,
            itemCount: doc.data().itemCount || 0
        }));

        return categories;
    }, []);
};

/**
 * Récupère une catégorie spécifique par ID avec gestion des erreurs améliorée
 * @param categoryId L'ID de la catégorie à récupérer
 * @returns La catégorie trouvée ou null si non trouvée
 */
export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
    try {
        console.log(`Récupération de la catégorie avec l'ID: ${categoryId}`);

        if (!categoryId) {
            console.error('ID de catégorie invalide fourni');
            return null;
        }

        const categoryDoc = doc(db, 'categories', categoryId);
        const snapshot = await getDoc(categoryDoc);

        if (snapshot.exists()) {
            console.log(`Catégorie trouvée par ID direct: ${categoryId}`);
            const data = snapshot.data();
            return {
                id: snapshot.id,
                name: data.name || '',
                image: data.image || '',
                description: data.description || '',
                cuisineId: data.cuisineId || null,
                itemCount: data.itemCount || 0
            };
        }

        console.log(`Aucune catégorie trouvée avec l'ID: ${categoryId}`);
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la catégorie avec l'ID ${categoryId}:`, error);
        return null;
    }
};

/**
 * Récupère la cuisine associée à une catégorie
 * @param categoryId L'ID de la catégorie
 * @returns La cuisine associée ou null
 */
export const getCuisineFromCategory = async (categoryId: string) => {
    try {
        console.log(`Récupération de la cuisine pour la catégorie ID: ${categoryId}`);

        // D'abord obtenir la catégorie pour trouver l'ID de cuisine
        const category = await getCategoryById(categoryId);

        if (!category || !category.cuisineId) {
            console.error(`Aucun ID de cuisine valide trouvé pour la catégorie: ${categoryId}`);
            return null;
        }

        const cuisineId = category.cuisineId;
        console.log(`ID de cuisine trouvé: ${cuisineId} pour la catégorie: ${categoryId}`);

        // Maintenant obtenir les détails de la cuisine
        return await getCuisineById(cuisineId);
    } catch (error) {
        console.error(`Erreur lors de la récupération de la cuisine pour la catégorie ${categoryId}:`, error);
        return null;
    }
};

/**
 * Ajoute une nouvelle catégorie en téléchargeant l'image sur Cloudinary
 * @param name Nom de la catégorie
 * @param description Description de la catégorie
 * @param cuisineId ID de la cuisine associée
 * @param imageUri URI local de l'image à télécharger
 * @returns ID de la nouvelle catégorie créée
 */
export const addCategory = async (
    name: string,
    description: string,
    cuisineId: string,
    imageUrl: string
): Promise<string | null> => {
    try {
        console.log('Début de l\'ajout d\'une catégorie:', { name, description, cuisineId });

        if (!name) {
            console.error('Nom manquant pour ajouter une catégorie');
            return null;
        }

        if (!cuisineId) {
            console.error('ID de cuisine manquant pour ajouter une catégorie');
            return null;
        }

        if (!imageUrl) {
            console.error('URL d\'image manquante pour ajouter une catégorie');
            return null;
        }

        // Créer la référence du document
        const categoriesRef = collection(db, 'categories');
        const newCategoryRef = doc(categoriesRef);

        // Données à enregistrer
        const categoryData = {
            name,
            description: description || '',
            image: imageUrl,
            cuisineId,
            itemCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Sauvegarde de la catégorie dans Firestore avec ID:', newCategoryRef.id);

        // Sauvegarder dans Firestore
        await setDoc(newCategoryRef, categoryData);
        console.log(`Nouvelle catégorie créée avec l'ID: ${newCategoryRef.id}`);

        return newCategoryRef.id;
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'une catégorie:', error);
        return null;
    }
};

/**
 * Met à jour une catégorie existante
 * @param categoryId ID de la catégorie à mettre à jour
 * @param data Données à mettre à jour
 * @param newImageUri Nouvelle image (optionnel)
 * @returns true si la mise à jour a réussi
 */
export const updateCategory = async (
    categoryId: string,
    data: Partial<Category>,
    newImageUri?: string
): Promise<boolean> => {
    try {
        console.log('Début de la mise à jour d\'une catégorie:', { categoryId, data });

        if (!categoryId) {
            console.error('ID de catégorie manquant pour la mise à jour');
            return false;
        }

        const updateData: any = {
            ...data,
            updatedAt: new Date()
        };

        // Si une nouvelle image est fournie, la télécharger via Cloudinary
        if (newImageUri && newImageUri.startsWith('file://')) {
            console.log(`Téléchargement de la nouvelle image pour la catégorie ${categoryId}`);
            try {
                updateData.image = await uploadToCloudinary(newImageUri, 'categories');
                console.log('Image téléchargée sur Cloudinary:', updateData.image);
            } catch (cloudinaryError) {
                console.error('Erreur lors du téléchargement de l\'image vers Cloudinary:', cloudinaryError);
                throw cloudinaryError; // Propager l'erreur
            }
        }

        console.log('Mise à jour dans Firestore avec les données:', updateData);

        // Mettre à jour dans Firestore
        const categoryRef = doc(db, 'categories', categoryId);
        await updateDoc(categoryRef, updateData);
        console.log(`Catégorie ${categoryId} mise à jour avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la catégorie ${categoryId}:`, error);
        return false;
    }
};
/**
 * Supprime une catégorie
 * @param categoryId ID de la catégorie à supprimer
 * @returns true si la suppression a réussi
 */
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
        if (!categoryId) {
            console.error('ID de catégorie manquant pour la suppression');
            return false;
        }

        // Supprimer de Firestore
        const categoryRef = doc(db, 'categories', categoryId);
        await deleteDoc(categoryRef);
        console.log(`Catégorie ${categoryId} supprimée avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la catégorie ${categoryId}:`, error);
        return false;
    }
};