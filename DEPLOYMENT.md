# Deployment Guide

## Render Deployment

### Required Environment Variables

Add these environment variables to your Render web service:

1. **NEXTAUTH_SECRET** (Required)
   - Generate with: `openssl rand -base64 32`
   - This is used to encrypt NextAuth sessions and tokens

2. **ANTHROPIC_API_KEY** (Required)
   - Your Claude API key from Anthropic
   - Format: `sk-ant-...`

3. **VOYAGE_API_KEY** (Required for embeddings/search)
   - Your Voyage API key for vector embeddings
   - Used by `/api/insights` and theme matching

4. **NEXTAUTH_URL** (Auto-configured)
   - Should be set to your Render URL: `https://project-loop.onrender.com`

5. **NODE_ENV**
   - Set to: `production`

### Database Setup

The application uses PostgreSQL with pgvector support. 

**Important:** The database must have the `vector` extension enabled for embeddings to work.

1. Create a PostgreSQL database on Render
2. The `DATABASE_URL` will be automatically set by Render if using the native Postgres database
3. Migrations will run automatically during the build process

### Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deployment configuration"
   git push
   ```

2. **On Render Dashboard:**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Choose branch: `master`
   - Set build command: `npm install && npm run build`
   - Set start command: `npm run start`

3. **Add Environment Variables:**
   - Go to "Environment" tab
   - Add all required variables listed above

4. **Add PostgreSQL Database:**
   - Click "Create PostgreSQL Database"
   - Render will automatically populate `DATABASE_URL` and `DIRECT_URL`

5. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Monitor logs for any issues

### Troubleshooting

**500 Error on login/signup:**
- Check that `NEXTAUTH_SECRET` is set
- Check database connection in Render logs
- Ensure migrations ran successfully

**Build failing:**
- Check Render build logs for specific error
- Ensure all environment variables are set
- Verify database is accessible

**Embeddings/search not working:**
- Ensure `VOYAGE_API_KEY` is set
- Check if pgvector extension is enabled on PostgreSQL
