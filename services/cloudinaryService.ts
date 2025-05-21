// lib/firebase/cloudinaryService.ts
import { Platform } from 'react-native';

// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dkg7na769';
const CLOUDINARY_UPLOAD_PRESET = 'hafid_preset'; // Preset à créer dans le dashboard Cloudinary
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Télécharge une image sur Cloudinary avec gestion des erreurs améliorée
 * @param uri URI local de l'image
 * @param path Dossier de destination dans Cloudinary (ex: 'products', 'categories', 'cuisines')
 * @returns URL sécurisée de l'image téléchargée
 */
export const uploadToCloudinary = async (uri: string, path?: string): Promise<string> => {
    try {
        console.log('Démarrage du téléchargement direct vers Cloudinary:', { uri, path });

        if (!uri) {
            throw new Error('URI de l\'image manquant');
        }

        if (!uri.startsWith('file://')) {
            // C'est déjà une URL, pas besoin de télécharger à nouveau
            console.log('L\'URI est déjà une URL, retourne directement:', uri);
            return uri;
        }

        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Le téléchargement Cloudinary a pris trop de temps')), 60000);
        });

        // Créer les données du formulaire
        const formData = new FormData();

        // Obtenir le nom du fichier à partir de l'URI
        const uriParts = uri.split('/');
        const fileName = uriParts[uriParts.length - 1];

        // Déterminer le type de fichier
        const fileType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
            ? 'image/jpeg'
            : fileName.endsWith('.png')
                ? 'image/png'
                : 'image/jpeg'; // Par défaut jpeg

        console.log('Préparation du fichier pour le téléchargement Cloudinary:', { fileName, fileType });

        // Ajouter le fichier aux données du formulaire
        formData.append('file', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: fileName,
            type: fileType,
        } as any);

        // Ajouter les paramètres spécifiques à Cloudinary
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        if (path) {
            formData.append('folder', path);
        }

        console.log('Envoi de la demande de téléchargement direct à Cloudinary:', CLOUDINARY_URL);

        // Upload promise
        const uploadPromise = fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });

        // Race the upload against the timeout
        const response = await Promise.race([uploadPromise, timeoutPromise]);

        // Journaliser l'état de la réponse
        console.log('État de la réponse du téléchargement Cloudinary:', response.status);

        // Check if the response is okay
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur de réponse Cloudinary:', errorText);
            throw new Error(`Échec du téléchargement Cloudinary: ${response.status} ${response.statusText}`);
        }

        // Obtenir le texte de réponse brut
        const responseText = await response.text();
        console.log('Réponse brute de Cloudinary:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));

        // Parse the JSON response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erreur d\'analyse JSON:', parseError);
            throw new Error('La réponse de Cloudinary n\'était pas un JSON valide');
        }

        // Verify that we have the secure_url
        if (!data.secure_url) {
            console.error('Réponse Cloudinary sans secure_url:', data);
            throw new Error('URL sécurisée manquante dans la réponse Cloudinary');
        }

        console.log('Téléchargement Cloudinary réussi:', {
            public_id: data.public_id,
            url: data.secure_url
        });

        // Retourner l'URL sécurisée de Cloudinary
        return data.secure_url;
    } catch (error) {
        console.error('Erreur dans la fonction uploadToCloudinary:', error);
        throw error; // Re-throw to be handled by caller
    }
};