"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, X } from "lucide-react"
import { toPng } from "html-to-image"
import { toast } from "sonner"

interface DownloadMenuProps {
  readonly onClose: () => void
  readonly cardElementRef?: React.RefObject<HTMLDivElement>
}

export function DownloadMenu({ onClose, cardElementRef }: DownloadMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    const node = cardElementRef?.current
    if (!node) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true })

      const link = document.createElement("a")
      const timestamp = new Date().toISOString().split("T")[0]
      link.download = `snap-${timestamp}.png`
      link.href = dataUrl
      link.click()
      toast.success("Image downloaded")
    } catch (error) {
      console.error("Error generating image:", error)
      toast.error("Failed to generate image. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="fixed top-24 right-6 w-80 max-h-[36rem] overflow-y-auto bg-card shadow-lg border-0 p-4 rounded-xl z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Download</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3 mb-2">
        <Button onClick={handleDownload} disabled={isGenerating} className="w-full" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download Image
        </Button>
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
