import express from 'express'
import multer from 'multer'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4} from 'uuid'

const app = express()
const PORT = 3000 

const jobs = new Map() 

// Middleware video checking
const upload = multer({
  dest: 'uploads/', // Temporary local storage folder
  limits: {
    fileSize: 500 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.avi', '.mov', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)){
        cb(null, true);
    } else {
        cb(new Error('Invalid type file'), false);
    }
  }
});

// Post endpoint
app.post('/api/upload', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: 'No video file provided'});
    }

    const jobID = uuidv4();

    jobs.set(jobID, {
        id: jobID,
        status: 'pending', 
        progress: 0,
        input: req.file.path, 
        originalname: req.file.originalname,
        totalQualities: 0,
        completedQualities: 0,
        outputs: {}
    });

    
    transcodeVideo(jobID, req.file.path).catch(err => {
        const job = jobs.get(jobID);
        if (job) {
            job.status = 'failed';
            job.error = err.message;
        }
    });

    res.json({
        jobID,
        message: 'Video uploaded successfully', 
        status: 'pending'
    });
});

// Get job details endpoint
app.get('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);

    if (!job) {
        return res.status(400).json({error: 'Job not found'});
    }

    const {input, ...safeJob} = job;

    res.json(safeJob);
})

// Get status check endpoint
app.get('/api/jobs/:id/status', (req, res) => {
    const job = jobs.get(req.params.id);

    if (!job) {
        return res.status(400).json(({error: 'Job not found'}))
    }

    res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        outputs: job.status === 'completed' ? Object.keys(job.outputs) : []
    });
});


// Transcoding ffmpeg function
async function transcodeVideo(jobID, inputPath) {
    const job = jobs.get(jobID);

    const outputDir = path.join('transcoded', jobID);
    await fs.mkdir(outputDir, {recursive: true});

    const qualities = [
        { name: '1080p', width: 1920, height: 1080, bitrate: '5000k'},
        { name: '720p', width: 1280, height: 720, bitrate: '2500k'},
        { name: '360p', width: 640, height: 360, bitrate: '1000k'}

    ];

    job.status = 'processing';
    job.totalQualities = qualities.length;
    job.completedQualities = 0;

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
                const qualityProgress = job.completedQualities * 100;
                const currentProgress = progress.percent || 0;
                job.progress = Math.round(
                    (qualityProgress + currentProgress) / job.totalQualities
                );
                console.log(`Job ${jobID}: ${job.progress}% complete`)
            })
            .on('end', () => {
                job.completedQualities++;
                job.outputs[quality.name] = outputPath;
                console.log(`${quality.name} complete for job ${jobID}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error transcoding quality: ${quality.name}.`, err)
                reject(err)
            })
            .save(outputPath)
        })

    }

    job.status = 'completed';
    job.progress = 100;

    await fs.unlink(inputPath);

    console.log(`Job ${jobID} fully completed`);
}




app.listen(PORT, () => {
    console.log(`StreamForge running on http://localhost:${PORT}`)
});


    