import { v2 as cloudinary } from 'cloudinary';
import { TraceContext } from '@/types/drive';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  trace: TraceContext,
  fileBuffer: ArrayBuffer,
  folderName: string, // e.g., logbookId
  fileName: string
): Promise<{ url: string; publicId: string } | null> {
  trace.log("CLOUDINARY", "Starting upload to Cloudinary", { folder: folderName, fileName });

  try {
    const buffer = Buffer.from(fileBuffer);
    
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `logbooks/${folderName}`,
          public_id: fileName.split('.')[0], // Cloudinary handles extensions
          resource_type: 'image',
          format: 'webp', // Auto-convert to webp for performance
          quality: 'auto',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error || !result) {
            trace.error("CLOUDINARY", "Upload failed", { error: error?.message || 'Unknown error' });
            resolve(null);
          } else {
            trace.log("CLOUDINARY", "Upload successful", { url: result.secure_url });
            resolve({
              url: result.secure_url,
              publicId: result.public_id
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    trace.error("CLOUDINARY", "Exception during upload", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
