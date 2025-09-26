import express from 'express'
import { createReadStream } from 'fs'
import multer from 'multer'
import path from 'path'
import { v4 } from 'uuid'
import fs from 'fs/promises'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { videoQueue, queueEvents, connection } from './lib/queue.js'
import storage from './lib/storage.js'  // MinIO storage interface
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from "./lib/storage.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)
const app = express()
app.use(cors());
const PORT = 3000
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.avi', '.mov', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid type file'), false);
    }
  }
});

// New async upload endpoint with MinIO storage
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }
  try {
    const storage_id = v4();

    const objectKey = `uploads/${storage_id}/${req.file.originalname}`;
    await storage.uploadFile(objectKey, req.file.path);
    await fs.unlink(req.file.path);

    const job = await videoQueue.add('transcode-video', {
      objectKey: objectKey,  
      originalName: req.file.originalname
    });
    
    // Return immediately with job ID
    res.json({
      jobID: job.id,
      message: 'Video uploaded and queued for processing',
      status: 'queued'
    });
  } catch (error) {
    console.error('Upload failed:', error);
    // Clean up temp file on error
    await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get job status endpoint
app.get('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const job = await videoQueue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const status = await job.getState();
  return res.json({
    id: job.id,
    status: status,
    progress: job.progress,
    result: status === 'completed' ? job.returnvalue :
      status === 'failed' ? 'Job Failed' : 'Job still processing'
  })
});

// Quick check status endpoint
app.get('/api/jobs/:id/status', async (req, res) => {
  const { id } = req.params;
  const job = await videoQueue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const status = await job.getState();
  return res.json({
    id: job.id,
    status: status,
    progress: job.progress
  })
});

// Real-time progress updates via Server-Sent Events
// Streams live updates as video processes - no polling needed
app.get('/api/jobs/:id/progress', async (req, res) => {
  const { id } = req.params;

  // Verify job exists before setting up SSE
  const job = await videoQueue.getJob(id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  // Configure SSE headers for real-time streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable proxy buffering
  });

  // Send initial job state immediately
  const initialState = await job.getState();
  res.write(`data: ${JSON.stringify({
    id: job.id,
    status: initialState,
    progress: job.progress || 0
  })}\n\n`);

  // Cleanups
  const cleanup = () => {
    queueEvents.off('progress', progressListener);
    queueEvents.off('failed', failedListener);
    queueEvents.off('completed', completedListener);
    res.end();
  };

  // Listener objects
  const progressListener = (eventData) => {
    if (eventData.jobId === id) {
      res.write(`data: ${JSON.stringify({
        id: id,
        progress: eventData.data
      }
      )}\n\n`);
    }
  };

  const failedListener = (eventData) => {
    if (eventData.jobId === id) {
      res.write(`data: ${JSON.stringify({
        id: id,
        failedReason: eventData.failedReason,
        message: 'Job Failed'
      }
      )}\n\n`);
      cleanup();
    }
  };

  const completedListener = (eventData) => {
    if (eventData.jobId === id) {
      res.write(`data: ${JSON.stringify({
        id: id,
        returnvalue: eventData.returnvalue,
        message: 'Job Completed'
      }
      )}\n\n`);
      cleanup();
    }
  };

  queueEvents.on('progress', progressListener);
  queueEvents.on('failed', failedListener);
  queueEvents.on('completed', completedListener);

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    console.log(`SSE client disconnected for job ${id}`);
    cleanup();
  });
});

// Health check endpoint - monitors system status
app.get('/api/health', async (req, res) => {
  try {
    // Check Redis Connection Health
    const con_status = connection.status;
    if (con_status !== 'ready') {
      return res.status(503).json('Server not connected to Redis');
    }

    // Get all job counts
    const jobs_count = await videoQueue.getJobCounts();

    //Get all worker counts
    const jobs_info = await videoQueue.getWorkers();

    // 503 if there aren't any workers
    if (jobs_info.length === 0) {
      return res.status(503).json({
        status: 'Unhealthy',
        error: 'No workers available'
      });
    }

    res.status(200).json({
      status: 'healthy',
      metrics: {
        jobs_count: jobs_count,
        jobs_info: jobs_info
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Stream video endpoint - this stays mostly the same
app.get('/api/stream/:id/:quality', async (req, res) => {
  const { id, quality } = req.params;

  // Get job from queue
  const job = await videoQueue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Video not found' });
  } else if ((await job.getState()) !== 'completed') {
    return res.status(404).json({ error: 'Video still processing' });
  }

  // Get the output path from job's return value
  const outputs = job.returnvalue;
  const objectKey = outputs?.[quality];

  if (!objectKey) {
    return res.status(404).json({ error: 'Quality not available' });
  }

  // Rest of streaming logic stays the same
  try {
    const statCommand = new HeadObjectCommand ({
      Bucket: 'streamforge-videos',
      Key: objectKey
    });

    const statResponse = await s3Client.send(statCommand);
    const fileSize = statResponse.ContentLength;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const streamCommand = new GetObjectCommand({
        Bucket: 'streamforge-videos',
        Key: objectKey,
        Range: `bytes=${start}-${end}`
      });

      const streamResponse = await s3Client.send(streamCommand);

      res.writeHead(206, {
        'Content-Range': `bytes ${start} -${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });

      streamResponse.Body.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': 'video/mp4'
      });

      const fullStreamCommand = new GetObjectCommand({
        Bucket: 'streamforge-videos',
        Key: objectKey
      });

      const fullStreamResponse = await s3Client.send(fullStreamCommand);

      fullStreamResponse.Body.pipe(res);
    }
  } catch (error) {
    console.error('Error streaming:', error);
    res.status(500).json({ error: 'Streaming Error' });
  }
});

// Initialize storage and start server
async function startServer() {
  try {
    // Initialize MinIO storage
    await storage.initializeStorage();
    console.log('MinIO storage initialized');

    app.listen(PORT, () => {
      console.log(`StreamForge API running on http://localhost:${PORT}`)
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
