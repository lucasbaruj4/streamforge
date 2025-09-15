import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis'

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false
})

connection.on('connect', () => {
  console.log('Connected to Redis');
})

connection.on('error', (error) => {
  console.error('Redis connection error', error);
})

// Create the video transcoding queue
export const videoQueue = new Queue('video-transcoding', {
  connection,
  defaultJobOptions: {
    attempts: 3,             // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',   // Wait 2^attempt seconds between retries
      delay: 2000,           // Start with 2 second delay
    },
    removeOnComplete: {
      age: 24 * 3600,        // Keep completed jobs for 24 hours
      count: 100,            // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600,    // Keep failed jobs for 7 days for debugging
    },
  },
});

// Queue events for real-time updates
export const queueEvents = new QueueEvents('video-transcoding', {
  connection: connection.duplicate(),
});

// Export the connection for other modules
export { videoQueue, queueEvents, connection };

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Redis connections...');
  await videoQueue.close();
  await queueEvents.close();
  await connection.quit();
});
