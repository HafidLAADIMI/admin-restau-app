import {initializeApp} from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    serverTimestamp,
    increment,

    collectionGroup
} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
import Constants from 'expo-constants';

// Initialize Firebase with your config
const firebaseConfig = {

    apiKey: "AIzaSyC7eddeYoCqEn4au25Gs7eQbpWpuBbXVtg",

    authDomain: "dixie-solution.firebaseapp.com",

    projectId: "dixie-solution",

    storageBucket: "dixie-solution.firebasestorage.app",

    messagingSenderId: "831709659427",

    appId: "1:831709659427:web:848f5c80eb677327b20c96",

    measurementId: "G-8Z3NE5T9PV"

};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper function to handle Firestore operations with error handling
export const handleFirestoreOperation = async (operation, defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        console.error('Firestore operation failed:', error);
        return defaultValue;
    }
};

// Define types
export interface Cuisine {
    id: string;
    name: string;
    image: string;
    description?: string;
    longDescription?: string;
    restaurantCount?: number;
}

export interface Category {
    id: string;
    name: string;
    image: string;
    description?: string;
    cuisineId: string | null;
    itemCount?: number;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    discountedPrice?: number;
    description: string;
    image: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    subCategory?: string;
    isVeg: boolean;
    cuisineId: string;
}

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

// Get all cuisines with additional logging
export const getCuisines = async () => {
    return handleFirestoreOperation(async () => {
        console.log('Fetching all cuisines...');
        const cuisinesRef = collection(db, 'cuisines');
        const snapshot = await getDocs(cuisinesRef);

        if (snapshot.empty) {
            console.warn('No cuisines found in the collection!');
            return [];
        }

        console.log(`Found ${snapshot.docs.length} cuisines`);

        // Debug: Print all cuisine documents
        snapshot.docs.forEach(doc => {
            console.log(`Cuisine document - ID: ${doc.id}, Name: ${doc.data().name || 'unnamed'}`);
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

// Get a specific cuisine by ID with improved error handling
export const getCuisineById = async (cuisineId: string) => {
    try {
        console.log(`Fetching cuisine with ID: ${cuisineId}`);

        if (!cuisineId) {
            console.error('Invalid cuisineId provided');
            return null;
        }

        // Try direct document access first
        const cuisineDoc = doc(db, 'cuisines', cuisineId);
        const snapshot = await getDoc(cuisineDoc);

        if (snapshot.exists()) {
            console.log(`Found cuisine by direct ID: ${cuisineId}`);
            return {
                id: snapshot.id,
                name: snapshot.data().name || '',
                image: snapshot.data().image || '',
                description: snapshot.data().description || '',
                longDescription: snapshot.data().longDescription || '',
                restaurantCount: snapshot.data().restaurantCount || 0
            };
        }

        console.log(`No cuisine found with ID: ${cuisineId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching cuisine with ID ${cuisineId}:`, error);
        return null;
    }
};

// Get products by cuisine ID with proper filtering
export const getProductsByCuisine = async (cuisineId: string) => {
    try {
        console.log(`Fetching products for cuisine ID: ${cuisineId}`);

        if (!cuisineId) {
            console.error('Invalid cuisineId provided');
            return [];
        }

        // Query products by cuisineId field
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('cuisineId', '==', cuisineId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn(`No products found for cuisine ID: ${cuisineId}`);
            return [];
        }

        console.log(`Found ${snapshot.docs.length} products for cuisine ${cuisineId}`);

        // Map products to a consistent format
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
        console.error(`Error fetching products for cuisine ${cuisineId}:`, error);
        return [];
    }
};

// Get all categories with additional logging
export const getCategories = async () => {
    return handleFirestoreOperation(async () => {
        console.log('Fetching all categories...');
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(categoriesRef);

        if (snapshot.empty) {
            console.warn('No categories found in the collection!');
            return [];
        }

        console.log(`Found ${snapshot.docs.length} categories`);

        // Debug: Print all category documents
        snapshot.docs.forEach(doc => {
            console.log(`Category document - ID: ${doc.id}, Name: ${doc.data().name || 'unnamed'}`);
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

// Get a specific category by ID with improved error handling
export const getCategoryById = async (categoryId: string) => {
    try {
        console.log(`Fetching category with ID: ${categoryId}`);

        if (!categoryId) {
            console.error('Invalid categoryId provided');
            return null;
        }

        const categoryDoc = doc(db, 'categories', categoryId);
        const snapshot = await getDoc(categoryDoc);

        if (snapshot.exists()) {
            console.log(`Found category by direct ID: ${categoryId}`);
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

        console.log(`No category found with ID: ${categoryId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching category with ID ${categoryId}:`, error);
        return null;
    }
};

export const getCuisineFromCategory = async (categoryId: string) => {
    try {
        console.log(`Getting cuisine for category ID: ${categoryId}`);

        // First get the category to find the cuisineId
        const category = await getCategoryById(categoryId);

        if (!category || !category.cuisineId) {
            console.error(`No valid cuisineId found for category: ${categoryId}`);
            return null;
        }

        const cuisineId = category.cuisineId;
        console.log(`Found cuisineId: ${cuisineId} for category: ${categoryId}`);

        // Now get the cuisine details
        return await getCuisineById(cuisineId);
    } catch (error) {
        console.error(`Error getting cuisine for category ${categoryId}:`, error);
        return null;
    }
};

export const getProductsByCategory = async (categoryId: string) => {
    try {
        console.log(`Fetching products for category ID: ${categoryId}`);

        if (!categoryId) {
            console.error('Invalid categoryId provided');
            return [];
        }

        // First, get the category to find its associated cuisineId
        const category = await getCategoryById(categoryId);

        if (!category || !category.cuisineId) {
            console.error(`No valid cuisineId found for category: ${categoryId}`);
            return [];
        }

        const cuisineId = category.cuisineId;
        console.log(`Found associated cuisineId: ${cuisineId} for category: ${categoryId}`);

        // Now fetch products by cuisineId
        return await getProductsByCuisine(cuisineId);
    } catch (error) {
        console.error(`Error fetching products for category ${categoryId}:`, error);
        return [];
    }
};

// Get all orders
export const getOrders = async (): Promise<Order[]> => {
    try {
        console.log("[getOrders] Attempting to fetch orders...");

        // Try collection group query first
        try {
            const q = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);

            // Process and validate the results
            const all: Order[] = snap.docs.map((d) => {
                const maybeUserDoc = d.ref.parent.parent;
                const userId =
                    maybeUserDoc?.id ??
                    (d.data().userId as string | undefined) ??
                    'unknown';

                const data = d.data() as Omit<Order, 'id' | 'userId'>;

                // Validate coordinates
                let coordinates = {latitude: 0, longitude: 0};
                if (data.coordinates &&
                    typeof data.coordinates.latitude === 'number' &&
                    typeof data.coordinates.longitude === 'number') {
                    coordinates = {
                        latitude: data.coordinates.latitude,
                        longitude: data.coordinates.longitude
                    };
                }

                // Validate items array
                const items = Array.isArray(data.items) ? data.items.map(item => ({
                    id: item.id || undefined,
                    name: item.name || '',
                    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                    price: typeof item.price === 'number' ? item.price : 0
                })) : [];

                // Return validated order object
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

            console.log(`[getOrders] ${all.length} orders retrieved`);
            return all;

        } catch (groupQueryError) {
            // Fallback: fetch users then their orders
            console.log('[getOrders] Collection group query failed, falling back to user-by-user fetch');
            console.error(groupQueryError);

            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);

            // Array to hold all orders
            let allOrders: Order[] = [];

            // For each user, get their orders
            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const ordersRef = collection(db, 'users', userId, 'orders');

                try {
                    const q = query(ordersRef);
                    const ordersSnap = await getDocs(q);

                    // Process and validate each order
                    const userOrders = ordersSnap.docs.map(d => {
                        const data = d.data();

                        // Validate coordinates
                        let coordinates = {latitude: 0, longitude: 0};
                        if (data.coordinates &&
                            typeof data.coordinates.latitude === 'number' &&
                            typeof data.coordinates.longitude === 'number') {
                            coordinates = {
                                latitude: data.coordinates.latitude,
                                longitude: data.coordinates.longitude
                            };
                        }

                        // Validate items array
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
                    console.error(`[getOrders] Error fetching orders for user ${userId}:`, error);
                }
            }

            // Sort all orders by createdAt
            allOrders.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
                const dateB = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });

            console.log(`[getOrders] ${allOrders.length} orders retrieved (fallback method)`);
            return allOrders;
        }
    } catch (err: any) {
        console.error('[getOrders] failed:', err);
        return [];
    }
};

export const getOrderOnce = async (userId: string, orderId: string): Promise<Order | null> => {
    try {
        console.log(`[getOrderOnce] Fetching order ${orderId} for user ${userId}`);

        if (!userId || !orderId) {
            console.error('[getOrderOnce] Missing userId or orderId');
            return null;
        }

        const orderRef = doc(db, 'users', userId, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
            console.error('[getOrderOnce] Order not found');
            return null;
        }

        const data = orderSnap.data();

        // Validate coordinates
        let coordinates = {latitude: 0, longitude: 0};
        if (data.coordinates &&
            typeof data.coordinates.latitude === 'number' &&
            typeof data.coordinates.longitude === 'number') {
            coordinates = {
                latitude: data.coordinates.latitude,
                longitude: data.coordinates.longitude
            };
        } else {
            console.warn(`[getOrderOnce] Invalid coordinates for order ${orderId}`);
        }

        // Validate items array
        const items = Array.isArray(data.items) ? data.items.map(item => ({
            id: item.id || undefined,
            name: item.name || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            price: typeof item.price === 'number' ? item.price : 0
        })) : [];

        // Return validated order object
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

        console.log(`[getOrderOnce] Successfully fetched order ${orderId}`);
        return order;
    } catch (err: any) {
        console.error(`[getOrderOnce] Failed to fetch order ${orderId}:`, err);
        return null;
    }
};

// Add this function to update order status
export const updateOrderStatus = async (
    userId: string,
    orderId: string,
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled',
    deliveryData?: OrderDeliveryData
) => {
    try {
        const orderRef = doc(db, 'users', userId, 'orders', orderId);

        const updateData: any = {
            status,
            updatedAt: serverTimestamp()
        };

        // If delivery data is provided (for completed orders)
        if (status === 'completed' && deliveryData) {
            updateData.deliveryDetails = {
                ...deliveryData,
                deliveredAt: serverTimestamp()
            };
        }

        await updateDoc(orderRef, updateData);

        // Increment the deliveryman's completed deliveries count if status is completed
        if (status === 'completed' && deliveryData && deliveryData.deliveredBy) {
            const deliverymanRef = doc(db, 'deliverymen', deliveryData.deliveredBy);
            await updateDoc(deliverymanRef, {
                deliveriesCompleted: increment(1),
                updatedAt: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error(`Error updating order status to ${status}:`, error);
        throw error;
    }
};