# StreamForge
## Distributed Video Processing Pipeline

@context/teaching_context.md
@context/phase-4.5-plan.md

### Executive Summary
StreamForge is a scalable video transcoding system that demonstrates enterprise-level video processing architecture. The system accepts video uploads, processes them into multiple quality formats, and serves them efficiently to end users.

### Business Objectives
- Build production-ready video processing infrastructure
- Demonstrate understanding of distributed systems architecture
- Create foundation for streaming platform capabilities
- Establish patterns for horizontal scaling and fault tolerance

### Learning Objectives

**System Design Mastery**
- Understand how YouTube/Netflix handle millions of concurrent streams
- Learn load balancing strategies and when to apply them
- Master caching layers and CDN architecture
- Experience real distributed system failures and recovery patterns

**Low-Level Computing**
- Deep dive into video codecs and compression algorithms
- Understand process management and resource constraints
- Learn memory management with large file processing
- Explore OS-level optimizations for I/O operations

**Web Development & Networking**
- Implement real-time communication (WebSockets/SSE)
- Master HTTP streaming protocols and range requests
- Build robust REST APIs with proper error handling
- Understand TCP/IP stack through video streaming challenges

**Infrastructure & DevOps**
- Container orchestration and service discovery
- Message queue patterns and when to use them
- Database scaling strategies (eventually: sharding, replication)
- Monitoring and observability in distributed systems

**AI/ML Foundations**
- Implement basic transformer architecture from scratch
- Understand attention mechanisms hands-on
- Learn model serving and inference optimization
- Bridge the gap between AI theory and production systems

---

## Release Roadmap

### ✅ Phase 1: Core Processing Engine - COMPLETED
**Completed: Day 1** 

**Learning Focus:** How video processing actually works at the bytes level, HTTP streaming fundamentals

**Delivered:**
- ✅ REST API for video upload (max 500MB)
- ✅ Synchronous transcoding to 3 quality tiers (1080p, 720p, 360p)
- ✅ Job status tracking endpoint
- ✅ Video streaming with range request support

**Achievements:**
- Successfully process videos synchronously
- Support MP4 format with H.264 codec
- Implement HTTP range requests for video seeking
- 100% completion rate achieved

**Key Learnings:**
- HTTP range requests (206 Partial Content) enable seeking without full download
- FFmpeg transcoding pipeline and quality/bitrate relationships
- Node.js streams prevent memory overflow with large files
- ES modules vs CommonJS compatibility in modern Node.js

---

### ✅ Phase 2: Asynchronous Processing - COMPLETED
**Completed: Day 2**

**Learning Focus:** Message queue architectures, event-driven systems, how Spotify handles millions of simultaneous operations

**Delivered:**
- ✅ BullMQ message queue with Redis backend
- ✅ Background worker process with concurrency control
- ✅ Real-time progress updates via Server-Sent Events (SSE)
- ✅ Job persistence with retry logic and graceful recovery
- ✅ Worker health monitoring endpoint (/api/health)

**Achievements:**
- Successfully handled 5 concurrent uploads (tested with Tame Impala video)
- Zero blocking on upload endpoint - instant job ID response
- Real-time progress updates streaming via SSE
- Worker concurrency limit (2) preventing system overload
- 100% job completion rate with proper queue distribution

**Key Learnings:**
- BullMQ/Redis architecture for distributed job processing
- SSE vs WebSockets for unidirectional real-time updates
- Worker process isolation and memory leak prevention
- Health check patterns for production monitoring
- Event-driven architecture with proper cleanup

---

### ✅ Phase 2.5: Frontend Visualization - COMPLETED
**Completed: Day 3**

**Learning Focus:** Real-time UI updates, SSE client implementation, visual feedback patterns

**Delivered:**
- ✅ Drag-and-drop HTML upload interface
- ✅ Real-time ASCII-style progress bars using SSE endpoint
- ✅ Job status dashboard with inline video playback
- ✅ Video playback for completed jobs with View/Close buttons

**Achievements:**
- ASCII progress bars `[XXXX░░░░░░]` with percentage display
- Inline video player integration (no modal needed)
- Proper SSE connection management with cleanup
- Minimalist UI with lowercase aesthetic
- Error handling for video loading failures

**Key Learnings:**
- EventSource API for unidirectional real-time updates
- Inline media display vs modal patterns
- Connection lifecycle management in SPAs
- Progressive enhancement with drag-and-drop

---

### ✅ Phase 3: Distributed Architecture - COMPLETED
**Completed: Day 4**

**Learning Focus:** How GitHub/GitLab handle distributed workloads, consensus algorithms, failure recovery

**Delivered:**
- ✅ MinIO S3-compatible distributed storage
- ✅ Multi-worker support (tested with 3 concurrent workers)
- ✅ Zero local file dependencies - fully distributed
- ✅ Worker job distribution via Redis queue
- ✅ Automatic retry on worker failure (BullMQ)

**Achievements:**
- Successfully eliminated all local file storage
- Workers download from MinIO, process, upload back to MinIO
- Tested 3 workers processing simultaneously
- API server and workers completely decoupled
- 100% stateless workers - can run anywhere

**Key Learnings:**
- S3 protocol compatibility enables local MinIO to AWS migration
- Object storage vs filesystem - keys not paths
- Environment variables are always strings (boolean conversion needed)
- Distributed systems require shared storage not shared filesystem
- Worker statelessness enables horizontal scaling

---

### ✅ Phase 4: Content Delivery Network - COMPLETED
**Completed: Day 5**

**Learning Focus:** How Netflix achieves <100ms load times globally, caching strategies, network topology

**Delivered:**
- ✅ Nginx reverse proxy as edge cache server
- ✅ Cache key strategy with quality-based separation
- ✅ Cache bypass mechanism for debugging (?nocache=1)
- ✅ Performance testing showing 4.1x speedup
- ✅ Containerized entire stack (API, Worker, CDN)

**Achievements:**
- 100% cache hit rate on warm cache
- 75.9% performance improvement (4.1x faster)
- Sub-6ms response times for cached content
- Production-ready Docker architecture

**Key Learnings:**
- Nginx proxy_cache creates in-memory/disk cache layers
- Cache keys determine uniqueness ($request_uri for video+quality)
- Container networking uses service names for internal communication
- Docker port mapping maintains localhost compatibility

---

### Phase 4.5: User Management & Persistence
**Target: Week 8**

**Learning Focus:** Authentication, database design, user-generated content patterns

**Deliverables:**
- User registration and authentication system
- PostgreSQL database for user and video metadata
- Video ownership and naming functionality
- User video library with search capability
- Public video browsing by user

**Success Metrics:**
- Secure JWT-based authentication
- Efficient video metadata queries
- User isolation for private videos
- Search functionality < 100ms

**Technical Requirements:**
- PostgreSQL with proper indexing
- Password hashing (bcrypt)
- JWT token management
- Database migrations system
- RESTful user endpoints

---

### Phase 5: Intelligence Layer
**Target: Week 9-10**

**Learning Focus:** Transformer architecture from scratch, attention mechanisms, bridging AI research to production

**Deliverables:**
- Auto-captioning using transformer model
- Thumbnail generation at key frames
- Video quality analysis
- Content classification

**Success Metrics:**
- Caption accuracy > 80%
- Meaningful thumbnail selection
- Automated quality reports
- Basic content categorization

**Technical Requirements:**
- ML model integration
- GPU processing pipeline
- Model serving infrastructure
- Batch processing optimization

---

### Phase 6: Frontend Refinement
**Target: Week 11**

**Learning Focus:** Production UI patterns, state management at scale, user experience optimization

**Deliverables:**
- Multi-job management interface
- Quality selector for video playback (1080p/720p/360p)
- Job filtering and search
- Persistent job history view
- Download functionality for transcoded videos

**Success Metrics:**
- Handle 20+ simultaneous job displays smoothly
- Quality switching without player reload
- Job state persistence across sessions
- Intuitive multi-video management

**Technical Requirements:**
- Efficient DOM updates for multiple jobs
- Local storage for job history
- Lazy loading for video thumbnails
- Keyboard shortcuts for power users

---

## Technical Specifications

### API Endpoints
```
POST   /api/upload
GET    /api/jobs/:id
GET    /api/jobs/:id/status
DELETE /api/jobs/:id
GET    /api/stream/:id/:quality
GET    /api/health
```

### Video Specifications
- **Input formats**: MP4, MOV, AVI, WebM
- **Output formats**: MP4 (H.264), WebM (VP9)
- **Quality tiers**:
  - 1080p: 1920x1080, 5000kbps
  - 720p: 1280x720, 2500kbps
  - 360p: 640x360, 1000kbps

### Performance Requirements
- Upload: < 2s response time
- Transcoding: < 2x video duration
- Streaming: < 500ms initial load
- Storage: 3x input size (all qualities)

### Monitoring & Logging
- Job completion rate
- Average processing time
- Queue depth
- Worker utilization
- Error rates by type
- Storage consumption

---

## Development Guidelines

### Code Quality
- Comprehensive error handling
- Unit test coverage > 70%
- API documentation
- Container-ready deployment

### Security Considerations
- File type validation
- Size limits enforcement
- Rate limiting
- Secure file storage
- Input sanitization

### Scalability Considerations
- Stateless API design
- Horizontal scaling ready
- Database connection pooling
- Efficient file handling
- Memory leak prevention

---

## Future Enhancements
- Adaptive bitrate streaming (HLS/DASH)
- Live streaming support
- Video analytics dashboard
- Multi-tenant architecture
- Global CDN integration
- AI-powered video enhancement