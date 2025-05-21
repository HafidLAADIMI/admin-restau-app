// lib/firebase/orderService.ts
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    increment
} from 'firebase/firestore';
import { db } from './../lib/config';

export interface Order {
    id: string;
    userId: string;
    driverId?: string;
    customerName: string;
    customerPhone: string;
    address: string;
    coordinates: { latitude: number; longitude: number };
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    total: number;
    eta?: string;
    distance?: string;
    note?: string;
    items: { id?: string; name: string; quantity: number; price: number }[];
    createdAt: any;
    updatedAt: any;
}

export interface OrderDeliveryData {
    receivedBy: string;
    notes: string;
    amountCollected: number;
    signatureUrl: string | null;
    proofOfDeliveryUrl: string | null;
    deliveredAt: Date;
    deliveredBy: string;
    deliverymanName: string;
}

/**
 * Récupère toutes les commandes
 * @returns Array de toutes les commandes
 */
export const getOrders = async (): Promise<Order[]> => {
    try {
        console.log("[getOrders] Tentative de récupération des commandes...");

        // Essayer d'abord une requête de groupe de collections
        try {
            const q = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);

            // Traiter et valider les résultats
            const all: Order[] = snap.docs.map((d) => {
                const maybeUserDoc = d.ref.parent.parent;
                const userId =
                    maybeUserDoc?.id ??
                    (d.data().userId as string | undefined) ??
                    'unknown';

                const data = d.data() as Omit<Order, 'id' | 'userId'>;

                // Valider les coordonnées
                let coordinates = { latitude: 0, longitude: 0 };
                if (data.coordinates &&
                    typeof data.coordinates.latitude === 'number' &&
                    typeof data.coordinates.longitude === 'number') {
                    coordinates = {
                        latitude: data.coordinates.latitude,
                        longitude: data.coordinates.longitude
                    };
                }

                // Valider le tableau d'articles
                const items = Array.isArray(data.items) ? data.items.map(item => ({
                    id: item.id || undefined,
                    name: item.name || '',
                    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                    price: typeof item.price === 'number' ? item.price : 0
                })) : [];

                // Retourner l'objet de commande validé
                return {
                    id: d.id,
                    userId,
                    driverId: data.driverId,
                    customerName: data.customerName || '',
                    customerPhone: data.customerPhone || '',
                    address: data.address || '',
                    coordinates,
                    status: data.status || 'pending',
                    total: typeof data.total === 'number' ? data.total : 0,
                    eta: data.eta || '',
                    distance: data.distance || '',
                    note: data.note || '',
                    items,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt || data.createdAt
                };
            });

            console.log(`[getOrders] ${all.length} commandes récupérées`);
            return all;

        } catch (groupQueryError) {
            // Recours : récupérer les utilisateurs puis leurs commandes
            console.log('[getOrders] La requête de groupe a échoué, recours à la récupération utilisateur par utilisateur');
            console.error(groupQueryError);

            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);

            // Tableau pour contenir toutes les commandes
            let allOrders: Order[] = [];

            // Pour chaque utilisateur, récupérer ses commandes
            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const ordersRef = collection(db, 'users', userId, 'orders');

                try {
                    const q = query(ordersRef);
                    const ordersSnap = await getDocs(q);

                    // Traiter et valider chaque commande
                    const userOrders = ordersSnap.docs.map(d => {
                        const data = d.data();

                        // Valider les coordonnées
                        let coordinates = { latitude: 0, longitude: 0 };
                        if (data.coordinates &&
                            typeof data.coordinates.latitude === 'number' &&
                            typeof data.coordinates.longitude === 'number') {
                            coordinates = {
                                latitude: data.coordinates.latitude,
                                longitude: data.coordinates.longitude
                            };
                        }

                        // Valider le tableau d'articles
                        const items = Array.isArray(data.items) ? data.items.map(item => ({
                            id: item.id || undefined,
                            name: item.name || '',
                            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                            price: typeof item.price === 'number' ? item.price : 0
                        })) : [];

                        return {
                            id: d.id,
                            userId,
                            driverId: data.driverId,
                            customerName: data.customerName || '',
                            customerPhone: data.customerPhone || '',
                            address: data.address || '',
                            coordinates,
                            status: data.status || 'pending',
                            total: typeof data.total === 'number' ? data.total : 0,
                            eta: data.eta || '',
                            distance: data.distance || '',
                            note: data.note || '',
                            items,
                            createdAt: data.createdAt,
                            updatedAt: data.updatedAt || data.createdAt
                        };
                    });

                    allOrders = [...allOrders, ...userOrders];
                } catch (error) {
                    console.error(`[getOrders] Erreur lors de la récupération des commandes pour l'utilisateur ${userId}:`, error);
                }
            }

            // Trier toutes les commandes par createdAt
            allOrders.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
                const dateB = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });

            console.log(`[getOrders] ${allOrders.length} commandes récupérées (méthode de recours)`);
            return allOrders;
        }
    } catch (err: any) {
        console.error('[getOrders] échec:', err);
        return [];
    }
};

/**
 * Récupère une commande spécifique
 * @param userId ID de l'utilisateur
 * @param orderId ID de la commande
 * @returns La commande trouvée ou null
 */
export const getOrderOnce = async (userId: string, orderId: string): Promise<Order | null> => {
    try {
        console.log(`[getOrderOnce] Récupération de la commande ${orderId} pour l'utilisateur ${userId}`);

        if (!userId || !orderId) {
            console.error('[getOrderOnce] ID utilisateur ou ID commande manquant');
            return null;
        }

        const orderRef = doc(db, 'users', userId, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            console.error('[getOrderOnce] Commande non trouvée');
            return null;
        }

        const data = orderSnap.data();

        // Valider les coordonnées
        let coordinates = { latitude: 0, longitude: 0 };
        if (data.coordinates &&
            typeof data.coordinates.latitude === 'number' &&
            typeof data.coordinates.longitude === 'number') {
            coordinates = {
                latitude: data.coordinates.latitude,
                longitude: data.coordinates.longitude
            };
        } else {
            console.warn(`[getOrderOnce] Coordonnées invalides pour la commande ${orderId}`);
        }

        // Valider le tableau d'articles
        const items = Array.isArray(data.items) ? data.items.map(item => ({
            id: item.id || undefined,
            name: item.name || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            price: typeof item.price === 'number' ? item.price : 0
        })) : [];

        // Retourner l'objet de commande validé
        const order: Order = {
            id: orderId,
            userId,
            driverId: data.driverId,
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            address: data.address || '',
            coordinates,
            status: data.status || 'pending',
            total: typeof data.total === 'number' ? data.total : 0,
            eta: data.eta || '',
            distance: data.distance || '',
            note: data.note || '',
            items,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || data.createdAt
        };

        console.log(`[getOrderOnce] Commande ${orderId} récupérée avec succès`);
        return order;
    } catch (err: any) {
        console.error(`[getOrderOnce] Échec de la récupération de la commande ${orderId}:`, err);
        return null;
    }
};

/**
 * Met à jour le statut d'une commande
 * @param userId ID de l'utilisateur
 * @param orderId ID de la commande
 * @param status Nouveau statut
 * @param deliveryData Données de livraison (optionnel)
 * @returns true si la mise à jour est réussie
 */
export const updateOrderStatus = async (
    userId: string,
    orderId: string,
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled',
    deliveryData?: OrderDeliveryData
): Promise<boolean> => {
    try {
        const orderRef = doc(db, 'users', userId, 'orders', orderId);

        const updateData: any = {
            status,
            updatedAt: serverTimestamp()
        };

        // Si des données de livraison sont fournies (pour les commandes terminées)
        if (status === 'completed' && deliveryData) {
            updateData.deliveryDetails = {
                ...deliveryData,
                deliveredAt: serverTimestamp()
            };
        }

        await updateDoc(orderRef, updateData);

        // Incrémenter le nombre de livraisons complétées du livreur si le statut est complété
        if (status === 'completed' && deliveryData && deliveryData.deliveredBy) {
            const deliverymanRef = doc(db, 'deliverymen', deliveryData.deliveredBy);
            await updateDoc(deliverymanRef, {
                deliveriesCompleted: increment(1),
                updatedAt: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut de la commande à ${status}:`, error);
        throw error;
    }
};