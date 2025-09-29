# Phase 4.5: User Management & Persistence - Implementation Plan

## Overview
Transform StreamForge from anonymous video processing to a full user-based platform using Supabase as our backend-as-a-service.

## Why Supabase?
- Built on PostgreSQL (same DB that powers Instagram, Reddit)
- Authentication included (JWT-based, like we planned)
- Row Level Security (RLS) for data isolation
- Realtime subscriptions (future: live processing updates)
- Direct PostgreSQL access for complex queries
- Auto-generated REST APIs with PostgREST

## Architecture Changes

### Current State
```
[Client] → [API Server] → [BullMQ/Redis] → [Worker] → [MinIO Storage]
```

### Target State
```
[Client] → [Supabase Auth] → [API Server] → [BullMQ/Redis] → [Worker] → [MinIO Storage]
                ↓                    ↓                            ↓
           [Supabase DB] ←───────────┴────────────────────────────┘
```

## Implementation Phases

### Step 1: Supabase Setup ✅ Ready to start
**Goal:** Establish database connection and auth system

**Tasks:**
1. Create Supabase project (get URL and anon key)
2. Install `@supabase/supabase-js` package
3. Create `.env` entries for Supabase credentials
4. Initialize Supabase client in the project
5. Test connection with a simple query

**Files to create/modify:**
- `/lib/supabase.js` - Supabase client initialization
- `.env` - Add SUPABASE_URL and SUPABASE_ANON_KEY

### Step 2: Database Schema Design
**Goal:** Create tables that link users to videos

**Schema:**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- Already exists as auth.users

-- Videos table
CREATE TABLE videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  duration_seconds FLOAT,
  file_size_bytes BIGINT,
  storage_paths JSONB, -- {original: "path", 1080p: "path", 720p: "path", 360p: "path"}
  metadata JSONB, -- flexible field for future data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_public_created ON videos(is_public, created_at DESC);
CREATE INDEX idx_videos_job_id ON videos(job_id);

-- RLS Policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Users can see their own videos
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see public videos
CREATE POLICY "Anyone can view public videos" ON videos
  FOR SELECT USING (is_public = true);

-- Users can update their own videos
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (auth.uid() = user_id);

-- Users can insert their own videos
CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**TODO(human):** After we set up the connection, you'll write the SQL migration

### Step 3: Authentication Integration
**Goal:** Add login/register endpoints using Supabase Auth

**New Endpoints:**
```javascript
POST /auth/register - Create account via Supabase
POST /auth/login    - Authenticate via Supabase
POST /auth/logout   - Invalidate session
GET  /auth/user     - Get current user from token
```

**Middleware:**
```javascript
// requireAuth middleware using Supabase
async function requireAuth(req, res, next) {
  // TODO(human): Implement JWT verification using Supabase
}
```

### Step 4: Modify Upload Flow
**Goal:** Link uploaded videos to authenticated users

**Changes needed:**
1. Add `requireAuth` middleware to upload endpoint
2. Create video record in Supabase when job starts
3. Update video status when processing completes
4. Store MinIO paths in `storage_paths` JSONB field

**Modified flow:**
```javascript
// server-async.js
app.post('/api/upload', requireAuth, upload.single('video'), async (req, res) => {
  // 1. Get user from req.user (set by middleware)
  // 2. Create video record with 'processing' status
  // 3. Queue job with video_id
  // 4. Return video_id to client
});
```

### Step 5: Worker Database Updates
**Goal:** Worker updates video status in Supabase

**Worker changes:**
```javascript
// worker.js
videoQueue.process(async (job) => {
  // ... existing processing ...

  // Update video record:
  // - Set status to 'ready'
  // - Add storage_paths
  // - Set processed_at
  // - Add duration and file_size
});
```

### Step 6: Video Management APIs
**Goal:** CRUD operations for user videos

**New Endpoints:**
```javascript
GET    /api/videos/mine     - List user's videos
GET    /api/videos/:id      - Get video details
PATCH  /api/videos/:id      - Update title/description/privacy
DELETE /api/videos/:id      - Delete video and MinIO files
GET    /api/videos/public   - Browse public videos
```

### Step 7: Frontend Auth UI
**Goal:** Add login/register forms to the frontend

**New UI Components:**
- Login/Register modal
- User profile dropdown
- "My Videos" section
- Public video browser
- Video privacy toggle

### Step 8: Enhanced Streaming
**Goal:** Enforce access control on video streaming

**Changes:**
```javascript
// Before: /api/stream/:jobId/:quality
// After:  /api/stream/:videoId/:quality

// Check if user can access:
// - Own videos: always
// - Public videos: always
// - Others' private: denied
```

## Testing Checklist

### Authentication Tests
- [ ] User can register new account
- [ ] User can login with credentials
- [ ] Invalid credentials are rejected
- [ ] JWT tokens expire correctly
- [ ] Protected endpoints require auth

### Video Ownership Tests
- [ ] Videos are linked to uploading user
- [ ] Users can only see their own private videos
- [ ] Public videos are visible to all
- [ ] Users can update their own video metadata
- [ ] Users cannot modify others' videos

### Performance Tests
- [ ] Database queries use indexes (<10ms)
- [ ] Video listing is paginated
- [ ] Search performs well with 1000+ videos

## Success Metrics
- User registration to first upload: <2 minutes
- Video query performance: <10ms
- Auth token validation: <5ms
- 100% video-user association accuracy
- Zero unauthorized access incidents

## Learning Outcomes
By completing this phase, you'll understand:
- How YouTube manages billions of user-video relationships
- JWT authentication at scale (how Discord handles 150M users)
- Row Level Security (how Notion isolates workspace data)
- Database indexing strategies for fast queries
- JSONB fields for flexible schema evolution

## Next Steps After Phase 4.5
- Phase 5: AI/ML intelligence layer (captions, thumbnails)
- Phase 6: Frontend refinement (quality selector, better UI)
- Future: Live streaming, adaptive bitrate, global CDN

---

## Quick Start Commands
```bash
# Install Supabase client
npm install @supabase/supabase-js

# Environment variables to add:
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key  # For server-side admin operations
```

## Resources
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth with Node.js](https://supabase.com/docs/guides/auth/server-side/nodejs)