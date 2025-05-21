// lib/firebase/productService.ts
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, Product } from './config';
import { getCategoryById } from './categoryService';

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
                id: doc.id,
                name: data.name || '',
                price: data.price || 0,
                originalPrice: data.originalPrice || data.price || 0,
                discountedPrice: data.discountedPrice || data.price || 0,
                description: data.description || '',
                image: data.image || '',
                rating: data.rating || 0,
                reviewCount: data.reviewCount || 0,
                category: data.category || '',
                subCategory: data.subCategory || '',
                isVeg: data.isVeg || false,
                cuisineId: data.cuisineId || ''
            };
        });

        return products;
    } catch (error) {
        console.error(`Erreur lors de la récupération des produits pour la cuisine ${cuisineId}:`, error);
        return [];
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