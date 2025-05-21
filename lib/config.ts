// lib/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDu3tFrjlkzvegTcfcLkBfyrLmj1B8p18k",
    authDomain: "dixie-latestdb.firebaseapp.com",
    projectId: "dixie-latestdb",
    storageBucket: "dixie-latestdb.firebasestorage.app",
    messagingSenderId: "942778815273",
    appId: "1:942778815273:web:6d0ff3b4ed8edee1461d38",
    measurementId: "G-HQZV2WR7VW"
};

// Initialiser l'application Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Fonction utilitaire pour gérer les opérations Firestore avec gestion des erreurs
export const handleFirestoreOperation = async (operation, defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        console.error('Échec de l\'opération Firestore:', error);
        return defaultValue;
    }
};

// Exporter les types communs
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