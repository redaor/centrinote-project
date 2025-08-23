# Zoom Meeting SDK Setup Guide

## Overview
This application uses the Zoom Meeting SDK (not OAuth) for a simplified integration approach. Follow these steps to configure Zoom integration.

## Prerequisites
1. A Zoom account (Basic or higher)
2. Access to Zoom Marketplace

## Step 1: Create a Meeting SDK App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click "Develop" → "Build App"
3. Choose "Meeting SDK" app type
4. Fill in your app information:
   - App Name: "Centrinote Meetings"
   - Company Name: Your company name
   - Developer Email: Your email
   - App Description: "Meeting integration for Centrinote"

## Step 2: Get SDK Credentials

After creating your app, you'll get:
- **SDK Key**: Used for SDK authentication
- **SDK Secret**: Used for JWT token generation

## Step 3: Configure Environment Variables

Update your `.env` file with the SDK credentials:

```env
# Zoom Meeting SDK Configuration
VITE_ZOOM_SDK_KEY=your_actual_sdk_key_here
VITE_ZOOM_SDK_SECRET=your_actual_sdk_secret_here
```

## Step 4: App Configuration

In your Zoom app settings:

### App Information
- App name: Centrinote Meetings
- Short description: Meeting integration for note-taking
- Long description: Provides seamless Zoom meeting integration with note-taking capabilities

### Basic Information
- App Type: Meeting SDK
- Would you like to publish this app: No (for development)

### SDK Configuration
- SDK Domain: `localhost:5174` (for development)
- For production, add your production domain

## Step 5: Verify Setup

1. Start the development server: `npm run dev`
2. Navigate to the Zoom section in the app
3. You should see a "Connect with Zoom" interface
4. Click on the debug info icon (bug icon) in the bottom right to verify:
   - SDK Key: ✅ (green checkmark)
   - SDK Secret: ✅ (green checkmark)
   - Environment: development

## Step 6: Connect Your Zoom Account

1. Click the "Connect with Zoom" button
2. In the connection modal, enter:
   - Display Name: Your name as it should appear in meetings
   - Email: Your Zoom account email address
   - Zoom Password: Your Zoom account password
3. Click "Connect"
4. The system will authenticate your credentials with Zoom
5. You should see a success message and be connected

## Step 7: Test Meeting Creation

1. After connecting, you'll see the meeting management interface
2. Go to the "Create Meeting" tab
3. Fill in meeting details:
   - Topic: "Test Meeting"
   - Start time: Any future time
   - Duration: 30 minutes
4. Click "Create Meeting"
5. The meeting should be created successfully

## Step 8: Test Meeting Join

1. Use the "SDK" button on any meeting to join with the SDK
2. The Zoom meeting interface should load properly
3. You should be able to see video/audio controls

## Troubleshooting

### Common Issues

1. **"Connect with Zoom" button is disabled**
   - Check that VITE_ZOOM_SDK_KEY is set in .env
   - Check that VITE_ZOOM_SDK_SECRET is set in .env
   - Restart the development server after changing .env

2. **"Configuration Required" warning appears**
   - Ensure both SDK key and secret environment variables are set
   - Verify the values are correct (no quotes, no spaces)
   - Restart the development server

3. **Connection fails when clicking "Connect"**
   - Verify your Zoom email and password are correct
   - Check that your Zoom account is active and not locked
   - Ensure you're using your Zoom account credentials (not Google/SSO)
   - Check browser console for detailed error messages
   - Verify database connection is working
   - Ensure user is properly authenticated in Centrinote

4. **Meeting creation fails after connecting**
   - Verify your Zoom app has the necessary scopes
   - Check that the SDK key/secret are valid
   - Try disconnecting and reconnecting

5. **Join meeting fails**
   - Make sure the meeting ID is valid
   - Check that the Zoom domain is whitelisted in your app settings
   - Verify SDK signature generation is working

### Debug Information

Use the debug tool (bug icon) to check:
- User authentication status
- Environment variable configuration
- SDK initialization status
- Connection status

## Security Notes

- Never commit actual SDK keys to version control
- Use different credentials for development and production
- Regularly rotate your SDK secrets
- The SDK approach is more secure than OAuth for meeting integration
- **Password Security**: Your Zoom password is only used for initial authentication and is cleared from memory after connection
- Passwords are never stored permanently - only connection tokens are saved
- Consider using Zoom's OAuth flow in production for enhanced security

## Next Steps

Once basic integration is working:
1. Configure webhooks for meeting events
2. Set up meeting recordings integration
3. Add participant management features
4. Implement meeting analytics