const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { fal } = require('@fal-ai/client');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://localhost:5241',
      'https://new.express.adobe.com',
      'https://w0n4g6khi.wxp.adobe-addons.com/',
    ];
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.wxp\.adobe-addons\.com$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());

// Configure Fal AI client
fal.config({
  credentials: process.env.FAL_API_KEY,
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Upload video to Fal AI storage
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    console.log('Uploading video:', req.file.originalname, req.file.size, 'bytes');
    const uploadedVideoUrl = await fal.storage.upload(req.file.buffer, {
      file_name: req.file.originalname,
      content_type: req.file.mimetype,
    });
    console.log('Video uploaded to Fal storage:', uploadedVideoUrl);

    res.status(200).json({ videoUrl: uploadedVideoUrl });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message || 'Failed to upload video' });
  }
});

// Generate audio for video
app.post('/api/generate-audio', async (req, res) => {
  const { videoUrl, prompt } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  try {
    console.log('Generating audio for video:', videoUrl);
    const result = await fal.subscribe('fal-ai/thinksound', {
      input: {
        video_url: videoUrl,
        prompt: prompt || 'Generate ambient background sound that fits the video\'s content',
      },
      logs: true,
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video with audio generated or video URL not found');
    }

    console.log('Audio generated successfully:', result.data.video.url);
    res.status(200).json({ generatedVideoUrl: result.data.video.url });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: error.message || 'Failed to generate audio' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});