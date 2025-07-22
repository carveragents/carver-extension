// Chrome Extension Side Panel JavaScript
class RegulatoryMonitorSidePanel {
    constructor() {
        this.apiKey = null;
        this.currentUser = null;
        this.currentScreen = 'loading';
        this.apiHost = 'https://app.carveragents.ai'; // Default to production
        this.apiBaseUrl = `${this.apiHost}/api/v1`;
        this.cache = new Map();
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Show loading screen initially
        this.showScreen('loading');
        this.init();
    }

    async init() {
        try {
            console.log('Initializing side panel...');
            this.setupEventListeners();
            
            // Check for existing API key and host
            const result = await chrome.storage.local.get(['apiKey', 'userInfo', 'apiHost']);
            console.log('Storage result:', result);
            
            // Set host and update base URL
            if (result.apiHost) {
                this.apiHost = result.apiHost;
                this.apiBaseUrl = `${this.apiHost}/api/v1`;
                
                // Set the host dropdown to the saved value
                const hostSelect = document.getElementById('host-select');
                if (hostSelect) {
                    hostSelect.value = result.apiHost;
                }
            }
            
            if (result.apiKey) {
                console.log('Found existing API key, validating...');
                this.apiKey = result.apiKey;
                this.currentUser = result.userInfo;
                await this.validateApiKey();
                // Only switch to regulatory tab if we have a valid API key
                this.switchTab('regulatory');
            } else {
                console.log('No API key found, showing setup screen');
                this.showScreen('api-key-setup');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize extension');
        }
    }

    setupEventListeners() {
        // API Key setup
        document.getElementById('validate-api-key')?.addEventListener('click', () => this.handleApiKeyValidation());
        document.getElementById('api-key-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleApiKeyValidation();
        });

        // Tab Navigation
        document.getElementById('regulatory-tab')?.addEventListener('click', () => this.switchTab('regulatory'));
        document.getElementById('horizon-tab')?.addEventListener('click', () => this.switchTab('horizon'));

        // Navigation
        document.getElementById('back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('search-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('subscriptions-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('settings-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));

        // Horizon Watch Event Listeners
        document.getElementById('add-keyword-btn')?.addEventListener('click', () => this.showAddKeywordModal());
        document.getElementById('add-first-keyword-btn')?.addEventListener('click', () => this.showAddKeywordModal());
        document.getElementById('close-keyword-modal')?.addEventListener('click', () => this.hideAddKeywordModal());
        document.getElementById('cancel-keyword-btn')?.addEventListener('click', () => this.hideAddKeywordModal());
        document.getElementById('save-keyword-btn')?.addEventListener('click', () => this.handleSaveKeyword());
        document.getElementById('close-keyword-details')?.addEventListener('click', () => this.hideKeywordDetailsModal());
        document.getElementById('trigger-search-btn')?.addEventListener('click', () => this.handleTriggerSearch());
        document.getElementById('kind-filter')?.addEventListener('change', () => this.filterHorizonContent());
        document.getElementById('horizon-refresh-btn')?.addEventListener('click', () => this.refreshHorizonData());

        // Main dashboard actions
        document.getElementById('search-btn')?.addEventListener('click', () => this.showSearchScreen());
        document.getElementById('tag-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.currentScreen === 'search-results') {
                    this.handleTagSearch();
                } else {
                    this.showSearchScreen();
                }
            }
        });
        document.getElementById('subscriptions-btn')?.addEventListener('click', () => this.showSubscriptions());
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshData());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.showScreen('settings-screen'));

        // Settings
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('change-api-key')?.addEventListener('click', () => this.changeApiKey());
        document.getElementById('show-api-key')?.addEventListener('click', () => this.toggleApiKeyVisibility());
        document.getElementById('settings-host-select')?.addEventListener('change', (e) => this.handleHostChange(e.target.value));

        // Error handling
        document.getElementById('retry-btn')?.addEventListener('click', () => this.retry());

        // Search screen event listeners
        document.getElementById('search-execute-btn')?.addEventListener('click', () => this.handleSearchScreenSearch());
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearchScreenSearch();
        });
        
        // Keyword modal form event listeners
        document.getElementById('keyword-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSaveKeyword();
        });
        document.getElementById('kind-select')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSaveKeyword();
        });
    }

    showScreen(screenId) {
        console.log(`Switching to screen: ${screenId}`);
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenId;
            
            // Initialize screen-specific data
            if (screenId === 'settings-screen') {
                this.initializeSettingsScreen();
            }
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }

    switchTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}-content`)?.classList.remove('hidden');
        
        // Load appropriate data
        if (tabName === 'regulatory') {
            this.loadRegulatoryData();
        } else if (tabName === 'horizon') {
            this.loadHorizonData();
        }
        
        // Show main dashboard if not already showing
        if (this.currentScreen !== 'main-dashboard') {
            this.showScreen('main-dashboard');
        }
    }

    async handleApiKeyValidation() {
        const apiKeyInput = document.getElementById('api-key-input');
        const hostSelect = document.getElementById('host-select');
        const validateButton = document.getElementById('validate-api-key');
        const errorElement = document.getElementById('api-key-error');
        
        if (!apiKeyInput || !validateButton || !hostSelect) return;
        
        const apiKey = apiKeyInput.value.trim();
        const selectedHost = hostSelect.value;
        
        if (!apiKey) {
            this.showApiKeyError('Please enter an API key');
            return;
        }
        
        // Show loading state
        this.setButtonLoading(validateButton, true);
        this.hideApiKeyError();
        
        try {
            // Update host and base URL before validation
            this.apiHost = selectedHost;
            this.apiBaseUrl = `${this.apiHost}/api/v1`;
            
            const isValid = await this.validateApiKey(apiKey);
            
            if (isValid) {
                // Store API key, user info, and selected host
                await chrome.storage.local.set({
                    apiKey: apiKey,
                    userInfo: this.currentUser,
                    apiHost: selectedHost
                });
                
                this.apiKey = apiKey;
                this.showScreen('main-dashboard');
                this.switchTab('regulatory');
            } else {
                this.showApiKeyError('Invalid API key. Please check and try again.');
            }
        } catch (error) {
            console.error('API key validation error:', error);
            this.showApiKeyError('Failed to validate API key. Please try again.');
        } finally {
            this.setButtonLoading(validateButton, false);
        }
    }

    async validateApiKey(apiKey = this.apiKey) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/validate-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: apiKey
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.valid && result.user) {
                    this.currentUser = result.user;
                    
                    // Update user info in UI
                    const userNameElement = document.getElementById('user-name');
                    if (userNameElement && result.user.name) {
                        userNameElement.textContent = result.user.name;
                    }
                    
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('API key validation failed:', error);
            return false;
        }
    }

    async loadRegulatoryData() {
        console.log('Loading regulatory data...');
        
        if (!this.apiKey) {
            console.log('No API key available');
            return;
        }
        
        try {
            const topicSummaries = await this.apiCall('/extension/topics/summaries');
            this.renderTopicSummaries(topicSummaries);
            
            // Update user info in header
            if (this.currentUser && this.currentUser.name) {
                const userNameElement = document.getElementById('user-name');
                if (userNameElement) {
                    userNameElement.textContent = this.currentUser.name;
                }
            }
        } catch (error) {
            console.error('Failed to load regulatory data:', error);
            this.showError('Failed to load regulatory data');
        }
    }

    renderTopicSummaries(summaries) {
        const container = document.getElementById('tag-summaries');
        const emptyState = document.getElementById('empty-state');
        
        if (!summaries || summaries.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        // Sort topics: subscribed first (green color), then by name
        const sortedSummaries = [...summaries].sort((a, b) => {
            const aSubscribed = a.color === '#10b981';
            const bSubscribed = b.color === '#10b981';
            
            if (aSubscribed && !bSubscribed) return -1;
            if (!aSubscribed && bSubscribed) return 1;
            return a.tag_name.localeCompare(b.tag_name);
        });
        
        container.innerHTML = sortedSummaries.map(topic => `
            <div class="topic-card" data-topic-id="${topic.tag_id}">
                <div class="topic-header">
                    <div class="topic-name">
                        <div class="topic-color" style="background-color: ${topic.color}"></div>
                        ${this.escapeHtml(topic.tag_name)}
                        ${topic.color === '#10b981' ? '<span class="subscribed-badge">✓</span>' : ''}
                    </div>
                    <div class="topic-meta">
                        <span>${topic.link_count} entries</span>
                        ${topic.last_updated ? `<span>${this.formatDate(topic.last_updated)}</span>` : ''}
                    </div>
                </div>
                <div class="topic-summary">
                    ${this.escapeHtml(topic.meta_summary)}
                </div>
            </div>
        `).join('');
        
        // Add click listeners for topic cards
        const topicCards = container.querySelectorAll('.topic-card');
        topicCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const topicId = e.currentTarget.getAttribute('data-topic-id');
                this.showTopicDetails(topicId);
            });
        });
    }

    async showTopicDetails(topicId) {
        try {
            console.log(`Loading topic details for: ${topicId}`);
            this.showScreen('tag-details');
            
            const topicDetails = await this.apiCall(`/extension/topics/${topicId}/details`);
            
            // Update topic details
            document.getElementById('tag-details-title').textContent = topicDetails.topic_name;
            document.getElementById('tag-meta-summary').textContent = topicDetails.meta_summary;
            document.getElementById('tag-last-updated').textContent = 
                topicDetails.last_updated ? `Last updated: ${this.formatDate(topicDetails.last_updated)}` : 'No recent updates';
            
            // Render feed entries instead of link summaries
            this.renderFeedEntries(topicDetails.feed_entries);
            
            // Update subscribe button
            await this.updateSubscribeButton(topicId);
            
        } catch (error) {
            console.error('Failed to load topic details:', error);
            this.showError('Failed to load topic details');
        }
    }

    renderFeedEntries(feedEntries) {
        const container = document.getElementById('link-list');
        
        // if (!feedEntries || feedEntries.length === 0) {
        //     container.innerHTML = '<div class="empty-state"><p>No recent updates available.</p></div>';
        //     return;
        // }

        container.innerHTML = feedEntries.map(entry => `
            <div class="link-item" data-entry-id="${entry.entry_id}">
                <div class="link-title">${this.escapeHtml(entry.title)}</div>
                <div class="link-summary-text">${this.escapeHtml(entry.one_line_summary || 'No summary available')}</div>
                <div class="link-content-preview">${this.escapeHtml(entry.content_preview || '')}</div>
                <div class="link-actions">
                    ${entry.actions.map(action => `
                        <button class="link-action" data-action="${action}" data-entry-id="${entry.entry_id}" data-entry-url="${this.escapeHtml(entry.link)}">
                            ${this.getActionLabel(action)}
                        </button>
                    `).join('')}
                </div>
                <div class="link-meta">
                    Published: ${this.formatDateTime(entry.published_date)}
                    ${entry.tags && entry.tags.length > 0 ? `
                        <div class="link-tags">
                            ${entry.tags.map(tag => `<span class="tag-badge">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        // Add event listeners for action buttons
        this.addActionButtonListeners(container);
    }
    
    addActionButtonListeners(container) {
        const actionButtons = container.querySelectorAll('.link-action[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const entryId = e.target.getAttribute('data-entry-id');
                const entryUrl = e.target.getAttribute('data-entry-url');
                this.handleEntryAction(action, entryId, entryUrl, e.target);
            });
        });
    }


    async handleEntryAction(action, entryId, url, actionButton) {
        console.log(`Handling action: ${action} for entry: ${entryId}`);
        
        // Add loading state
        actionButton.disabled = true;
        actionButton.classList.add('loading');
        const originalText = actionButton.innerHTML;
        actionButton.innerHTML = `Processing...`;
        
        // Disable all action buttons in this entry
        const allButtons = actionButton.closest('.link-item').querySelectorAll('.link-action');
        allButtons.forEach(btn => {
            if (btn !== actionButton) {
                btn.disabled = true;
            }
        });
        
        try {
            // Handle share_summary action locally
            if (action === 'share_summary') {
                // Get the summary text from the current entry
                const entryElement = actionButton.closest('.link-item');
                const summaryText = entryElement.querySelector('.link-summary-text')?.textContent || 'No summary available';
                const titleText = entryElement.querySelector('.link-title')?.textContent || 'No title';
                
                const textToCopy = `${titleText}\n\n${summaryText}\n\nSource: ${url}`;
                
                await navigator.clipboard.writeText(textToCopy);
                this.showToast('Summary copied to clipboard!', 'success');
            } else {
                // For other actions, call the API
                const result = await this.apiCall(`/extension/entries/${entryId}/actions/${action}`, {
                    method: 'POST'
                });
                
                if (result.success) {
                    // Show the result in a modal
                    this.showActionResult(action, result.result, url);
                } else {
                    this.showToast(`Action failed: ${result.message}`, 'error');
                }
            }
            
        } catch (error) {
            console.error(`Action ${action} failed:`, error);
            if (action === 'share_summary') {
                this.showToast('Failed to copy summary to clipboard', 'error');
            } else {
                this.showToast(`Failed to ${action.replace('_', ' ')}`, 'error');
            }
        } finally {
            // Reset button state
            actionButton.disabled = false;
            actionButton.classList.remove('loading');
            actionButton.innerHTML = originalText;
            
            // Re-enable all action buttons
            allButtons.forEach(btn => {
                btn.disabled = false;
            });
        }
    }

    showActionResult(action, result) {
        // Create and show modal with action result
        const modal = document.createElement('div');
        modal.className = 'action-result-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.getActionLabel(action)} Result</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="action-result">${this.escapeHtml(result.result || JSON.stringify(result, null, 2))}</div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary modal-close-btn">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close handlers
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close') || e.target.classList.contains('modal-close-btn')) {
                document.body.removeChild(modal);
            }
        });
    }

    getActionLabel(action) {
        const labels = {
            'share_summary': 'Share Summary',
            'extract_names': 'Extract Names',
            'extract_timelines': 'Extract Timelines'
        };
        return labels[action] || action.replace('_', ' ');
    }

    async loadHorizonData() {
        try {
            console.log('Loading horizon content...');
            
            // Load horizon dashboard data from extension API  
            const keywords = await this.apiCall('/extension/horizon/keywords');
            
            // Transform keywords data to dashboard format
            const horizonData = {
                total_keywords: keywords.length,
                summaries_today: 0, // Always show 0 as requested
                recent_meta_summaries: keywords.filter(k => k.meta_summary && k.meta_summary !== `No summaries available for '${k.keyword}'`)
            };
            this.renderHorizonDashboard(horizonData);
            
            // Render keywords list using the same data
            this.renderKeywordsList(keywords);
            
        } catch (error) {
            console.error('Failed to load horizon content:', error);
            this.showError('Failed to load Horizon Watch data');
        }
    }

    renderHorizonDashboard(data) {
        // Update stats
        document.getElementById('total-keywords').textContent = data.total_keywords || 0;
        document.getElementById('summaries-today').textContent = 0; // Always show 0 as requested
        
        // Show/hide empty state based only on keywords
        const emptyState = document.getElementById('horizon-empty-state');
        const keywordsContainer = document.getElementById('keywords-list');
        
        const hasKeywords = data.total_keywords && data.total_keywords > 0;
        
        if (hasKeywords) {
            emptyState.classList.add('hidden');
            keywordsContainer.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
            keywordsContainer.classList.add('hidden');
        }
    }

    renderHorizonSummaries(summaries) {
        // Meta summaries tiles have been removed as requested
        // This function is kept for compatibility but does nothing
        return;
    }

    getKindColor(kind, index) {
        const colors = [
            '#667eea', // Purple-blue
            '#764ba2', // Purple
            '#f093fb', // Pink
            '#f5576c', // Red
            '#4facfe', // Blue
            '#43e97b', // Green
            '#38ef7d', // Light green
            '#ffecd2', // Peach
            '#fcb69f', // Orange
            '#a8edea', // Mint
            '#fed6e3', // Light pink
            '#d299c2'  // Lavender
        ];
        
        // Use kind to determine color, fallback to index if kind doesn't map
        const kindColors = {
            'regulatory': '#e3f2fd',
            'partner': '#f3e5f5', 
            'competition': '#fff3e0',
            'vendor': '#e8f5e8'
        };
        
        return kindColors[kind] || colors[index % colors.length];
    }

    renderKeywordsList(keywords) {
        const container = document.getElementById('keywords-list');
        
        if (!keywords || keywords.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <h3>Keywords</h3>
            ${keywords.map((keyword, index) => `
                <div class="keyword-item" data-keyword-id="${keyword.keyword_id}" data-kind="${keyword.kind}">
                    <div class="keyword-info">
                        <div class="keyword-name">
                            <span class="keyword-tag" style="background-color: ${this.getKindColor(keyword.kind, index)}; color: ${this.getKindTextColor(keyword.kind)};">
                                ${this.escapeHtml(keyword.keyword)}
                            </span>
                        </div>
                        <div class="keyword-meta">
                            ${keyword.kind} • Sentiment: ${keyword.sentiment || 'neutral'} • ${keyword.result_count || 0} results from ${keyword.sources_count || 0} sources • Last updated: ${keyword.last_updated ? this.formatDate(keyword.last_updated) : 'Never'}
                        </div>
                    </div>
                    <div class="keyword-actions">
                        <button class="btn btn-small btn-secondary trigger-search" data-keyword-id="${keyword.keyword_id}">
                            🔍 Search
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
        
        // Add event listeners
        container.querySelectorAll('.keyword-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('trigger-search')) {
                    const keywordId = e.currentTarget.getAttribute('data-keyword-id');
                    this.showKeywordDetails(keywordId);
                }
            });
        });
        
        container.querySelectorAll('.trigger-search').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const keywordId = e.target.getAttribute('data-keyword-id');
                this.handleTriggerSearchForKeyword(keywordId);
            });
        });
    }

    getKindTextColor(kind) {
        const darkColors = {
            'regulatory': '#1976d2',
            'partner': '#7b1fa2', 
            'competition': '#f57c00',
            'vendor': '#388e3c'
        };
        return darkColors[kind] || '#333';
    }

    async updateSubscribeButton(topicId) {
        try {
            const subscriptions = await this.apiCall('/extension/subscriptions');
            const isSubscribed = subscriptions.some(sub => 
                sub.subscription_type === 'topic' && sub.subscription_value === topicId
            );
            
            const subscribeBtn = document.getElementById('subscribe-tag-btn');
            const subscribeText = subscribeBtn.querySelector('.subscribe-text');
            const unsubscribeText = subscribeBtn.querySelector('.unsubscribe-text');
            
            if (isSubscribed) {
                subscribeText.classList.add('hidden');
                unsubscribeText.classList.remove('hidden');
                subscribeBtn.replaceWith(subscribeBtn.cloneNode(true)); // Remove old listeners
                const newBtn = document.getElementById('subscribe-tag-btn');
                newBtn.addEventListener('click', () => this.unsubscribeFromTopic(topicId));
            } else {
                subscribeText.classList.remove('hidden');
                unsubscribeText.classList.add('hidden');
                subscribeBtn.replaceWith(subscribeBtn.cloneNode(true)); // Remove old listeners
                const newBtn = document.getElementById('subscribe-tag-btn');
                newBtn.addEventListener('click', () => this.subscribeToTopic(topicId));
            }
        } catch (error) {
            console.error('Failed to update subscribe button:', error);
        }
    }

    showApiKeyError(message) {
        const errorElement = document.getElementById('api-key-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    hideApiKeyError() {
        const errorElement = document.getElementById('api-key-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        const spinner = button.querySelector('.btn-spinner');
        const text = button.querySelector('.btn-text');
        
        if (loading) {
            button.disabled = true;
            if (spinner) spinner.classList.remove('hidden');
            if (text) text.textContent = 'Validating...';
        } else {
            button.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (text) text.textContent = 'Validate Key';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                container.removeChild(toast);
            }
        }, 3000);
    }

    showError(message) {
        this.showScreen('error-screen');
        const errorElement = document.getElementById('error-message-text');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    retry() {
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
            this.init();
        } else {
            this.showError('Maximum retry attempts reached. Please refresh the extension.');
        }
    }

    refreshData() {
        // Clear cache and reload data
        this.cache.clear();
        if (this.currentScreen === 'main-dashboard') {
            this.loadRegulatoryData();
        }
        this.showToast('Data refreshed', 'success');
    }

    refreshHorizonData() {
        // Clear cache and reload horizon data
        this.cache.clear();
        this.loadHorizonData();
        this.showToast('Horizon data refreshed', 'success');
    }

    async logout() {
        await chrome.storage.local.clear();
        this.apiKey = null;
        this.currentUser = null;
        this.cache.clear();
        this.showScreen('api-key-setup');
        this.showToast('Logged out successfully', 'success');
    }

    async handleHostChange(newHost) {
        // Update the host and base URL
        this.apiHost = newHost;
        this.apiBaseUrl = `${this.apiHost}/api/v1`;
        
        // Save the new host to storage
        await chrome.storage.local.set({ apiHost: newHost });
        
        // Notify background service of host change
        try {
            await chrome.runtime.sendMessage({ action: 'hostChanged' });
        } catch (error) {
            console.log('Could not notify background service of host change:', error);
        }
        
        // Clear cache since we're switching environments
        this.cache.clear();
        
        // Show confirmation message
        let hostName = 'Production';
        if (newHost.includes('staging')) {
            hostName = 'Staging';
        } else if (newHost.includes('localhost')) {
            hostName = 'Local Development';
        }
        this.showToast(`Switched to ${hostName} environment`, 'success');
        
        // Refresh current data if we're on the main dashboard
        if (this.currentScreen === 'main-dashboard') {
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const tabName = activeTab.id.replace('-tab', '');
                if (tabName === 'regulatory') {
                    this.loadRegulatoryData();
                } else if (tabName === 'horizon') {
                    this.loadHorizonData();
                }
            }
        }
    }

    initializeSettingsScreen() {
        // Set the current host in the settings dropdown
        const settingsHostSelect = document.getElementById('settings-host-select');
        if (settingsHostSelect) {
            settingsHostSelect.value = this.apiHost;
        }
        
        // Reset API key visibility
        const maskedKey = document.getElementById('masked-api-key');
        const showBtn = document.getElementById('show-api-key');
        if (maskedKey && showBtn) {
            maskedKey.textContent = '••••••••••••••••';
            showBtn.textContent = 'Show';
        }
    }

    changeApiKey() {
        this.showScreen('api-key-setup');
    }

    toggleApiKeyVisibility() {
        const maskedKey = document.getElementById('masked-api-key');
        const showBtn = document.getElementById('show-api-key');
        
        if (maskedKey && showBtn) {
            if (maskedKey.textContent.includes('•')) {
                maskedKey.textContent = this.apiKey;
                showBtn.textContent = 'Hide';
            } else {
                maskedKey.textContent = '••••••••••••••••';
                showBtn.textContent = 'Show';
            }
        }
    }

    // API call method with proper headers and caching
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        // Check cache first for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = this.cache.get(url);
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.data;
            }
        }
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache successful GET requests
            if (!options.method || options.method === 'GET') {
                this.cache.set(url, { data, timestamp: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Utility functions
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    renderSentiment(summary) {
        // Handle different possible sentiment field names
        const sentiment = summary.sentiment_label || summary.sentiment_estimate || summary.sentiment || 'neutral';
        const score = summary.sentiment_score || summary.sentiment_confidence || summary.confidence;
        
        if (!sentiment) {
            return '<span class="sentiment-badge neutral">neutral</span>';
        }

        const normalizedSentiment = sentiment.toLowerCase();
        let scoreDisplay = '';
        
        if (score !== undefined && score !== null) {
            const scoreValue = typeof score === 'number' ? score : parseFloat(score);
            if (!isNaN(scoreValue)) {
                const percentage = scoreValue > 1 ? scoreValue : scoreValue * 100;
                scoreDisplay = `<span class="sentiment-score">${percentage.toFixed(0)}%</span>`;
            }
        }

        return `
            <span class="sentiment-badge ${normalizedSentiment}">${normalizedSentiment}</span>
            ${scoreDisplay}
        `;
    }

    getDomainFromUrl(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return 'Today';
            if (diffDays === 2) return 'Yesterday';
            if (diffDays <= 7) return `${diffDays - 1} days ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown date';
        }
    }

    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (error) {
            return 'Unknown date';
        }
    }

    // Horizon Watch Methods
    async showKeywordDetails(keywordId) {
        try {
            const modal = document.getElementById('keyword-details-modal');
            modal.classList.remove('hidden');
            
            // Load keyword details from extension API
            const keywordDetails = await this.apiCall(`/extension/horizon/keywords/${keywordId}/details`);
            
            console.log('Keyword details received:', keywordDetails);
            
            // Validate response
            if (!keywordDetails || !keywordDetails.topic_name) {
                throw new Error('Invalid keyword details response');
            }
            
            // Extract keyword info from details response
            let keywordName = keywordDetails.topic_name;
            let keywordKind = 'unknown';
            
            if (keywordDetails.topic_name.includes('(')) {
                const parts = keywordDetails.topic_name.split('(');
                keywordName = parts[0].trim();
                if (parts[1]) {
                    keywordKind = parts[1].replace(')', '').trim();
                }
            }
            
            const keyword = {
                keyword: keywordName,
                kind: keywordKind,
                last_search_date: keywordDetails.last_updated,
                cron_schedule: '0 8 * * *' // Default schedule
            };
            
            // Use the meta summary from the details response
            const hasRealSummary = keywordDetails.meta_summary && 
                                 !keywordDetails.meta_summary.includes('No meta summary available');
            
            const metaSummary = hasRealSummary ? {
                point_summary: keywordDetails.meta_summary,
                sentiment_estimate: null,
                sentiment_details: null
            } : null;
            
            // No recent summaries since we removed individual summaries
            const recentSummaries = [];
            
            // Populate modal
            document.getElementById('keyword-details-title').textContent = `${keyword.keyword} Details`;
            document.getElementById('detail-keyword').textContent = keyword.keyword;
            document.getElementById('detail-kind').textContent = keyword.kind;
            document.getElementById('detail-kind').className = `kind-badge ${keyword.kind}`;
            document.getElementById('detail-last-search').textContent = 
                keyword.last_search_date ? this.formatDateTime(keyword.last_search_date) : 'Never';
            document.getElementById('detail-schedule').textContent = this.formatCronSchedule(keyword.cron_schedule);
            
            // Meta summary
            const metaSummaryContainer = document.getElementById('keyword-meta-summary');
            const sentimentIndicator = document.getElementById('sentiment-indicator');
            
            if (metaSummary) {
                metaSummaryContainer.innerHTML = `<p>${this.escapeHtml(metaSummary.point_summary)}</p>`;
                
                if (metaSummary.sentiment_estimate) {
                    sentimentIndicator.classList.remove('hidden');
                    const sentimentLabel = document.getElementById('sentiment-label');
                    const sentimentFill = document.getElementById('sentiment-fill');
                    
                    sentimentLabel.textContent = metaSummary.sentiment_estimate;
                    sentimentLabel.className = `sentiment-label ${metaSummary.sentiment_estimate.toLowerCase()}`;
                    sentimentFill.className = `sentiment-fill ${metaSummary.sentiment_estimate.toLowerCase()}`;
                    
                    if (metaSummary.sentiment_details && metaSummary.sentiment_details.confidence) {
                        sentimentFill.style.width = `${metaSummary.sentiment_details.confidence * 100}%`;
                    }
                } else {
                    sentimentIndicator.classList.add('hidden');
                }
            } else {
                metaSummaryContainer.innerHTML = '<p class="no-summary">No summary available yet</p>';
                sentimentIndicator.classList.add('hidden');
            }
            
            // Render individual feed entries if available
            const recentSummariesList = document.getElementById('recent-summaries-list');
            if (keywordDetails.feed_entries && keywordDetails.feed_entries.length > 0) {
                this.renderKeywordFeedEntries(keywordDetails.feed_entries, recentSummariesList);
            } else {
                recentSummariesList.innerHTML = '<p class="no-summary">No individual summaries available yet.</p>';
            }
            
            // Store keyword ID for trigger search
            modal.setAttribute('data-keyword-id', keywordId);
            
        } catch (error) {
            console.error('Failed to load keyword details:', error);
            this.showToast('Failed to load keyword details', 'error');
        }
    }

    renderKeywordFeedEntries(feedEntries, container) {
        if (!feedEntries || feedEntries.length === 0) {
            container.innerHTML = '<p class="no-summary">No individual summaries available yet.</p>';
            return;
        }

        container.innerHTML = feedEntries.map(entry => `
            <div class="link-item" data-entry-id="${entry.entry_id}">
                <div class="link-title">${this.escapeHtml(entry.title)}</div>
                <div class="link-summary-text">${this.escapeHtml(entry.one_line_summary || 'No summary available')}</div>
                <div class="link-content-preview">${this.escapeHtml(entry.content_preview || '')}</div>
                <div class="link-actions">
                    ${(entry.actions || ['share_summary', 'extract_names', 'extract_timelines']).map(action => `
                        <button class="link-action" data-action="${action}" data-entry-id="${entry.entry_id}" data-entry-url="${this.escapeHtml(entry.link)}">
                            ${this.getActionLabel(action)}
                        </button>
                    `).join('')}
                </div>
                <div class="link-meta">
                    Published: ${this.formatDateTime(entry.published_date)}
                    ${entry.tags && entry.tags.length > 0 ? `
                        <div class="link-tags">
                            ${entry.tags.map(tag => `<span class="tag-badge">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        // Add event listeners for action buttons
        this.addActionButtonListeners(container);
    }

    async handleTriggerSearchForKeyword(keywordId) {
        try {
            console.log(`Triggering search for keyword ID: ${keywordId}`);
            this.showToast(`Calling API: /horizon/keywords/${keywordId}/search`)
            
            const result = await this.apiCall(`/horizon/keywords/${keywordId}/search`, {
                method: 'POST'
            });
            
            if (result.success) {
                this.showToast(`Search triggered successfully!`, 'success');
                
                // Refresh horizon content after a short delay
                setTimeout(() => {
                    this.loadHorizonData();
                }, 2000);
            } else {
                this.showToast(`Search failed: ${result.message}`, 'error');
            }
            
        } catch (error) {
            console.error('Failed to trigger search:', error);
            this.showToast('Failed to trigger search. Please try again.', 'error');
        }
    }

    addSummaryActionListeners(container) {
        const actionButtons = container.querySelectorAll('.action-btn[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const summaryId = e.target.getAttribute('data-summary-id');
                const sourceUrl = e.target.getAttribute('data-source-url');
                this.handleSummaryAction(action, summaryId, sourceUrl, e.target);
            });
        });
    }

    async handleSummaryAction(action, summaryId, sourceUrl, actionButton) {
        // Similar to handleEntryAction but for horizon summaries
        console.log(`Handling summary action: ${action} for summary: ${summaryId}`);
        
        // Add loading state
        actionButton.disabled = true;
        actionButton.classList.add('loading');
        const originalText = actionButton.innerHTML;
        actionButton.innerHTML = `Processing...`;
        
        try {
            const result = await this.apiCall(`/horizon/summaries/${summaryId}/actions/${action}`, {
                method: 'POST'
            });
            
            if (result.success) {
                this.showActionResult(action, result.result, sourceUrl);
            } else {
                this.showToast(`Action failed: ${result.message}`, 'error');
            }
            
        } catch (error) {
            console.error(`Summary action ${action} failed:`, error);
            this.showToast(`Failed to ${action.replace('_', ' ')}`, 'error');
        } finally {
            // Reset button state
            actionButton.disabled = false;
            actionButton.classList.remove('loading');
            actionButton.innerHTML = originalText;
        }
    }

    formatCronSchedule(cronSchedule) {
        // Simple cron schedule formatter
        const scheduleMap = {
            '0 8 * * *': 'Daily at 8 AM',
            '0 8 * * 1': 'Weekly on Monday',
            '0 8 * * 1,4': 'Twice a week (Mon & Thu)',
            '0 8 1 * *': 'Monthly on 1st'
        };
        return scheduleMap[cronSchedule] || cronSchedule;
    }

    truncateUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.length > 30 ? domain.substring(0, 27) + '...' : domain;
        } catch {
            return url.length > 30 ? url.substring(0, 27) + '...' : url;
        }
    }

    // Placeholder methods for missing functionality
    async showSearchScreen() {
        try {
            console.log('Showing search screen...');
            this.showScreen('search-results');
            
            // Load recommendations initially
            const recommendations = await this.apiCall('/extension/topics/recommendations');
            console.log('Recommendations loaded:', recommendations.length);
            this.renderSearchResults(recommendations, true);
            
        } catch (error) {
            console.error('Failed to load search screen:', error);
            this.showError('Failed to load topics. Please try again.');
        }
    }

    async showSubscriptions() {
        try {
            console.log('Loading subscriptions...');
            this.showScreen('subscriptions-screen');
            
            const subscriptions = await this.apiCall('/extension/subscriptions');
            this.renderSubscriptions(subscriptions);
            
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
            this.showError('Failed to load subscriptions');
        }
    }

    renderSubscriptions(subscriptions) {
        const container = document.getElementById('subscriptions-list');
        const emptyState = document.getElementById('subscriptions-empty-state');
        
        if (!subscriptions || subscriptions.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = subscriptions.map(sub => `
            <div class="subscription-item">
                <div class="subscription-info">
                    <div class="subscription-name">${this.escapeHtml(sub.subscription_name || sub.subscription_value)}</div>
                    <div class="subscription-type">${sub.subscription_type}</div>
                </div>
                <div class="subscription-actions">
                    <button class="btn btn-small btn-danger unsubscribe-btn" data-subscription-id="${sub.id}">
                        Unsubscribe
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.unsubscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subscriptionId = e.target.getAttribute('data-subscription-id');
                this.unsubscribe(subscriptionId);
            });
        });
    }

    async unsubscribe(subscriptionId) {
        try {
            await this.apiCall(`/extension/subscriptions/${subscriptionId}`, {
                method: 'DELETE'
            });
            
            this.showToast('Successfully unsubscribed!', 'success');
            await this.showSubscriptions(); // Refresh the list
            
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            this.showToast('Failed to unsubscribe. Please try again.', 'error');
        }
    }

    changeApiKey() {
        this.showScreen('api-key-setup');
    }

    toggleApiKeyVisibility() {
        // Implementation for showing/hiding API key
        console.log('Toggle API key visibility');
    }

    async handleTagSearch() {
        const searchInput = document.getElementById('tag-search');
        const query = searchInput.value.trim();
        
        try {
            this.showScreen('search-results');
            
            let results;
            if (!query) {
                // Show recommendations when no search query
                results = await this.apiCall('/extension/topics/recommendations');
                this.renderSearchResults(results, true); // true indicates recommendations
            } else {
                // Show search results
                results = await this.apiCall(`/extension/topics/search?query=${encodeURIComponent(query)}&limit=20`);
                this.renderSearchResults(results, false);
                
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    async handleSearchScreenSearch() {
        const searchInput = document.getElementById('search-input');
        const query = searchInput?.value?.trim() || '';
        
        try {
            console.log('Handling search screen search with query:', query);
            
            let results;
            if (!query) {
                // Show recommendations when no search query
                results = await this.apiCall('/extension/topics/recommendations');
                this.renderSearchResults(results, true);
            } else {
                // Show search results
                results = await this.apiCall(`/extension/topics/search?query=${encodeURIComponent(query)}&limit=20`);
                this.renderSearchResults(results, false);
                
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    renderSearchResults(results, isRecommendations = false) {
        console.log('Rendering search results:', results?.length, 'isRecommendations:', isRecommendations);
        const container = document.getElementById('search-results-list');
        const emptyState = document.getElementById('search-empty-state');
        
        if (!container) {
            console.error('search-results-list container not found');
            return;
        }
        
        if (!results || results.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // Add header
        const headerText = isRecommendations ? 'Recommended Topics' : 'Search Results';
        const headerHTML = `
            <div class="${isRecommendations ? 'recommendations-header' : 'search-header'}">
                <h3>${headerText}</h3>
                ${isRecommendations ? '<p>Topics you might be interested in</p>' : ''}
            </div>
        `;
        
        container.innerHTML = headerHTML + results.map(topic => `
            <div class="topic-card ${topic.color === '#10b981' ? 'subscribed' : ''}" data-topic-id="${topic.tag_id}">
                <div class="topic-header">
                    <div class="topic-name">
                        <div class="topic-color" style="background-color: ${topic.color}"></div>
                        ${this.escapeHtml(topic.tag_name)}
                        ${topic.color === '#10b981' ? '<span class="subscribed-badge">✓</span>' : ''}
                    </div>
                    <div class="topic-meta">
                        <span>${topic.link_count} entries</span>
                        ${topic.last_updated ? `<span>${this.formatDate(topic.last_updated)}</span>` : ''}
                    </div>
                </div>
                <div class="topic-summary">
                    ${this.escapeHtml(topic.meta_summary)}
                </div>
                <div class="topic-description">
                    ${this.escapeHtml(topic.description || '')}
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.topic-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const topicId = e.currentTarget.getAttribute('data-topic-id');
                this.showTopicDetails(topicId);
            });
        });
    }

    showAddKeywordModal() {
        const modal = document.getElementById('add-keyword-modal');
        modal.classList.remove('hidden');
        
        // Clear form
        document.getElementById('keyword-input').value = '';
        document.getElementById('kind-select').value = '';
        document.getElementById('frequency-select').value = 'daily';
        
        // Reset button state
        const saveBtn = document.getElementById('save-keyword-btn');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnSpinner = saveBtn.querySelector('.btn-spinner');
        
        saveBtn.disabled = false;
        btnText.textContent = 'Add Keyword';
        btnSpinner.classList.add('hidden');
        
        // Focus on keyword input
        document.getElementById('keyword-input').focus();
        
        // Add ESC key handler
        document.addEventListener('keydown', this.handleModalEscKey.bind(this));
    }

    hideAddKeywordModal() {
        const modal = document.getElementById('add-keyword-modal');
        modal.classList.add('hidden');
        
        // Remove ESC key handler
        document.removeEventListener('keydown', this.handleModalEscKey.bind(this));
    }
    
    handleModalEscKey(event) {
        if (event.key === 'Escape') {
            const addKeywordModal = document.getElementById('add-keyword-modal');
            const keywordDetailsModal = document.getElementById('keyword-details-modal');
            
            if (!addKeywordModal.classList.contains('hidden')) {
                this.hideAddKeywordModal();
            } else if (!keywordDetailsModal.classList.contains('hidden')) {
                this.hideKeywordDetailsModal();
            }
        }
    }

    async handleSaveKeyword() {
        const keywordInput = document.getElementById('keyword-input');
        const kindSelect = document.getElementById('kind-select');
        const frequencySelect = document.getElementById('frequency-select');
        
        const keyword = keywordInput.value.trim();
        const kind = kindSelect.value;
        const frequency = frequencySelect.value;
        
        // Clear previous errors
        document.getElementById('keyword-input-error').classList.add('hidden');
        document.getElementById('kind-select-error').classList.add('hidden');
        
        // Validation
        if (!keyword) {
            const errorDiv = document.getElementById('keyword-input-error');
            errorDiv.textContent = 'Please enter a keyword';
            errorDiv.classList.remove('hidden');
            keywordInput.focus();
            return;
        }
        
        if (!kind) {
            const errorDiv = document.getElementById('kind-select-error');
            errorDiv.textContent = 'Please select a type';
            errorDiv.classList.remove('hidden');
            kindSelect.focus();
            return;
        }
        
        const saveBtn = document.getElementById('save-keyword-btn');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnSpinner = saveBtn.querySelector('.btn-spinner');
        
        // Show loading state
        saveBtn.disabled = true;
        btnText.textContent = 'Adding...';
        btnSpinner.classList.remove('hidden');
        
        try {
            const result = await this.apiCall('/horizon/keywords', {
                method: 'POST',
                body: JSON.stringify({
                    keyword: keyword,
                    kind: kind,
                    frequency: frequency
                })
            });
            
            if (result.success !== false) {
                this.hideAddKeywordModal();
                
                // Clear cache and refresh horizon data to show the new keyword
                this.cache.clear();
                await this.loadHorizonData();
                
                // Show success message after refresh to confirm the keyword appears
                this.showToast(`Keyword "${keyword}" added successfully!`, 'success');
            } else {
                this.showToast(`Failed to add keyword: ${result.message || 'Unknown error'}`, 'error');
            }
            
        } catch (error) {
            console.error('Failed to save keyword:', error);
            this.showToast('Failed to add keyword. Please try again.', 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            btnText.textContent = 'Add Keyword';
            btnSpinner.classList.add('hidden');
        }
    }

    hideKeywordDetailsModal() {
        const modal = document.getElementById('keyword-details-modal');
        modal.classList.add('hidden');
    }

    handleTriggerSearch() {
        const modal = document.getElementById('keyword-details-modal');
        const keywordId = modal.getAttribute('data-keyword-id');
        
        if (!keywordId) {
            this.showToast('No keyword selected', 'error');
            return;
        }
        
        this.handleTriggerSearchForKeyword(keywordId);
    }

    filterHorizonContent() {
        const kindFilter = document.getElementById('kind-filter');
        const selectedKind = kindFilter.value;
        
        console.log('Filtering by kind:', selectedKind);
        
        // Filter keyword items only (meta summaries removed)
        const keywordItems = document.querySelectorAll('.keyword-item');
        console.log('Found keyword items:', keywordItems.length);
        
        keywordItems.forEach(item => {
            const itemKind = item.getAttribute('data-kind');
            console.log('Item kind:', itemKind, 'Selected:', selectedKind);
            
            if (!selectedKind || itemKind === selectedKind) {
                item.style.display = 'flex'; // keyword-item uses flex display
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update stats
        this.updateFilteredStats(selectedKind);
    }
    
    updateFilteredStats(selectedKind) {
        const totalKeywordsElement = document.getElementById('total-keywords');
        const allKeywords = document.querySelectorAll('.keyword-item');
        const filteredKeywords = selectedKind 
            ? document.querySelectorAll(`.keyword-item[data-kind="${selectedKind}"]`)
            : allKeywords;
        
        totalKeywordsElement.textContent = filteredKeywords.length;
    }
}

// Initialize the side panel when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new RegulatoryMonitorSidePanel();
    });
} else {
    new RegulatoryMonitorSidePanel();
}