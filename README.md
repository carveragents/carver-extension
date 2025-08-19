# Carver Chrome Extension

A Chrome extension for real-time regulatory monitoring and partner watch functionality.

## Features

- **Regulatory Monitoring**: Subscribe to regulatory topics and receive real-time updates
- **Partner Watch**: Monitor partners for news and developments
- **Side Panel Interface**: Clean, intuitive interface in Chrome's side panel
- **Floating Button**: Quick access button that appears on web pages
- **Smart Notifications**: Background sync with customizable refresh intervals

## Status

- Advanced Development : Will be added to Chrome WebStore shortly

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The Carver extension icon should appear in your toolbar

## Setup

1. Click the Carver extension icon to open the side panel
2. Enter your API key when prompted
3. Start monitoring regulatory topics and partners

## Usage

### Regulatory Monitoring
- Search for regulatory topics using the search bar
- Subscribe to topics with the star (★) button
- View detailed summaries and recent updates
- Share topic summaries via the share button

### Partner Watch
- Add partners to monitor using the "+" button
- Set monitoring frequency (daily/weekly)
- View partner details and recent updates
- Edit or delete partners as needed

### Floating Button
- A floating button appears on web pages for quick access
- Button automatically hides when side panel is open
- Click to open the side panel from any website

## Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── sidepanel.html         # Main UI structure
├── js/
│   ├── sidepanel.js      # Main application logic
│   ├── content.js        # Content script for floating button
│   └── version.js        # Version information
├── styles/
│   ├── sidepanel.css     # Main UI styles
│   └── content.css       # Content script styles
└── icons/                # Extension icons
```

### Key Components
- **Background Service**: Handles periodic sync, notifications, and side panel management
- **Side Panel**: Main interface for regulatory and partner monitoring
- **Content Script**: Floating button functionality with side panel state awareness
- **API Integration**: Connects to Carver Agents backend services

### Configuration
The extension supports multiple environments:
- **Production**: `https://app.carveragents.ai` (default)
- **Staging**: `https://app.staging.carveragents.ai`
- **Local Development**: `http://localhost:8000`

Environment can be changed via the hidden host selector in the login screen.

## API Integration

The extension communicates with the Carver Agents API for:
- User authentication and validation
- Regulatory topic subscriptions
- Partner monitoring setup
- Feed data retrieval
- Summary generation

## Permissions

The extension requires the following permissions:
- `storage`: For storing API keys and user preferences
- `alarms`: For periodic background sync
- `notifications`: For update notifications
- `sidePanel`: For the side panel interface
- `activeTab`: For content script injection

## Support

For support or questions, contact: support@carveragents.ai

## License

© Carver Agents. All rights reserved.