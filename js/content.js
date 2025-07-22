// Content script for Regulatory Monitor extension
// Creates a floating button that opens the side panel

class RegulatoryMonitorFloatingButton {
    constructor() {
        this.button = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        console.log('Regulatory Monitor content script initializing...');
        
        // Only inject on main pages (not iframes)
        if (window.self !== window.top) {
            console.log('Skipping: in iframe');
            return;
        }

        // Don't inject on extension pages
        if (window.location.protocol === 'chrome-extension:' || 
            window.location.protocol === 'moz-extension:' ||
            window.location.hostname === 'chrome.google.com') {
            console.log('Skipping: on extension/chrome page');
            return;
        }

        console.log('Creating floating button...');
        this.createFloatingButton();
        this.setupEventListeners();
        
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
        this.button.setAttribute('aria-label', 'Open Regulatory Monitor');
        this.button.title = 'Regulatory Monitor';
        
        // Add the button content with a simpler icon
        this.button.innerHTML = `
            <div class="rm-btn-icon">
                📋
            </div>
            <div class="rm-btn-tooltip">Regulatory Monitor</div>
        `;

        // Apply inline styles directly (more reliable than CSS classes)
        Object.assign(this.button.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            background: '#6b7280',
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
            if (message.action === 'toggleSidePanel') {
                this.openSidePanel();
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
            console.log('Could not send message to background script:', error);
        });

        // Add click animation
        if (this.button) {
            this.button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.button.style.transform = this.isVisible ? 'scale(1)' : 'scale(0)';
            }, 100);
        }
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
console.log('🔧 Regulatory Monitor content script loaded!', window.location.href);

// Global test function
window.testRegulatoryMonitor = function() {
    console.log('🧪 Testing Regulatory Monitor...');
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
    console.log('🔧 Force injecting Regulatory Monitor...');
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