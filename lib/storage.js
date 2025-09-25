// MinIO/S3 storage interface for distributed file access
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  BucketAlreadyExists
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { pipeline } from 'stream/promises';

// Initialize S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.endpoint,  
  region: process.env.region,  
  credentials: {
    accessKeyId: process.env.accessKeyId,      
    secretAccessKey: process.env.secretAccessKey   
  },
  forcePathStyle: process.env.forcePathStyle  
});

const BUCKET_NAME = 'streamforge-videos'; 

// Create bucket if it doesn't exist
export async function initializeStorage() {
  try {
    await s3Client.send(new HeadBucketCommand( {Bucket: BUCKET_NAME}));
    console.log(`Bucket ${BUCKET_NAME} already exists`);
  } catch (error ){
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        await s3Client.send(new CreateBucketCommand({Bucket: BUCKET_NAME}));
        console.log(`Created Bucket: ${BUCKET_NAME}`);
      } catch (createError) {
        if (createError.name !== 'BucketAlreadyExists' && createError.name !== 'BucketAlreadyOwnedByYou'){
          throw createError;
        }
      } 
    } else {
      throw error;
    }
  } 
}
 
// Upload file from local storage to MinIO
export async function uploadFile(objectKey, localPath) {
  const uploadStream = fs.createReadStream(localPath);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: uploadStream
    }
  });

  upload.on("httpUploadProgress", (progress) => {
    console.log('Upload to MinIO progress: ', progress);
  });

  await upload.done();
  return objectKey;
}

// Download file from MinIO to local path
export async function downloadFile(objectKey, localPath) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey
  });

  const response = await s3Client.send(command);
  const fileStream = fs.createWriteStream(localPath);

  await pipeline(
    response.Body,
    fileStream
  );

  return localPath;
}

// Get a readable stream from MinIO
export async function getFileStream(objectKey) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey
  });

  const response = await s3Client.send(command);
  return response.Body; 
}

// Delete file from MinIO
export async function deleteFile(objectKey) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey
  });

  return await s3Client.send(command);
}

export default {
  initializeStorage,
  uploadFile,
  downloadFile,
  getFileStream,
  deleteFile
};