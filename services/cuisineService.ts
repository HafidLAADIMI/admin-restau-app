import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {db, handleFirestoreOperation} from '../lib/config';

import {uploadToCloudinary} from './cloudinaryService';

export interface Cuisine {
    id: string;
    name: string;
    image: string;
    description?: string;
    longDescription?: string;
    restaurantCount?: number;
}

// lib/firebase/cuisineService.ts


/**
 * Récupère toutes les cuisines avec journalisation supplémentaire
 * @returns Array de toutes les cuisines
 */
export const getCuisines = async (): Promise<Cuisine[]> => {
    return handleFirestoreOperation(async () => {
        console.log('Récupération de toutes les cuisines...');
        const cuisinesRef = collection(db, 'cuisines');
        const snapshot = await getDocs(cuisinesRef);

        if (snapshot.empty) {
            console.warn('Aucune cuisine trouvée dans la collection !');
            return [];
        }

        console.log(`${snapshot.docs.length} cuisines trouvées`);

        // Debug: Afficher toutes les cuisines
        snapshot.docs.forEach(doc => {
            console.log(`Document cuisine - ID: ${doc.id}, Nom: ${doc.data().name || 'sans nom'}`);
        });

        const cuisines = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            image: doc.data().image || '',
            description: doc.data().description || '',
        }));

        return cuisines;
    }, []);
};

/**
 * Récupère une cuisine spécifique par ID avec gestion des erreurs améliorée
 * @param cuisineId L'ID de la cuisine à récupérer
 * @returns La cuisine trouvée ou null si non trouvée
 */
export const getCuisineById = async (cuisineId: string): Promise<Cuisine | null> => {
    try {
        console.log(`Récupération de la cuisine avec l'ID: ${cuisineId}`);

        if (!cuisineId) {
            console.error('ID de cuisine invalide fourni');
            return null;
        }

        // Essayer d'abord l'accès direct au document
        const cuisineDoc = doc(db, 'cuisines', cuisineId);
        const snapshot = await getDoc(cuisineDoc);

        if (snapshot.exists()) {
            console.log(`Cuisine trouvée par ID direct: ${cuisineId}`);
            return {
                id: snapshot.id,
                name: snapshot.data().name || '',
                image: snapshot.data().image || '',
                description: snapshot.data().description || '',
                longDescription: snapshot.data().longDescription || '',
                restaurantCount: snapshot.data().restaurantCount || 0
            };
        }

        console.log(`Aucune cuisine trouvée avec l'ID: ${cuisineId}`);
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la cuisine avec l'ID ${cuisineId}:`, error);
        return null;
    }
};

/**
 * Ajoute une nouvelle cuisine en téléchargeant l'image sur Cloudinary
 * @param name Nom de la cuisine
 * @param description Description de la cuisine
 * @param imageUri URI local de l'image à télécharger
 * @returns ID de la nouvelle cuisine créée
 */
export const addCuisine = async (
    name: string,
    description: string,
    imageUrl: string
): Promise<string | null> => {
    try {
        console.log('Début de l\'ajout d\'une cuisine:', { name, description });

        if (!name) {
            console.error('Nom manquant pour ajouter une cuisine');
            return null;
        }

        if (!imageUrl) {
            console.error('URL d\'image manquante pour ajouter une cuisine');
            return null;
        }

        // Créer la référence du document
        const cuisinesRef = collection(db, 'cuisines');
        const newCuisineRef = doc(cuisinesRef);

        // Données à enregistrer
        const cuisineData = {
            name,
            description: description || '',
            image: imageUrl,
            restaurantCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        console.log('Sauvegarde de la cuisine dans Firestore avec ID:', newCuisineRef.id);

        // Sauvegarder dans Firestore
        await setDoc(newCuisineRef, cuisineData);
        console.log(`Nouvelle cuisine créée avec l'ID: ${newCuisineRef.id}`);

        return newCuisineRef.id;
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'une cuisine:', error);
        return null;
    }
};


/**
 * Met à jour une cuisine existante
 * @param cuisineId ID de la cuisine à mettre à jour
 * @param data Données à mettre à jour
 * @param newImageUri Nouvelle image (optionnel)
 * @returns true si la mise à jour a réussi
 */
export const updateCuisine = async (
    cuisineId: string,
    data: Partial<Cuisine>,
    newImageUri?: string
): Promise<boolean> => {
    try {
        console.log('Début de la mise à jour d\'une cuisine:', { cuisineId, data });

        if (!cuisineId) {
            console.error('ID de cuisine manquant pour la mise à jour');
            return false;
        }

        const updateData: any = {
            ...data,
            updatedAt: new Date()
        };

        // Si une nouvelle image est fournie, la télécharger via Cloudinary
        if (newImageUri && newImageUri.startsWith('file://')) {
            console.log(`Téléchargement de la nouvelle image pour la cuisine ${cuisineId}`);
            try {
                updateData.image = await uploadToCloudinary(newImageUri, 'cuisines');
                console.log('Image téléchargée sur Cloudinary:', updateData.image);
            } catch (cloudinaryError) {
                console.error('Erreur lors du téléchargement de l\'image vers Cloudinary:', cloudinaryError);
                throw cloudinaryError; // Propagate the error
            }
        }

        console.log('Mise à jour dans Firestore avec les données:', updateData);

        // Mettre à jour dans Firestore
        const cuisineRef = doc(db, 'cuisines', cuisineId);
        await updateDoc(cuisineRef, updateData);
        console.log(`Cuisine ${cuisineId} mise à jour avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la cuisine ${cuisineId}:`, error);
        return false;
    }
};

/**
 * Supprime une cuisine
 * @param cuisineId ID de la cuisine à supprimer
 * @returns true si la suppression a réussi
 */
export const deleteCuisine = async (cuisineId: string): Promise<boolean> => {
    try {
        if (!cuisineId) {
            console.error('ID de cuisine manquant pour la suppression');
            return false;
        }

        // Supprimer de Firestore
        const cuisineRef = doc(db, 'cuisines', cuisineId);
        await deleteDoc(cuisineRef);
        console.log(`Cuisine ${cuisineId} supprimée avec succès`);

        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la cuisine ${cuisineId}:`, error);
        return false;
    }
};