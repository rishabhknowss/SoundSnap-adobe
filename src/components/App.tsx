"use client"

import React, { useState, useRef } from "react"
import { Theme } from "@swc-react/theme"
import { Button } from "@swc-react/button"
import { Textfield } from "@swc-react/textfield"
import { FieldLabel } from "@swc-react/field-label"
import { ProgressCircle } from "@swc-react/progress-circle"
import "@spectrum-web-components/theme/express/scale-medium.js"
import "@spectrum-web-components/theme/express/theme-light.js"
import type { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js"
import type { Textfield as SpectrumTextfield } from "@spectrum-web-components/textfield"
import "./App.css"

interface AppProps {
  addOnUISdk: AddOnSDKAPI
}

const API_BASE_URL = "http://localhost:3000"

const App: React.FC<AppProps> = ({ addOnUISdk }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setError("")
    } else {
      setVideoFile(null)
      setVideoPreviewUrl(null)
    }
  }

  const handleGenerateVideoWithAudio = async () => {
    if (!videoFile) {
      setError("Please upload a video file.")
      return
    }

    setIsGenerating(true)
    setError("")
    setGeneratedVideoUrl(null)
    setProgress("Uploading video...")

    try {
      // Upload video to backend
      const formData = new FormData()
      formData.append("video", videoFile)
      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-video`, {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Video upload failed: ${uploadResponse.statusText}`)
      }

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.videoUrl) {
        throw new Error("No video URL returned from upload")
      }

      setProgress("Generating audio for video...")
      const generateResponse = await fetch(`${API_BASE_URL}/api/generate-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: uploadResult.videoUrl,
          prompt: prompt.trim() || "Generate ambient background sound that fits the video's content",
        }),
      })

      if (!generateResponse.ok) {
        throw new Error(`Audio generation failed: ${generateResponse.statusText}`)
      }

      const generateResult = await generateResponse.json()
      if (!generateResult.generatedVideoUrl) {
        throw new Error("No generated video URL returned")
      }

      setGeneratedVideoUrl(generateResult.generatedVideoUrl)
      setProgress("Video with audio generated successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video with audio.")
      setProgress("")
    } finally {
      setIsGenerating(false)
      if (!error) {
        setTimeout(() => setProgress(""), 3000)
      }
    }
  }

  const handleReset = () => {
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setPrompt("")
    setIsGenerating(false)
    setGeneratedVideoUrl(null)
    setError("")
    setProgress("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addToCanvas = async () => {
    if (!generatedVideoUrl) return

    try {
      setProgress("Adding to canvas...")
      const response = await fetch(generatedVideoUrl)
      let blob = await response.blob()

      if (blob.type === "application/octet-stream") {
        blob = new Blob([blob], { type: "video/mp4" })
      }

      if (typeof addOnUISdk.app.document.addVideo === "function") {
        await addOnUISdk.app.document.addVideo(blob)
        setProgress("Video added to canvas successfully!")
      } else {
        const videoFrameBlob = await extractVideoFrame(blob)
        await addOnUISdk.app.document.addImage(videoFrameBlob)
        setProgress("Video frame added to canvas as an image.")
      }

      setTimeout(() => setProgress(""), 2000)
    } catch (error) {
      setError("Failed to add content to canvas: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const extractVideoFrame = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      video.src = URL.createObjectURL(videoBlob)
      video.muted = true
      video.currentTime = 0

      video.onloadeddata = () => {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context."))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to convert frame to blob."))
          }
          URL.revokeObjectURL(video.src)
        }, "image/png")
      }

      video.onerror = () => {
        reject(new Error("Failed to load video for frame extraction."))
        URL.revokeObjectURL(video.src)
      }
    })
  }

  return (
    <Theme system="express" scale="medium" color="light">
      <div className="container">
        <div className="header">
          <h1>SoundSnap</h1>
          <p>Enhance your videos with AI-generated ambient audio tailored to your content.</p>
        </div>

        <div className="main-content">
          <div className="card">
            <h2>Upload Video</h2>
            <div className="control">
              <Button
                size="m"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
              >
                Choose Video
              </Button>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                disabled={isGenerating}
                ref={fileInputRef}
                className="hidden"
              />
              <p className="control-text">Supported formats: MP4, MOV, WebM</p>
            </div>
            {videoPreviewUrl && (
              <div className="video-preview">
                <h3>Preview</h3>
                <video
                  src={videoPreviewUrl}
                  controls
                  className="video-preview-video"
                  aria-label="Uploaded video preview"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Audio Prompt (Optional)</h2>
            <div className="control">
              <FieldLabel>Describe the desired audio</FieldLabel>
              <Textfield
                value={prompt}
                onInput={(e: React.FormEvent<SpectrumTextfield>) => setPrompt((e.target as SpectrumTextfield).value)}
                placeholder="Generate ambient background sound that fits the video's content"
                disabled={isGenerating}
                rows={2}
                className="textfield"
              />
              <p className="control-text">Leave blank to auto-generate audio based on video content.</p>
            </div>
          </div>

          {(progress || error) && (
            <div className="card status-card">
              {isGenerating && (
                <div className="progress-section">
                  <ProgressCircle indeterminate size="s" />
                  <p className="progress-text">{progress || "Generating audio..."}</p> 
                </div>
              )}
              {error && (
                <div className="error-section">
                  <p className="error-text">{error}</p>
                </div>
              )}
              {!isGenerating && progress && !error && (
                <p className="success-text">{progress}</p>
              )}
            </div>
          )}

          {generatedVideoUrl && (
            <div className="card preview-card">
              <h2>Generated Video with Audio</h2>
              <div className="video-container">
                <video
                  src={generatedVideoUrl}
                  controls
                  className="generated-video"
                  aria-label="Generated video with audio preview"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Actions</h2>
            <div className="button-group">
              <Button size="m" variant="secondary" onClick={handleReset} disabled={isGenerating}>
                Reset
              </Button>
              <Button size="m" variant="primary" onClick={handleGenerateVideoWithAudio} disabled={isGenerating || !videoFile}>
                {isGenerating ? (
                  <>
                    <ProgressCircle indeterminate size="s" />
                    Generating...
                  </>
                ) : (
                  "Generate Audio"
                )}
              </Button>
              {generatedVideoUrl && (
                <Button size="m" variant="primary" onClick={addToCanvas} disabled={isGenerating}>
                  Add to Canvas
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Theme>
  )
}

export default App