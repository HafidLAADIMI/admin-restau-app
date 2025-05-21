// lib/firebase/cuisineService.ts
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreOperation, Cuisine } from './config';

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
            restaurantCount: doc.data().restaurantCount || 0
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