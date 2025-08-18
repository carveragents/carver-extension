# Carver Agents Chrome Extension - User Guide

A comprehensive guide for installing, using, and troubleshooting the Carver Agents Chrome extension.

## 📥 Installation

### Method 1: Chrome Web Store (Recommended)
1. Visit the [Carver Agents extension page](https://chrome.google.com/webstore) on Chrome Web Store
2. Click **"Add to Chrome"**
3. Click **"Add extension"** in the confirmation dialog
4. The Carver Agents icon will appear in your Chrome toolbar

### Method 2: Developer Installation (For Testing)
1. Download or clone the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** toggle in the top right
4. Click **"Load unpacked"** and select the extension folder
5. The Carver Agents icon should appear in your toolbar

## 🚀 Getting Started

### Initial Setup
1. **Open the Extension**: Click the Carver Agents icon in your Chrome toolbar
2. **Enter API Key**: Input your API key when prompted
3. **Start Monitoring**: Begin subscribing to regulatory topics and adding partners

### First Use
- The side panel will open on the right side of your browser
- Navigate between **Regulatory Monitoring** and **Partner Watch** tabs
- Use the search functionality to find relevant topics

## 🎯 How to Use

### Regulatory Monitoring
- **Search Topics**: Use the search bar to find regulatory topics
- **Subscribe**: Click the star (★) button to subscribe to topics
- **View Updates**: Monitor real-time regulatory developments
- **Share Summaries**: Use the share button to export topic information
- **Extract Data**: Use extraction tools for entities and timelines

### Partner Watch
- **Add Partners**: Click the "+" button to add new partners
- **Set Frequency**: Choose daily or weekly monitoring
- **Edit Partners**: Modify partner details using the edit button
- **View Activity**: Monitor partner news and developments

### Edge Trigger (On Web Pages)
- **Location**: Look for a subtle edge trigger on the right side of any webpage
- **Hover**: Hover over the edge to see the Carver icon
- **Click**: Click to instantly open the side panel
- **Always Available**: The trigger works on any website you visit

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Edge Trigger Not Appearing
**Problem**: Can't see the edge trigger on web pages
**Solutions**:
1. Refresh the page (Ctrl+R / Cmd+R)
2. Check if the extension is enabled at `chrome://extensions/`
3. Look carefully at the right edge - it's designed to be subtle
4. Try hovering along the right edge of the page

#### "Extension Not Ready" Error
**Problem**: Clicking edge trigger shows "Extension not ready" message
**Solutions**:
1. **Refresh the page** - This is usually sufficient
2. Click **"Reload"** if prompted in the error message
3. If problem persists, reload the extension:
   - Go to `chrome://extensions/`
   - Find Carver Agents and click the reload button (🔄)

#### Side Panel Won't Open
**Problem**: Clicking the toolbar icon or edge trigger doesn't open the side panel
**Solutions**:
1. **Check Extension Status**: Go to `chrome://extensions/` and ensure Carver Agents is enabled
2. **Reload Extension**: Click the reload button (🔄) next to the extension
3. **Restart Chrome**: Close and reopen Chrome completely
4. **Check Permissions**: Ensure all required permissions are granted

#### API Key Issues
**Problem**: "Invalid API key" or authentication errors
**Solutions**:
1. **Verify API Key**: Ensure you're using the correct API key from your account
2. **Re-enter Key**: Go to Settings → API Key and re-enter your key
3. **Contact Support**: If key is correct but still failing, contact support

#### Performance Issues
**Problem**: Extension feels slow or unresponsive
**Solutions**:
1. **Clear Extension Data**: 
   - Go to `chrome://extensions/`
   - Click "Details" on Carver Agents
   - Click "Extension options" and clear data
2. **Restart Chrome**: Close and reopen Chrome
3. **Check Network**: Ensure stable internet connection

#### Side Panel State Issues
**Problem**: Edge trigger visible when side panel is open, or vice versa
**Solutions**:
1. **Refresh the Page**: Usually resolves state synchronization issues
2. **Toggle Side Panel**: Close and reopen the side panel using the toolbar icon
3. **Clear Browser Cache**: Chrome Settings → Privacy → Clear browsing data

## ❓ Frequently Asked Questions

### General Questions

**Q: Do I need to keep the side panel open all the time?**
A: No! The extension works in the background. You can close the side panel and still receive notifications when new regulatory updates are available.

**Q: Does the extension slow down my browsing?**
A: No. The extension is designed to be lightweight and only activates when you interact with it. The edge trigger has minimal impact on page performance.

**Q: Can I use this extension on any website?**
A: Yes! The edge trigger appears on all websites, allowing you to access Carver Agents from anywhere you browse.

### Technical Questions

**Q: What permissions does the extension need?**
A: The extension requires:
- **Storage**: To save your API key and preferences
- **Side Panel**: To display the main interface
- **Active Tab**: To show the edge trigger on web pages
- **Notifications**: To alert you of new updates
- **Alarms**: For background data synchronization

**Q: Is my data secure?**
A: Yes. Your API key is stored locally in Chrome's secure storage. All communication with Carver Agents servers uses HTTPS encryption.

**Q: How often does the extension check for updates?**
A: The extension automatically checks for new regulatory updates every 15 minutes. You can also manually refresh using the refresh button in the side panel.

**Q: Can I customize the notification frequency?**
A: Yes! You can adjust notification settings and refresh intervals in the extension's Settings panel.

### Usage Questions

**Q: How do I know if I have new updates?**
A: New updates are indicated by:
- A badge (•) on the extension icon in your toolbar
- Desktop notifications (if enabled)
- Visual indicators in the side panel

**Q: Can I export or share regulatory summaries?**
A: Yes! Use the share button (📤) next to any topic or feed entry to export summaries and share them with your team.

**Q: What's the difference between Regulatory Monitoring and Partner Watch?**
A: 
- **Regulatory Monitoring**: Tracks regulatory developments by topic/jurisdiction
- **Partner Watch**: Monitors specific companies or organizations for news and updates

**Q: How do I unsubscribe from a topic?**
A: Click the filled star (★) button next to any subscribed topic to unsubscribe. The star will become empty (☆) when unsubscribed.

### Troubleshooting Questions

**Q: The edge trigger disappeared after I closed the side panel. How do I get it back?**
A: 
1. Refresh the webpage (most common solution)
2. If that doesn't work, go to `chrome://extensions/` and reload the Carver Agents extension
3. The edge trigger should reappear within a few seconds

**Q: I'm getting "Could not establish connection" errors. What should I do?**
A: This usually means the extension needs a moment to initialize:
1. Wait 2-3 seconds and try clicking again
2. If the error persists, refresh the page
3. For persistent issues, reload the extension at `chrome://extensions/`

**Q: The extension worked before but stopped working after a Chrome update. How do I fix it?**
A: 
1. Go to `chrome://extensions/`
2. Find Carver Agents and click the reload button (🔄)
3. If issues persist, disable and re-enable the extension
4. As a last resort, remove and reinstall the extension

**Q: Can I use this extension in Incognito mode?**
A: The extension can work in Incognito mode if you enable it:
1. Go to `chrome://extensions/`
2. Click "Details" on Carver Agents
3. Toggle "Allow in incognito" to enable

## 🆘 Getting Help

### Contact Support
- **Email**: support@carveragents.ai
- **Include**: 
  - Your Chrome version (`chrome://version/`)
  - Extension version (visible in `chrome://extensions/`)
  - Description of the issue
  - Any error messages from the console

### Debug Information
To help with troubleshooting, you can provide:
1. **Console Logs**: Press F12 → Console tab → screenshot any red errors
2. **Extension Status**: Screenshot from `chrome://extensions/`
3. **Steps to Reproduce**: Detailed steps that trigger the issue

### Community Resources
- **Documentation**: Full API documentation at carveragents.ai
- **Updates**: Follow our development blog for new features
- **Feedback**: Report bugs and suggest features through our support email

---

*This guide covers the most common use cases and issues. For additional help, don't hesitate to contact our support team!*