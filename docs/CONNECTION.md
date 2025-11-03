# Connection and Authentication Guide

## Overview

Deep End connects to Nextcloud using WebDAV protocol. This document explains how to set up authentication and configure CORS headers.

## Authentication Methods

### Method 1: App Password (Recommended)

App passwords provide secure authentication without exposing your main Nextcloud password.

#### Advantages
- ✅ Easy to set up
- ✅ Can be revoked individually
- ✅ No admin access required
- ✅ Works immediately

#### Setup Steps

1. **Log into Nextcloud** with your main account

2. **Navigate to Settings**:
   - Click your profile picture (top right)
   - Select "Settings"
   - Go to "Security" section

3. **Create App Password**:
   - Scroll to "Devices & sessions"
   - In "App name" field, enter: `Deep End`
   - Click "Create new app password"
   - **Important**: Copy the generated password immediately
     - It looks like: `xxxxx-xxxxx-xxxxx-xxxxx-xxxxx`
     - You cannot view it again after closing

4. **Use in Deep End**:
   - Select "🔑 App Password" method
   - Enter your Nextcloud URL
   - Enter your username
   - Paste the app password
   - Click "Connect with App Password"

#### Technical Details

- Uses HTTP Basic Authentication
- Format: `Authorization: Basic base64(username:password)`
- Password stored in browser localStorage
- Sent with every WebDAV request

### Method 2: OAuth2

OAuth2 provides token-based authentication with better security for shared devices.

#### Advantages
- ✅ More secure (tokens can expire)
- ✅ No password stored in browser
- ✅ Standard OAuth2 flow
- ✅ Better for public/shared computers

#### Disadvantages
- ❌ Requires admin access to set up
- ❌ More complex setup process
- ❌ Token management needed

#### Setup Steps

##### Part 1: Nextcloud Configuration (Admin)

1. **Log into Nextcloud as admin**

2. **Navigate to OAuth2 Settings**:
   - Go to Settings (admin) → Security
   - Scroll to "OAuth 2.0" section

3. **Create OAuth2 Client**:
   - Click "Add client"
   - **Name**: `Deep End`
   - **Redirection URI**: Your app URL
     - For local: `http://localhost:8080`
     - For hosted: `https://diary.example.com`
   - Click "Add"

4. **Note Credentials**:
   - Copy the **Client Identifier** (Client ID)
   - Copy the **Secret**
   - Keep these secure!

##### Part 2: App Configuration (User)

1. **Open Deep End**

2. **Select OAuth2 Method**:
   - Choose "🔐 OAuth2"

3. **Enter OAuth2 Details**:
   - Nextcloud URL: `https://cloud.example.com`
   - Client ID: (from Part 1, step 4)
   - Client Secret: (from Part 1, step 4)
   - Click "Connect with OAuth2"

4. **Authorize**:
   - New window opens to Nextcloud
   - Log in if needed
   - Click "Authorize"
   - You'll see a screen with an access token

5. **Complete Setup**:
   - Copy the entire access token
   - Return to Deep End
   - Paste token in "Access Token" field
   - Click "Use This Token"

#### Technical Details

- Uses Bearer token authentication
- Format: `Authorization: Bearer {token}`
- Token stored in browser localStorage
- Token expiration handled by Nextcloud
- Refresh tokens not yet implemented

## CORS Configuration

CORS (Cross-Origin Resource Sharing) headers must be configured on your Nextcloud server to allow the Deep End to access the WebDAV API.

### Why CORS?

When the Deep End is hosted on a different domain than Nextcloud (e.g., `http://localhost:8080` accessing `https://cloud.example.com`), browsers block the requests by default for security. CORS headers tell the browser it's safe.

### Required Headers

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Depth, OCS-APIRequest
Access-Control-Max-Age: 86400
```

### Configuration by Server Type

#### Apache (with mod_headers)

Add to your VirtualHost configuration or `.htaccess`:

```apache
<IfModule mod_headers.c>
    # Allow all origins (or specify your app's origin)
    Header set Access-Control-Allow-Origin "*"
    
    # Allow WebDAV methods
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS"
    
    # Allow required headers
    Header set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, OCS-APIRequest"
    
    # Cache preflight requests for 24 hours
    Header set Access-Control-Max-Age "86400"
</IfModule>
```

**For specific origin** (more secure):

```apache
Header set Access-Control-Allow-Origin "http://localhost:8080"
```

#### Nginx

Add to your Nextcloud server block:

```nginx
# CORS headers for Deep End
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Depth, OCS-APIRequest' always;
add_header 'Access-Control-Max-Age' '86400' always;

# Handle preflight requests
if ($request_method = 'OPTIONS') {
    return 204;
}
```

**For specific origin**:

```nginx
add_header 'Access-Control-Allow-Origin' 'http://localhost:8080' always;
```

#### NixOS Configuration

For NixOS-based Nextcloud, edit your configuration file:

```nix
services.nginx = {
  virtualHosts."${config.services.nextcloud.hostName}" = {
    forceSSL = true;
    enableACME = true;
    
    # CORS headers for PWA access
    extraConfig = ''
      add_header 'Access-Control-Allow-Origin' '*' always;
      add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS' always;
      add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Depth, OCS-APIRequest' always;
      add_header 'Access-Control-Max-Age' '86400' always;
      
      # Handle preflight requests
      if ($request_method = 'OPTIONS') {
        return 204;
      }
    '';
  };
};
```

Then rebuild your system:

```bash
sudo nixos-rebuild switch --flake .#hostname
```

### Security Considerations

#### Allow All Origins (`*`)

```apache
Header set Access-Control-Allow-Origin "*"
```

**Pros:**
- Works from any origin
- Easy to test locally
- No configuration updates needed

**Cons:**
- Less secure
- Allows any website to access your Nextcloud
- Credentials still required for actual access

**Use when:**
- Testing locally
- Personal server with strong authentication
- Acceptable risk for your use case

#### Allow Specific Origin

```apache
Header set Access-Control-Allow-Origin "https://diary.yourdomain.com"
```

**Pros:**
- More secure
- Only your app can access
- Recommended for production

**Cons:**
- Must update if app URL changes
- Doesn't work for local testing without additional config

**Use when:**
- Deploying to production
- Hosting app on specific domain
- Security is important

### Testing CORS

#### Using cURL

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: PROPFIND" \
  -H "Access-Control-Request-Headers: Authorization, Depth" \
  -v \
  https://cloud.example.com/remote.php/dav/files/username/

# Check response headers for:
# - Access-Control-Allow-Origin
# - Access-Control-Allow-Methods
# - Access-Control-Allow-Headers
```

#### Using Browser DevTools

1. Open Deep End
2. Try to connect
3. Open DevTools (F12)
4. Go to Network tab
5. Look for failed requests with CORS errors
6. Check response headers

## Troubleshooting

### Error: CORS Header Missing

**Symptom:**
```
Access to fetch at 'https://cloud.example.com/...' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Solution:**
- Add CORS headers to Nextcloud server (see above)
- Restart web server after adding headers
- Clear browser cache
- Test with cURL to verify headers

### Error: Authentication Failed (401)

**Symptom:**
```
Authentication failed (401)
```

**Solutions:**
- **App Password**: Verify password is correct (re-generate if needed)
- **OAuth2**: Check token is valid (may have expired)
- Check username is correct (case-sensitive)
- Verify Nextcloud URL is correct

### Error: Forbidden (403)

**Symptom:**
```
Access forbidden (403)
```

**Solutions:**
- Check user has access to WebDAV
- Verify user has permissions on selected folder
- Check Nextcloud logs for details

### Error: Not Found (404)

**Symptom:**
```
File not found (404)
```

**Solutions:**
- Verify Nextcloud URL is correct
- Check WebDAV endpoint: `/remote.php/dav/files/{username}/`
- Ensure folder path is correct

### Preflight Request Fails

**Symptom:** OPTIONS requests return errors

**Solutions:**
- Add CORS headers with `always` flag
- Handle OPTIONS method explicitly
- Check web server logs

## Best Practices

### For Development

1. **Use App Password**: Easier setup, good for testing
2. **Allow All Origins**: `Access-Control-Allow-Origin: *`
3. **Local Development**: `http://localhost:8080`
4. **Test in Private Mode**: Avoids cache issues

### For Production

1. **Consider OAuth2**: More secure if possible
2. **Specific Origin**: `Access-Control-Allow-Origin: https://your-app.com`
3. **HTTPS Required**: Use SSL for production
4. **Strong Passwords**: Use complex app passwords
5. **Regular Token Rotation**: Regenerate tokens periodically

### Security Checklist

- [ ] HTTPS enabled on Nextcloud
- [ ] Strong app password or OAuth2 token
- [ ] CORS origin restricted (if possible)
- [ ] Regular password/token rotation
- [ ] Monitor access logs
- [ ] Revoke unused app passwords
- [ ] Keep Nextcloud updated

## Additional Resources

- [Nextcloud WebDAV Documentation](https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OAuth2 RFC](https://oauth.net/2/)
