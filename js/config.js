// Chrome Extension Configuration
// This file contains non-sensitive configuration for the extension

const ExtensionConfig = {
    // Firebase configuration (public keys only)
    firebase: {
        apiKey: "AIzaSyCotR0I9KPtIZ-X6bq_sVlk17Ljf0Dav68",
        authDomain: "carveragents.firebaseapp.com",
        projectId: "carveragents",
        storageBucket: "carveragents.firebasestorage.app",
        messagingSenderId: "251733089648",
        appId: "1:251733089648:web:f4e44bf26e5f5efa8c83b5",
        measurementId: "G-MV35GFQMX5"
    },

    // API endpoints
    api: {
        staging: "https://staging.carveragents.ai",
        production: "https://app.carveragents.ai",
        local: "http://localhost:8000"
    },

    // OAuth settings (public configuration only)
    oauth: {
        // Note: The actual OAuth client ID should be configured through
        // Google Cloud Console for your specific domain/extension
        scopes: ['openid', 'email', 'profile'],
        redirectUri: chrome?.identity?.getRedirectURL?.() || 'chrome-extension://redirect'
    },

    // Extension settings
    extension: {
        tokenExpirationHours: 24,
        cacheTimeoutMinutes: 5,
        maxRetries: 3,
        backgroundSyncIntervalMinutes: 15
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ExtensionConfig = ExtensionConfig;
}

// For Node.js environments (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionConfig;
}