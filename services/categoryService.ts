// lib/firebase/categoryService.ts
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreOperation, Category } from './config';
import { getCuisineById } from './cuisineService';

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