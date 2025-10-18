# Staging Login Page Integration

To complete the web-based authentication flow, add this JavaScript snippet to your staging login page (`staging.carveragents.ai/login`).

## Add to Staging Login Page

Add this script **after successful authentication** on your staging login page:

```javascript
// Extension Authentication Bridge
// Add this to your staging login page after successful authentication

async function notifyExtensionAuth(authData) {
    try {
        // Expected authData format:
        // {
        //   jwt_token: "your_jwt_token_here",
        //   user: {
        //     id: "user_id",
        //     email: "user@example.com",
        //     display_name: "User Name",
        //     role: "user"
        //   },
        //   success: true
        // }

        // Store auth data for extension to pick up
        const tokenData = JSON.stringify(authData);

        // Multiple storage methods for maximum compatibility
        localStorage.setItem('carver_web_auth_token', tokenData);
        sessionStorage.setItem('carver_web_auth_token', tokenData);

        console.log('Authentication data stored for extension');

        // Optional: Show success message
        alert('Authentication successful! You can now close this tab and return to the extension.');

    } catch (error) {
        console.error('Error notifying extension:', error);
    }
}

// Call this function after successful login
// Example usage:
/*
// After your existing login success handler:
if (loginSuccess) {
    const authData = {
        jwt_token: response.jwt_token,
        user: response.user,
        success: true
    };

    // Notify extension
    notifyExtensionAuth(authData);
}
*/
```

## Alternative: Automatic Detection

If you can't modify the staging login page, the extension will still work by:

1. **Polling for authentication** - Checks every 2-3 seconds if JWT token appears in extension storage
2. **Detecting login state** - Monitors for authentication changes
3. **Cross-tab communication** - Detects if user logs in through normal web interface

## Integration Steps

### Option 1: Full Integration (Recommended)
1. Add the JavaScript snippet above to your staging login page
2. Call `notifyExtensionAuth(authData)` after successful authentication
3. Extension will automatically detect and redirect user

### Option 2: Minimal Integration
1. Ensure your login page stores JWT tokens in a way the extension can access
2. Extension will detect authentication through periodic polling

### Option 3: Manual Process (Fallback)
1. User logs in on staging.carveragents.ai/login
2. User manually returns to extension
3. Extension detects authentication automatically

## Testing the Flow

1. **Open extension** → Click "Sign In"
2. **Click Google OAuth** → Automatically redirects to staging login
3. **Complete authentication** on staging.carveragents.ai/login
4. **Extension automatically detects** login and redirects to dashboard

OR

1. **Click "Sign in on Web (Recommended)"** → Opens staging login directly
2. **Complete authentication**
3. **Return to extension** → Automatically detects and logs in

## Expected User Experience

```
Extension Login Page
        ↓
Click "Continue with Google" or "Sign in on Web"
        ↓
Opens staging.carveragents.ai/login
        ↓
User completes authentication
        ↓
Extension automatically detects success
        ↓
Redirects to main dashboard
```

This provides a seamless experience where users authenticate on your familiar web interface but return to a fully authenticated extension! 🚀