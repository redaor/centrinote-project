# Zoom Connection Troubleshooting Guide

## Quick Debugging Steps

### 1. Check Debug Information
1. Navigate to the Zoom section
2. Click the debug icon (bug) in the bottom right corner
3. Look for these status indicators:
   - **User Authentication**: Should show green ✅
   - **Environment**: SDK Key and Secret should show green ✅
   - **SDK Configuration**: Should show "SDK properly configured"
   - **Database Connection**: Should show green ✅ with "Connection successful"
   - **Zoom Connection**: Shows your current connection status

### 2. Common Error Patterns

#### "Failed to save connection" Error
**Symptoms**: Authentication appears successful but connection saving fails
**Debugging Steps**:
1. Check console for detailed error messages
2. Look for database connection status in debug panel
3. Verify user is authenticated in Centrinote (not just Zoom)

**Common Causes**:
- **Database Table Missing**: Migration not applied
  ```
  Solution: Apply Supabase migration files
  ```
- **User Not Authenticated**: Centrinote session expired
  ```
  Solution: Refresh page and login again
  ```
- **Permission Error**: RLS policy blocking access
  ```
  Solution: Check Supabase RLS policies
  ```

#### "Authentication error: ..." Messages
**Symptoms**: Error mentions authentication or user session
**Causes**:
- Centrinote user session expired
- Supabase auth token invalid
- User not properly logged into Centrinote

**Solution**: 
1. Refresh the page
2. Login to Centrinote again
3. Try the Zoom connection again

#### Database Connection Errors
**Symptoms**: Debug panel shows red ❌ for Database Connection
**Common Errors**:
- "Table access error: relation 'zoom_user_connections' does not exist"
- "Auth error: ..."
- "No authenticated user found"

**Solutions**:
1. **Missing Table**: Apply the migration
   ```bash
   # Check if migration exists
   ls supabase/migrations/*zoom*.sql
   
   # Apply migration if needed
   supabase db push
   ```

2. **Auth Issues**: Check Supabase connection
   ```javascript
   // In browser console:
   // Check if user is authenticated
   const { data } = await supabase.auth.getUser()
   console.log(data.user)
   ```

### 3. Console Error Analysis

#### Error: "PGRST116"
**Meaning**: No rows found (normal when user hasn't connected before)
**Action**: Not an error, just means user needs to connect

#### Error: "relation 'zoom_user_connections' does not exist"
**Meaning**: Database table hasn't been created
**Action**: Apply the Supabase migration

#### Error: "JWT expired" or auth-related errors
**Meaning**: Centrinote session expired
**Action**: Refresh page and login again

### 4. Step-by-Step Connection Process

1. **User Authentication**: Ensure logged into Centrinote
2. **SDK Configuration**: Verify environment variables set
3. **Database Ready**: Check table exists and accessible
4. **Zoom Authentication**: Enter valid Zoom credentials
5. **Connection Save**: Store connection in database
6. **Verification**: Retrieve and display connection info

### 5. Environment Variable Checklist

Verify these are set in your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_ZOOM_SDK_KEY=your_zoom_sdk_key
VITE_ZOOM_SDK_SECRET=your_zoom_sdk_secret
```

**After changing .env**: Restart the development server

### 6. Database Schema Check

The `zoom_user_connections` table should have these columns:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `zoom_user_id` (text)
- `zoom_email` (text)
- `zoom_display_name` (text)
- `zoom_account_id` (text, nullable)
- `is_active` (boolean, default true)
- `last_connected_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 7. RLS Policies Check

Ensure these policies exist:
```sql
-- User can only access their own connections
CREATE POLICY "zoom_user_connections_own_data" 
ON public.zoom_user_connections
FOR ALL USING (user_id = auth.uid());
```

### 8. Manual Testing Commands

You can test the connection manually in browser console:

```javascript
// Test database connection
const dbTest = await zoomMeetingSDK.testDatabaseConnection();
console.log('Database test:', dbTest);

// Test user connection retrieval
const userConn = await zoomMeetingSDK.getUserConnection('your-user-id');
console.log('User connection:', userConn);
```

## When All Else Fails

1. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
2. **Check Network Tab**: Look for failed requests
3. **Restart Dev Server**: Stop and start `npm run dev`
4. **Check Supabase Dashboard**: Verify tables exist and data is accessible
5. **Review Console Logs**: Look for the 🔄, ✅, and ❌ emoji markers in detailed logs