// Version management for Carver Chrome Extension
// This file should be updated whenever the extension version changes

const VERSION_INFO = {
    version: '1.0.0',
    name: 'Carver Agents',
    buildDate: '2025-07-24'
};

// Function to get version string for display
function getVersionString() {
    return `v${VERSION_INFO.version}`;
}

// Function to get full version info
function getFullVersionInfo() {
    return {
        ...VERSION_INFO,
        displayString: getVersionString()
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VERSION_INFO, getVersionString, getFullVersionInfo };
}