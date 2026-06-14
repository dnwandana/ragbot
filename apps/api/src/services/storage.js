import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  requestHandler: {
    connectionTimeout: Number(process.env.S3_TIMEOUT_MS),
    requestTimeout: Number(process.env.S3_TIMEOUT_MS),
  },
})

const BUCKET = process.env.S3_BUCKET

/**
 * Upload a file buffer to R2/S3 at the given key.
 *
 * @param {string} key - Object key (storage path) within the bucket
 * @param {Buffer} buffer - File content as a Buffer
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} The key that was uploaded
 * @throws {Error} If the S3 PutObject command fails
 */
export const uploadFile = async (key, buffer, contentType) => {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  return key
}

/**
 * Delete an object from R2/S3 by key.
 *
 * @param {string} key - Object key to delete
 * @returns {Promise<void>}
 * @throws {Error} If the S3 DeleteObject command fails
 */
export const deleteFile = async (key) => {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

/**
 * Generate a pre-signed URL for downloading an object from R2/S3.
 *
 * @param {string} key - Object key to generate the URL for
 * @param {number} [expiresIn=3600] - URL expiry duration in seconds
 * @returns {Promise<string>} The pre-signed download URL
 * @throws {Error} If URL signing fails
 */
export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(client, command, { expiresIn })
}
