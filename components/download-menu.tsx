"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, X, ImageIcon, FileText, Share2 } from "lucide-react"
import { ImageGenerator, type ImageOptions } from "@/lib/image-generator"

interface DownloadMenuProps {
  readonly text: string
  readonly fontFamily: string
  readonly fontSize?: number
  readonly canvasRef: React.RefObject<HTMLCanvasElement>
  readonly onClose: () => void
}

export function DownloadMenu({ text, fontFamily, fontSize, canvasRef, onClose }: DownloadMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>("default")

  const formats = [
    { id: "default", name: "Default (PNG)", description: "High quality, transparent background support" },
    { id: "jpeg", name: "JPEG", description: "Smaller file size, good for sharing" },
    { id: "webp", name: "WebP", description: "Modern format, best compression" },
  ]

  const socialPresets = [
    { id: "instagram-square", name: "Instagram Square", size: "1080×1080" },
    { id: "instagram-story", name: "Instagram Story", size: "1080×1920" },
    { id: "twitter-post", name: "Twitter Post", size: "1200×675" },
    { id: "facebook-post", name: "Facebook Post", size: "1200×630" },
    { id: "linkedin-post", name: "LinkedIn Post", size: "1200×627" },
  ]

  const handleDownload = async (presetId?: string) => {
    if (!canvasRef.current) return

    setIsGenerating(true)

    try {
      const generator = new ImageGenerator(canvasRef.current)
      let options: Partial<ImageOptions> = { fontFamily, fontSize }

      if (presetId && presetId !== "default") {
        const presets = ImageGenerator.getSocialMediaPresets()
        options = { ...options, ...(presets[presetId] || {}) }
      } else if (selectedFormat === "jpeg") {
        options = { ...options, format: "jpeg", quality: 0.9 }
      } else if (selectedFormat === "webp") {
        options = { ...options, format: "webp", quality: 0.9 }
      }

      // Match editor exactly by disabling autoFit when user chooses size
      const dataUrl = await generator.generateImage(text, { ...options, autoFit: false })

      // Create download link
      const link = document.createElement("a")
      const timestamp = new Date().toISOString().split("T")[0]
      const formatExt = options.format || "png"
      const filename = presetId ? `snap-${presetId}-${timestamp}.${formatExt}` : `snap-${timestamp}.${formatExt}`

      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Failed to generate image. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShareText = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Snap",
          text: text,
        })
      } else {
        await navigator.clipboard.writeText(text)
        alert("Text copied to clipboard!")
      }
    } catch {
      await navigator.clipboard.writeText(text)
      alert("Text copied to clipboard!")
    }
  }

  const handleShareImage = async () => {
    if (!canvasRef.current || !navigator.share) {
      alert("Image sharing not supported on this device")
      return
    }

    setIsGenerating(true)

    try {
      const generator = new ImageGenerator(canvasRef.current)
      const dataUrl = await generator.generateImage(text)

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `snap-${Date.now()}.png`, { type: "image/png" })

      await navigator.share({
        title: "My Snap",
        files: [file],
      })
    } catch (error) {
      console.error("Error sharing image:", error)
      alert("Failed to share image. Please try downloading instead.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="absolute top-16 right-0 w-80 bg-card shadow-lg border-0 p-4 rounded-xl z-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Download & Share</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <Button onClick={() => handleDownload()} disabled={isGenerating} className="flex-1" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </Button>
          <Button onClick={handleShareText} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Share Text
          </Button>
        </div>

        {navigator.share && (
          <Button
            onClick={handleShareImage}
            disabled={isGenerating}
            variant="outline"
            className="w-full bg-transparent"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Image
          </Button>
        )}
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">Format</h4>
        <div className="grid grid-cols-1 gap-2">
          {formats.map((format) => (
            <button
              key={format.id}
              type="button"
              className={`text-left p-2 rounded-lg border transition-colors ${
                selectedFormat === format.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
              }`}
              onClick={() => setSelectedFormat(format.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{format.name}</span>
                {selectedFormat === format.id && (
                  <Badge variant="default" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{format.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Social Media Presets */}
      <div>
        <h4 className="text-sm font-medium mb-2">Social Media Formats</h4>
        <div className="space-y-2">
          {socialPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="flex items-center justify-between w-full p-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              onClick={() => handleDownload(preset.id)}
            >
              <div>
                <span className="text-sm font-medium">{preset.name}</span>
                <p className="text-xs text-muted-foreground">{preset.size}</p>
              </div>
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Generating image...</p>
          </div>
        </div>
      )}
    </Card>
  )
}
