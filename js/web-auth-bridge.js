// Web Authentication Bridge
// This script helps detect authentication from the web login page

class WebAuthBridge {
    constructor() {
        this.storageKey = 'carver_web_auth_token';
        this.init();
    }

    init() {
        // Listen for storage changes (when user authenticates on web)
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes[this.storageKey]) {
                console.log('Web authentication token detected!');
                this.handleWebAuthToken(changes[this.storageKey].newValue);
            }
        });

        // Also listen for direct storage events
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key === this.storageKey && event.newValue) {
                    console.log('Web authentication via localStorage detected!');
                    this.handleWebAuthToken(event.newValue);
                }
            });
        }

        // Periodic check for web auth token
        this.startWebAuthCheck();
    }

    startWebAuthCheck() {
        // Check every 2 seconds for web auth token
        this.webAuthInterval = setInterval(async () => {
            try {
                await this.checkForWebAuth();
            } catch (error) {
                console.error('Web auth check error:', error);
            }
        }, 2000);
    }

    async checkForWebAuth() {
        // Check extension storage first
        const result = await chrome.storage.local.get([this.storageKey]);
        if (result[this.storageKey]) {
            await this.handleWebAuthToken(result[this.storageKey]);
            return;
        }

        // Check localStorage if available (for cross-origin scenarios)
        if (typeof localStorage !== 'undefined') {
            const webToken = localStorage.getItem(this.storageKey);
            if (webToken) {
                await this.handleWebAuthToken(webToken);
                return;
            }
        }

        // Check sessionStorage as well
        if (typeof sessionStorage !== 'undefined') {
            const webToken = sessionStorage.getItem(this.storageKey);
            if (webToken) {
                await this.handleWebAuthToken(webToken);
                return;
            }
        }
    }

    async handleWebAuthToken(tokenData) {
        try {
            console.log('Processing web authentication token...');

            // Parse the token data
            let authData;
            if (typeof tokenData === 'string') {
                authData = JSON.parse(tokenData);
            } else {
                authData = tokenData;
            }

            // Store the authentication data in extension storage
            await chrome.storage.local.set({
                jwt_token: authData.jwt_token,
                user: authData.user,
                authenticated: true,
                authTime: Date.now()
            });

            // Clean up the temporary token
            await chrome.storage.local.remove([this.storageKey]);
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.storageKey);
            }
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(this.storageKey);
            }

            // Stop checking
            this.stopWebAuthCheck();

            console.log('Web authentication successfully processed!');

            // Trigger authentication success event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('webAuthSuccess', {
                    detail: authData
                }));
            }

        } catch (error) {
            console.error('Error processing web auth token:', error);
        }
    }

    stopWebAuthCheck() {
        if (this.webAuthInterval) {
            clearInterval(this.webAuthInterval);
            this.webAuthInterval = null;
        }
    }

    // Method to be called by web page after successful login
    static async storeWebAuthToken(authData) {
        try {
            const tokenData = JSON.stringify(authData);

            // Store in extension storage (if available)
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({
                    carver_web_auth_token: authData
                });
            }

            // Also store in localStorage for cross-origin scenarios
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('carver_web_auth_token', tokenData);
            }

            // And sessionStorage
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('carver_web_auth_token', tokenData);
            }

            console.log('Web authentication token stored successfully');
        } catch (error) {
            console.error('Error storing web auth token:', error);
        }
    }
}

// Export for use in extension
if (typeof window !== 'undefined') {
    window.WebAuthBridge = WebAuthBridge;
}

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.storage) {
    new WebAuthBridge();
}