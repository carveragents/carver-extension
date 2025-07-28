// Chrome Extension Side Panel JavaScript
class RegulatoryMonitorSidePanel {
    constructor() {
        this.apiKey = null;
        this.currentUser = null;
        this.currentScreen = 'loading';
        this.apiHost = 'http://localhost:8000'; // Default to local development
        this.apiBaseUrl = `${this.apiHost}/api/v1`;
        this.cache = new Map();
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Show loading screen initially
        this.showScreen('loading');
        this.initializeVersionDisplay();
        this.init();
    }

    async init() {
        try {
            console.log('Initializing side panel...');
            this.setupEventListeners();
            
            // Check for existing API key and host
            const result = await chrome.storage.local.get(['apiKey', 'userInfo', 'apiHost']);
            console.log('Storage result:', result);
            
            // Force localhost for development - override any stored host
            this.apiHost = 'http://localhost:8000';
            this.apiBaseUrl = `${this.apiHost}/api/v1`;
            
            // Update storage to reflect localhost
            await chrome.storage.local.set({ apiHost: this.apiHost });
            
            // Set the host dropdown to localhost
            const hostSelect = document.getElementById('host-select');
            if (hostSelect) {
                hostSelect.value = this.apiHost;
            }
            
            if (result.apiKey) {
                console.log('Found existing API key, validating...');
                this.apiKey = result.apiKey;
                // Don't use cached userInfo - always get fresh data from API validation
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
        document.getElementById('toggle-api-key-visibility')?.addEventListener('click', () => this.toggleLoginApiKeyVisibility());

        // Tab Navigation
        document.getElementById('regulatory-tab')?.addEventListener('click', () => this.switchTab('regulatory'));
        document.getElementById('horizon-tab')?.addEventListener('click', () => this.switchTab('horizon'));

        // Navigation
        document.getElementById('back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('search-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('subscriptions-back-btn')?.addEventListener('click', () => this.returnToMainFromSubscriptions());
        document.getElementById('settings-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        document.getElementById('partner-back-btn')?.addEventListener('click', () => this.showScreen('main-dashboard'));
        
        // Partner Details Screen Actions
        document.getElementById('edit-partner-btn')?.addEventListener('click', () => this.handleEditPartnerFromScreen());
        document.getElementById('delete-partner-btn')?.addEventListener('click', () => this.handleDeletePartnerFromScreen());

        // Partner Watch Event Listeners
        document.getElementById('add-partner-btn')?.addEventListener('click', () => this.showAddPartnerModal());
        document.getElementById('add-first-partner-btn')?.addEventListener('click', () => this.showAddPartnerModal());
        document.getElementById('close-partner-modal')?.addEventListener('click', () => this.hideAddPartnerModal());
        document.getElementById('cancel-partner-btn')?.addEventListener('click', () => this.hideAddPartnerModal());
        document.getElementById('save-partner-btn')?.addEventListener('click', () => this.handleSavePartner());
        document.getElementById('horizon-refresh-btn')?.addEventListener('click', () => this.refreshPartnerData());
        
        // Edit Partner Modal Event Listeners
        document.getElementById('close-edit-partner-modal')?.addEventListener('click', () => this.hideEditPartnerModal());
        document.getElementById('cancel-edit-partner-btn')?.addEventListener('click', () => this.hideEditPartnerModal());
        document.getElementById('save-edit-partner-btn')?.addEventListener('click', () => this.handleUpdatePartner());
        
        // Share Summary Modal Event Listeners
        document.getElementById('copy-share-btn')?.addEventListener('click', () => this.copyShareSummary());
        document.getElementById('close-share-modal')?.addEventListener('click', () => this.hideShareSummaryModal());
        
        // Topic Summary Share Button Event Listeners
        document.getElementById('share-topic-summary')?.addEventListener('click', () => this.showTopicSummaryModal());
        document.getElementById('close-overall-topic-summary-modal')?.addEventListener('click', () => this.hideTopicSummaryModal());
        document.getElementById('copy-overall-topic-summary-btn')?.addEventListener('click', () => this.copyTopicSummary());
        
        // Partner Summary Share Button Event Listeners
        document.getElementById('share-partner-summary')?.addEventListener('click', () => this.showPartnerSummaryModal());
        document.getElementById('close-overall-partner-summary-modal')?.addEventListener('click', () => this.hidePartnerSummaryModal());
        document.getElementById('copy-overall-partner-summary-btn')?.addEventListener('click', () => this.copyPartnerSummary());
        
        // Unsubscribe Confirmation Modal Event Listeners
        document.getElementById('close-unsubscribe-confirm-modal')?.addEventListener('click', () => this.hideUnsubscribeConfirmModal());
        document.getElementById('cancel-unsubscribe-btn')?.addEventListener('click', () => this.hideUnsubscribeConfirmModal());
        document.getElementById('confirm-unsubscribe-btn')?.addEventListener('click', () => this.confirmUnsubscribe());
        
        // Delete Partner Confirmation Modal Event Listeners
        document.getElementById('close-delete-partner-confirm-modal')?.addEventListener('click', () => this.hideDeletePartnerConfirmModal());
        document.getElementById('cancel-delete-partner-btn')?.addEventListener('click', () => this.hideDeletePartnerConfirmModal());
        document.getElementById('confirm-delete-partner-btn')?.addEventListener('click', () => this.confirmDeletePartnerFromModal());
        
        // Partner Search Event Listeners
        document.getElementById('partner-search-input')?.addEventListener('input', (e) => this.handlePartnerSearch(e.target.value));
        document.getElementById('partner-search-input')?.addEventListener('focus', () => this.showPartnerSuggestions());
        document.getElementById('partner-search-input')?.addEventListener('blur', () => setTimeout(() => this.hidePartnerSuggestions(), 200));

        // Topics Search Event Listeners
        document.getElementById('topics-search-input')?.addEventListener('input', (e) => this.handleTopicsSearch(e.target.value));
        document.getElementById('topics-search-input')?.addEventListener('focus', () => this.handleTopicsSearchFocus());
        document.getElementById('topics-search-input')?.addEventListener('blur', () => setTimeout(() => this.hideTopicsSuggestions(), 200));
        document.getElementById('search-topics-btn')?.addEventListener('click', () => this.focusTopicsSearch());
        
        // Legacy search functionality (keep for compatibility)
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
        
        // Support Modal Event Listeners
        document.getElementById('support-btn')?.addEventListener('click', () => this.showSupportModal());
        document.getElementById('close-support-modal')?.addEventListener('click', () => this.hideSupportModal());
        document.getElementById('copy-support-email-btn')?.addEventListener('click', () => this.copySupportEmail());
        
        // Make support email clickable to copy
        document.querySelector('.support-email')?.addEventListener('click', () => this.copySupportEmail());

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
        document.getElementById('partner-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSaveKeyword();
        });
        document.getElementById('frequency-select')?.addEventListener('keypress', (e) => {
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
                    
                    // Debug logging to see what user object contains
                    console.log('User object from API validation:', result.user);
                    console.log('User ID field:', result.user.id);
                    console.log('All user object keys:', Object.keys(result.user));
                    
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
        
        container.innerHTML = sortedSummaries.map(topic => {
            const isSubscribed = topic.color === '#10b981';
            return `
            <div class="topic-card" data-topic-id="${topic.tag_id}">
                <div class="topic-header">
                    <div class="topic-name">
                        <div class="topic-color" style="background-color: ${topic.color}"></div>
                        <span class="topic-title" title="${this.escapeHtml(topic.tag_name)}">${this.escapeHtml(this.truncateText(topic.tag_name, 3))}</span>
                    </div>
                    <div class="topic-meta">
                        <span>${topic.link_count} ${topic.link_count === 1 ? 'update' : 'updates'} 
                        ${topic.last_updated ? `, Updated ${this.formatActualDate(topic.last_updated)}</span>` : '<span>No recent updates</span>'}
                    </div>
                    ${isSubscribed ? `
                    <div class="topic-actions">
                        <button class="unsubscribe-tile-btn" 
                                data-topic-id="${topic.tag_id}" 
                                data-topic-name="${this.escapeHtml(topic.tag_name)}"
                                title="Unsubscribe from topic">
                            ×
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="topic-summary">
                    ${this.escapeHtml(this.cleanSummaryText(topic.meta_summary))}
                </div>
            </div>
            `;
        }).join('');
        
        // Add click listeners for topic cards
        const topicCards = container.querySelectorAll('.topic-card');
        topicCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't navigate to details if clicking on action buttons
                if (e.target.classList.contains('unsubscribe-tile-btn')) {
                    return;
                }
                const topicId = e.currentTarget.getAttribute('data-topic-id');
                this.showTopicDetails(topicId);
            });
        });
        
        // Add listeners for unsubscribe buttons in tiles
        container.querySelectorAll('.unsubscribe-tile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const topicId = e.target.getAttribute('data-topic-id');
                const topicName = e.target.getAttribute('data-topic-name');
                this.showUnsubscribeConfirmModal(topicId, topicName, 'tile');
            });
        });
    }

    async showTopicDetails(topicId) {
        try {
            console.log(`Loading topic details for: ${topicId}`);
            this.showScreen('tag-details');
            
            const topicDetails = await this.apiCall(`/extension/topics/${topicId}/details`);
            
            // Check if user is subscribed to this topic
            const isSubscribed = await this.isUserSubscribedToTopic(topicId);
            
            // Update topic details
            document.getElementById('tag-details-title').textContent = topicDetails.topic_name;
            
            
            // Show/hide content based on subscription status
            const metaSummarySection = document.querySelector('.meta-summary');
            const linkSummariesSection = document.querySelector('.link-summaries');
            const subscribeBtn = document.getElementById('subscribe-tag-btn');
            
            if (isSubscribed) {
                // Show all content for subscribed users
                document.getElementById('tag-meta-summary').innerHTML = this.formatMetaSummary(topicDetails.meta_summary);
                document.getElementById('tag-last-updated').textContent = 
                    topicDetails.last_updated ? `Last updated: ${this.formatDate(topicDetails.last_updated)}` : 'No recent updates';
                
                // Render feed entries
                this.renderFeedEntries(topicDetails.feed_entries);
                
                // Show summary sections
                metaSummarySection?.classList.remove('hidden');
                linkSummariesSection?.classList.remove('hidden');
                
                // Hide subscribe button for subscribed users
                subscribeBtn?.classList.add('hidden');
            } else {
                // Hide summaries for non-subscribed users
                metaSummarySection?.classList.add('hidden');
                linkSummariesSection?.classList.add('hidden');
                
                // Show subscribe button for non-subscribed users
                subscribeBtn?.classList.remove('hidden');
            }
            
            // Update subscribe button state (only if visible)
            if (!isSubscribed) {
                await this.updateSubscribeButton(topicId);
            }
            
        } catch (error) {
            console.error('Failed to load topic details:', error);
            this.showError('Failed to load topic details');
        }
    }

    async isUserSubscribedToTopic(topicId) {
        try {
            const subscriptions = await this.apiCall('/extension/subscriptions');
            const subscriptionsArray = Array.isArray(subscriptions) ? subscriptions : [];
            
            return subscriptionsArray.some(sub => 
                sub.topic_id === topicId || sub.subscription_value === topicId
            );
        } catch (error) {
            console.error('Failed to check subscription status:', error);
            return false;
        }
    }

    renderFeedEntries(feedEntries) {
        const container = document.getElementById('link-list');
        
        if (!feedEntries || feedEntries.length === 0) {
            container.innerHTML = '<p class="no-summary">No recent updates available yet.</p>';
            return;
        }

        // Sort entries by published date (latest first)
        const sortedEntries = [...feedEntries].sort((a, b) => {
            const dateA = new Date(a.published_date);
            const dateB = new Date(b.published_date);
            return dateB - dateA;
        });

        container.innerHTML = sortedEntries.map(entry => `
            <div class="link-item" data-entry-id="${entry.entry_id}">
                <div class="link-header">
                    <div class="link-title">
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="link-title-text" title="${this.escapeHtml(entry.title)}">
                            ${this.escapeHtml(this.truncateText(entry.title, 5))}
                        </a>
                    </div>
                    <div class="link-meta">
                        <span>${this.formatActualDate(entry.published_date)}</span>
                    </div>
                    <div class="link-actions">
                        <button class="link-action-icon" data-action="share_summary" data-entry-id="${entry.entry_id}" data-entry-url="${this.escapeHtml(entry.link)}" data-entry-title="${this.escapeHtml(entry.title)}" data-entry-summary="${this.escapeHtml(entry.one_line_summary || entry.content_preview || '')}" title="Share Summary">
                            📤
                        </button>
                        <button class="link-action-icon disabled" disabled title="Extract Names (Coming Soon)">
                            👥
                        </button>
                        <button class="link-action-icon disabled" disabled title="Extract Timelines (Coming Soon)">
                            📅
                        </button>
                    </div>
                </div>
                <div class="link-summary-text">${this.escapeHtml(entry.one_line_summary || entry.content_preview || 'No summary available')}</div>
            </div>
        `).join('');
        
        // Add event listeners for action buttons
        this.addActionButtonListeners(container);
    }
    
    addActionButtonListeners(container) {
        const actionButtons = container.querySelectorAll('.link-action[data-action], .link-action-icon[data-action]');
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
                // Get the data from button attributes
                const title = actionButton.getAttribute('data-entry-title') || 'No title';
                const fivePointSummary = actionButton.getAttribute('data-entry-five-point');
                const basicSummary = actionButton.getAttribute('data-entry-summary') || 'No summary available';
                
                // Use five-point summary if available, otherwise fall back to basic summary
                const summary = fivePointSummary && fivePointSummary.trim() ? fivePointSummary : basicSummary;
                
                this.showShareSummaryModal(title, url, summary);
                
                // Reset button state immediately since this is not async
                actionButton.disabled = false;
                actionButton.classList.remove('loading');
                actionButton.innerHTML = originalText;
                allButtons.forEach(btn => btn.disabled = false);
                return; // Exit early, don't go to finally block
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
            
            // Store keywords data for partner search
            this.allPartners = keywords;
            
        } catch (error) {
            console.error('Failed to load horizon content:', error);
            this.showError('Failed to load Horizon Watch data');
        }
    }

    renderHorizonDashboard(data) {
        // Show/hide empty state based only on keywords
        const emptyState = document.getElementById('partner-empty-state');
        const keywordsContainer = document.getElementById('partners-list');
        
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
        const container = document.getElementById('partners-list');
        
        if (!keywords || keywords.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            ${keywords.map((keyword, index) => {
                // Calculate aggregated sentiment from feed entries
                const aggregatedSentiment = this.calculateSentiment(keyword.feed_entries);
                const sentimentDot = this.renderSentimentDot(aggregatedSentiment);
                
                // Get one-line summary
                const summary = keyword.meta_summary || 'No summary available';
                const truncatedSummary = this.truncateText(this.cleanSummaryText(summary), 150);
                
                return `
                    <div class="topic-card partner-card" data-keyword-id="${keyword.keyword_id}" data-kind="${keyword.kind}">
                        <div class="topic-header">
                            <div class="topic-name">
                                <span class="topic-title" title="${this.escapeHtml(keyword.keyword)}">${this.escapeHtml(this.truncateText(keyword.keyword, 5))}</span>
                            </div>
                            <div class="topic-meta">
                                <span>${keyword.sources_count || 0} sources</span>
                                ${keyword.last_updated ? `, ${this.formatActualDate(keyword.last_updated)}` : ', No recent updates'}
                            </div>
                            <div class="partner-actions">
                                <button class="btn btn-small btn-secondary edit-partner" data-keyword-id="${keyword.keyword_id}" data-keyword-name="${this.escapeHtml(keyword.keyword)}" data-keyword-frequency="${keyword.frequency || 'daily'}" title="Edit Partner">
                                    ✎
                                </button>
                                <button class="btn btn-small btn-secondary delete-partner" data-keyword-id="${keyword.keyword_id}" data-keyword-name="${this.escapeHtml(keyword.keyword)}" title="Delete Partner">
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div class="partner-sentiment">
                            <span>Sentiment: ${this.capitalize(aggregatedSentiment)}</span>
                        </div>
                        <div class="topic-summary">
                            ${this.escapeHtml(truncatedSummary)}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        
        // Add event listeners for partner cards
        container.querySelectorAll('.partner-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger card click if clicking on action buttons
                if (!e.target.classList.contains('edit-partner') && 
                    !e.target.classList.contains('delete-partner') &&
                    !e.target.closest('.partner-actions')) {
                    const keywordId = e.currentTarget.getAttribute('data-keyword-id');
                    this.showPartnerDetails(keywordId);
                }
            });
        });
        
        container.querySelectorAll('.edit-partner').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const keywordId = e.target.getAttribute('data-keyword-id');
                const keywordName = e.target.getAttribute('data-keyword-name');
                const frequency = e.target.getAttribute('data-keyword-frequency');
                this.showEditPartnerModal(keywordId, keywordName, frequency);
            });
        });
        
        container.querySelectorAll('.delete-partner').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const keywordId = e.target.getAttribute('data-keyword-id');
                const keywordName = e.target.getAttribute('data-keyword-name');
                this.confirmDeletePartner(keywordId, keywordName);
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
            const userId = this.getUserId();
            if (!userId) {
                console.log('User information not available for subscription check');
                return;
            }
            
            const subscriptions = await this.apiCall(`/core/users/${userId}/topics/subscriptions`);
            const subscriptionsArray = Array.isArray(subscriptions) ? subscriptions : [];
            const isSubscribed = subscriptionsArray.some(sub => 
                sub.topic_id === topicId || sub.subscription_value === topicId
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

    getUserId() {
        if (!this.currentUser) {
            console.error('No current user available');
            return null;
        }
        
        
        // The API now correctly returns the UUID in the 'id' field
        // This should contain the UUID (98d34273-d703-43a9-ae57-fd8fa1b1d4a4)
        const userId = this.currentUser.id;
        
        if (!userId) {
            console.error('No user ID found in user object. Current user object:', this.currentUser);
            console.error('Available user properties:', Object.keys(this.currentUser));
            return null;
        }
        
        return userId;
    }

    async subscribeToTopic(topicId) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('User UUID not available. Please check backend API configuration.', 'error');
                return;
            }

            console.log(`Subscribing to topic ${topicId} for user ${userId}`);
            await this.apiCall(`/core/users/${userId}/topics/${topicId}/subscribe`, {
                method: 'POST'
            });
            
            this.showToast('Successfully subscribed to topic!', 'success');
            
            // Refresh regulatory data to show updated subscription status
            this.cache.clear();
            await this.loadRegulatoryData();
            
            // Navigate back to regulatory screen
            this.showScreen('main-dashboard');
            
        } catch (error) {
            console.error('Failed to subscribe to topic:', error);
            this.showToast('Failed to subscribe to topic. Please try again.', 'error');
        }
    }

    async unsubscribeFromTopic(topicId) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('User UUID not available. Please check backend API configuration.', 'error');
                return;
            }

            console.log(`Unsubscribing from topic ${topicId} for user ${userId}`);
            await this.apiCall(`/core/users/${userId}/topics/${topicId}/unsubscribe`, {
                method: 'DELETE'
            });
            
            this.showToast('Successfully unsubscribed from topic!', 'success');
            
            // Refresh regulatory data to show updated subscription status
            this.cache.clear();
            await this.loadRegulatoryData();
            
            // Navigate back to regulatory screen
            this.showScreen('main-dashboard');
            
        } catch (error) {
            console.error('Failed to unsubscribe from topic:', error);
            this.showToast('Failed to unsubscribe from topic. Please try again.', 'error');
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

    async refreshData() {
        // Clear cache and reload data
        this.cache.clear();
        
        // Refresh topics list for search suggestions
        this.allTopics = null;
        await this.loadAllTopics();
        
        if (this.currentScreen === 'main-dashboard') {
            this.loadRegulatoryData();
        }
        
        // If search suggestions are currently showing, refresh them
        const suggestionsContainer = document.getElementById('topics-suggestions');
        if (suggestionsContainer && !suggestionsContainer.classList.contains('hidden')) {
            const searchInput = document.getElementById('topics-search-input');
            const currentValue = searchInput ? searchInput.value.trim() : '';
            await this.handleTopicsSearch(currentValue);
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
        
        // Populate user profile data
        const userNameElement = document.getElementById('user-profile-name');
        const userEmailElement = document.getElementById('user-profile-email');
        
        if (this.currentUser && userNameElement && userEmailElement) {
            userNameElement.textContent = this.currentUser.name || 'Unknown User';
            userEmailElement.textContent = this.currentUser.email || 'No email available';
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

    toggleLoginApiKeyVisibility() {
        const input = document.getElementById('api-key-input');
        const toggleBtn = document.getElementById('toggle-api-key-visibility');
        
        if (input && toggleBtn) {
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.textContent = 'Hide';
            } else {
                input.type = 'password';
                toggleBtn.textContent = 'Show';
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

    cleanSummaryText(text) {
        if (!text) return '';
        
        // Remove leading special characters and whitespace
        // Keep removing until we find an alphanumeric character
        return text.replace(/^[^a-zA-Z0-9]+/, '').trim();
    }

    calculateSentiment(feedEntries) {
        if (!feedEntries || feedEntries.length === 0) {
            return 'neutral';
        }

        const sentimentCounts = {
            positive: 0,
            negative: 0,
            neutral: 0
        };

        console.log('--- SENTIMENT ANALYSIS DEBUG ---');
        console.log('Feed entries count:', feedEntries.length);

        feedEntries.forEach((entry, index) => {
            const rawSentiment = entry.sentiment;
            const sentiment = entry.sentiment ? entry.sentiment.toLowerCase() : 'neutral';
            
            console.log(`Entry ${index + 1}:`, {
                title: entry.title?.substring(0, 50) + ' ...',
                rawSentiment: rawSentiment,
                processedSentiment: sentiment,
                sentimentScore: entry.sentiment_score
            });
            
            if (sentimentCounts.hasOwnProperty(sentiment)) {
                sentimentCounts[sentiment]++;
            } else {
                console.log(`Unknown sentiment "${sentiment}", defaulting to neutral`);
                sentimentCounts.neutral++;
            }
        });

        console.log('Sentiment counts:', sentimentCounts);

        // Find the sentiment with the highest count
        const maxCount = Math.max(...Object.values(sentimentCounts));
        const dominantSentiment = Object.keys(sentimentCounts).find(
            sentiment => sentimentCounts[sentiment] === maxCount
        );

        console.log('Dominant sentiment:', dominantSentiment);
        console.log('--- END SENTIMENT DEBUG ---');

        return dominantSentiment;
    }

    renderSentimentDot(sentiment) {
        const sentimentColors = {
            positive: '🟢',
            negative: '🔴',
            neutral: '🟡'
        };
        
        return sentimentColors[sentiment] || sentimentColors.neutral;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + ' ...';
    }

    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    formatMetaSummary(summaryText) {
        if (!summaryText) return '<p class="no-summary">No summary available yet</p>';
        
        // Split by various newline patterns to get individual points
        let points = [];
        
        // Try different splitting patterns
        if (summaryText.includes('\\n\\n')) {
            points = summaryText.split('\\n\\n');
        } else if (summaryText.includes('\n\n')) {
            points = summaryText.split('\n\n');
        } else if (summaryText.includes('- ')) {
            // Split by dash patterns
            points = summaryText.split(/- (?=[^-])/).filter(p => p.trim());
        } else {
            // If no clear separators, treat as single point
            points = [summaryText];
        }
        
        // Clean up points
        points = points.filter(point => point.trim()).map(point => point.trim().replace(/^- /, ''));
        
        if (points.length === 0) {
            return '<p class="no-summary">No summary available yet</p>';
        }
        
        // Format each point as a smaller text element with bullets
        return `<div class="meta-summary-content">
            ${points.map(point => `<p class="summary-point">• ${this.escapeHtml(point)}</p>`).join('')}
        </div>`;
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

    formatActualDate(dateString) {
        try {
            const date = new Date(dateString);
            const day = date.getDate();
            const suffix = this.getOrdinalSuffix(day);
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            return `${month} ${day}${suffix}, ${year}`;
        } catch (error) {
            return 'Unknown date';
        }
    }

    getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
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

    renderKeywordFeedEntries(feedEntries, container) {
        if (!feedEntries || feedEntries.length === 0) {
            container.innerHTML = '<p class="no-summary">No individual summaries available yet.</p>';
            return;
        }

        container.innerHTML = feedEntries.map(entry => `
            <div class="link-item" data-entry-id="${entry.entry_id}">
                <div class="link-title">
                    <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="link-title-text">
                        ${this.escapeHtml(this.truncateText(entry.title, 80))}
                    </a>
                </div>
                <div class="entry-sentiment">
                    <span>Sentiment: ${this.capitalize(entry.sentiment || 'neutral')}</span>
                </div>
                <div class="link-summary-text">${this.escapeHtml(entry.one_line_summary || entry.content_preview || 'No summary available')}</div>
                <div class="link-actions">
                    <button class="link-action" data-action="share_summary" data-entry-id="${entry.entry_id}" data-entry-url="${this.escapeHtml(entry.link)}" data-entry-title="${this.escapeHtml(entry.title)}" data-entry-summary="${this.escapeHtml(entry.one_line_summary || entry.content_preview || '')}" data-entry-five-point="${this.escapeHtml(entry.five_point_summary || '')}">
                        ${this.getActionLabel('share_summary')}
                    </button>
                    <button class="link-action disabled" disabled title="Coming Soon">
                        ${this.getActionLabel('extract_names')} <span class="coming-soon">Coming Soon</span>
                    </button>
                    <button class="link-action disabled" disabled title="Coming Soon">
                        ${this.getActionLabel('extract_timelines')} <span class="coming-soon">Coming Soon</span>
                    </button>
                </div>
                <div class="link-meta">
                    Published: ${this.formatDateTime(entry.published_date)}
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
            
            if (!this.currentUser) {
                this.showError('User information not available');
                return;
            }
            
            // Debug logging for subscription API call
            console.log('Current user object:', this.currentUser);
            console.log('Available user properties:', Object.keys(this.currentUser));
            
            const userId = this.getUserId();
            if (!userId) {
                this.showError('User ID not available');
                return;
            }
            
            console.log('Using user ID for subscriptions:', userId);
            console.log('Making API call to:', `/core/users/${userId}/topics/subscriptions`);
            
            const subscriptions = await this.apiCall(`/core/users/${userId}/topics/subscriptions`);
            this.renderSubscriptions(subscriptions);
            
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
            this.showError('Failed to load subscriptions');
        }
    }

    renderSubscriptions(response) {
        const container = document.getElementById('subscriptions-list');
        const emptyState = document.getElementById('subscriptions-empty-state');
        
        // Handle the API response structure: {subscriptions: Array, total_count: Number}
        const subscriptions = response.subscriptions || response;
        
        if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = subscriptions.map(sub => `
            <div class="subscription-item">
                <div class="subscription-info">
                    <div class="subscription-name">${this.escapeHtml(sub.name || sub.topic_name || sub.subscription_name)}</div>
                    <div class="subscription-description">${this.escapeHtml(sub.description || '')}</div>
                </div>
                <div class="subscription-actions">
                    <button class="btn btn-small btn-danger unsubscribe-btn" data-topic-id="${sub.id}">
                        Unsubscribe
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.unsubscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const topicId = e.target.getAttribute('data-topic-id');
                this.unsubscribeFromTopicInList(topicId);
            });
        });
    }

    async unsubscribeFromTopicInList(topicId) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('User information not available', 'error');
                return;
            }

            console.log(`Unsubscribing from topic ${topicId} for user ${userId} (from list)`);
            await this.apiCall(`/core/users/${userId}/topics/${topicId}/unsubscribe`, {
                method: 'DELETE'
            });
            
            this.showToast('Successfully unsubscribed from topic!', 'success');
            
            // Refresh the subscriptions list
            await this.showSubscriptions();
            
            // Clear cache and refresh regulatory data to update subscription indicators
            this.cache.clear();
            
        } catch (error) {
            console.error('Failed to unsubscribe from topic:', error);
            this.showToast('Failed to unsubscribe. Please try again.', 'error');
        }
    }

    // Legacy method - keeping for compatibility but updating to use new API
    async unsubscribe(subscriptionId) {
        // This is a fallback method that may be called from other parts of the code
        console.log('Legacy unsubscribe method called, this should be updated to use topic-based unsubscribe');
        this.showToast('Please use the topic-based unsubscribe feature', 'warning');
    }

    changeApiKey() {
        this.showScreen('api-key-setup');
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
        
        container.innerHTML = headerHTML + results.map(topic => {
            const isSubscribed = topic.color === '#10b981';
            console.log('Rendering search result:', topic.tag_name, 'isSubscribed:', isSubscribed);
            return `
            <div class="search-result-item" data-topic-id="${topic.tag_id}">
                <div class="search-result-header">
                    <div class="search-result-title">
                        <div class="topic-color" style="background-color: ${topic.color}; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px;"></div>
                        ${this.escapeHtml(topic.tag_name)}
                    </div>
                    <button class="search-subscribe-btn" 
                            data-topic-id="${topic.tag_id}" 
                            data-topic-name="${this.escapeHtml(topic.tag_name)}"
                            style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; color: ${isSubscribed ? '#10b981' : '#6b7280'};"
                            title="${isSubscribed ? 'Unsubscribe from topic' : 'Subscribe to topic'}">
                        ${isSubscribed ? '★' : '☆'}
                    </button>
                </div>
                <div class="search-result-description">
                    ${this.escapeHtml(topic.description || topic.meta_summary || 'No description available')}
                </div>
            </div>
            `;
        }).join('');
        
        // Add listeners for subscribe buttons in search results
        const subscribeButtons = container.querySelectorAll('.search-subscribe-btn');
        console.log('Found subscribe buttons in search results:', subscribeButtons.length);
        subscribeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Subscribe button clicked!');
                const topicId = e.target.getAttribute('data-topic-id');
                const topicName = e.target.getAttribute('data-topic-name');
                const isSubscribed = e.target.textContent.trim() === '★';
                
                console.log('Topic:', topicName, 'isSubscribed:', isSubscribed);
                
                if (isSubscribed) {
                    this.showUnsubscribeConfirmModal(topicId, topicName, 'search');
                } else {
                    this.subscribeToTopicFromSearch(topicId, topicName);
                }
            });
        });
    }

    showAddKeywordModal() {
        const modal = document.getElementById('add-partner-modal');
        modal.classList.remove('hidden');
        
        // Clear form
        document.getElementById('partner-input').value = '';
        document.getElementById('frequency-select').value = '';
        document.getElementById('frequency-select').value = 'daily';
        
        // Reset button state
        const saveBtn = document.getElementById('save-partner-btn');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnSpinner = saveBtn.querySelector('.btn-spinner');
        
        saveBtn.disabled = false;
        btnText.textContent = 'Add Keyword';
        btnSpinner.classList.add('hidden');
        
        // Focus on keyword input
        document.getElementById('partner-input').focus();
        
        // Add ESC key handler
        document.addEventListener('keydown', this.handleModalEscKey.bind(this));
    }

    hideAddKeywordModal() {
        const modal = document.getElementById('add-partner-modal');
        modal.classList.add('hidden');
        
        // Remove ESC key handler
        document.removeEventListener('keydown', this.handleModalEscKey.bind(this));
    }
    
    handleModalEscKey(event) {
        if (event.key === 'Escape') {
            const addPartnerModal = document.getElementById('add-partner-modal');
            const partnerDetailsModal = document.getElementById('partner-details-modal');
            
            if (!addPartnerModal.classList.contains('hidden')) {
                this.hideAddKeywordModal();
            } else if (!partnerDetailsModal.classList.contains('hidden')) {
                this.hideKeywordDetailsModal();
            }
        }
    }

    async handleSaveKeyword() {
        const partnerInput = document.getElementById('partner-input');
        const frequencySelect = document.getElementById('frequency-select');
        
        const keyword = partnerInput.value.trim();
        const frequency = frequencySelect.value;
        
        // Clear previous errors
        document.getElementById('partner-input-error').classList.add('hidden');
        document.getElementById('frequency-select-error').classList.add('hidden');
        
        // Validation
        if (!keyword) {
            const errorDiv = document.getElementById('partner-input-error');
            errorDiv.textContent = 'Please enter a keyword';
            errorDiv.classList.remove('hidden');
            partnerInput.focus();
            return;
        }
        
        if (!kind) {
            const errorDiv = document.getElementById('frequency-select-error');
            errorDiv.textContent = 'Please select a type';
            errorDiv.classList.remove('hidden');
            frequencySelect.focus();
            return;
        }
        
        const saveBtn = document.getElementById('save-partner-btn');
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
        const modal = document.getElementById('partner-details-modal');
        modal.classList.add('hidden');
    }

    handleTriggerSearch() {
        const modal = document.getElementById('partner-details-modal');
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
        
        // Filter partner cards only
        const partnerCards = document.querySelectorAll('.partner-card');
        console.log('Found partner cards:', partnerCards.length);
        
        partnerCards.forEach(card => {
            const itemKind = card.getAttribute('data-kind');
            console.log('Item kind:', itemKind, 'Selected:', selectedKind);
            
            if (!selectedKind || itemKind === selectedKind) {
                card.style.display = 'block'; // partner-card uses block display
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update stats
        this.updateFilteredStats(selectedKind);
    }
    
    updateFilteredStats(selectedKind) {
        const totalKeywordsElement = document.getElementById('total-keywords');
        const allPartners = document.querySelectorAll('.partner-card');
        const filteredPartners = selectedKind 
            ? document.querySelectorAll(`.partner-card[data-kind="${selectedKind}"]`)
            : allPartners;
        
        totalKeywordsElement.textContent = filteredPartners.length;
    }

    // Partner Search Methods
    async handlePartnerSearch(query) {
        if (!query.trim()) {
            this.hidePartnerSuggestions();
            // Clear filter to show all partners when search is empty
            this.filterPartnersDisplay(null);
            return;
        }

        try {
            // Get all partners for filtering - they're loaded when horizon data loads
            if (!this.allPartners) {
                console.log('No partner data loaded yet');
                this.hidePartnerSuggestions();
                return;
            }

            const filteredPartners = this.allPartners.filter(partner => 
                partner.keyword.toLowerCase().includes(query.toLowerCase())
            );

            this.showPartnerSuggestions(filteredPartners.slice(0, 10)); // Show top 10 matches
        } catch (error) {
            console.error('Partner search failed:', error);
        }
    }


    showPartnerSuggestions(partners = []) {
        const suggestionsContainer = document.getElementById('partner-suggestions');
        if (!suggestionsContainer) return;

        if (partners.length === 0) {
            this.hidePartnerSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = partners.map(partner => `
            <div class="partner-suggestion" data-partner-id="${partner.keyword_id}">
                <div class="partner-suggestion-name">${this.escapeHtml(partner.keyword)}</div>
                <div class="partner-suggestion-description">${this.escapeHtml(partner.kind || '')}</div>
            </div>
        `).join('');

        // Add click handlers
        suggestionsContainer.querySelectorAll('.partner-suggestion').forEach(item => {
            item.addEventListener('click', (e) => {
                const partnerId = e.currentTarget.getAttribute('data-partner-id');
                const partnerName = e.currentTarget.querySelector('.partner-suggestion-name').textContent;
                this.selectPartner(partnerId, partnerName);
            });
        });

        suggestionsContainer.classList.remove('hidden');
    }

    hidePartnerSuggestions() {
        const suggestionsContainer = document.getElementById('partner-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    selectPartner(partnerId, partnerName) {
        document.getElementById('partner-search-input').value = partnerName;
        this.hidePartnerSuggestions();
        
        // Filter the partners list to show only the selected partner
        this.filterPartnersDisplay(partnerId);
    }

    filterPartnersDisplay(selectedPartnerId = null) {
        const partnersContainer = document.getElementById('partners-list');
        if (!partnersContainer || !this.allPartners) return;

        let partnersToShow = this.allPartners;
        
        // If a specific partner is selected, filter to show only that partner
        if (selectedPartnerId) {
            partnersToShow = this.allPartners.filter(partner => 
                partner.keyword_id.toString() === selectedPartnerId.toString()
            );
        }

        // Re-render the keywords list with filtered data
        this.renderKeywordsList(partnersToShow);
        
        // Also update the dashboard to reflect filtered state
        const filteredData = {
            total_keywords: partnersToShow.length,
            summaries_today: 0,
            recent_meta_summaries: partnersToShow.filter(k => k.meta_summary && k.meta_summary !== `No summaries available for '${k.keyword}'`)
        };
        this.renderHorizonDashboard(filteredData);
    }

    clearPartnerFilter() {
        // Clear search input and show all partners
        const searchInput = document.getElementById('partner-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.filterPartnersDisplay(null);
    }

    // Topics Search Methods
    async handleTopicsSearch(query) {
        try {
            // Get all topics for filtering
            if (!this.allTopics) {
                await this.loadAllTopics();
            }

            if (!query.trim()) {
                // Show all topics when no query (pre-loaded list)
                await this.showTopicsSuggestions(this.allTopics.slice(0, 15)); // Show top 15 topics
                return;
            }

            const filteredTopics = this.allTopics.filter(topic => 
                topic.tag_name.toLowerCase().includes(query.toLowerCase()) ||
                (topic.description && topic.description.toLowerCase().includes(query.toLowerCase()))
            );
            await this.showTopicsSuggestions(filteredTopics.slice(0, 10)); // Show top 10 matches
        } catch (error) {
            console.error('Topics search failed:', error);
        }
    }

    async loadAllTopics() {
        try {
            // Load all available topics from the API
            const response = await this.apiCall('/extension/topics/all');
            this.allTopics = response.topics || response || [];
        } catch (error) {
            console.error('Failed to load topics:', error);
            this.allTopics = [];
        }
    }

    async showTopicsSuggestions(topics = []) {
        const suggestionsContainer = document.getElementById('topics-suggestions');
        if (!suggestionsContainer) return;

        if (topics.length === 0) {
            this.hideTopicsSuggestions();
            return;
        }

        // Get current subscriptions to show correct subscribe button state
        let subscribedTopicIds = [];
        try {
            const subscriptions = await this.apiCall('/extension/subscriptions');
            const subscriptionsArray = Array.isArray(subscriptions) ? subscriptions : [];
            subscribedTopicIds = subscriptionsArray.map(sub => sub.topic_id || sub.subscription_value);
        } catch (error) {
            console.error('Failed to get user subscriptions for suggestions:', error);
        }

        suggestionsContainer.innerHTML = topics.map(topic => {
            const isSubscribed = subscribedTopicIds.includes(topic.tag_id);
            return `
                <div class="topic-suggestion" data-topic-id="${topic.tag_id}">
                    <div class="topic-suggestion-content">
                        <div class="topic-suggestion-name">${this.escapeHtml(topic.tag_name)}</div>
                        <div class="topic-suggestion-description">${this.escapeHtml(topic.description || '')}</div>
                    </div>
                    <button class="topic-suggestion-subscribe-btn" 
                            data-topic-id="${topic.tag_id}" 
                            data-topic-name="${this.escapeHtml(topic.tag_name)}"
                            title="${isSubscribed ? 'Unsubscribe from topic' : 'Subscribe to topic'}">
                        ${isSubscribed ? '★' : '☆'}
                    </button>
                </div>
            `;
        }).join('');

        // Add click handlers for topic selection
        suggestionsContainer.querySelectorAll('.topic-suggestion').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't navigate to details if clicking on subscribe button
                if (e.target.classList.contains('topic-suggestion-subscribe-btn')) {
                    return;
                }
                
                // Check if user is subscribed to this topic
                const topicId = e.currentTarget.getAttribute('data-topic-id');
                const subscribeBtn = e.currentTarget.querySelector('.topic-suggestion-subscribe-btn');
                const isSubscribed = subscribeBtn && subscribeBtn.textContent.trim() === '★';
                
                if (!isSubscribed) {
                    // Show a message that they need to subscribe first
                    this.showToast('Please subscribe to this topic to view details', 'info');
                    return;
                }
                
                const topicName = e.currentTarget.querySelector('.topic-suggestion-name').textContent;
                this.selectTopic(topicId, topicName);
            });
        });

        // Add click handlers for subscribe buttons
        suggestionsContainer.querySelectorAll('.topic-suggestion-subscribe-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const topicId = e.target.getAttribute('data-topic-id');
                const topicName = e.target.getAttribute('data-topic-name');
                const isCurrentlySubscribed = e.target.textContent.trim() === '★';
                
                if (isCurrentlySubscribed) {
                    this.showUnsubscribeConfirmModal(topicId, topicName, 'suggestions');
                } else {
                    await this.subscribeToTopicFromSuggestions(topicId, topicName);
                }
            });
        });

        suggestionsContainer.classList.remove('hidden');
    }

    hideTopicsSuggestions() {
        const suggestionsContainer = document.getElementById('topics-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    selectTopic(topicId, topicName) {
        document.getElementById('topics-search-input').value = topicName;
        this.hideTopicsSuggestions();
        // Show topic details
        this.showTopicDetails(topicId);
    }

    focusTopicsSearch() {
        const searchInput = document.getElementById('topics-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    async handleTopicsSearchFocus() {
        // Show pre-loaded topics list when input is focused
        const searchInput = document.getElementById('topics-search-input');
        const currentValue = searchInput ? searchInput.value.trim() : '';
        
        // Trigger search to show either filtered results or all topics
        await this.handleTopicsSearch(currentValue);
    }

    async subscribeToTopicFromSuggestions(topicId, topicName) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('Please log in to subscribe to topics', 'error');
                return;
            }

            await this.apiCall(`/core/users/${userId}/topics/${topicId}/subscribe`, {
                method: 'POST'
            });
            
            this.showToast(`Successfully subscribed to "${topicName}"!`, 'success');
            
            // Refresh the suggestions to show updated subscription status
            const searchInput = document.getElementById('topics-search-input');
            const currentValue = searchInput ? searchInput.value.trim() : '';
            await this.handleTopicsSearch(currentValue);
            
            // Refresh main regulatory data to show updated subscription status
            this.cache.clear();
            await this.loadRegulatoryData();
            
        } catch (error) {
            console.error('Failed to subscribe to topic:', error);
            this.showToast('Failed to subscribe to topic. Please try again.', 'error');
        }
    }

    async showPartnerDetails(keywordId) {
        try {
            console.log(`Loading partner details for: ${keywordId}`);
            this.showScreen('partner-details');
            
            // Load keyword details from extension API
            const keywordDetails = await this.apiCall(`/extension/horizon/keywords/${keywordId}/details`);
            
            console.log('Partner details received:', keywordDetails);
            
            // Validate response
            if (!keywordDetails || !keywordDetails.topic_name) {
                throw new Error('Invalid partner details response');
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
            
            // Update partner details screen
            document.getElementById('partner-details-title').textContent = `${keywordName}`;
            
            // Show meta summary if available
            const metaSummaryContainer = document.getElementById('partner-screen-meta-summary');
            const hasRealSummary = keywordDetails.meta_summary && 
                                 !keywordDetails.meta_summary.includes('No meta summary available');
            
            if (hasRealSummary) {
                metaSummaryContainer.innerHTML = this.formatMetaSummary(keywordDetails.meta_summary);
            } else {
                metaSummaryContainer.innerHTML = '<p class="no-summary">No summary available yet</p>';
            }
            
            // Update last updated
            const lastUpdatedElement = document.getElementById('partner-screen-last-updated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = keywordDetails.last_updated ? 
                    `Last updated: ${this.formatDate(keywordDetails.last_updated)}` : 
                    'No recent updates';
            }
            
            // Show feed entries
            const feedListContainer = document.getElementById('partner-feed-list');
            if (keywordDetails.feed_entries && keywordDetails.feed_entries.length > 0) {
                this.renderPartnerScreenFeedEntries(keywordDetails.feed_entries, feedListContainer);
                
                // Calculate and show aggregated sentiment
                const aggregatedSentiment = this.calculateSentiment(keywordDetails.feed_entries);
                this.showPartnerSentimentIndicator(aggregatedSentiment);
            } else {
                feedListContainer.innerHTML = '<p class="no-summary">No recent updates available yet.</p>';
            }
            
            // Store keyword ID and data for edit/delete actions
            const screen = document.getElementById('partner-details');
            screen.setAttribute('data-keyword-id', keywordId);
            screen.setAttribute('data-keyword-name', keywordName);
            
        } catch (error) {
            console.error('Failed to load partner details:', error);
            this.showToast('Failed to load partner details', 'error');
            this.showScreen('main-dashboard');
        }
    }

    renderPartnerScreenFeedEntries(feedEntries, container) {
        if (!feedEntries || feedEntries.length === 0) {
            container.innerHTML = '<p class="no-summary">No recent updates available yet.</p>';
            return;
        }

        // Sort entries by published date (latest first)
        const sortedEntries = [...feedEntries].sort((a, b) => {
            const dateA = new Date(a.published_date);
            const dateB = new Date(b.published_date);
            return dateB - dateA;
        });

        container.innerHTML = sortedEntries.map(entry => `
            <div class="link-item" data-entry-id="${entry.entry_id}">
                <div class="link-header">
                    <div class="link-title">
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="link-title-text" title="${this.escapeHtml(entry.title)}">
                            ${this.escapeHtml(this.truncateText(entry.title, 5))}
                        </a>
                    </div>
                    <div class="link-meta">
                        <span>${this.formatActualDate(entry.published_date)}</span>
                    </div>
                    <div class="link-actions">
                        <button class="link-action-icon" data-action="share_summary" data-entry-id="${entry.entry_id}" data-entry-url="${this.escapeHtml(entry.link)}" data-entry-title="${this.escapeHtml(entry.title)}" data-entry-summary="${this.escapeHtml(entry.one_line_summary || entry.content_preview || '')}" data-entry-five-point="${this.escapeHtml(entry.five_point_summary || '')}" title="Share Summary">
                            📤
                        </button>
                        <button class="link-action-icon disabled" disabled title="Extract Names (Coming Soon)">
                            👥
                        </button>
                        <button class="link-action-icon disabled" disabled title="Extract Timelines (Coming Soon)">
                            📅
                        </button>
                    </div>
                </div>
                <div class="entry-sentiment">
                    <span>Sentiment: ${this.capitalize(entry.sentiment || 'neutral')}</span>
                </div>
                <div class="link-summary-text">${this.escapeHtml(entry.one_line_summary || entry.content_preview || 'No summary available')}</div>
            </div>
        `).join('');
        
        // Add event listeners for actions
        this.addActionButtonListeners(container);
    }

    showPartnerSentimentIndicator(sentiment) {
        const sentimentIndicator = document.getElementById('partner-sentiment-indicator');
        const sentimentLabel = document.getElementById('partner-sentiment-label');
        const sentimentFill = document.getElementById('partner-sentiment-fill');
        
        if (sentimentIndicator && sentimentLabel && sentimentFill) {
            sentimentIndicator.classList.remove('hidden');
            
            // Set sentiment label and color
            const sentimentConfig = {
                positive: { label: 'Positive', color: '#10b981', percentage: 80 },
                negative: { label: 'Negative', color: '#ef4444', percentage: 80 },
                neutral: { label: 'Neutral', color: '#f59e0b', percentage: 50 }
            };
            
            const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
            sentimentLabel.textContent = `Overall Sentiment: ${config.label}`;
            sentimentFill.style.backgroundColor = config.color;
            sentimentFill.style.width = `${config.percentage}%`;
        }
    }

    handleEditPartnerFromScreen() {
        const screen = document.getElementById('partner-details');
        const keywordId = screen.getAttribute('data-keyword-id');
        const keywordName = screen.getAttribute('data-keyword-name');
        
        if (keywordId && keywordName) {
            // Find the partner data to get frequency
            const partnerTile = document.querySelector(`[data-keyword-id="${keywordId}"]`);
            const frequency = partnerTile ? partnerTile.getAttribute('data-keyword-frequency') || 'daily' : 'daily';
            
            this.showEditPartnerModal(keywordId, keywordName, frequency);
        }
    }

    handleDeletePartnerFromScreen() {
        const screen = document.getElementById('partner-details');
        const keywordId = screen.getAttribute('data-keyword-id');
        const keywordName = screen.getAttribute('data-keyword-name');
        
        if (keywordId && keywordName) {
            this.confirmDeletePartner(keywordId, keywordName);
        }
    }

    // Partner Modal Methods (renamed from keyword methods)
    showAddPartnerModal() {
        const modal = document.getElementById('add-partner-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('partner-input')?.focus();
        }
    }

    hideAddPartnerModal() {
        const modal = document.getElementById('add-partner-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.clearPartnerForm();
        }
    }

    clearPartnerForm() {
        document.getElementById('partner-input').value = '';
        document.getElementById('frequency-select').value = 'daily';
        // Clear any error messages
        document.getElementById('partner-input-error')?.classList.add('hidden');
    }

    async handleSavePartner() {
        const partnerName = document.getElementById('partner-input').value.trim();
        const frequency = document.getElementById('frequency-select').value;

        if (!partnerName) {
            this.showPartnerError('Partner name is required');
            return;
        }

        try {
            this.setPartnerSaving(true);
            
            const result = await this.apiCall('/horizon/keywords', {
                method: 'POST',
                body: JSON.stringify({
                    keyword: partnerName,
                    kind: 'partner',
                    frequency: frequency
                })
            });

            console.log('Partner creation result:', result);

            // Trigger workflow for the newly created keyword
            if (result && result.id) {
                console.log('Attempting to trigger workflow for keyword_id:', result.id);
                try {
                    const workflowResult = await this.triggerKeywordWorkflow(result.id);
                    console.log('Workflow triggered successfully:', workflowResult);
                } catch (workflowError) {
                    console.error('Failed to trigger workflow:', workflowError);
                    // Don't fail the entire operation if workflow trigger fails
                }
            } else {
                console.warn('No id found in result:', result);
            }

            this.hideAddPartnerModal();
            this.showToast('Partner added successfully!', 'success');
            await this.refreshPartnerData();
            
        } catch (error) {
            console.error('Failed to save partner:', error);
            this.showPartnerError('Failed to add partner. Please try again.');
        } finally {
            this.setPartnerSaving(false);
        }
    }

    async triggerKeywordWorkflow(keywordId) {
        try {
            console.log('Triggering SERP search for keyword_id:', keywordId);
            console.log('Making API call to:', `/horizon/keywords/${keywordId}/search`);
            
            // Trigger the SERP search for the new keyword
            const response = await this.apiCall(`/horizon/keywords/${keywordId}/search`, {
                method: 'POST'
            });
            
            console.log('SERP search API response:', response);
            return response;
        } catch (error) {
            console.error('Failed to trigger keyword search:', error);
            console.error('Error details:', error);
            throw error;
        }
    }

    showPartnerError(message) {
        const errorElement = document.getElementById('partner-input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    setPartnerSaving(saving) {
        const saveBtn = document.getElementById('save-partner-btn');
        const spinner = saveBtn?.querySelector('.btn-spinner');
        const text = saveBtn?.querySelector('.btn-text');
        
        if (saving) {
            spinner?.classList.remove('hidden');
            text.textContent = 'Adding...';
            saveBtn.disabled = true;
        } else {
            spinner?.classList.add('hidden');
            text.textContent = 'Add Partner';
            saveBtn.disabled = false;
        }
    }


    formatShareSummary(summary) {
        if (!summary) return '';
        
        // Format bullet points with proper line breaks
        let formattedSummary = summary.replace(/•\s*/g, '<br/>• ');
        
        // Remove leading <br/> if it exists
        formattedSummary = formattedSummary.replace(/^<br\/>/, '');
        
        // Highlight key terms (simple approach - can be enhanced)
        const keywords = ['regulatory', 'compliance', 'bank', 'financial', 'policy', 'requirement', 'guideline', 'framework', 'announcement', 'update'];
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            formattedSummary = formattedSummary.replace(regex, '<strong>$1</strong>');
        });
        
        return formattedSummary;
    }

    showShareSummaryModal(title, url, summary) {
        // Populate modal content
        document.getElementById('share-title').textContent = title;
        document.getElementById('share-url').textContent = url;
        
        // Format and display summary with HTML
        const summaryElement = document.getElementById('share-summary');
        summaryElement.innerHTML = this.formatShareSummary(summary);
        
        // Show modal
        const modal = document.getElementById('share-summary-modal');
        modal.classList.remove('hidden');
        
        // Store data for copying (keep original text for clipboard)
        this.shareSummaryData = {
            title: title,
            url: url,
            summary: summary
        };
    }

    hideShareSummaryModal() {
        const modal = document.getElementById('share-summary-modal');
        modal.classList.add('hidden');
        this.shareSummaryData = null;
    }

    async copyShareSummary() {
        if (!this.shareSummaryData) return;
        
        const { title, url, summary } = this.shareSummaryData;
        const textToCopy = `${title}\n\n${summary}\n\nSource: ${url}`;
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast('Summary copied to clipboard!', 'success');
            this.hideShareSummaryModal();
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    // Topic Summary Modal Methods
    showTopicSummaryModal() {
        const titleElement = document.getElementById('tag-details-title');
        const summaryElement = document.getElementById('tag-meta-summary');
        
        if (!titleElement || !summaryElement) {
            this.showToast('No summary available to share', 'error');
            return;
        }
        
        const title = titleElement.textContent;
        const summary = summaryElement.textContent;
        
        // Populate modal content
        document.getElementById('overall-topic-summary-title').textContent = title;
        document.getElementById('overall-topic-summary-text').textContent = summary;
        
        // Show modal
        const modal = document.getElementById('overall-topic-summary-modal');
        modal.classList.remove('hidden');
    }

    hideTopicSummaryModal() {
        const modal = document.getElementById('overall-topic-summary-modal');
        modal.classList.add('hidden');
    }

    async copyTopicSummary() {
        const title = document.getElementById('overall-topic-summary-title').textContent;
        const summary = document.getElementById('overall-topic-summary-text').textContent;
        
        const textToCopy = `${title}\n\n${summary}\n\nGenerated on: https://carveragents.ai`;
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast('Topic summary copied to clipboard!', 'success');
            this.hideTopicSummaryModal();
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    // Partner Summary Modal Methods
    showPartnerSummaryModal() {
        const titleElement = document.getElementById('partner-details-title');
        const summaryElement = document.getElementById('partner-screen-meta-summary');
        
        if (!titleElement || !summaryElement) {
            this.showToast('No summary available to share', 'error');
            return;
        }
        
        const title = titleElement.textContent;
        const summary = summaryElement.textContent;
        
        // Populate modal content
        document.getElementById('overall-partner-summary-title').textContent = title;
        document.getElementById('overall-partner-summary-text').textContent = summary;
        
        // Show modal
        const modal = document.getElementById('overall-partner-summary-modal');
        modal.classList.remove('hidden');
    }

    hidePartnerSummaryModal() {
        const modal = document.getElementById('overall-partner-summary-modal');
        modal.classList.add('hidden');
    }

    async copyPartnerSummary() {
        const title = document.getElementById('overall-partner-summary-title').textContent;
        const summary = document.getElementById('overall-partner-summary-text').textContent;
        
        const textToCopy = `${title}\n\n${summary}\n\nGenerated on: https://carveragents.ai`;
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast('Partner summary copied to clipboard!', 'success');
            this.hidePartnerSummaryModal();
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    // Unsubscribe Confirmation Modal Methods
    showUnsubscribeConfirmModal(topicId, topicName, source) {
        document.getElementById('unsubscribe-topic-name').textContent = topicName;
        
        // Store the topic info for confirmation
        this.pendingUnsubscribe = { topicId, topicName, source };
        
        const modal = document.getElementById('unsubscribe-confirm-modal');
        modal.classList.remove('hidden');
    }

    hideUnsubscribeConfirmModal() {
        const modal = document.getElementById('unsubscribe-confirm-modal');
        modal.classList.add('hidden');
        this.pendingUnsubscribe = null;
    }

    async confirmUnsubscribe() {
        if (!this.pendingUnsubscribe) return;
        
        const { topicId, topicName, source } = this.pendingUnsubscribe;
        const confirmBtn = document.getElementById('confirm-unsubscribe-btn');
        const btnText = confirmBtn.querySelector('.btn-text');
        const btnSpinner = confirmBtn.querySelector('.btn-spinner');
        
        // Show loading state
        confirmBtn.disabled = true;
        btnText.textContent = 'Unsubscribing...';
        btnSpinner.classList.remove('hidden');
        
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('User information not available', 'error');
                return;
            }

            await this.apiCall(`/core/users/${userId}/topics/${topicId}/unsubscribe`, {
                method: 'DELETE'
            });
            
            this.showToast(`Successfully unsubscribed from "${topicName}"!`, 'success');
            this.hideUnsubscribeConfirmModal();
            
            // Refresh the appropriate page
            await this.refreshAfterSubscriptionChange(source);
            
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            this.showToast('Failed to unsubscribe. Please try again.', 'error');
        } finally {
            // Reset button state
            confirmBtn.disabled = false;
            btnText.textContent = 'Unsubscribe';
            btnSpinner.classList.add('hidden');
        }
    }

    async subscribeToTopicFromSearch(topicId, topicName) {
        try {
            const userId = this.getUserId();
            if (!userId) {
                this.showToast('User information not available', 'error');
                return;
            }

            await this.apiCall(`/core/users/${userId}/topics/${topicId}/subscribe`, {
                method: 'POST'
            });
            
            this.showToast(`Successfully subscribed to "${topicName}"!`, 'success');
            
            // Refresh the search results
            await this.refreshAfterSubscriptionChange('search');
            
        } catch (error) {
            console.error('Failed to subscribe:', error);
            this.showToast('Failed to subscribe. Please try again.', 'error');
        }
    }

    async refreshAfterSubscriptionChange(source) {
        // Clear cache to force fresh data
        this.cache.clear();
        
        if (source === 'search') {
            // Refresh search results
            const searchInput = document.getElementById('search-input');
            const query = searchInput?.value?.trim() || '';
            if (query) {
                await this.handleSearchScreenSearch();
            } else {
                // Show recommendations
                const results = await this.apiCall('/extension/topics/recommendations');
                this.renderSearchResults(results, true);
            }
        } else if (source === 'suggestions') {
            // Refresh topics suggestions
            const searchInput = document.getElementById('topics-search-input');
            const currentValue = searchInput ? searchInput.value.trim() : '';
            await this.handleTopicsSearch(currentValue);
            
            // Refresh main dashboard
            await this.loadRegulatoryData();
        } else {
            // Refresh main dashboard
            await this.loadRegulatoryData();
        }
    }

    async refreshPartnerData() {
        try {
            console.log('Refreshing partner data...');
            
            // Clear cache for horizon keywords to force fresh data
            const horizonUrl = `${this.apiBaseUrl}/extension/horizon/keywords`;
            this.cache.delete(horizonUrl);
            
            // Reload the horizon data
            await this.loadHorizonData();
            
            this.showToast('Partner data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Failed to refresh partner data:', error);
            this.showToast('Failed to refresh partner data', 'error');
        }
    }

    async returnToMainFromSubscriptions() {
        // Clear cache to ensure fresh data
        this.cache.clear();
        
        // Refresh regulatory data to show updated subscription states
        await this.loadRegulatoryData();
        
        // Return to main dashboard
        this.showScreen('main-dashboard');
    }

    // Version Display Management
    initializeVersionDisplay() {
        // Get version info from version.js
        const versionString = getVersionString();
        
        // Update all version display elements
        const versionElements = [
            'api-version',
            'regulatory-version', 
            'partner-version'
        ];
        
        versionElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = versionString;
            }
        });
    }

    // Support Modal Management
    showSupportModal() {
        const modal = document.getElementById('support-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideSupportModal() {
        const modal = document.getElementById('support-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async copySupportEmail() {
        const supportEmail = 'support@carveragents.ai';
        
        try {
            await navigator.clipboard.writeText(supportEmail);
            this.showToast('Support email copied to clipboard!', 'success');
            this.hideSupportModal();
        } catch (error) {
            console.error('Failed to copy email:', error);
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = supportEmail;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('Support email copied to clipboard!', 'success');
                this.hideSupportModal();
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                this.showToast('Failed to copy email. Please manually copy: ' + supportEmail, 'error');
            }
        }
    }


    // Edit Partner Modal Functions
    showEditPartnerModal(keywordId, keywordName, frequency) {
        this.currentEditingKeywordId = keywordId;
        
        // Populate the form with current values
        document.getElementById('edit-partner-input').value = keywordName;
        document.getElementById('edit-frequency-select').value = frequency || 'daily';
        
        // Clear any previous error messages
        const errorElement = document.getElementById('edit-partner-input-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        // Show the modal
        document.getElementById('edit-partner-modal').classList.remove('hidden');
    }

    hideEditPartnerModal() {
        document.getElementById('edit-partner-modal').classList.add('hidden');
        this.currentEditingKeywordId = null;
    }

    async handleUpdatePartner() {
        const partnerName = document.getElementById('edit-partner-input').value.trim();
        const frequency = document.getElementById('edit-frequency-select').value;

        if (!partnerName) {
            this.showEditPartnerError('Partner name is required');
            return;
        }

        if (!this.currentEditingKeywordId) {
            this.showEditPartnerError('Invalid partner ID');
            return;
        }

        try {
            this.setEditPartnerSaving(true);
            
            const result = await this.apiCall(`/horizon/keywords/${this.currentEditingKeywordId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    keyword: partnerName,
                    kind: 'partner',
                    frequency: frequency
                })
            });

            this.hideEditPartnerModal();
            this.showToast('Partner updated successfully!', 'success');
            await this.refreshPartnerData();
            
        } catch (error) {
            console.error('Failed to update partner:', error);
            this.showEditPartnerError('Failed to update partner. Please try again.');
        } finally {
            this.setEditPartnerSaving(false);
        }
    }

    showEditPartnerError(message) {
        const errorElement = document.getElementById('edit-partner-input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    setEditPartnerSaving(saving) {
        const saveBtn = document.getElementById('save-edit-partner-btn');
        const spinner = saveBtn?.querySelector('.btn-spinner');
        const text = saveBtn?.querySelector('.btn-text');
        
        if (saving) {
            spinner?.classList.remove('hidden');
            text.textContent = 'Updating...';
            saveBtn.disabled = true;
        } else {
            spinner?.classList.add('hidden');
            text.textContent = 'Update Partner';
            saveBtn.disabled = false;
        }
    }

    // Delete Partner Function
    confirmDeletePartner(keywordId, keywordName) {
        document.getElementById('delete-partner-name').textContent = keywordName;
        
        // Store the partner info for confirmation
        this.pendingDeletePartner = { keywordId, keywordName };
        
        const modal = document.getElementById('delete-partner-confirm-modal');
        modal.classList.remove('hidden');
    }

    hideDeletePartnerConfirmModal() {
        const modal = document.getElementById('delete-partner-confirm-modal');
        modal.classList.add('hidden');
        this.pendingDeletePartner = null;
    }

    async confirmDeletePartnerFromModal() {
        if (!this.pendingDeletePartner) return;
        
        const { keywordId, keywordName } = this.pendingDeletePartner;
        const confirmBtn = document.getElementById('confirm-delete-partner-btn');
        const btnText = confirmBtn.querySelector('.btn-text');
        const btnSpinner = confirmBtn.querySelector('.btn-spinner');
        
        // Show loading state
        confirmBtn.disabled = true;
        btnText.textContent = 'Deleting...';
        btnSpinner.classList.remove('hidden');
        
        try {
            await this.deletePartner(keywordId, keywordName);
            this.hideDeletePartnerConfirmModal();
        } catch (error) {
            console.error('Failed to delete partner from modal:', error);
            this.showToast('Failed to delete partner. Please try again.', 'error');
        } finally {
            // Reset button state
            confirmBtn.disabled = false;
            btnText.textContent = 'Delete';
            btnSpinner.classList.add('hidden');
        }
    }

    async deletePartner(keywordId, keywordName) {
        try {
            await this.apiCall(`/horizon/keywords/${keywordId}`, {
                method: 'DELETE'
            });

            this.showToast(`Partner "${keywordName}" deleted successfully!`, 'success');
            
            // If we're on the partner details screen, return to main dashboard
            if (this.currentScreen === 'partner-details') {
                this.showScreen('main-dashboard');
                this.switchTab('horizon');
            }
            
            await this.refreshPartnerData();
            
        } catch (error) {
            console.error('Failed to delete partner:', error);
            this.showToast('Failed to delete partner. Please try again.', 'error');
        }
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