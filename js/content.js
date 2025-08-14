// Content script for Carver Agents extension
// Creates a floating button that opens the side panel

class RegulatoryMonitorEdgeTrigger {
    constructor() {
        this.trigger = null;
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

        console.log('Creating edge trigger...');
        this.createEdgeTrigger();
        this.setupEventListeners();
    }

    createEdgeTrigger() {
        console.log('Creating edge trigger element...');
        
        // Remove any existing trigger first
        const existing = document.getElementById('carver-edge-trigger');
        if (existing) {
            existing.remove();
        }

        // Create the minimal edge trigger
        this.trigger = document.createElement('div');
        this.trigger.id = 'carver-edge-trigger';
        this.trigger.setAttribute('aria-label', 'Open Carver Agents');
        this.trigger.title = 'Open Carver Agents';
        
        // Add hover-revealed icon
        this.trigger.innerHTML = `
            <div class="trigger-icon">
                <img src="${chrome.runtime.getURL('icons/icon16.png')}" alt="Carver Agents" class="carver-icon">
            </div>
        `;

        // Apply minimal edge trigger styles
        Object.assign(this.trigger.style, {
            position: 'fixed',
            top: '50%',
            right: '0px',
            transform: 'translateY(-50%) translateX(calc(100% - 8px))',
            width: '50px',
            height: '80px',
            background: this.getThemeAwareBackground(),
            borderRadius: '6px 0 0 6px',
            cursor: 'pointer',
            zIndex: '999999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0',
            margin: '0',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            border: 'none',
            outline: 'none',
            userSelect: 'none',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
            opacity: '0.8'
        });

        // Add to page
        if (document.body) {
            document.body.appendChild(this.trigger);
            console.log('Edge trigger added to page!');
        } else {
            console.error('Document body not found!');
            return;
        }

        // Add CSS for interactions
        if (!document.getElementById('carver-edge-trigger-styles')) {
            const style = document.createElement('style');
            style.id = 'carver-edge-trigger-styles';
            style.textContent = `
                #carver-edge-trigger {
                    transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease !important;
                }
                
                #carver-edge-trigger:hover {
                    transform: translateY(-50%) translateX(calc(100% - 25px)) !important;
                    box-shadow: -3px 0 15px rgba(0, 0, 0, 0.25) !important;
                    opacity: 1 !important;
                }
                
                #carver-edge-trigger:active {
                    transform: translateY(-50%) translateX(calc(100% - 22px)) !important;
                }
                
                #carver-edge-trigger .trigger-icon {
                    opacity: 0;
                    transform: scale(0.8);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    width: 100%;
                    height: 100%;
                    padding-left: 2px;
                }
                
                #carver-edge-trigger:hover .trigger-icon {
                    opacity: 1;
                    transform: scale(1);
                }
                
                #carver-edge-trigger .carver-icon {
                    width: 16px;
                    height: 16px;
                    border-radius: 2px;
                    filter: brightness(1.2);
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupEventListeners() {
        if (!this.trigger) return;

        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSidePanel();
        });

        // Simple hover effect on scroll (optional)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            this.trigger.style.opacity = '0.8';
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trigger.style.opacity = '1';
            }, 300);
        });
    }

    // No show/hide needed - trigger is always visible
    // User controls visibility by using it or not

    openSidePanel() {
        console.log('Opening sidepanel...');
        
        // Add click animation
        if (this.trigger) {
            this.trigger.style.transform = 'translateY(-50%) translateX(calc(100% - 20px))';
            setTimeout(() => {
                this.trigger.style.transform = 'translateY(-50%) translateX(calc(100% - 8px))';
            }, 150);
        }
        
        // Send message to background script to open side panel
        if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'openSidePanel'
            }).catch(error => {
                console.warn('Failed to open sidepanel:', error.message);
                // Show user-friendly message
                this.showErrorMessage('Please refresh the page and try again');
            });
        } else {
            console.warn('Chrome runtime not available');
            this.showErrorMessage('Extension not ready - please refresh the page');
        }
    }
    
    showErrorMessage(message) {
        // Create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        Object.assign(errorDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#ff4444',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            zIndex: '1000000',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 4000);
    }

    // No sidepanel listener needed - trigger is always available

    getThemeAwareBackground() {
        // Check if user prefers dark mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #000000 0%, #434343 100%)';
    }

    destroy() {
        if (this.trigger && this.trigger.parentNode) {
            this.trigger.parentNode.removeChild(this.trigger);
        }
        this.trigger = null;
    }
}

// Initialize the floating button when the page loads
console.log('🔧 Carver Agent content script loaded!', window.location.href);

// Global test function
window.testCarverTrigger = function() {
    console.log('🧪 Testing Carver Edge Trigger...');
    const trigger = document.getElementById('carver-edge-trigger');
    if (trigger) {
        console.log('✅ Edge trigger found!', trigger);
        return true;
    } else {
        console.log('❌ Edge trigger NOT found!');
        return false;
    }
};

// Global force injection function
window.forceInjectCarverTrigger = function() {
    console.log('🔧 Force injecting Carver Edge Trigger...');
    try {
        if (window.carverEdgeTrigger) {
            console.log('Destroying existing trigger...');
            window.carverEdgeTrigger.destroy();
        }
        window.carverEdgeTrigger = new RegulatoryMonitorEdgeTrigger();
        console.log('✅ Forced injection complete!');
        return true;
    } catch (error) {
        console.error('❌ Force injection failed:', error);
        return false;
    }
};

function initializeEdgeTrigger() {
    console.log('🚀 Initializing edge trigger...');
    try {
        window.carverEdgeTrigger = new RegulatoryMonitorEdgeTrigger();
        console.log('✅ Edge trigger initialized successfully!');
        
        // Test after 1 second
        setTimeout(() => {
            window.testCarverTrigger();
        }, 1000);
    } catch (error) {
        console.error('❌ Failed to initialize edge trigger:', error);
    }
}

if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeEdgeTrigger);
} else {
    console.log('⚡ Document already loaded, initializing immediately...');
    initializeEdgeTrigger();
}