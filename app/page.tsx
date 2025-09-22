"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HistoryPanel } from "@/components/history-panel"
import { Download, History, Type } from "lucide-react"
import { DownloadMenu } from "@/components/download-menu"
import { type SavedSnap, SnapStorage } from "@/lib/storage"
// Image generation handled in download menu

const FONT_OPTIONS = [
  { id: "sfmono", name: "SF Mono", css: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace' },
  { id: "courier", name: "Courier New", css: '"Courier New", "Courier", monospace' },
  { id: "monaco", name: "Monaco", css: '"Monaco", "Menlo", "Ubuntu Mono", monospace' },
  { id: "fira", name: "Fira Code", css: 'var(--font-fira-code), monospace' },
  { id: "jetbrains", name: "JetBrains Mono", css: 'var(--font-jetbrains-mono), monospace' },
  { id: "sourcecode", name: "Source Code Pro", css: 'var(--font-source-code-pro), monospace' },
  { id: "ibmplex", name: "IBM Plex Mono", css: '"IBM Plex Mono", "Menlo", monospace' },
  { id: "robotomono", name: "Roboto Mono", css: '"Roboto Mono", "Courier New", monospace' },
]

const SIZE_OPTIONS = [
  { id: "10", name: "10", px: 10 },
  { id: "11", name: "11", px: 11 },
  { id: "12", name: "12", px: 12 },
  { id: "13", name: "13", px: 13 },
  { id: "14", name: "14", px: 14 },
  { id: "15", name: "15", px: 15 },
  { id: "16", name: "16", px: 16 },
  { id: "17", name: "17", px: 17 },
  { id: "18", name: "18", px: 18 },
  { id: "19", name: "19", px: 19 },
  { id: "20", name: "20", px: 20 },
  { id: "21", name: "21", px: 21 },
  { id: "22", name: "22", px: 22 },
  { id: "23", name: "23", px: 23 },
  { id: "24", name: "24", px: 24 },
  { id: "25", name: "25", px: 25 },
  { id: "26", name: "26", px: 26 },
  { id: "27", name: "27", px: 27 },
  { id: "28", name: "28", px: 28 },
]

export default function SnapEditor() {
  const [text, setText] = useState("")
  const [selectedFontId, setSelectedFontId] = useState<string>("jetbrains")
  const [selectedSizeId, setSelectedSizeId] = useState<string>("16")
  const [showHistory, setShowHistory] = useState(false)
  const [showFontSelector, setShowFontSelector] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [savedSnaps, setSavedSnaps] = useState<SavedSnap[]>([])
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedFontCss = FONT_OPTIONS.find((f) => f.id === selectedFontId)?.css || FONT_OPTIONS[0].css
  const selectedFontSize = SIZE_OPTIONS.find((s) => s.id === selectedSizeId)?.px || 24

  const autoSave = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    const latest = savedSnaps[0]
    if (!latest || latest.text !== trimmed) {
      SnapStorage.saveSnap(trimmed)
      setSavedSnaps(SnapStorage.getSnaps())
    }
  }, [text, savedSnaps])

  useEffect(() => {
    const timer = setTimeout(autoSave, 1200)
    return () => clearTimeout(timer)
  }, [autoSave])

  // Load saved snaps on mount
  useEffect(() => {
    setSavedSnaps(SnapStorage.getSnaps())
  }, [])

  // Load persisted preferred size on mount (fallback to 16)
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem("snap-editor-selected-size")
      if (savedSize && SIZE_OPTIONS.some((s) => s.id === savedSize)) {
        setSelectedSizeId(savedSize)
      }
    } catch {}
  }, [])

  // Persist size preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-selected-size", selectedSizeId)
    } catch {}
  }, [selectedSizeId])

  // Load persisted preferred font on mount
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem("snap-editor-selected-font")
      if (savedFont && FONT_OPTIONS.some((f) => f.id === savedFont)) {
        setSelectedFontId(savedFont)
      }
    } catch {}
  }, [])

  // Persist font preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-selected-font", selectedFontId)
    } catch {}
  }, [selectedFontId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text, selectedFontSize])

  const loadFromHistory = (snap: SavedSnap) => {
    setText(snap.text)
    setShowHistory(false)
  }

  const deleteFromHistory = (id: string) => {
    SnapStorage.deleteSnap(id)
    setSavedSnaps(SnapStorage.getSnaps())
  }

  // Sync history from server file on mount
  useEffect(() => {
    SnapStorage.syncFromServer().then((snaps) => setSavedSnaps(snaps))
  }, [])

  // Close history when clicking outside (avoid interfering with font/size selects)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-menu]') && !target.closest('[data-radix-portal]')) {
        setShowHistory(false)
      }
    }

    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("mousedown", onDown)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-end gap-2 mb-4" data-menu>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowHistory(!showHistory)
            setShowFontSelector(false)
            setShowDownloadMenu(false)
          }}
          className="p-2 hover:bg-secondary"
          aria-label="Toggle history"
        >
          <History className="w-4 h-4" />
        </Button>

        <div className="relative" data-menu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDownloadMenu((v) => !v)
              setShowFontSelector(false)
              setShowHistory(false)
            }}
            className="p-2 hover:bg-secondary"
            aria-label="Open download menu"
          >
            <Download className="w-4 h-4" />
          </Button>
          {showDownloadMenu && (
            <DownloadMenu
              text={text}
              fontFamily={selectedFontCss}
              fontSize={selectedFontSize}
              canvasRef={canvasRef}
              onClose={() => setShowDownloadMenu(false)}
            />
          )}
        </div>

        <div className="relative" data-menu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowFontSelector((v) => !v)
              setShowHistory(false)
              setShowDownloadMenu(false)
            }}
            className="p-2 hover:bg-secondary"
            aria-label="Open font selector"
          >
            <Type className="w-4 h-4" />
          </Button>

          {/* Font Selector */}
          {showFontSelector && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-2">
                <Select
                  value={selectedFontId}
                  onValueChange={(value) => {
                    setSelectedFontId(value)
                    // Do not close here; let user preview multiple fonts quickly
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.id} value={font.id}>
                        <span style={{ fontFamily: font.css }}>{font.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Text Size Selector */}
        <div className="relative" data-menu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSizeSelector((v) => !v)
              setShowHistory(false)
              setShowFontSelector(false)
              setShowDownloadMenu(false)
            }}
            className="p-2"
            aria-label="Open text size selector"
          >
            <span className="text-sm">{selectedFontSize}px</span>
          </Button>
          {showSizeSelector && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-2">
                <Select
                  value={selectedSizeId}
                  onValueChange={(value) => {
                    setSelectedSizeId(value)
                    // Do not close here; let user experiment without closing
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Text size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.name} ({size.px}px)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl flex-1 flex items-center justify-center">
        {/* Main Editor Card - only typing area */}
        <Card
          className="relative w-full max-w-3xl shadow-lg border-0 p-10 rounded-2xl"
          style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.1)", backgroundColor: "#EFE3CF" }}
        >
          {/* macOS Traffic Lights */}
          <div className="absolute top-6 left-6 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          {/* Text Content */}
          <div style={{ fontFamily: selectedFontCss, fontSize: selectedFontSize }}>
            <Textarea
              key={selectedFontSize}
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[280px] border-0 bg-transparent resize-none focus:ring-0 leading-relaxed p-6"
              style={{ fontFamily: selectedFontCss, fontSize: selectedFontSize }}
              placeholder="Start typing your thoughts..."
              autoFocus
            />
          </div>
        </Card>

        {/* History Panel */}
        {showHistory && (
          <HistoryPanel
            onClose={() => setShowHistory(false)}
            onLoadSnap={loadFromHistory}
            onDeleteSnap={deleteFromHistory}
            savedSnaps={savedSnaps}
            onRefresh={() => setSavedSnaps(SnapStorage.getSnaps())}
          />
        )}
      </div>

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
