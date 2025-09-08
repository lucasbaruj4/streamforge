import express from 'express'
import multer from 'multer'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4} from 'uuid'

const app = express()
const PORT = 3000 

const jobs = new Map()

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
        outputs: {}
    });

    // TODO: transcoding logic, we'll do this next

    res.json({
        jobId,
        message: 'Video uplaoded successfully', 
        status: 'pending'
    });
});

app.listen(PORT, () => {
    console.log(`StreamForge running on http://localhost:${PORT}`)
});