import express from 'express'
import { createReadStream } from 'fs'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { videoQueue, queueEvents } from './lib/queue.js'

const app = express()
const PORT = 3000

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

// New async upload endpoint
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }


  const job = await videoQueue.add('transcode-video', {
    inputPath: req.file.path,
    originalName: req.file.originalname
  });

  // Return immediately with job ID
  res.json({
    jobID: job.id,
    message: 'Video uploaded and queued for processing',
    status: 'queued'
  });
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
  const videoPath = outputs?.[quality];

  if (!videoPath) {
    return res.status(404).json({ error: 'Quality not available' });
  }

  // Rest of streaming logic stays the same
  try {
    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const stream = createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });

      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });

      createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming:', error);
    res.status(500).json({ error: 'Streaming Error' });
  }
});

app.listen(PORT, () => {
  console.log(`StreamForge API running on http://localhost:${PORT}`)
});
