// Chrome Extension Login JavaScript
class LoginManager {
    constructor() {
        this.authService = new AuthService();
        this.isLoading = false;
        this.init();
    }

    async init() {
        console.log('Initializing LoginManager...');

        // Initialize auth service
        await this.authService.init();

        // Check if already authenticated
        const isAuth = await this.authService.isAuthenticated();
        if (isAuth) {
            console.log('User already authenticated, redirecting to main app...');
            this.redirectToMainApp();
            return;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Initialize version display
        this.initializeVersionDisplay();

        // Start periodic authentication checking in case user authenticates in another tab
        this.startPeriodicAuthCheck();

        // Listen for web authentication success
        window.addEventListener('webAuthSuccess', (event) => {
            console.log('Web authentication success event received!');
            this.stopPeriodicAuthCheck();
            this.stopAuthPolling();
            this.showSuccess('Authentication successful! Loading dashboard...');
            setTimeout(() => this.redirectToMainApp(), 1000);
        });

        console.log('LoginManager initialized');
    }

    startPeriodicAuthCheck() {
        // Check every 3 seconds if user has authenticated in another tab
        this.periodicAuthInterval = setInterval(async () => {
            try {
                const isAuthenticated = await this.authService.isAuthenticated();
                if (isAuthenticated) {
                    console.log('Authentication detected! Redirecting to main app...');
                    this.stopPeriodicAuthCheck();
                    this.showSuccess('Authentication successful! Loading dashboard...');
                    setTimeout(() => this.redirectToMainApp(), 1000);
                }
            } catch (error) {
                console.error('Periodic auth check error:', error);
            }
        }, 3000);
    }

    stopPeriodicAuthCheck() {
        if (this.periodicAuthInterval) {
            clearInterval(this.periodicAuthInterval);
            this.periodicAuthInterval = null;
        }
    }

    setupEventListeners() {
        // Tab switching
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // OAuth buttons
        document.getElementById('google-signin-btn').addEventListener('click', () => {
            this.handleGoogleAuth('signin');
        });

        document.getElementById('google-signup-btn').addEventListener('click', () => {
            this.handleGoogleAuth('signup');
        });

        document.getElementById('microsoft-signin-btn').addEventListener('click', () => {
            this.handleMicrosoftAuth('signin');
        });

        document.getElementById('microsoft-signup-btn').addEventListener('click', () => {
            this.handleMicrosoftAuth('signup');
        });

        // External login buttons
        document.getElementById('external-signin-btn').addEventListener('click', () => {
            this.handleExternalLogin();
        });

        // Check existing auth button
        document.getElementById('check-existing-auth-btn').addEventListener('click', () => {
            this.handleCheckExistingAuth();
        });

        // Form submissions
        document.getElementById('signin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignIn();
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignUp();
        });

        // Host selection (hidden but functional)
        document.getElementById('host-select').addEventListener('change', (e) => {
            this.handleHostChange(e.target.value);
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.auth-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });

        // Clear any error messages
        this.clearMessages();
    }

    async handleGoogleAuth(mode) {
        if (this.isLoading) return;

        const button = document.getElementById(`google-${mode}-btn`);
        this.setButtonLoading(button, true);
        this.clearMessages();

        try {
            console.log(`Starting Google ${mode}...`);
            const result = await this.authService.authenticateWithGoogle();

            if (result && result.success) {
                this.stopAuthPolling();
                this.showSuccess(`Successfully ${mode === 'signin' ? 'signed in' : 'created account'} with Google!`);
                setTimeout(() => this.redirectToMainApp(), 1500);
            } else {
                throw new Error(result?.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);

            // If Google OAuth fails, automatically redirect to web login
            if (error.message.includes('OAuth popup failed') || error.message.includes('Authorization page could not be loaded')) {
                this.showSuccess('Redirecting to web login...');
                setTimeout(() => this.handleExternalLogin(), 1000);
            } else {
                this.showError(this.getErrorMessage(error));
            }
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async handleMicrosoftAuth(mode) {
        if (this.isLoading) return;

        const button = document.getElementById(`microsoft-${mode}-btn`);
        this.setButtonLoading(button, true);
        this.clearMessages();

        try {
            console.log(`Starting Microsoft ${mode}...`);
            // Microsoft OAuth implementation would go here
            // For now, show a placeholder message
            throw new Error('Microsoft authentication is coming soon. Please use Google or email/password.');
        } catch (error) {
            console.error('Microsoft auth error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async handleExternalLogin() {
        try {
            console.log('Opening staging login page...');
            // Open the main staging login page
            const loginUrl = `${this.authService.apiHost}/login`;
            await chrome.tabs.create({ url: loginUrl });

            // Show instruction message
            this.showSuccess('Please complete authentication in the new tab, then return here.');

            // Set up listener for authentication completion
            this.setupExternalAuthListener();
        } catch (error) {
            console.error('External login error:', error);
            this.showError('Failed to open login page');
        }
    }

    setupExternalAuthListener() {
        // Start polling for authentication status
        this.startAuthPolling();

        // Also listen for messages from the external auth page (if available)
        window.addEventListener('message', (event) => {
            if (event.origin !== this.authService.apiHost) return;

            if (event.data.type === 'AUTH_SUCCESS') {
                console.log('External auth successful');
                this.stopAuthPolling();
                this.showSuccess('Authentication successful! Redirecting...');
                setTimeout(() => this.redirectToMainApp(), 1500);
            } else if (event.data.type === 'AUTH_ERROR') {
                console.log('External auth failed');
                this.showError(event.data.message || 'External authentication failed');
            }
        });
    }

    startAuthPolling() {
        // Clear any existing polling
        this.stopAuthPolling();

        console.log('Starting authentication polling...');

        // Poll every 2 seconds to check if user has authenticated
        this.authPollingInterval = setInterval(async () => {
            try {
                const isAuthenticated = await this.authService.isAuthenticated();
                if (isAuthenticated) {
                    console.log('Authentication detected via polling!');
                    this.stopAuthPolling();
                    this.showSuccess('Authentication successful! Loading dashboard...');
                    setTimeout(() => this.redirectToMainApp(), 1000);
                }
            } catch (error) {
                console.error('Auth polling error:', error);
            }
        }, 2000);

        // Stop polling after 5 minutes to avoid infinite polling
        setTimeout(() => {
            this.stopAuthPolling();
        }, 5 * 60 * 1000);
    }

    stopAuthPolling() {
        if (this.authPollingInterval) {
            clearInterval(this.authPollingInterval);
            this.authPollingInterval = null;
            console.log('Stopped authentication polling');
        }
    }

    async handleCheckExistingAuth() {
        if (this.isLoading) return;

        const button = document.getElementById('check-existing-auth-btn');
        this.setButtonLoading(button, true);
        this.clearMessages();

        try {
            console.log('Checking for existing authentication...');

            // First try silent authentication check
            const silentAuth = await this.authService.checkSilentAuthentication();
            if (silentAuth && silentAuth.success) {
                this.showSuccess('Authentication detected! Redirecting to dashboard...');
                setTimeout(() => this.redirectToMainApp(), 1000);
                return;
            }

            // If no silent auth, check if user is already authenticated
            const isAuth = await this.authService.isAuthenticated();
            if (isAuth) {
                this.showSuccess('Already authenticated! Redirecting to dashboard...');
                setTimeout(() => this.redirectToMainApp(), 1000);
                return;
            }

            // If not authenticated, show instruction
            this.showError('No existing authentication found. Please sign in using one of the methods above.');

        } catch (error) {
            console.error('Check existing auth error:', error);
            this.showError('Unable to check authentication status. Please try signing in manually.');
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async handleEmailSignIn() {
        if (this.isLoading) return;

        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        const submitBtn = document.getElementById('signin-submit-btn');

        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        this.setButtonLoading(submitBtn, true);
        this.clearMessages();

        try {
            console.log('Starting email sign in...');
            const result = await this.authService.authenticateWithEmail(email, password);

            if (result && result.success) {
                this.showSuccess('Successfully signed in!');
                setTimeout(() => this.redirectToMainApp(), 1500);
            } else {
                throw new Error(result?.message || 'Sign in failed');
            }
        } catch (error) {
            console.error('Email sign in error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleEmailSignUp() {
        if (this.isLoading) return;

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const submitBtn = document.getElementById('signup-submit-btn');

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }

        this.setButtonLoading(submitBtn, true);
        this.clearMessages();

        try {
            console.log('Starting account creation...');
            const result = await this.authService.createAccountWithEmail(email, password, name);

            if (result && result.success) {
                this.showSuccess('Account created successfully!');
                setTimeout(() => this.redirectToMainApp(), 1500);
            } else {
                throw new Error(result?.message || 'Account creation failed');
            }
        } catch (error) {
            console.error('Account creation error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleHostChange(newHost) {
        try {
            await chrome.storage.local.set({ apiHost: newHost });
            await this.authService.loadHostConfiguration();
            console.log('Host changed to:', newHost);
        } catch (error) {
            console.error('Failed to change host:', error);
        }
    }

    setButtonLoading(button, loading) {
        this.isLoading = loading;

        if (loading) {
            button.disabled = true;
            const textElement = button.querySelector('.btn-text') || button.querySelector('span');
            const spinnerElement = button.querySelector('.btn-spinner, .loading-spinner-small');

            if (textElement) textElement.style.display = 'none';
            if (spinnerElement) spinnerElement.classList.remove('hidden');
        } else {
            button.disabled = false;
            const textElement = button.querySelector('.btn-text') || button.querySelector('span');
            const spinnerElement = button.querySelector('.btn-spinner, .loading-spinner-small');

            if (textElement) textElement.style.display = '';
            if (spinnerElement) spinnerElement.classList.add('hidden');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('auth-error');
        const successElement = document.getElementById('auth-success');

        successElement.classList.add('hidden');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');

        // Scroll to top to ensure error is visible
        window.scrollTo(0, 0);
    }

    showSuccess(message) {
        const errorElement = document.getElementById('auth-error');
        const successElement = document.getElementById('auth-success');

        errorElement.classList.add('hidden');
        successElement.textContent = message;
        successElement.classList.remove('hidden');

        // Scroll to top to ensure success message is visible
        window.scrollTo(0, 0);
    }

    clearMessages() {
        const errorElement = document.getElementById('auth-error');
        const successElement = document.getElementById('auth-success');

        errorElement.classList.add('hidden');
        successElement.classList.add('hidden');
    }

    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        if (error && error.message) {
            // Handle common authentication errors
            const message = error.message.toLowerCase();

            if (message.includes('invalid-email')) {
                return 'Please enter a valid email address';
            }
            if (message.includes('user-disabled')) {
                return 'This account has been disabled';
            }
            if (message.includes('user-not-found')) {
                return 'No account found with this email address';
            }
            if (message.includes('wrong-password')) {
                return 'Incorrect password';
            }
            if (message.includes('too-many-requests')) {
                return 'Too many failed attempts. Please try again later';
            }
            if (message.includes('weak-password')) {
                return 'Password is too weak. Please choose a stronger password';
            }
            if (message.includes('email-already-in-use')) {
                return 'An account with this email already exists';
            }
            if (message.includes('popup-closed-by-user')) {
                return 'Sign-in was cancelled';
            }
            if (message.includes('network')) {
                return 'Network error. Please check your connection and try again';
            }

            return error.message;
        }

        return 'An unexpected error occurred. Please try again';
    }

    redirectToMainApp() {
        // Check if we're in a popup or side panel context
        if (window.location.pathname.includes('login.html')) {
            // Redirect to sidepanel
            window.location.href = 'sidepanel.html';
        } else {
            // Close login window and refresh main extension
            if (window.close) {
                window.close();
            }

            // Notify background script of successful login
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'authSuccess' }).catch(error => {
                    console.log('Could not notify background script:', error);
                });
            }
        }
    }

    initializeVersionDisplay() {
        // Set version information
        const versionElement = document.getElementById('api-version');
        if (versionElement && window.VERSION_INFO) {
            versionElement.textContent = window.VERSION_INFO.version;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LoginManager();
    });
} else {
    new LoginManager();
}