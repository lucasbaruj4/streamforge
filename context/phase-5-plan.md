# Phase 5: Intelligence Layer - Implementation Plan

## Overview
Build auto-captioning system by implementing transformer architecture from scratch, then integrating pre-trained Whisper model for production-quality speech-to-text on uploaded videos.

## Philosophy: Learn by Building
This phase takes a **bottom-up approach** - we'll build each transformer component from scratch to understand the architecture deeply, then leverage that knowledge to work with production models.

## Why This Matters
- **YouTube processes 500+ hours of video per minute** - all auto-captioned
- **Netflix uses ML for subtitle timing** - reduces human labor by 80%
- **Zoom's live captions** use transformer-based speech recognition
- Understanding transformers unlocks: GPT, BERT, Whisper, and modern AI

---

## Part 1: Transformer Fundamentals (Week 1)

### Goal
Build a tiny transformer from scratch for a simple task (text translation or generation), understanding every single line of code.

### Step 1.1: Attention Mechanism - The Core Innovation
**Learning Focus:** Why transformers replaced RNNs, how attention "focuses" on relevant parts of input

**What You'll Build:**
```python
# Simplified attention mechanism (you'll implement this)
def scaled_dot_product_attention(Q, K, V):
    # Q = queries, K = keys, V = values
    # This is the heart of transformers
    pass  # TODO(human): Implement attention calculation
```

**Key Concepts:**
- Query, Key, Value (QKV) matrices - what they mean intuitively
- Attention scores - how the model decides what's important
- Scaled dot-product - why we scale and what happens if we don't
- Softmax normalization - turning scores into probabilities

**Hands-on Task:**
- Visualize attention weights on a simple sentence
- See how attention "connects" words to each other
- Understand why "The cat sat on the mat" focuses "cat" → "sat"

**Success Metric:** You can explain attention to someone without looking at notes

---

### Step 1.2: Positional Encoding
**Learning Focus:** Transformers have no notion of sequence order - we must inject it

**What You'll Build:**
```python
def positional_encoding(seq_length, d_model):
    # Encodes position information using sin/cos waves
    pass  # TODO(human): Implement PE calculation
```

**Key Concepts:**
- Why RNNs didn't need this (they process sequentially)
- Sin/cos wave patterns encode position uniquely
- Why this works better than learned embeddings
- Visualizing positional encodings as a heatmap

**Hands-on Task:**
- Plot positional encodings for a 10-word sentence
- See how similar positions have similar encodings
- Understand relative position encoding

---

### Step 1.3: Multi-Head Attention
**Learning Focus:** Multiple attention "perspectives" capture different relationships

**What You'll Build:**
```python
class MultiHeadAttention:
    def __init__(self, d_model, num_heads):
        # Multiple attention heads in parallel
        pass

    def forward(self, Q, K, V):
        # TODO(human): Split into heads, apply attention, concatenate
        pass
```

**Key Concepts:**
- Why 8 heads instead of 1? (different linguistic patterns)
- Head 1 might learn syntax, Head 2 semantics, etc.
- Parallel computation - all heads run simultaneously
- Concatenation and projection back to model dimension

**Hands-on Task:**
- Visualize what different heads learn
- See one head focus on adjacent words, another on long-range
- Understand head specialization

---

### Step 1.4: Feedforward Network
**Learning Focus:** The "thinking" layer after attention

**What You'll Build:**
```python
class FeedForward:
    def __init__(self, d_model, d_ff):
        # Two linear layers with activation
        pass

    def forward(self, x):
        # TODO(human): Expand → ReLU → Contract
        pass
```

**Key Concepts:**
- Why expand to 4x dimension then contract?
- ReLU vs GELU activation functions
- Position-wise processing (same network for each position)

---

### Step 1.5: Transformer Block
**Learning Focus:** Combining attention + feedforward with residual connections

**What You'll Build:**
```python
class TransformerBlock:
    def __init__(self, d_model, num_heads, d_ff):
        self.attention = MultiHeadAttention(d_model, num_heads)
        self.feedforward = FeedForward(d_model, d_ff)
        self.norm1 = LayerNorm(d_model)
        self.norm2 = LayerNorm(d_model)

    def forward(self, x):
        # TODO(human): Attention → Add & Norm → FFN → Add & Norm
        pass
```

**Key Concepts:**
- Residual connections prevent vanishing gradients
- Layer normalization stabilizes training
- Why normalization comes after addition (Post-LN vs Pre-LN)

---

### Step 1.6: Full Transformer Architecture
**Learning Focus:** Encoder-decoder structure, how pieces fit together

**What You'll Build:**
```python
class Transformer:
    def __init__(self, vocab_size, d_model, num_layers, num_heads):
        self.encoder = TransformerEncoder(...)
        self.decoder = TransformerDecoder(...)

    def forward(self, src, tgt):
        # TODO(human): Encode source → Decode target
        pass
```

**Key Concepts:**
- Encoder processes input (video audio features)
- Decoder generates output (text captions) auto-regressively
- Cross-attention - decoder attends to encoder outputs
- Masked attention - decoder can't see future words

---

### Step 1.7: Training Loop (The Learning Process)
**What You'll Build:**
```python
def train_epoch(model, data_loader, optimizer, criterion):
    for batch in data_loader:
        # TODO(human): Forward pass → Loss → Backward → Update
        pass
```

**Key Concepts:**
- Cross-entropy loss for sequence prediction
- Teacher forcing during training (give model correct previous words)
- Learning rate scheduling (warm-up then decay)
- Gradient clipping prevents exploding gradients

**First Milestone:** Train on a tiny dataset (1000 sentence pairs)
- English → Spanish translation OR
- Predict next word in a sentence
- Watch loss decrease, see model learn patterns
- Generate your first transformer output!

---

## Part 2: Audio Processing Foundations (Week 2)

### Step 2.1: Understanding Audio Data
**Learning Focus:** How computers represent sound, why we can't feed raw audio to models

**What You'll Learn:**
- Waveforms vs spectrograms (time domain vs frequency domain)
- Sampling rate (44.1kHz means 44,100 numbers per second)
- Why spectrograms look like images (2D: time × frequency)
- Mel scale - compresses frequencies like human hearing

**Hands-on Task:**
```python
# Extract audio from video
def extract_audio(video_path, output_path):
    # TODO(human): Use FFmpeg to extract audio track
    pass

# Visualize waveform and spectrogram
def visualize_audio(audio_path):
    # TODO(human): Plot waveform and mel-spectrogram
    pass
```

**Success Metric:** Upload a video, extract audio, see the mel-spectrogram visualization

---

### Step 2.2: Mel-Spectrogram Extraction
**Learning Focus:** Converting audio to model-friendly representation

**What You'll Build:**
```python
import librosa

def audio_to_mel_spectrogram(audio_path, n_mels=80):
    # Load audio
    y, sr = librosa.load(audio_path, sr=16000)

    # TODO(human): Compute mel-spectrogram with librosa
    mel_spec = ...

    return mel_spec
```

**Key Concepts:**
- 80 mel bands (frequency buckets) is standard for speech
- 16kHz sampling rate (Whisper's requirement)
- Hop length determines time resolution
- Log scale for amplitude (decibels)

**Hands-on Task:**
- Extract mel-spectrograms from 5 test videos
- Visualize how speech looks vs music vs silence
- Understand why this representation works for ML

---

### Step 2.3: Data Preprocessing Pipeline
**Learning Focus:** Preparing audio features for transformer input

**What You'll Build:**
```python
class AudioPreprocessor:
    def __init__(self, sample_rate=16000, n_mels=80):
        pass

    def process_video(self, video_path):
        # TODO(human): Extract → Resample → Mel-spec → Normalize
        pass

    def chunk_audio(self, mel_spec, chunk_seconds=30):
        # TODO(human): Split long audio into 30-second chunks
        pass
```

**Key Concepts:**
- Why 30-second chunks? (memory constraints, attention span)
- Normalization (zero mean, unit variance)
- Padding short audio, chunking long audio
- Batching for efficient GPU processing

---

## Part 3: Whisper Integration (Week 3)

### Step 3.1: Understanding Whisper Architecture
**Learning Focus:** How OpenAI adapted transformers for speech recognition

**What You'll Learn:**
- Whisper is an encoder-decoder transformer (like we built!)
- Encoder: mel-spectrogram → audio embeddings
- Decoder: embeddings → text tokens (auto-regressive)
- Pre-trained on 680,000 hours of multilingual audio
- Why it's so good: massive dataset + careful training

**Key Differences from Our Toy Model:**
- 1550M parameters vs our ~10M
- Multi-task training (transcription, translation, language detection)
- Hierarchical audio encoding
- Robust to noise, accents, background sounds

---

### Step 3.2: Setting Up Whisper
**What You'll Build:**
```python
import whisper

# Load pre-trained model
model = whisper.load_model("base")  # 74M params, good balance

def transcribe_audio(audio_path):
    # TODO(human): Load model, transcribe, extract timestamps
    result = model.transcribe(audio_path, ...)
    return result
```

**Model Size Options:**
- `tiny` (39M) - Fast, less accurate
- `base` (74M) - **Recommended starting point**
- `small` (244M) - Better accuracy, slower
- `medium` (769M) - Great accuracy, needs GPU
- `large` (1550M) - Best accuracy, slow without GPU

**Hands-on Task:**
- Transcribe a 1-minute video
- Compare `tiny` vs `base` vs `small` quality
- Measure processing time on your hardware
- Choose model based on accuracy/speed trade-off

---

### Step 3.3: Caption Generation with Timestamps
**Learning Focus:** Generating SRT-formatted captions with word-level timing

**What You'll Build:**
```python
def generate_captions(video_path, model):
    # Extract audio
    audio_path = extract_audio(video_path)

    # Transcribe with word timestamps
    result = model.transcribe(audio_path, word_timestamps=True)

    # TODO(human): Convert to SRT format
    srt_content = format_as_srt(result['segments'])

    return srt_content

def format_as_srt(segments):
    # TODO(human): Format timestamps and text as SRT
    # SRT format:
    # 1
    # 00:00:00,000 --> 00:00:02,500
    # This is the first caption
    pass
```

**SRT Format Example:**
```
1
00:00:00,000 --> 00:00:02,500
Welcome to StreamForge

2
00:00:02,500 --> 00:00:05,000
This video was auto-captioned
```

**Hands-on Task:**
- Generate captions for test video
- Open in VLC to verify timing
- Adjust segment length (short vs long captions)
- Handle edge cases (silence, music, overlapping speech)

---

### Step 3.4: Python ML Service Architecture
**Learning Focus:** Separating ML workload from Node.js, inter-service communication

**What You'll Build:**
```
Current Architecture:
[Node API] → [Redis Queue] → [Node Worker] → [MinIO]

New Architecture:
[Node API] → [Redis Queue] → ┬ [Node Worker] (transcoding)
                               └ [Python ML Worker] (captions)
```

**Python Worker Structure:**
```python
from bullmq import Worker, Job
import whisper

# Load model once at startup
model = whisper.load_model("base")

async def process_caption_job(job: Job):
    # TODO(human): Download video → Extract audio → Transcribe → Upload SRT
    video_key = job.data['objectKey']
    job_id = job.id

    # Download from MinIO
    # Process with Whisper
    # Generate SRT
    # Upload to MinIO
    # Update database

    return {"srt_path": "..."}

worker = Worker("caption-queue", process_caption_job, connection=redis_config)
```

**Key Concepts:**
- Separate queue for ML jobs (`caption-queue`)
- Python worker reads from same Redis instance
- Model loaded once (startup), reused for all jobs
- GPU utilization if available

---

### Step 3.5: Triggering Caption Generation
**Learning Focus:** Queueing caption job after video transcode completes

**What You'll Build:**
```javascript
// In worker.js (Node worker)
async function processVideoJob(job) {
    // ... existing transcoding ...

    // After transcoding succeeds, queue caption job
    await captionQueue.add('generate-captions', {
        objectKey: objectKey,
        jobId: job.id,
        userId: job.data.userId
    });

    console.log(`Queued caption job for ${job.id}`);

    return output;
}
```

**Flow:**
1. User uploads video
2. Node worker transcodes to 1080p/720p/360p
3. Node worker queues caption job
4. Python ML worker picks up caption job
5. Whisper generates captions
6. SRT file uploaded to MinIO
7. Database updated with caption path

---

## Part 4: Database & Frontend Integration (Week 4)

### Step 4.1: Database Schema for Captions
**What You'll Build:**
```sql
-- Add caption fields to videos table
ALTER TABLE videos ADD COLUMN caption_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN caption_path TEXT;
ALTER TABLE videos ADD COLUMN caption_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE videos ADD COLUMN caption_generated_at TIMESTAMPTZ;

-- Or create separate captions table
CREATE TABLE captions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en',
  srt_path TEXT NOT NULL,
  vtt_path TEXT,  -- WebVTT format for HTML5
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_captions_video_id ON captions(video_id);
```

**Key Decisions:**
- Single captions table vs adding columns to videos?
- Support multiple languages per video?
- Store SRT and/or WebVTT format?

---

### Step 4.2: Caption API Endpoints
**What You'll Build:**
```javascript
// Get captions for a video
app.get('/api/videos/:videoId/captions', async (req, res) => {
    // TODO(human): Query database, download from MinIO, return SRT
});

// Trigger caption regeneration
app.post('/api/videos/:videoId/captions/regenerate', requireAuth, async (req, res) => {
    // TODO(human): Queue new caption job
});
```

**Endpoints:**
- `GET /api/videos/:id/captions` - Download SRT file
- `GET /api/videos/:id/captions/status` - Check caption generation progress
- `POST /api/videos/:id/captions/regenerate` - Re-run captioning

---

### Step 4.3: Video Player Caption Support
**Learning Focus:** HTML5 `<track>` element, WebVTT format

**What You'll Build:**
```html
<video controls>
  <source src="/api/stream/video-id/720p" type="video/mp4">
  <track
    kind="subtitles"
    src="/api/videos/video-id/captions"
    srclang="en"
    label="English"
    default>
</video>
```

**Key Concepts:**
- WebVTT format (similar to SRT, web-native)
- Convert SRT → WebVTT (change format slightly)
- Caption styling with CSS (position, font, background)
- Multiple caption tracks (multi-language support)

**Hands-on Task:**
- Add caption track to video player
- Test caption display and timing
- Style captions to match terminal aesthetic
- Add caption toggle button

---

### Step 4.4: Caption Status Indicators
**What You'll Build:**
```javascript
// Frontend: Show caption status
function displayVideo(video) {
    const statusBadge = video.caption_status === 'ready'
        ? '[captions ✓]'
        : '[generating captions...]';

    // Display badge next to video
}
```

**Caption States:**
- `pending` - Caption job queued
- `processing` - Whisper running
- `ready` - Captions available
- `failed` - Error during generation

---

## Part 5: Advanced Features (Optional Extensions)

### 5.1: Multi-Language Support
- Detect video language automatically
- Generate captions in multiple languages
- Translation (English captions → Spanish captions)

### 5.2: Caption Editing
- Web interface to edit generated captions
- Fix transcription errors
- Adjust timing
- Save edited version

### 5.3: Thumbnail Generation
- Extract keyframes at interesting moments
- Use attention weights to find "important" frames
- Generate thumbnail grid
- Let user select custom thumbnail

### 5.4: Video Quality Analysis
- Detect low-quality audio (noise, compression)
- Flag videos that might have bad captions
- Suggest re-upload with better quality

### 5.5: Content Classification
- Simple sentiment analysis on captions
- Topic detection (tech, music, gaming, etc.)
- NSFW content detection
- Auto-tagging videos

---

## Success Metrics

### Phase 5.1 (Transformer Understanding)
- ✅ Can explain attention mechanism without notes
- ✅ Implemented transformer from scratch (all components)
- ✅ Trained on toy dataset, saw convergence
- ✅ Generated meaningful output (translation or text)

### Phase 5.2 (Audio Processing)
- ✅ Extract audio from video successfully
- ✅ Generate mel-spectrograms
- ✅ Visualize audio features
- ✅ Understand frequency domain representation

### Phase 5.3 (Whisper Integration)
- ✅ Transcribe video to text with Whisper
- ✅ Generate SRT captions with timestamps
- ✅ Python ML worker running in Docker
- ✅ Caption jobs queued and processed automatically

### Phase 5.4 (Production Integration)
- ✅ Captions stored in database
- ✅ Captions display on video player
- ✅ Caption status tracking (pending → ready)
- ✅ User can download SRT files

### Phase 5.5 (Quality Metrics)
- Caption accuracy: >90% for clear speech
- Processing time: <1x video duration (30min video → 30min processing)
- Language support: English (baseline), Spanish (stretch goal)
- User satisfaction: Captions are useful, not distracting

---

## Technical Stack

### Python Environment
```bash
# Install Python dependencies
pip install torch whisper librosa bullmq redis boto3 supabase
```

### Docker Service
```yaml
# docker-compose.yml
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

### File Structure
```
/ml-worker
  ├── Dockerfile
  ├── requirements.txt
  ├── worker.py              # BullMQ worker
  ├── transcription.py       # Whisper integration
  ├── audio_processing.py    # Audio extraction
  └── models/
      └── transformer/       # Our scratch implementation
          ├── attention.py
          ├── encoder.py
          ├── decoder.py
          └── model.py
```

---

## Learning Outcomes

By completing this phase, you'll deeply understand:

### Transformer Architecture
- **Attention mechanism** - why it revolutionized NLP/speech
- **Multi-head attention** - parallel pattern recognition
- **Positional encoding** - injecting sequence order
- **Encoder-decoder** - how sequence-to-sequence works
- **Training dynamics** - loss curves, convergence, hyperparameters

### Audio/Speech Processing
- **Waveforms vs spectrograms** - time vs frequency representation
- **Mel scale** - perceptual frequency warping
- **Feature extraction** - preparing audio for ML
- **Speech recognition** - challenges and solutions

### Production ML Systems
- **Model serving** - loading once, reusing efficiently
- **GPU utilization** - batch processing for speed
- **Multi-service architecture** - Python + Node.js coordination
- **Monitoring ML jobs** - tracking progress, handling failures

### Real-World Patterns
- **How YouTube auto-captions** 500+ hours/minute
- **How Zoom does live captions** with low latency
- **Why transformers replaced RNNs** for speech recognition
- **How to evaluate ML quality** (accuracy, speed, cost trade-offs)

---

## Timeline Estimate

**Conservative (Deep Learning):** 4 weeks
- Week 1: Transformer from scratch + toy training
- Week 2: Audio processing + Whisper setup
- Week 3: Python worker + integration
- Week 4: Frontend + polish

**Aggressive (Move Fast):** 2 weeks
- Week 1: Transformer basics + Whisper integration
- Week 2: Full system integration

**Realistic (Balanced):** 3 weeks
- Days 1-7: Transformer implementation + understanding
- Days 8-14: Whisper integration + Python worker
- Days 15-21: Database + frontend + testing

---

## Next Steps

1. **Set up Python environment** (virtual env, dependencies)
2. **Build attention mechanism** (first hands-on component)
3. **Visualize attention weights** (see it work on toy data)
4. **Implement positional encoding** (add sequence awareness)
5. **Build first transformer block** (attention + FFN)

**Ready to start with Step 1.1: Attention Mechanism?**
