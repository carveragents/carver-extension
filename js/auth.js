// Chrome Extension Authentication Module for V2 API
class AuthService {
    constructor() {
        this.apiHost = 'https://staging.carveragents.ai'; // Default to staging
        this.apiV2BaseUrl = `${this.apiHost}/api/v2`;

        // Firebase configuration from config file
        this.firebaseConfig = window.ExtensionConfig?.firebase || {
            apiKey: "AIzaSyCotR0I9KPtIZ-X6bq_sVlk17Ljf0Dav68",
            authDomain: "carveragents.firebaseapp.com",
            projectId: "carveragents",
            storageBucket: "carveragents.firebasestorage.app",
            messagingSenderId: "251733089648",
            appId: "1:251733089648:web:f4e44bf26e5f5efa8c83b5",
            measurementId: "G-MV35GFQMX5"
        };

        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Load host configuration from storage
            await this.loadHostConfiguration();

            // Check for existing authentication on web
            await this.checkSilentAuthentication();

            this.isInitialized = true;
            console.log('AuthService initialized with host:', this.apiHost);
        } catch (error) {
            console.error('Failed to initialize AuthService:', error);
        }
    }

    // Check if user is already authenticated on the web (silent check)
    async checkSilentAuthentication() {
        console.log('Checking for existing web authentication...');

        // Method 1: Direct API call with credentials
        try {
            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/check-session`, {
                method: 'GET',
                credentials: 'include', // Include cookies for session-based auth
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.jwt_token) {
                    console.log('Existing authentication found via API!');
                    await this.storeAuthData(result);
                    return true;
                }
            }
        } catch (error) {
            console.log('Direct API session check failed:', error.message);
        }

        // Method 2: Try a simple GET to a protected endpoint
        try {
            const response = await fetch(`${this.apiV2BaseUrl}/extension/user/profile`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.user) {
                    console.log('Existing session detected via profile endpoint!');

                    // Create auth data structure
                    const authData = {
                        success: true,
                        user: result.user,
                        jwt_token: result.jwt_token || 'session_based', // Use session if no JWT
                        is_new_user: false
                    };

                    await this.storeAuthData(authData);
                    return true;
                }
            }
        } catch (error) {
            console.log('Profile endpoint check failed:', error.message);
        }

        // Method 3: Simple redirect test
        try {
            return await this.checkSessionViaRedirect();
        } catch (error) {
            console.log('All silent authentication methods failed:', error.message);
            return false;
        }
    }

    // Method 3: Check via redirect test
    async checkSessionViaRedirect() {
        console.log('Trying redirect-based session check...');

        // Open staging login in hidden window/tab briefly
        return new Promise((resolve) => {
            try {
                // Use chrome.tabs to check if user is logged in
                chrome.tabs.create({
                    url: `${this.apiHost}/login`,
                    active: false // Don't focus the tab
                }, (tab) => {
                    // Check the tab after it loads
                    setTimeout(async () => {
                        try {
                            // Try to get information about the tab
                            chrome.tabs.get(tab.id, (tabInfo) => {
                                // If URL changed to dashboard or profile, user is logged in
                                if (tabInfo.url.includes('/dashboard') ||
                                    tabInfo.url.includes('/profile') ||
                                    tabInfo.url.includes('/admin') ||
                                    !tabInfo.url.includes('/login')) {

                                    console.log('User appears to be logged in (redirected from login)');

                                    // Close the tab
                                    chrome.tabs.remove(tab.id);

                                    // Open the login page to trigger auth data extraction
                                    this.extractAuthFromLoginPage();
                                    resolve(true);
                                } else {
                                    console.log('User not logged in (still on login page)');
                                    chrome.tabs.remove(tab.id);
                                    resolve(false);
                                }
                            });
                        } catch (error) {
                            console.log('Tab check failed:', error);
                            chrome.tabs.remove(tab.id);
                            resolve(false);
                        }
                    }, 3000);
                });
            } catch (error) {
                console.log('Redirect check failed:', error);
                resolve(false);
            }
        });
    }

    // Extract auth data from login page
    async extractAuthFromLoginPage() {
        console.log('Attempting to extract auth data from logged-in session...');

        // This will open the login page, and if user is logged in,
        // they should be redirected or we can detect their session
        const loginUrl = `${this.apiHost}/login`;
        chrome.tabs.create({ url: loginUrl });
    }

    // Alternative: Check session via hidden iframe
    async checkSessionViaIframe() {
        return new Promise((resolve) => {
            try {
                console.log('Trying iframe-based session check...');

                // Create hidden iframe
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = `${this.apiHost}/auth/extension-check`;

                // Set up message listener
                const messageHandler = (event) => {
                    if (event.origin !== this.apiHost) return;

                    if (event.data.type === 'AUTH_STATUS') {
                        window.removeEventListener('message', messageHandler);
                        document.body.removeChild(iframe);

                        if (event.data.authenticated && event.data.authData) {
                            console.log('Session found via iframe!');
                            this.storeAuthData(event.data.authData);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                };

                window.addEventListener('message', messageHandler);

                // Add to DOM
                document.body.appendChild(iframe);

                // Timeout after 5 seconds
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                    resolve(false);
                }, 5000);

            } catch (error) {
                console.log('Iframe session check failed:', error.message);
                resolve(false);
            }
        });
    }

    async loadHostConfiguration() {
        try {
            const result = await chrome.storage.local.get(['apiHost']);
            if (result.apiHost) {
                this.apiHost = result.apiHost;
                this.apiV2BaseUrl = `${this.apiHost}/api/v2`;
            }
        } catch (error) {
            console.error('Failed to load host configuration:', error);
        }
    }

    // Google OAuth using simplified approach for Chrome extensions
    async authenticateWithGoogle() {
        try {
            console.log('Starting Google OAuth flow...');

            // Try multiple OAuth approaches for better compatibility
            return await this.tryOAuthMethods();
        } catch (error) {
            console.error('Google authentication error:', error);
            throw error;
        }
    }

    // Try multiple OAuth methods for better compatibility
    async tryOAuthMethods() {
        const methods = [
            () => this.oauthWithExtensionId(),
            () => this.oauthWithFirebaseConfig(),
            () => this.fallbackToExternalLogin()
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying OAuth method ${i + 1}...`);
                return await methods[i]();
            } catch (error) {
                console.warn(`OAuth method ${i + 1} failed:`, error.message);
                if (i === methods.length - 1) {
                    throw error; // If all methods fail, throw the last error
                }
            }
        }
    }

    // Method 1: Use proper Chrome extension OAuth
    async oauthWithExtensionId() {
        return new Promise((resolve, reject) => {
            // Get the extension's OAuth client ID from manifest or generate one
            const extensionId = chrome.runtime.id;
            const clientId = `${this.firebaseConfig.messagingSenderId}-${extensionId}.apps.googleusercontent.com`;

            const authUrl = 'https://accounts.google.com/oauth/authorize?' +
                'client_id=' + encodeURIComponent(clientId) +
                '&response_type=id_token' +
                '&scope=' + encodeURIComponent('openid email profile') +
                '&redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL()) +
                '&nonce=' + this.generateNonce();

            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, async (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(`OAuth method 1 failed: ${chrome.runtime.lastError.message}`));
                    return;
                }

                if (!redirectUrl) {
                    reject(new Error('OAuth flow was cancelled'));
                    return;
                }

                try {
                    const result = await this.processOAuthRedirect(redirectUrl);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // Method 2: Use Firebase web client configuration
    async oauthWithFirebaseConfig() {
        return new Promise((resolve, reject) => {
            // Use the Firebase web app client ID
            const clientId = this.firebaseConfig.appId.replace(':', '-') + '.apps.googleusercontent.com';

            const authUrl = 'https://accounts.google.com/oauth/authorize?' +
                'client_id=' + encodeURIComponent(clientId) +
                '&response_type=code' +
                '&scope=' + encodeURIComponent('openid email profile') +
                '&redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL()) +
                '&nonce=' + this.generateNonce();

            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, async (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(`OAuth method 2 failed: ${chrome.runtime.lastError.message}`));
                    return;
                }

                if (!redirectUrl) {
                    reject(new Error('OAuth flow was cancelled'));
                    return;
                }

                try {
                    const result = await this.processOAuthRedirect(redirectUrl);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // Method 3: Fallback to external login
    async fallbackToExternalLogin() {
        console.log('Falling back to external login page...');
        this.openExternalLogin();
        throw new Error('OAuth popup failed. Please use the external login page that was opened.');
    }

    // Process OAuth redirect URL
    async processOAuthRedirect(redirectUrl) {
        const url = new URL(redirectUrl);

        // Try to extract ID token first
        let token = null;
        const fragment = url.hash.substring(1);
        const fragmentParams = new URLSearchParams(fragment);
        token = fragmentParams.get('id_token');

        // If no ID token, try authorization code
        if (!token) {
            const queryParams = new URLSearchParams(url.search);
            const code = queryParams.get('code');
            if (code) {
                // Exchange code for token via backend
                token = await this.exchangeCodeForToken(code);
            }
        }

        if (!token) {
            throw new Error('No authentication token received from OAuth flow');
        }

        // Verify token with backend
        const authResult = await this.verifyGoogleTokenWithBackend(token);

        if (authResult.success) {
            await this.storeAuthData(authResult);
            return authResult;
        } else {
            throw new Error(authResult.message || 'Backend authentication verification failed');
        }
    }

    // Exchange authorization code for token
    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/oauth/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    redirect_uri: chrome.identity.getRedirectURL()
                })
            });

            if (!response.ok) {
                throw new Error(`Token exchange failed: ${response.status}`);
            }

            const result = await response.json();
            return result.id_token;
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    // Fallback: Open external login page
    openExternalLogin() {
        const loginUrl = `${this.apiHost}/login`;
        chrome.tabs.create({ url: loginUrl });
    }

    // Generate nonce for OAuth security
    generateNonce() {
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    // Email/Password authentication
    async authenticateWithEmail(email, password) {
        try {
            console.log('Authenticating with email/password...');

            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/email/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Authentication failed: ${response.status}`);
            }

            const authResult = await response.json();

            if (authResult.success) {
                await this.storeAuthData(authResult);
                return authResult;
            } else {
                throw new Error(authResult.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Email authentication error:', error);
            throw error;
        }
    }

    // Create account with email/password
    async createAccountWithEmail(email, password, displayName) {
        try {
            console.log('Creating account with email/password...');

            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/email/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    display_name: displayName
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Account creation failed: ${response.status}`);
            }

            const authResult = await response.json();

            if (authResult.success) {
                await this.storeAuthData(authResult);
                return authResult;
            } else {
                throw new Error(authResult.message || 'Account creation failed');
            }
        } catch (error) {
            console.error('Account creation error:', error);
            throw error;
        }
    }

    // Verify Firebase ID token with backend
    async verifyGoogleTokenWithBackend(idToken) {
        try {
            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/firebase/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: idToken
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Backend verification failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Backend verification error:', error);
            throw error;
        }
    }

    // Store authentication data
    async storeAuthData(authResult) {
        try {
            const authData = {
                jwt_token: authResult.jwt_token,
                user: authResult.user,
                authenticated: true,
                authTime: Date.now()
            };

            await chrome.storage.local.set(authData);
            console.log('Authentication data stored successfully');
        } catch (error) {
            console.error('Failed to store auth data:', error);
            throw error;
        }
    }

    // Get stored authentication data
    async getStoredAuth() {
        try {
            const result = await chrome.storage.local.get([
                'jwt_token',
                'user',
                'authenticated',
                'authTime'
            ]);

            if (!result.authenticated || !result.jwt_token) {
                return null;
            }

            // Check if token is expired (24 hours)
            const tokenAge = Date.now() - (result.authTime || 0);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (tokenAge > maxAge) {
                console.log('Token expired, clearing auth data');
                await this.clearAuth();
                return null;
            }

            return {
                jwt_token: result.jwt_token,
                user: result.user,
                authenticated: result.authenticated
            };
        } catch (error) {
            console.error('Failed to get stored auth:', error);
            return null;
        }
    }

    // Clear authentication data
    async clearAuth() {
        try {
            await chrome.storage.local.remove([
                'jwt_token',
                'user',
                'authenticated',
                'authTime',
                // Also remove old V1 data
                'apiKey',
                'userInfo'
            ]);
            console.log('Authentication data cleared');
        } catch (error) {
            console.error('Failed to clear auth data:', error);
        }
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const auth = await this.getStoredAuth();
        return auth && auth.authenticated && auth.jwt_token;
    }

    // Get current user
    async getCurrentUser() {
        const auth = await this.getStoredAuth();
        return auth ? auth.user : null;
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(endpoint, options = {}) {
        try {
            const auth = await this.getStoredAuth();
            if (!auth || !auth.jwt_token) {
                throw new Error('Not authenticated');
            }

            const url = endpoint.startsWith('http') ? endpoint : `${this.apiV2BaseUrl}${endpoint}`;

            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.jwt_token}`
                }
            };

            const finalOptions = { ...defaultOptions, ...options };

            // Merge headers properly
            if (options.headers) {
                finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
            }

            const response = await fetch(url, finalOptions);

            // Handle 401 Unauthorized - token expired
            if (response.status === 401) {
                console.log('Token expired, clearing auth data');
                await this.clearAuth();
                throw new Error('Authentication expired. Please log in again.');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }

    // Refresh JWT token if needed
    async refreshToken() {
        try {
            const auth = await this.getStoredAuth();
            if (!auth || !auth.jwt_token) {
                throw new Error('No token to refresh');
            }

            // Attempt to refresh token
            const response = await fetch(`${this.apiV2BaseUrl}/core/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.jwt_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const refreshResult = await response.json();

            if (refreshResult.success && refreshResult.jwt_token) {
                await this.storeAuthData(refreshResult);
                return refreshResult;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, clear auth data
            await this.clearAuth();
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            // Attempt to notify backend of logout
            try {
                await this.makeAuthenticatedRequest('/core/auth/logout', {
                    method: 'POST'
                });
            } catch (error) {
                // Continue with local logout even if backend call fails
                console.warn('Backend logout failed, continuing with local logout:', error);
            }

            await this.clearAuth();
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Always clear local auth data even if there are errors
            await this.clearAuth();
        }
    }
}

// Export as global for use in other scripts
window.AuthService = AuthService;