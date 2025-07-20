const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fal = require('@fal-ai/serverless-client');

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
      'https://w513kh8ki.wxp.adobe-addons.com',
      'https://w0n4g6khi.wxp.adobe-addons.com',
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
  console.log('Health check requested:', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    falApi: process.env.FAL_API_KEY ? 'Set' : 'Missing',
  });
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload video to Fal AI storage
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('Invalid request: No video file provided', {
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'No video file provided' });
    }

    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(req.file.mimetype)) {
      console.error('Invalid video format:', {
        mimetype: req.file.mimetype,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'Unsupported video format. Use MP4, MOV, or WebM.' });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      console.error('Video size too large:', {
        size: req.file.size,
        maxAllowed: 10 * 1024 * 1024,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'Video size exceeds 10MB limit' });
    }

    console.log('Uploading video:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    const uploadedVideoUrl = await fal.storage.upload(req.file.buffer, {
      file_name: req.file.originalname,
      content_type: req.file.mimetype,
    });
    console.log('Video uploaded to Fal storage:', {
      url: uploadedVideoUrl,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ videoUrl: uploadedVideoUrl });
  } catch (error) {
    console.error('Error uploading video:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: error.message || 'Failed to upload video' });
  }
});

// Generate audio for video
app.post('/api/generate-audio', async (req, res) => {
  const { videoUrl, prompt } = req.body;

  if (!videoUrl) {
    console.error('Invalid request: Video URL is required', {
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({ error: 'Video URL is required' });
  }

  try {
    const requestPayload = {
      video_url: videoUrl,
      prompt: prompt || 'Generate ambient background sound that fits the video\'s content',
      num_inference_steps: 24, // Default from ThinkSound docs
      cfg_scale: 5, // Default from ThinkSound docs
      seed: Math.floor(Math.random() * 1000000), // Random seed for consistency
    };
    console.log('Submitting audio generation request to Fal AI:', {
      videoUrl,
      prompt: prompt ? prompt.substring(0, 50) + '...' : 'Default',
      num_inference_steps: requestPayload.num_inference_steps,
      cfg_scale: requestPayload.cfg_scale,
      seed: requestPayload.seed,
      apiKey: process.env.FAL_API_KEY ? 'Set' : 'Missing',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });

    const retry = async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        const startTime = Date.now();
        try {
          const result = await fn();
          console.log(`Retry ${i + 1}/${retries} succeeded:`, {
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          });
          return result;
        } catch (err) {
          console.log(`Retry ${i + 1}/${retries} failed:`, {
            message: err.message,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          });
          if (i === retries - 1) throw err;
          await new Promise(res => setTimeout(res, delay));
        }
      }
    };

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Audio generation timed out after 180 seconds')), 180000);
    });

    const falPromise = retry(() => fal.subscribe('fal-ai/thinksound', {
      input: requestPayload,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal AI queue update:', {
          status: update.status,
          logs: update.logs?.map(log => log.message) || [],
          requestId: update.requestId,
          timestamp: new Date().toISOString(),
        });
      },
    }));

    const result = await Promise.race([falPromise, timeoutPromise]);
    console.log('Fal AI full response:', {
      requestId: result.requestId,
      data: result.data || result, // Handle case where result itself is the response
      status: result.status,
      logs: result.logs?.map(log => log.message) || [],
      timestamp: new Date().toISOString(),
    });

    // Check for valid response structure
    const responseData = result.data || result; // Fallback to result if data is undefined
    if (!responseData || !responseData.video || !responseData.video.url) {
      console.error('Invalid response structure from Fal AI:', {
        result: responseData,
        timestamp: new Date().toISOString(),
      });
      throw new Error('No video with audio generated or video URL not found');
    }

    console.log('Audio generated successfully:', {
      url: responseData.video.url,
      content_type: responseData.video.content_type,
      file_name: responseData.video.file_name,
      file_size: responseData.video.file_size,
      prompt: responseData.prompt,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ generatedVideoUrl: responseData.video.url });
  } catch (error) {
    console.error('Error generating audio:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : null,
      videoUrl,
      prompt: prompt ? prompt.substring(0, 50) + '...' : 'Default',
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ 
      error: error.message || 'Failed to generate audio',
      details: error.response ? error.response.data : null 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`, {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});