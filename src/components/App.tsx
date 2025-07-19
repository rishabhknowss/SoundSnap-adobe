"use client"

import React from "react"
import { useState, useRef } from "react"
import { Theme } from "@swc-react/theme"
import { Button } from "@swc-react/button"
import { Textfield } from "@swc-react/textfield"
import { FieldLabel } from "@swc-react/field-label"
import { ProgressCircle } from "@swc-react/progress-circle"
import "./App.css"

// Import Adobe Spectrum Web Components themes and styles
import "@spectrum-web-components/theme/express/scale-medium.js"
import "@spectrum-web-components/theme/express/theme-light.js"

// Import the AddOnSDKAPI type
import type { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js"

import { fal } from "@fal-ai/client"

// Define the AppProps interface for the addOnUISdk prop
interface AppProps {
  addOnUISdk: AddOnSDKAPI
}

// Default prompt if user doesn't provide one
const DEFAULT_PROMPT = "Generate ambient background sound that fits the video's content"

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
    console.log("handleVideoChange triggered.")
    const file = event.target.files?.[0]
    if (file) {
      console.log("Video file selected:", file.name, file.type, file.size, "bytes")
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setError("")
    } else {
      console.log("No video file selected.")
      setVideoFile(null)
      setVideoPreviewUrl(null)
    }
  }

  const handleGenerateVideoWithAudio = async () => {
    console.log("handleGenerateVideoWithAudio started.")
    if (!videoFile) {
      setError("Please upload a video file.")
      console.error("Error: No video file uploaded.")
      return
    }

    setIsGenerating(true)
    setError("")
    setGeneratedVideoUrl(null)
    setProgress("")

    try {
      console.log("Configuring Fal AI client...")
      fal.config({
        credentials: "14d488be-3ef3-440f-8a81-ad333dec502a:9bc05c0382b987cf79242ab1ac38c8a3",
      })
      console.log("Fal AI client configured.")

      const audioPrompt = prompt.trim() || DEFAULT_PROMPT
      console.log("Using audio prompt:", audioPrompt)

      setProgress("Uploading video...")
      console.log("Attempting to upload video to Fal storage...")
      const uploadedVideoUrl = await fal.storage.upload(videoFile)
      console.log("Video uploaded to Fal storage. URL:", uploadedVideoUrl)

      setProgress("Generating audio for video...")
      console.log("Calling fal-ai/thinksound API...")
      const result = await fal.subscribe("fal-ai/thinksound", {
        input: {
          video_url: uploadedVideoUrl,
          prompt: audioPrompt,
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log("Fal AI Queue Update:", update.status)
          if (update.status === "IN_PROGRESS") {
            const latestLog = update.logs[update.logs.length - 1]?.message || "Processing..."
            setProgress(latestLog)
          } else if (update.status === "COMPLETED") {
            setProgress("Generation complete!")
          }
        },
      })
      console.log("Fal AI subscription completed. Result:", result)

      if (!result.data || !result.data.video || !result.data.video.url) {
        throw new Error("No video with audio generated or video URL not found in response.")
      }

      setGeneratedVideoUrl(result.data.video.url)
      setProgress("Video with audio generated successfully!")
      console.log("Generated video URL:", result.data.video.url)
    } catch (err) {
      console.error("Caught error during video generation:", err)
      setError(err instanceof Error ? err.message : "Failed to generate video with audio.")
      setProgress("")
    } finally {
      setIsGenerating(false)
      console.log("Generation process finished. isGenerating set to false.")
      if (!error) {
        setTimeout(() => {
          setProgress("")
          console.log("Progress message cleared after 3 seconds.")
        }, 3000)
      }
    }
  }

  const handleReset = () => {
    console.log("Reset button clicked. Resetting all states.")
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setPrompt("")
    setIsGenerating(false)
    setGeneratedVideoUrl(null)
    setError("")
    setProgress("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      console.log("File input cleared.")
    }
  }

  const addToCanvas = async () => {
    console.log("Add to Canvas button clicked.")
    if (!generatedVideoUrl) {
      console.log("No generated video URL to add to canvas.")
      return
    }
    try {
      setProgress("Adding to canvas...")
      console.log("Fetching video blob for canvas import from:", generatedVideoUrl)
      const response = await fetch(generatedVideoUrl)
      let blob = await response.blob()
      console.log("Video blob fetched. Size:", blob.size, "bytes, Type:", blob.type)

      if (blob.type === "application/octet-stream") {
        console.log("Incorrect MIME type detected. Setting to video/mp4.")
        blob = new Blob([blob], { type: "video/mp4" })
      }

      if (typeof addOnUISdk.app.document.addVideo === "function") {
        console.log("Using addVideo method to add video to canvas.")
        await addOnUISdk.app.document.addVideo(blob)
        setProgress("Video added to canvas successfully!")
      } else {
        console.log("addVideo method not available. Attempting to extract a frame as fallback.")
        const videoFrameBlob = await extractVideoFrame(blob)
        await addOnUISdk.app.document.addImage(videoFrameBlob)
        setProgress("Video frame added to canvas as an image.")
      }

      console.log("Content added to canvas successfully.")
      setTimeout(() => setProgress(""), 2000)
    } catch (error) {
      console.error("Error adding content to canvas:", error)
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
                variant="black" // Changed to accent to match Add to Canvas button color
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
                onInput={(e: any) => setPrompt(e.target.value)}
                placeholder={DEFAULT_PROMPT}
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