# CloudFlare DNS Setup for BioMasters TCG

## 🌐 DNS Configuration

After your GitHub Actions deployment completes, you'll need to configure CloudFlare DNS to point to your GCP resources.

### 📋 Required DNS Records

1. **Frontend (biomasters.app)**
   ```
   Type: CNAME
   Name: @
   Target: storage.googleapis.com
   Proxy: ✅ Proxied (Orange Cloud)
   ```

2. **API (api.biomasters.app)**
   ```
   Type: CNAME
   Name: api
   Target: biomasters-api-useast1-biomasters-tcg.a.run.app
   Proxy: ✅ Proxied (Orange Cloud)
   ```

### 🔧 CloudFlare Settings

#### SSL/TLS Configuration
- **SSL/TLS encryption mode**: Full (strict)
- **Always Use HTTPS**: On
- **Minimum TLS Version**: 1.2

#### Page Rules
Create these page rules in order:

1. **Static Assets Caching**
   ```
   URL: biomasters.app/assets/*
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
   - Browser Cache TTL: 1 year
   ```

2. **API Bypass Cache**
   ```
   URL: api.biomasters.app/*
   Settings:
   - Cache Level: Bypass
   - Disable Security
   ```

3. **Frontend Caching**
   ```
   URL: biomasters.app/*
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 4 hours
   - Browser Cache TTL: 4 hours
   ```

#### Security Settings
- **Security Level**: Medium
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: On
- **Privacy Pass**: On

#### Speed Settings
- **Auto Minify**: CSS, HTML, JavaScript ✅
- **Brotli**: On
- **Early Hints**: On
- **HTTP/2**: On
- **HTTP/3 (with QUIC)**: On

### 🚀 Deployment URLs

After GitHub Actions completes, you'll see output like:
```
🚀 Backend deployed to: https://biomasters-api-useast1-biomasters-tcg.a.run.app
🌐 Frontend deployed to: https://storage.googleapis.com/biomasters-frontend/index.html
```

Use these URLs to configure your DNS records.

### 🧪 Testing

1. **Test API**: `curl https://api.biomasters.app/health`
2. **Test Frontend**: Visit `https://biomasters.app`
3. **Test HTTPS**: Verify SSL certificate is valid
4. **Test Performance**: Use CloudFlare Analytics

### 🔄 Custom Domain for Cloud Storage

To serve the frontend from `biomasters.app` instead of the storage URL:

1. **Verify Domain Ownership**
   ```bash
   gcloud storage buckets add-iam-policy-binding gs://biomasters-frontend \
     --member=allUsers \
     --role=roles/storage.objectViewer
   ```

2. **Configure Custom Domain**
   ```bash
   gcloud storage buckets update gs://biomasters-frontend \
     --web-main-page-suffix=index.html \
     --web-error-page=index.html
   ```

3. **Update CloudFlare DNS**
   ```
   Type: CNAME
   Name: @
   Target: c.storage.googleapis.com
   ```

### 📊 Monitoring

Set up CloudFlare Analytics to monitor:
- **Traffic**: Page views, unique visitors
- **Performance**: Load times, cache hit ratio
- **Security**: Threats blocked, SSL usage
- **Errors**: 4xx/5xx responses

### 🔧 Troubleshooting

**Common Issues:**

1. **SSL Certificate Errors**
   - Wait 15-30 minutes for CloudFlare to provision certificates
   - Ensure SSL mode is "Full (strict)"

2. **API CORS Errors**
   - Verify API endpoints allow your domain
   - Check CloudFlare security settings

3. **Caching Issues**
   - Use CloudFlare's "Purge Cache" feature
   - Check page rules order and settings

4. **DNS Propagation**
   - Use `dig` or online DNS checkers
   - Wait up to 24 hours for global propagation

### 🎯 Performance Optimization

1. **Enable CloudFlare Features**:
   - Argo Smart Routing
   - Polish (image optimization)
   - Mirage (mobile optimization)

2. **Configure Workers** (optional):
   - Edge-side includes
   - A/B testing
   - Custom redirects

3. **Set up Analytics**:
   - Real User Monitoring (RUM)
   - Core Web Vitals tracking
   - Custom events
