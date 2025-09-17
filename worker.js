import { Worker } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { connection } from './lib/queue.js';

async function processVideoJob(job) {
  const { inputPath, originalName } = job.data;
  console.log(`Processing job ${job.id}: ${originalName}`);
  const outputDir = path.join('transcoded', job.id);
  await fs.mkdir(outputDir, { recursive: true });

  const qualities = [
    { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
    { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
    { name: '360p', width: 640, height: 360, bitrate: '1000k' }

  ];
  const output = {};
  let completedQualities = 0;
  for (const quality of qualities) {
    const outputPath = path.join(outputDir, `${quality.name}.mp4`);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${quality.width}:${quality.height}`,
          `-b:v ${quality.bitrate}`,
          `-b:a 128k`,
          `-c:v libx264`,
          `-c:a aac`,
          `-preset medium`,
          `-movflags +faststart`
        ])
        .on('progress', (progress) => {
          const qualityProgress = completedQualities * 100;
          const currentProgress = progress.percent || 0;
          const TotalProgress = Math.round(
            (qualityProgress + currentProgress) / qualities.length
          );
          job.updateProgress(TotalProgress);
        })
        .on('end', () => {
          completedQualities++;
          output[quality.name] = outputPath;
          console.log(`${quality.name} complete for job ${job.id}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error transcoding quality: ${quality.name}.`, err)
          reject(err)
        })
        .save(outputPath)
    })

  }
  await fs.unlink(inputPath);

  console.log(`Job ${job.id} fully completed`);
  return output;
}

// Create the worker
const worker = new Worker('video-transcoding', processVideoJob, {
  connection,
  concurrency: 2,  // Process 2 videos at once
});

// Event listeners for monitoring
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on('active', (job) => {
  console.log(`Started processing job ${job.id}`);
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} is ${progress}% complete`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  await worker.close();
  process.exit(0);
});

console.log('🎬 StreamForge Worker started - Waiting for jobs...');
