import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
const bucket = process.env.OBJECT_STORAGE_BUCKET!;
const prefix = process.env.OBJECT_STORAGE_PREFIX || "upload";
const region = process.env.OBJECT_STORAGE_REGION || "us-east-1";
const forcePathStyle = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true";
const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID!;
const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY!;

export const s3Client = new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

/**
 * Uploads a file buffer to the configured S3 bucket and returns the public access URL.
 */
export async function uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
): Promise<string> {
    const key = `${prefix}/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Cloudhost/S3 compliant public-read setting
        ACL: "public-read",
    });

    await s3Client.send(command);
    
    // Return full public access URL
    return `${endpoint}/${bucket}/${key}`;
}

/**
 * Deletes a file from the configured S3 bucket using its public access URL.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
    const marker = `${bucket}/`;
    const index = fileUrl.indexOf(marker);
    if (index === -1) return;
    
    const key = fileUrl.substring(index + marker.length);
    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    
    await s3Client.send(command);
}
