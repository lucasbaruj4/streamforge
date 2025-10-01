import { Worker } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { connection } from './lib/queue.js';
import storage from './lib/storage.js';
import { supabaseAdmin } from './lib/supabase.js';

async function processVideoJob(job) {
  try {
    const { objectKey, originalName } = job.data;
    console.log(`Processing job ${job.id}: ${originalName}`);

    const temp_dir = path.join('tmp', job.id);
    await fs.mkdir(temp_dir, { recursive : true });
    const localVideoPath = path.join(temp_dir, originalName);
    await storage.downloadFile(objectKey, localVideoPath);
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
      const command = ffmpeg(localVideoPath)
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
        .on('end', async () => {
          completedQualities++;
          const transcodeKey = `transcoded/${job.id}/${quality.name}.mp4`;
          await storage.uploadFile(transcodeKey, outputPath);
          output[quality.name] = transcodeKey;
          console.log(`${quality.name} complete for job ${job.id}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error transcoding quality: ${quality.name}.`, err)
          command.kill('SIGKILL');
          reject(err)
        })
        .save(outputPath);
    })
  }
  await fs.rm(temp_dir, { recursive : true, force : true});
  await fs.rm(outputDir, { recursive : true, force : true});

  // Update database with completed video info (only if record exists - authenticated uploads)
  const { data: existingVideo } = await supabaseAdmin
    .from('videos')
    .select('id')
    .eq('job_id', job.id)
    .single();

  if (existingVideo) {
    const { error: dbError } = await supabaseAdmin
      .from('videos')
      .update({
        status: 'ready',
        processed_at: new Date().toISOString(),
        storage_paths: {
          original: objectKey,
          ...output
        }
      })
      .eq('job_id', job.id);

    if (dbError) {
      console.error(`Failed to update database for job ${job.id}:`, dbError);
    } else {
      console.log(`Database updated for job ${job.id}`);
    }
  } else {
    console.log(`Job ${job.id} is anonymous - skipping database update`);
  }

    console.log(`Job ${job.id} completed`);
    return output;
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error.message);
    throw error;
  }
}

// Create the worker
const worker = new Worker('video-transcoding', processVideoJob, {
  connection,
  concurrency: 2,  // Process 2 videos at once
});

// Error handling
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  await worker.close();
  process.exit(0);
});

console.log('🎬 StreamForge Worker started - Waiting for jobs...');
