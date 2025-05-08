export const COLORS = {
    primary: {
        DEFAULT: '#F97316', // Orange 500
        dark: '#EA580C',    // Orange 600
        light: '#FDBA74',   // Orange 300
        ultraLight: '#FFF7ED', // Orange 50
    },
    secondary: {
        DEFAULT: '#1E293B', // Slate 800
        dark: '#0F172A',    // Slate 900
        light: '#475569',   // Slate 600
        ultraLight: '#F1F5F9', // Slate 100
    },
    gray: {
        DEFAULT: '#9CA3AF', // Gray 400
        dark: '#4B5563',    // Gray 600
        light: '#E5E7EB',   // Gray 200
        ultraLight: '#F3F4F6', // Gray 100
    },
    white: '#FFFFFF',
    black: '#000000',
    success: '#10B981', // Green 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444',   // Red 500
    info: '#3B82F6',    // Blue 500
};

export const FONTS = {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
};

export const BORDER_RADIUS = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
};

// Helper function to create linear gradient colors
export const createGradient = (type: 'primary' | 'secondary' = 'primary') => {
    if (type === 'primary') {
        return ['#F97316', '#EA580C']; // Orange gradient
    }
    return ['#1E293B', '#0F172A']; // Slate gradient
};