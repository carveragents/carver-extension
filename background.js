// Chrome Extension Background Service Worker
class BackgroundService {
    constructor() {
        //this.apiHost = 'http://localhost:8000'; // Default to local development
        //this.apiHost = 'https://staging.carveragents.ai'; // Default to staging
        this.apiHost = 'https://app.carveragents.ai'; // Default to production
        this.apiBaseUrl = `${this.apiHost}/api/v1`;
        this.refreshInterval = 15 * 60 * 1000; // 15 minutes
        this.alarmName = 'regulatoryMonitorRefresh';
        this.sidePanelState = new Map(); // Track sidepanel state per tab
        
        this.init();
    }

    async loadHostConfiguration() {
        try {
            const result = await chrome.storage.local.get(['apiHost']);
            if (result.apiHost) {
                this.apiHost = result.apiHost;
                this.apiBaseUrl = `${this.apiHost}/api/v1`;
                console.log('Background service using host:', this.apiHost);
            }
        } catch (error) {
            console.error('Failed to load host configuration:', error);
            // Continue with default host
        }
    }

    async init() {
        // Load host configuration from storage
        await this.loadHostConfiguration();
        
        // Set up periodic refresh alarm (with error handling)
        if (chrome.alarms) {
            chrome.alarms.create(this.alarmName, { periodInMinutes: 15 });
            
            // Listen for alarm
            chrome.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name === this.alarmName) {
                    this.performBackgroundSync();
                }
            });
        } else {
            console.warn('Alarms permission not available');
            // Fallback to setInterval for development
            setInterval(() => {
                this.performBackgroundSync();
            }, this.refreshInterval);
        }

        // Handle action clicks to open side panel
        if (chrome.action) {
            chrome.action.onClicked.addListener((tab) => {
                this.openSidePanel(tab);
            });
        }

        // Listen for extension startup
        if (chrome.runtime.onStartup) {
            chrome.runtime.onStartup.addListener(() => {
                this.performBackgroundSync();
            });
        }

        // Listen for extension install
        if (chrome.runtime.onInstalled) {
            chrome.runtime.onInstalled.addListener((details) => {
                if (details.reason === 'install') {
                    this.handleFirstInstall();
                } else if (details.reason === 'update') {
                    this.handleUpdate(details.previousVersion);
                }
            });
        }

        // Listen for messages from popup and content scripts
        if (chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true; // Keep message channel open for async response
            });
        }

        // Track sidepanel state changes
        this.setupSidePanelTracking();

        console.log('Carver Agents background service initialized');
    }

    async performBackgroundSync() {
        try {
            console.log('Performing background sync...');
            
            // Get stored API key
            const result = await chrome.storage.local.get(['apiKey']);
            if (!result.apiKey) {
                console.log('No API key found, skipping sync');
                return;
            }

            // Check for new updates
            const hasUpdates = await this.checkForUpdates(result.apiKey);
            
            if (hasUpdates) {
                // Update badge to show new content
                await this.updateBadge();
                
                // Send notification if enabled
                await this.sendNotification();
                
                // Notify popup if open (with error handling)
                if (chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'dataUpdated' }).catch(error => {
                        // Silently handle case where no receiver exists
                        console.log('No active receivers for dataUpdated message');
                    });
                }
            }

            console.log('Background sync completed');
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    }

    async checkForUpdates(apiKey) {
        try {
            // Get user's subscriptions
            const subscriptions = await this.apiCall('/extension/subscriptions', {
                headers: { 'X-API-Key': apiKey }
            });

            if (!subscriptions || subscriptions.length === 0) {
                return false;
            }

            // Check last sync time
            const lastSyncResult = await chrome.storage.local.get(['lastSyncTime']);
            const lastSyncTime = lastSyncResult.lastSyncTime || 0;
            const currentTime = Date.now();

            // Get topic details for subscribed topics
            let hasNewContent = false;
            for (const subscription of subscriptions) {
                if (subscription.subscription_type === 'topic') {
                    const topicDetails = await this.apiCall(
                        `/extension/topics/${subscription.subscription_value}/details?limit=5`,
                        { headers: { 'X-API-Key': apiKey } }
                    );

                    // Check if there are new feed entries since last sync
                    if (topicDetails.feed_entries) {
                        const newEntries = topicDetails.feed_entries.filter(entry => 
                            new Date(entry.published_date).getTime() > lastSyncTime
                        );
                        
                        if (newEntries.length > 0) {
                            hasNewContent = true;
                            break;
                        }
                    }
                }
            }

            // Update last sync time
            await chrome.storage.local.set({ lastSyncTime: currentTime });

            return hasNewContent;
        } catch (error) {
            console.error('Failed to check for updates:', error);
            return false;
        }
    }

    async updateBadge() {
        try {
            if (chrome.action) {
                await chrome.action.setBadgeText({ text: '•' });
                await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
                
                // Clear badge after 1 hour
                setTimeout(async () => {
                    if (chrome.action) {
                        await chrome.action.setBadgeText({ text: '' });
                    }
                }, 60 * 60 * 1000);
            }
        } catch (error) {
            console.error('Failed to update badge:', error);
        }
    }

    async sendNotification() {
        try {
            // Check if notifications are enabled and not too frequent
            const settings = await chrome.storage.local.get(['notificationsEnabled', 'lastNotificationTime']);
            if (settings.notificationsEnabled === false) {
                return;
            }

            // Prevent notifications more than once per day
            const now = Date.now();
            const lastNotificationTime = settings.lastNotificationTime || 0;
            const oneDay = 24 * 60 * 60 * 1000;
            
            if (now - lastNotificationTime < oneDay) {
                console.log('Skipping notification - less than 24 hours since last notification');
                return;
            }

            // Create notification
            if (chrome.notifications) {
                await chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Carver Agents',
                    message: 'New regulatory updates available',
                    priority: 0 // Reduced priority
                });
                
                // Update last notification time
                await chrome.storage.local.set({ lastNotificationTime: now });
            }
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async openSidePanel(tab) {
        try {
            if (chrome.sidePanel) {
                await chrome.sidePanel.open({ tabId: tab.id });
                console.log('Side panel opened for tab:', tab.id);
                
                // Track sidepanel state and notify content script
                this.sidePanelState.set(tab.id, true);
                this.notifyContentScript(tab.id, true);
            }
        } catch (error) {
            console.error('Failed to open side panel:', error);
        }
    }

    notifyContentScript(tabId, isOpen) {
        // Notify content script of sidepanel state change
        chrome.tabs.sendMessage(tabId, {
            action: 'sidePanelStateChanged',
            isOpen: isOpen
        }).catch(error => {
            // Content script might not be ready or tab might be closed - this is normal
            // Only log in development mode
            if (this.apiHost.includes('localhost')) {
                console.log('Could not notify content script:', error.message);
            }
        });
    }

    setupSidePanelTracking() {
        // Listen for tab activation changes (user switches tabs)
        if (chrome.tabs.onActivated) {
            chrome.tabs.onActivated.addListener((activeInfo) => {
                // When user switches to a tab, assume sidepanel is closed
                this.sidePanelState.forEach((isOpen, tabId) => {
                    if (tabId !== activeInfo.tabId && isOpen) {
                        this.sidePanelState.set(tabId, false);
                        this.notifyContentScript(tabId, false);
                    }
                });
            });
        }

        // Listen for window focus changes
        if (chrome.windows.onFocusChanged) {
            chrome.windows.onFocusChanged.addListener((windowId) => {
                if (windowId === chrome.windows.WINDOW_ID_NONE) {
                    // Window lost focus, assume all sidepanels closed
                    this.sidePanelState.forEach((isOpen, tabId) => {
                        if (isOpen) {
                            this.sidePanelState.set(tabId, false);
                            this.notifyContentScript(tabId, false);
                        }
                    });
                }
            });
        }

        // Clean up state when tabs are closed
        if (chrome.tabs.onRemoved) {
            chrome.tabs.onRemoved.addListener((tabId) => {
                this.sidePanelState.delete(tabId);
            });
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'openSidePanel':
                    if (sender.tab) {
                        await this.openSidePanel(sender.tab);
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ error: 'No tab information available' });
                    }
                    break;

                case 'forceSync':
                    await this.performBackgroundSync();
                    sendResponse({ success: true });
                    break;
                
                case 'clearBadge':
                    if (chrome.action) {
                        await chrome.action.setBadgeText({ text: '' });
                    }
                    sendResponse({ success: true });
                    break;
                
                case 'getStorageData':
                    const data = await chrome.storage.local.get(request.keys);
                    sendResponse({ data });
                    break;
                
                case 'setStorageData':
                    await chrome.storage.local.set(request.data);
                    sendResponse({ success: true });
                    break;
                
                case 'hostChanged':
                    // Reload host configuration when host changes
                    await this.loadHostConfiguration();
                    sendResponse({ success: true });
                    break;
                
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleFirstInstall() {
        try {
            console.log('First time installation detected');
            
            // Set default settings
            await chrome.storage.local.set({
                notificationsEnabled: true,
                refreshInterval: 15,
                theme: 'light'
            });

            // Show installation notification
            if (chrome.notifications) {
                await chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Carver Agent Installed',
                    message: 'Click the extension icon to get started with your API key!',
                    priority: 2
                });
            }

        } catch (error) {
            console.error('First install handling failed:', error);
        }
    }

    async handleUpdate(previousVersion) {
        try {
            console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
            
            // Perform any necessary migrations
            // Clear cache to ensure fresh data with new version
            const userData = await chrome.storage.local.get(['apiKey', 'userInfo']);
            await chrome.storage.local.clear();
            await chrome.storage.local.set(userData);

        } catch (error) {
            console.error('Update handling failed:', error);
        }
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Background API call failed:', error);
            throw error;
        }
    }
}

// Initialize background service
const backgroundService = new BackgroundService();

// Handle extension lifecycle events
if (chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
        console.log('Extension going to sleep');
    });
}

// Handle notification clicks
if (chrome.notifications && chrome.notifications.onClicked) {
    chrome.notifications.onClicked.addListener((notificationId) => {
        // Open popup when notification is clicked
        if (chrome.action && chrome.action.openPopup) {
            chrome.action.openPopup();
        }
        chrome.notifications.clear(notificationId);
    });
}

// Context menu integration (optional)
if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(() => {
        if (chrome.contextMenus) {
            chrome.contextMenus.create({
                id: 'regulatoryMonitorRefresh',
                title: 'Refresh Regulatory Updates',
                contexts: ['action']
            });
        }
    });
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'regulatoryMonitorRefresh') {
            backgroundService.performBackgroundSync();
        }
    });
}
