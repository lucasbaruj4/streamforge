# Phase 5: Intelligence Layer — Implementation Plan (Revised)

## 🎯 Current Focus
Shift from *constructing* transformers from scratch to *engineering applied intelligence systems* using **Whisper** and related AI tools.  
This phase focuses on **production-grade speech-to-text** and **video intelligence integration** for StreamForge.

---

## ✅ Status Overview

**✅ COMPLETED (Research Foundations):**
- Implemented scaled dot-product attention  
- Implemented sinusoidal positional encoding  
- Implemented multi-head attention and feedforward layers  
- Built and visualized transformer blocks with residual connections  
- Understood encoder–decoder transformer architecture conceptually

**🎓 Outcome:** You now understand *how* transformers work — enough to use, optimize, and integrate them intelligently. We will now **focus on building systems that use these models effectively**.

---

## 🧩 Part 1: Whisper Integration (Core AI Functionality)

### Step 1.1 — Integrate Whisper Model
Use OpenAI’s Whisper as the backbone for speech recognition and caption generation.

```python
import whisper

model = whisper.load_model("base")

def transcribe_audio(audio_path: str):
    result = model.transcribe(audio_path, word_timestamps=True)
    return result
```

**Goals**
- Load and run Whisper models (`tiny`, `base`, `small`, `medium`, `large`)
- Extract transcriptions + timestamps
- Auto language detection
- Output JSON, SRT, and WebVTT

---

### Step 1.2 — Captioning Pipeline in the Distributed System

**Architecture**
```
[Node API] → [Redis Queue] → [Python ML Worker] → [MinIO Storage] → [Supabase DB]
```

**Worker Tasks**
1. Receive job from Redis (`caption-queue`)
2. Download video from MinIO
3. Extract audio via FFmpeg
4. Run Whisper transcription
5. Generate `.srt` and `.vtt`
6. Upload results to MinIO
7. Update DB (status, language, paths, word_count)

**Python ML Worker (simplified)**
```python
from bullmq import Worker
import whisper

model = whisper.load_model("base")

async def process_caption_job(job):
    video_key = job.data["objectKey"]
    # 1) download video → 2) extract audio → 3) transcribe
    result = model.transcribe("temp_audio.wav", word_timestamps=True)
    # 4) format to SRT/VTT → 5) upload to MinIO → 6) update DB
    return {"status": "ready", "srt_path": "...", "vtt_path": "...", "language": result.get("language", "en")}

worker = Worker("caption-queue", process_caption_job)
```

---

## 🧠 Part 2: Caption Formatting & Conversion

### Step 2.1 — Generate SRT + WebVTT
```python
def format_timestamp(t):
    ms = int((t - int(t)) * 1000)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

def format_as_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)

def srt_to_vtt(srt_text: str) -> str:
    return "WEBVTT\n\n" + srt_text.replace(",", ".")
```

**Outputs**
- `.srt` — for download/editing
- `.vtt` — for `<track>` in the frontend

---

## 🧰 Part 3: Backend & Database Integration

### Step 3.1 — Database Schema
```sql
CREATE TABLE IF NOT EXISTS captions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en',
  srt_path TEXT NOT NULL,
  vtt_path TEXT,
  caption_status VARCHAR(20) DEFAULT 'pending',
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captions_video_id ON captions(video_id);
```

**Caption States**
- `pending`  — job queued
- `processing` — ML worker running
- `ready` — caption files available
- `failed` — error during generation

---

### Step 3.2 — API Endpoints
```javascript
// GET captions file (VTT by default)
app.get('/api/videos/:videoId/captions', async (req, res) => {
  // stream VTT from MinIO or return 404 if not ready
});

// GET caption status
app.get('/api/videos/:videoId/captions/status', async (req, res) => {
  // return { status, language, updatedAt }
});

// POST regenerate captions
app.post('/api/videos/:videoId/captions/regenerate', requireAuth, async (req, res) => {
  // enqueue into caption-queue
});
```

---

## 🎬 Part 4: Frontend Integration

### Step 4.1 — Video Player with Captions
```html
<video controls>
  <source src="/api/stream/:videoId/720p" type="video/mp4" />
  <track
    kind="subtitles"
    src="/api/videos/:videoId/captions"
    srclang="en"
    label="English"
    default />
</video>
```

**UI Features**
- Real-time caption status badge (`[captions ✓]` / `[processing…]` / `[failed]`)
- Toggle captions on/off
- Multi-language support (multiple `<track>` entries)
- Terminal-style caption theme (font/contrast/position)

---

## 🚀 Part 5: Extended Intelligence (Optional)

- **Multi-language support**: detect + generate multiple tracks
- **Caption editor**: fix text/timing; save edited versions
- **Thumbnail generation**: keyframe extraction for highlights
- **Audio/quality analysis**: flag noisy/low-SNR uploads
- **Embedding-based search**: semantic retrieval over captions

---

## 📈 Success Metrics

- Caption accuracy (clear speech): **≥ 90%**
- Processing time: **≤ 1×** video duration
- Robust error handling (failed jobs < 2%)
- Multi-language track support
- Smooth frontend playback with captions enabled

---

## 🧪 Operational Playbook

- **Observability**: log job latency, queue depth, worker utilization
- **Retry policy**: exponential backoff; max retries = 3
- **Idempotency**: dedupe jobs per `video_id` + `language`
- **GPU utilization**: batch jobs when available; fall back to CPU
- **Storage hygiene**: TTL for temp audio; lifecycle rules in MinIO

---

## 🧱 Technical Stack

**Python**
```bash
pip install whisper librosa ffmpeg-python redis boto3 supabase
```

**Docker (excerpt)**
```yaml
ml-worker:
  build: ./ml-worker
  environment:
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - MINIO_ENDPOINT=minio:9000
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
  volumes:
    - ./ml-worker:/app
  depends_on:
    - redis
    - minio
```

**File Structure**
```
/ml-worker
  ├── Dockerfile
  ├── requirements.txt
  ├── worker.py
  ├── transcription.py
  ├── audio_processing.py
  └── utils/
      ├── srt.py
      └── storage.py
```

---

## 🗺️ Timeline

**Week 1**
- Whisper model integration
- End-to-end caption generation locally
- SRT/VTT formatting utilities

**Week 2**
- Python worker + Redis + MinIO integration
- DB schema + endpoints
- Frontend `<track>` + status UI

**Week 3**
- Error handling + retries + observability
- Optional: multi-language + caption editor

---

## ✅ Next Steps (Actionable)

1. Implement `transcription.py` (Whisper + timestamps → SRT/VTT)
2. Implement `worker.py` (job handler: download → extract → transcribe → upload → DB)
3. Add `/captions` and `/captions/status` endpoints
4. Wire frontend `<track>` + status badge
5. Add monitoring (queue depth, job latency, error rate)
