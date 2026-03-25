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
import "./App.css"

import { useAddonAuth } from "../hooks/useAuth"
import { apiFetch, apiUpload } from "../utils/api"

interface AppProps { addOnUISdk: AddOnSDKAPI }

const WEBSITE_URL = "http://localhost:3000"

const App: React.FC<AppProps> = ({ addOnUISdk }) => {
  const { status, user, credits, error: authError, activate, refreshCredits, disconnect } = useAddonAuth(addOnUISdk)

  // Form state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const [prompt, setPrompt] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState("")
  const [addedToCanvas, setAddedToCanvas] = useState(false)
  const [showBuyPrompt, setShowBuyPrompt] = useState(false)
  const [activationKey, setActivationKey] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [showActivateInput, setShowActivateInput] = useState(false)
  const [lastCreditsUsed, setLastCreditsUsed] = useState<number | null>(null)
  const pollRef = useRef<any>(null)

  const isLinked = status === "linked"

  const startCreditPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    const start = credits
    pollRef.current = setInterval(async () => {
      const c = await refreshCredits()
      if (c !== undefined && c > start) { clearInterval(pollRef.current); pollRef.current = null; setShowBuyPrompt(false) }
    }, 4000)
    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current) }, 600000)
  }

  const handleActivate = async () => {
    if (!activationKey.trim()) return
    setIsActivating(true)
    await activate(activationKey)
    setIsActivating(false)
  }

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) { setError("File too large. Max 50MB."); return }
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
      setError("")
      setGeneratedVideoUrl(null)
      setAddedToCanvas(false)
      setLastCreditsUsed(null)
      setVideoDuration(0)

      // Extract video duration
      const vid = document.createElement("video")
      vid.preload = "metadata"
      vid.onloadedmetadata = () => {
        setVideoDuration(vid.duration)
        URL.revokeObjectURL(vid.src)
      }
      vid.src = url
    }
  }

  // Estimate credits from video duration (compute ≈ duration × 4, then × 0.18 credits/sec)
  const estimatedCredits = videoDuration > 0 ? Math.max(1, Math.ceil(videoDuration * 4 * 0.18)) : 0

  const handleGenerate = async () => {
    if (!videoFile) { setError("Please upload a video"); return }
    if (!isLinked) return

    const latestCredits = await refreshCredits()
    const needed = Math.max(5, estimatedCredits)
    if ((latestCredits ?? credits) < needed) {
      setError(`Not enough credits. This ${Math.round(videoDuration)}s video needs ~${needed} credits. You have ${latestCredits ?? credits}.`)
      setShowBuyPrompt(true)
      return
    }

    setIsGenerating(true); setError(""); setGeneratedVideoUrl(null); setAddedToCanvas(false); setShowBuyPrompt(false); setLastCreditsUsed(null)

    try {
      setProgress("Uploading video...")
      const formData = new FormData()
      formData.append("video", videoFile)

      const uploadRes = await apiUpload("/api/upload-video", formData)
      if (!uploadRes.ok) { const d = await uploadRes.json(); throw new Error(d.error || "Upload failed") }
      const { videoUrl } = await uploadRes.json()

      setProgress("Generating audio (this may take 30-60s)...")
      const res = await apiFetch("/api/generate-audio", {
        method: "POST",
        body: JSON.stringify({
          videoUrl,
          videoDuration: videoDuration || undefined,
          prompt: prompt.trim() || "Generate ambient background sound that fits the video's content",
        }),
      })

      if (res.status === 402) { setShowBuyPrompt(true); return }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Generation failed") }

      const result = await res.json()
      setGeneratedVideoUrl(result.generatedVideoUrl)
      setLastCreditsUsed(result.creditsUsed || null)
      refreshCredits()
      setProgress("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate"); setProgress("")
    } finally { setIsGenerating(false) }
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
      } else {
        const frameBlob = await extractVideoFrame(blob)
        await addOnUISdk.app.document.addImage(frameBlob)
      }
      setAddedToCanvas(true); setProgress("")
    } catch { setError("Failed to add to canvas"); setProgress("") }
  }

  const extractVideoFrame = async (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      video.src = URL.createObjectURL(videoBlob)
      video.muted = true; video.currentTime = 0
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) { reject(new Error("Canvas context failed")); return }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((b) => { b ? resolve(b) : reject(new Error("Frame extract failed")); URL.revokeObjectURL(video.src) }, "image/png")
      }
      video.onerror = () => { reject(new Error("Video load failed")); URL.revokeObjectURL(video.src) }
    })
  }

  const downloadVideo = () => {
    if (!generatedVideoUrl) return
    const link = document.createElement("a"); link.href = generatedVideoUrl
    link.download = "soundsnap-output.mp4"; link.target = "_blank"; link.click()
  }

  const startNew = () => {
    setGeneratedVideoUrl(null); setError(""); setAddedToCanvas(false); setShowBuyPrompt(false); setProgress("")
    setVideoFile(null); setVideoPreviewUrl(null); setPrompt(""); setLastCreditsUsed(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ===== LOADING =====
  if (status === "loading") {
    return (
      <Theme system="express" scale="medium" color="light">
        <div className="container center-screen"><ProgressCircle indeterminate size="l" label="Loading" /></div>
      </Theme>
    )
  }

  return (
    <Theme system="express" scale="medium" color="light">
      <div className="container">

        {/* ===== TOP BAR ===== */}
        <div className="topbar">
          <span className="topbar-brand">soundsnap.</span>
          {isLinked && user ? (
            <div className="topbar-right">
              <span className={`topbar-credits ${credits < 5 ? "empty" : ""}`}>
                {credits} credits
              </span>
              <a className="topbar-link" href={`${WEBSITE_URL}/dashboard/credits`} target="_blank" rel="noopener noreferrer" onClick={startCreditPoll}>+</a>
            </div>
          ) : (
            <a className="topbar-link signup" href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Sign up</a>
          )}
        </div>

        {/* ===== NO CREDITS ===== */}
        {showBuyPrompt && (
          <div className="buy-prompt">
            <p className="buy-prompt-title">Not enough credits (min 5 required)</p>
            <a className="buy-btn" href={`${WEBSITE_URL}/dashboard/credits`} target="_blank" rel="noopener noreferrer" onClick={startCreditPoll}>Buy Credits</a>
          </div>
        )}

        {/* ===== RESULT ===== */}
        {isLinked && generatedVideoUrl ? (
          <div className="result-section">
            <div className="result-header">
              <h2>Your Video with Audio</h2>
              {addedToCanvas && <span className="success-badge">Added!</span>}
            </div>
            <div className="result-preview">
              <video src={generatedVideoUrl} controls className="result-video" />
            </div>
            {lastCreditsUsed && (
              <p className="cost-note">{lastCreditsUsed} credits used &middot; {credits} remaining</p>
            )}
            {progress && <div className="inline-progress"><ProgressCircle indeterminate size="s" label="Working" /><span>{progress}</span></div>}
            <div className="result-actions">
              <Button size="m" variant="cta" onClick={addToCanvas} disabled={!!progress}>
                {addedToCanvas ? "Add Again" : "Add to Canvas"}
              </Button>
              <Button size="m" variant="secondary" onClick={downloadVideo}>Download</Button>
            </div>
            <button className="text-button" onClick={startNew}>Generate another</button>
          </div>

        ) : (
          /* ===== GENERATION FORM (shown to everyone) ===== */
          <div className="main-content">

            {/* Upload Video */}
            <div className="card">
              <FieldLabel>Upload Video</FieldLabel>
              <div className="upload-area" onClick={() => !isGenerating && fileInputRef.current?.click()}>
                {videoPreviewUrl ? (
                  <video src={videoPreviewUrl} className="upload-preview" muted />
                ) : (
                  <div className="upload-placeholder">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
                    <span>Click to upload video</span>
                    <span className="upload-formats">MP4, MOV, WebM (max 50MB)</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleVideoChange}
                disabled={isGenerating}
                ref={fileInputRef}
                style={{ display: "none" }}
              />
              {videoFile && (
                <p className="file-name">
                  {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)}MB{videoDuration > 0 ? ` · ${Math.round(videoDuration)}s` : ""})
                </p>
              )}
            </div>

            {/* Audio Prompt */}
            <div className="card">
              <FieldLabel>Audio Description (optional)</FieldLabel>
              <Textfield value={prompt} onInput={(e: any) => setPrompt(e.target.value)}
                placeholder="Describe the sound you want: birds chirping, city traffic, calm ocean..."
                disabled={isGenerating} rows={2} />
              <p className="hint-text">Leave blank to auto-generate audio based on video content</p>
            </div>

            {/* Generating state */}
            {isGenerating && (
              <div className="card generating-card">
                <ProgressCircle indeterminate size="m" label="Generating" />
                <div>
                  <p className="generating-title">{progress || "Generating..."}</p>
                  <p className="generating-desc">This usually takes 30-60 seconds</p>
                </div>
              </div>
            )}

            {error && !isGenerating && <div className="card error-card"><p className="error-text">{error}</p></div>}

            {/* ACTION BUTTON: Generate or Activate */}
            {!isGenerating && isLinked && (
              <Button size="m" variant="cta" onClick={handleGenerate}
                disabled={!videoFile} style={{ width: "100%" }}>
                Generate Audio
              </Button>
            )}

            {!isGenerating && !isLinked && !showActivateInput && (
              <div className="activate-inline">
                <Button size="m" variant="cta" onClick={() => setShowActivateInput(true)} style={{ width: "100%" }}>
                  Activate Addon
                </Button>
                <p className="cost-note">
                  Get your activation key from <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "underline" }}>soundsnap.app</a> to start generating
                </p>
              </div>
            )}

            {!isGenerating && !isLinked && showActivateInput && (
              <div className="activate-card">
                <p className="activate-card-label">Enter your activation key</p>
                <div className="activate-input">
                  <Textfield
                    value={activationKey}
                    onInput={(e: any) => setActivationKey(e.target.value.toUpperCase())}
                    placeholder="SNAP-XXXX-XXXX"
                    disabled={isActivating}
                  />
                  <Button size="m" onClick={handleActivate} disabled={isActivating || !activationKey.trim()}>
                    {isActivating ? "..." : "Activate"}
                  </Button>
                </div>
                {authError && <p className="error-text">{authError}</p>}
                <p className="activate-hint">
                  Don't have a key? <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Sign up at soundsnap.app</a>
                </p>
                <button className="text-button" onClick={() => setShowActivateInput(false)}>Cancel</button>
              </div>
            )}

            {!isGenerating && isLinked && (
              <p className="cost-note">
                {videoDuration > 0 && estimatedCredits > 0
                  ? `~${estimatedCredits} credits for ${Math.round(videoDuration)}s video`
                  : "~5-10 credits per generation"
                } &middot; {credits} remaining
              </p>
            )}

            {/* Account */}
            {!isGenerating && isLinked && (
              <div className="account-bar">
                <span className="account-email">{user?.email}</span>
                <button className="account-disconnect" onClick={disconnect}>Disconnect</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Theme>
  )
}

export default App
