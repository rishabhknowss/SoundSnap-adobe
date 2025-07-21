# SoundSnap 🎵

SoundSnap is an innovative Adobe Creative Cloud Web Add-on that enhances videos with AI-generated ambient audio tailored to video content. Built for Adobe Express, it seamlessly integrates AI-powered audio generation into your creative workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Adobe Express](https://img.shields.io/badge/Adobe-Express-FF0000.svg)](https://express.adobe.com/)
[![Powered by Fal AI](https://img.shields.io/badge/Powered%20by-Fal%20AI-blue.svg)](https://fal.ai/)

##  Quick Links

🎮 **[Try SoundSnap Live](https://adobesparkpost.app.link/TR9Mb7TXFLb?mode=private&claimCode=w0n4g6khi:ZJREVRZ4)** - Experience the add-on in Adobe Express  
📺 **[Watch Demo Video](https://www.youtube.com/watch?v=rS8rZjaMWtI&t=1s)** - See SoundSnap in action

## Features

- **AI-Powered Audio Generation**: Leverages Fal AI's ThinkSound model to generate contextual ambient audio
- **Seamless Adobe Integration**: Native Adobe Express add-on with canvas integration
- **Intelligent Video Analysis**: Automatically analyzes video content to generate fitting audio
- **Custom Audio Prompts**: Optional custom prompts for specific audio generation requirements
- **Real-time Preview**: Preview generated videos with audio before adding to canvas
- **Multi-format Support**: Supports MP4, MOV, and WebM video formats
- **Responsive Design**: Optimized for Adobe's Spectrum design system

##  Architecture

### Frontend (Adobe Express Add-on)
- **Framework**: React 18.2.0 with TypeScript
- **UI Components**: Adobe Spectrum Web Components (@swc-react)
- **Build System**: Webpack 5 with custom configuration
- **Styling**: CSS3 with responsive design
- **Integration**: Adobe Creative Cloud Web Add-on SDK

### Backend (Node.js API Server)
- **Runtime**: Node.js with Express.js 5.1.0
- **AI Integration**: Fal AI Serverless Client for ThinkSound model
- **File Handling**: Multer for multipart form uploads
- **Storage**: Fal AI cloud storage for video processing
- **Security**: CORS configuration for Adobe domain whitelisting

## 🛠️ Tech Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.3.2 | Type safety and developer experience |
| Webpack | 5.98.0 | Module bundling and build optimization |
| Adobe Spectrum | 1.7.0 | Native Adobe design system |
| CSS3 | - | Styling and responsive design |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | - | Runtime environment |
| Express.js | 5.1.0 | Web framework |
| Fal AI Client | 0.15.0 | AI model integration |
| Multer | 2.0.2 | File upload handling |
| CORS | 2.8.5 | Cross-origin resource sharing |
| Dotenv | 17.2.0 | Environment configuration |

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Adobe Creative Cloud** account
- **Fal AI API Key** for audio generation

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/rishabhknowss/SoundSnap-adobe.git
cd SoundSnap-adobe
```

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Build the add-on for development
npm run build

# Start development server
npm run start
```

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env
```

### 4. Environment Configuration
Create a `.env` file in the backend directory:
```env
FAL_API_KEY=your_fal_ai_api_key_here
PORT=3000
NODE_ENV=production
```

### 5. Deploy Backend
The backend is deployed on Render.com at:
```
https://soundsnap-adobe.onrender.com
```

## 🎯 Usage

### For Adobe Express Users
1. **Install the Add-on**: Load SoundSnap in Adobe Express
2. **Upload Video**: Select a video file (MP4, MOV, or WebM, max 10MB)
3. **Optional Prompt**: Provide custom audio description or use auto-generation
4. **Generate Audio**: Click "Generate Audio" and wait for AI processing
5. **Preview Result**: Review the video with generated ambient audio
6. **Add to Canvas**: Integrate the enhanced video into your Adobe Express project

### For Developers
1. **Development Mode**: Use `npm run start` for hot-reload development
2. **Build Production**: Use `npm run build` for optimized builds
3. **Package Add-on**: Use `npm run package` to create distribution package

## 🔧 API Endpoints

### Backend API Routes

#### Health Check
```http
GET /health
```
Returns server status and configuration information.

#### Upload Video
```http
POST /api/upload-video
Content-Type: multipart/form-data
```
Uploads video to Fal AI storage and returns storage URL.

**Parameters:**
- `video`: Video file (multipart/form-data)

**Response:**
```json
{
  "videoUrl": "https://fal.media/files/..."
}
```

#### Generate Audio
```http
POST /api/generate-audio
Content-Type: application/json
```
Generates ambient audio for uploaded video using AI.

**Parameters:**
```json
{
  "videoUrl": "string",
  "prompt": "string (optional)"
}
```

**Response:**
```json
{
  "generatedVideoUrl": "https://fal.media/files/..."
}
```

## 🏭 Development Workflow

### Project Structure
```
├── src/                          # Frontend source code
│   ├── components/
│   │   ├── App.tsx              # Main React component
│   │   └── App.css              # Component styles
│   ├── index.tsx                # Application entry point
│   ├── index.html               # HTML template
│   └── manifest.json            # Adobe add-on manifest
├── backend/                     # Backend API server
│   ├── src/
│   │   └── index.js            # Express server and API routes
│   ├── package.json            # Backend dependencies
│   └── .env                    # Environment variables
├── dist/                       # Built add-on files
├── webpack.config.js           # Webpack configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Frontend dependencies
```

### Build System
- **Webpack Configuration**: Custom webpack setup for Adobe add-on compatibility
- **TypeScript Compilation**: ts-loader for TypeScript processing
- **Asset Management**: Copy plugin for manifest and static assets
- **Development Server**: Hot-reload development environment

### AI Integration
The application uses Fal AI's ThinkSound model for audio generation:

**Model Configuration:**
- **Model**: `fal-ai/thinksound`
- **Inference Steps**: 24 (configurable)
- **CFG Scale**: 5 (configurable)
- **Timeout**: 180 seconds
- **Retry Logic**: 3 attempts with exponential backoff

## 🔐 Security Features

- **CORS Protection**: Whitelist of allowed Adobe domains
- **File Validation**: MIME type and size validation for uploads
- **Error Handling**: Comprehensive error logging and user feedback
- **Environment Variables**: Secure API key management
- **Input Sanitization**: Request validation and sanitization

## 🚀 Deployment

### Frontend Deployment
The add-on is deployed through Adobe's add-on distribution system.

### Backend Deployment (Render.com)
```bash
# Automatic deployment from Git repository
# Environment variables configured in Render dashboard
# Health checks enabled for uptime monitoring
```

