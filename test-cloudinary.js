const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Read .env file manually since dotenv is not installed
const envContent = fs.readFileSync('d:\\GITHUB\\Project\\logbook-generate\\.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
});

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  try {
    console.log("Testing Cloudinary upload...");
    
    // Create a 1x1 pixel dummy image base64
    const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    const result = await cloudinary.uploader.upload(dummyImage, {
      folder: "test_folder"
    });

    console.log("SUCCESS! Cloudinary configuration is working.");
    console.log("Uploaded Image URL:", result.secure_url);
  } catch (error) {
    console.error("FAILED! Cloudinary error:", error);
  }
}

testUpload();
