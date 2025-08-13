// Content script for Carver Agents extension
// Creates a floating button that opens the side panel

class RegulatoryMonitorFloatingButton {
    constructor() {
        this.button = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        console.log('Carver agents content script initializing...');
        
        // Only inject on main pages (not iframes)
        if (window.self !== window.top) {
            console.log('Skipping: in iframe');
            return;
        }

        // Don't inject on extension pages
        if (window.location.protocol === 'chrome-extension:' || 
            window.location.protocol === 'moz-extension:') {
            console.log('Skipping: on extension page');
            return;
        }

        console.log('Creating floating button...');
        this.createFloatingButton();
        this.setupEventListeners();
        this.setupSidePanelListener();
        this.setupThemeListener();
        
        // Show button after a short delay
        setTimeout(() => {
            console.log('Showing floating button...');
            this.showButton();
        }, 1000);
    }

    createFloatingButton() {
        console.log('Creating floating button element...');
        
        // Remove any existing button first
        const existing = document.getElementById('regulatory-monitor-floating-btn');
        if (existing) {
            console.log('Removing existing button...');
            existing.remove();
        }

        // Create the floating button container
        this.button = document.createElement('div');
        this.button.id = 'regulatory-monitor-floating-btn';
        this.button.className = 'rm-floating-button';
        this.button.setAttribute('aria-label', 'Open Carver Agents');
        this.button.title = 'Carver Agents';
        
        // Add the button content with Carver icon
        this.button.innerHTML = `
            <div class="rm-btn-icon">
                <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="Carver Agents" style="width: 32px; height: 32px; border-radius: 4px;">
            </div>
            <div class="rm-btn-tooltip">Carver Agents</div>
        `;

        // Apply inline styles directly (more reliable than CSS classes)
        Object.assign(this.button.style, {
            position: 'fixed',
            bottom: '120px',
            right: '2px',
            width: '56px',
            height: '56px',
            background: this.getThemeAwareBackground(),
            borderRadius: '50%',
            boxShadow: '0 4px 20px rgba(107, 114, 128, 0.4)',
            cursor: 'pointer',
            zIndex: '999999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(0)',
            opacity: '0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            border: 'none',
            outline: 'none',
            userSelect: 'none'
        });

        // Add to page
        if (document.body) {
            document.body.appendChild(this.button);
            console.log('Button added to page!');
        } else {
            console.error('Document body not found!');
            return;
        }

        // Add CSS for hover effects
        if (!document.getElementById('rm-floating-button-styles')) {
            const style = document.createElement('style');
            style.id = 'rm-floating-button-styles';
            style.textContent = `
                #regulatory-monitor-floating-btn:hover {
                    transform: scale(1.1) !important;
                    box-shadow: 0 6px 25px rgba(107, 114, 128, 0.6) !important;
                    background: #4b5563 !important;
                }
                
                #regulatory-monitor-floating-btn:active {
                    transform: scale(1.05) !important;
                }

                #regulatory-monitor-floating-btn .rm-btn-tooltip {
                    position: absolute !important;
                    right: 65px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    background: rgba(0, 0, 0, 0.9) !important;
                    color: white !important;
                    padding: 8px 12px !important;
                    border-radius: 6px !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    transition: opacity 0.2s ease !important;
                    z-index: 1000000 !important;
                }

                #regulatory-monitor-floating-btn:hover .rm-btn-tooltip {
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupEventListeners() {
        if (!this.button) return;

        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSidePanel();
        });

        // Handle button visibility on scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!this.isVisible) return;
            
            // Hide button briefly during scroll
            this.button.style.opacity = '0.7';
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.button.style.opacity = '1';
            }, 150);
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                if (message.action === 'toggleSidePanel') {
                    this.openSidePanel();
                } else if (message.action === 'sidePanelStateChanged') {
                    // Handle side panel state changes
                    if (message.isOpen) {
                        this.hideButton();
                    } else {
                        this.showButton();
                    }
                }
                sendResponse({ success: true });
            } catch (error) {
                console.log('Error handling message:', error);
                sendResponse({ error: error.message });
            }
        });
    }

    showButton() {
        console.log('Attempting to show button...');
        if (!this.button) {
            console.error('Button not found when trying to show!');
            return;
        }
        
        console.log('Making button visible...');
        this.isVisible = true;
        this.button.style.transform = 'scale(1)';
        this.button.style.opacity = '1';
        console.log('Button should now be visible!');
    }

    hideButton() {
        if (!this.button) return;
        
        this.isVisible = false;
        this.button.style.transform = 'scale(0)';
        this.button.style.opacity = '0';
    }

    openSidePanel() {
        // Send message to background script to open side panel
        chrome.runtime.sendMessage({
            action: 'openSidePanel'
        }).catch(error => {
            // Silently handle case where background script is not ready
            // This is normal during extension startup/reload
            if (error.message.includes('Extension context invalidated') || 
                error.message.includes('Could not establish connection')) {
                console.log('Extension context not ready, will retry...');
                // Try again after a short delay
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'openSidePanel' }).catch(() => {
                        // If still fails, just ignore - user can try clicking again
                    });
                }, 500);
            }
        });

        // Add click animation
        if (this.button) {
            this.button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.button.style.transform = this.isVisible ? 'scale(1)' : 'scale(0)';
            }, 100);
        }
    }

    setupSidePanelListener() {
        // Listen for side panel state changes from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'sidePanelStateChanged') {
                if (message.isOpen) {
                    console.log('Side panel opened, hiding floating button');
                    this.hideButton();
                } else {
                    console.log('Side panel closed, showing floating button');
                    this.showButton();
                }
            }
        });
    }

    getThemeAwareBackground() {
        // Check if user prefers dark mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? '#bae424' : '#000000'; // Green for dark theme, black for light theme
    }

    updateButtonTheme() {
        if (!this.button) return;
        
        const newBackground = this.getThemeAwareBackground();
        this.button.style.background = newBackground;
        
        // Update shadow color to match new background
        const shadowColor = newBackground === '#bae424' ? 
            '0 4px 20px rgba(186, 228, 36, 0.4)' : 
            '0 4px 20px rgba(0, 0, 0, 0.4)';
        this.button.style.boxShadow = shadowColor;
        
        console.log('Updated floating button theme:', newBackground);
    }

    setupThemeListener() {
        // Listen for theme changes
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Initial setup
        console.log('Current theme:', darkModeQuery.matches ? 'dark' : 'light');
        
        // Listen for changes
        darkModeQuery.addEventListener('change', (e) => {
            console.log('Theme changed to:', e.matches ? 'dark' : 'light');
            this.updateButtonTheme();
        });
    }

    destroy() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        this.button = null;
        this.isVisible = false;
    }
}

// Initialize the floating button when the page loads
console.log('🔧 Carver Agent content script loaded!', window.location.href);

// Global test function
window.testRegulatoryMonitor = function() {
    console.log('🧪 Testing Carver Agent...');
    const button = document.getElementById('regulatory-monitor-floating-btn');
    if (button) {
        console.log('✅ Floating button found!', button);
        return true;
    } else {
        console.log('❌ Floating button NOT found!');
        return false;
    }
};

// Global force injection function
window.forceInjectRegulatoryMonitor = function() {
    console.log('🔧 Force injecting Carver Agent...');
    try {
        if (window.regulatoryMonitorApp) {
            console.log('Destroying existing app...');
            window.regulatoryMonitorApp.destroy();
        }
        window.regulatoryMonitorApp = new RegulatoryMonitorFloatingButton();
        console.log('✅ Forced injection complete!');
        return true;
    } catch (error) {
        console.error('❌ Force injection failed:', error);
        return false;
    }
};

function initializeFloatingButton() {
    console.log('🚀 Initializing floating button...');
    try {
        window.regulatoryMonitorApp = new RegulatoryMonitorFloatingButton();
        console.log('✅ Floating button initialized successfully!');
        
        // Test after 2 seconds
        setTimeout(() => {
            window.testRegulatoryMonitor();
        }, 2000);
    } catch (error) {
        console.error('❌ Failed to initialize floating button:', error);
    }
}

if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeFloatingButton);
} else {
    console.log('⚡ Document already loaded, initializing immediately...');
    initializeFloatingButton();
}