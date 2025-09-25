"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Type, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
// Image generation handled in download menu

const FONT_OPTIONS = [
  { id: "sfmono", name: "SF Mono", css: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace' },
  { id: "courier", name: "Courier New", css: '"Courier New", "Courier", monospace' },
  { id: "monaco", name: "Monaco", css: '"Monaco", "Menlo", "Ubuntu Mono", monospace' },
  { id: "fira", name: "Fira Code", css: 'var(--font-fira-code), monospace' },
  { id: "jetbrains", name: "JetBrains Mono", css: 'var(--font-jetbrains-mono), monospace' },
  { id: "sourcecode", name: "Source Code Pro", css: 'var(--font-source-code-pro), monospace' },
  { id: "spacemono", name: "Space Mono", css: 'var(--font-space-mono), monospace' },
  { id: "inconsolata", name: "Inconsolata", css: 'var(--font-inconsolata), monospace' },
  { id: "ibmplex", name: "IBM Plex Mono", css: 'var(--font-ibm-plex-mono), monospace' },
  { id: "dmmono", name: "DM Mono", css: 'var(--font-dm-mono), monospace' },
  { id: "robotomono", name: "Roboto Mono", css: '"Roboto Mono", "Courier New", monospace' },
]

const DEFAULT_FONT_SIZE = 16

const SIZE_OPTIONS = [
  { id: "12", name: "12", px: 12 },
  { id: "14", name: "14", px: 14 },
  { id: "16", name: "16", px: 16 },
  { id: "18", name: "18", px: 18 },
  { id: "20", name: "20", px: 20 },
  { id: "24", name: "24", px: 24 },
  { id: "28", name: "28", px: 28 },
  { id: "32", name: "32", px: 32 },
]

export default function SnapEditor() {
  const [text, setText] = useState("")
  const [selectedFontId, setSelectedFontId] = useState<string>("jetbrains")
  const [selectedThemeId, setSelectedThemeId] = useState<string>("brown")
  const [showFontSelector, setShowFontSelector] = useState(false)
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [selectedSizeId, setSelectedSizeId] = useState<string>("16")
  const [showAlignSelector, setShowAlignSelector] = useState(false)
  const [selectedAlign, setSelectedAlign] = useState<"left" | "center" | "right">("center")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  

  const selectedFontCss = FONT_OPTIONS.find((f) => f.id === selectedFontId)?.css || FONT_OPTIONS[0].css
  const selectedFontSize = SIZE_OPTIONS.find((s) => s.id === selectedSizeId)?.px || DEFAULT_FONT_SIZE

  const THEME_OPTIONS = [
    {
      id: "black",
      name: "Black",
      backgroundColor: "#0F0F0F",
      cardColor: "#1A1A1A",
      textColor: "#FFFFFF",
    },
    {
      id: "white",
      name: "White",
      backgroundColor: "#FFFFFF",
      cardColor: "#F5F5F5",
      textColor: "#000000",
    },
    {
      id: "brown",
      name: "Brown",
      backgroundColor: "#F3EBDD",
      cardColor: "#EFE3CF",
      textColor: "#000000",
    },
  ] as const

  const selectedTheme = THEME_OPTIONS.find((t) => t.id === selectedThemeId) || THEME_OPTIONS[2]

  // Optional autosave disabled when history UI removed

  // Load persisted preferred font on mount
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem("snap-editor-selected-font")
      if (savedFont && FONT_OPTIONS.some((f) => f.id === savedFont)) {
        setSelectedFontId(savedFont)
      }
    } catch {}
  }, [])

  // Load persisted alignment
  useEffect(() => {
    try {
      const savedAlign = localStorage.getItem("snap-editor-align") as any
      if (savedAlign === "left" || savedAlign === "center" || savedAlign === "right") {
        setSelectedAlign(savedAlign)
      }
    } catch {}
  }, [])

  // Load persisted preferred size on mount
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem("snap-editor-selected-size")
      if (savedSize && SIZE_OPTIONS.some((s) => s.id === savedSize)) {
        setSelectedSizeId(savedSize)
      }
    } catch {}
  }, [])

  // Persist font preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-selected-font", selectedFontId)
    } catch {}
  }, [selectedFontId])

  // Persist size preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-selected-size", selectedSizeId)
    } catch {}
  }, [selectedSizeId])

  // Persist alignment preference when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-align", selectedAlign)
    } catch {}
  }, [selectedAlign])

  // Load persisted theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("snap-editor-selected-theme")
      if (savedTheme && THEME_OPTIONS.some((t) => t.id === savedTheme)) {
        setSelectedThemeId(savedTheme)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist theme when it changes
  useEffect(() => {
    try {
      localStorage.setItem("snap-editor-selected-theme", selectedThemeId)
    } catch {}
  }, [selectedThemeId])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text, selectedFontSize])

  // Center textarea vertically inside the card using a flex wrapper with min-height
  useLayoutEffect(() => {
    const computeContentHeight = () => {
      const cardEl = cardRef.current
      if (!cardEl) return
      // Use the full card height so the caret sits in the true middle
      const available = Math.max(0, cardEl.clientHeight)
      // Also reflow the textarea height to fit new width
      const ta = textareaRef.current
      if (ta) {
        // Desired inner area (exclude top/bottom visual margin)
        const reserved = 56
        const innerAvailable = Math.max(0, available - reserved)

        // Search for largest font size that fits (shrink or grow)
        const userMax = SIZE_OPTIONS.find((s) => s.id === selectedSizeId)?.px || DEFAULT_FONT_SIZE
        const globalMax = 96
        const lowMin = 10
        let lo = lowMin
        let hi = Math.max(userMax, Math.min(globalMax, Math.ceil(innerAvailable / 8))) // rough upper bound

        const fits = (px: number) => {
          ta.style.fontSize = `${px}px`
          ta.style.lineHeight = `${px * 1.6}px`
          ta.style.height = "auto"
          ta.style.height = `${ta.scrollHeight}px`
          return ta.scrollHeight <= innerAvailable
        }

        // Binary search for max fitting size, capped by globalMax and not below lowMin
        while (lo < hi) {
          const mid = Math.ceil((lo + hi + 1) / 2)
          if (fits(mid)) lo = mid
          else hi = mid - 1
        }
        const chosen = Math.min(lo, globalMax)
        fits(chosen)
        // setEffectiveFontPx(chosen) // Removed as per edit hint

        // Center vertically with symmetric padding
        // padding handled by flex centering; no explicit verticalPad needed
      }
    }
    computeContentHeight()
    const onWindowResize = () => computeContentHeight()
    window.addEventListener("resize", onWindowResize)
    // Observe card size changes for drag-resize
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && cardRef.current) {
      ro = new ResizeObserver(() => computeContentHeight())
      ro.observe(cardRef.current)
    }
    // Second measurement on next frame to account for async font/layout
    const raf = requestAnimationFrame(() => computeContentHeight())
    return () => {
      window.removeEventListener("resize", onWindowResize)
      if (ro && cardRef.current) ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [text, selectedFontId, selectedSizeId, selectedThemeId])

  // Removed global outside-click handler; Radix Select handles its own dismissal

  // No download/copy; user requested to remove those actions

  return (
    <div
      className="min-h-screen flex flex-col items-center p-4"
      style={{ backgroundColor: selectedTheme.backgroundColor, color: selectedTheme.textColor }}
    >
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-end gap-2 mb-4" data-menu>

        <div className="relative" data-menu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowFontSelector((v) => !v)
              setShowThemeSelector(false)
              setShowSizeSelector(false)
            }}
            className="p-2 hover:bg-secondary cursor-pointer"
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

        {/* Alignment Selector */}
        <div className="relative" data-menu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAlignSelector((v) => !v)
              setShowFontSelector(false)
              setShowSizeSelector(false)
              setShowThemeSelector(false)
            }}
            className="p-2 hover:bg-secondary cursor-pointer"
            aria-label="Open alignment selector"
          >
            {selectedAlign === "left" && <AlignLeft className="w-4 h-4" />}
            {selectedAlign === "center" && <AlignCenter className="w-4 h-4" />}
            {selectedAlign === "right" && <AlignRight className="w-4 h-4" />}
          </Button>
          {showAlignSelector && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-2">
                <Select
                  value={selectedAlign}
                  onValueChange={(value) => setSelectedAlign(value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Size Selector */}
        <div className="relative" data-menu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSizeSelector((v) => !v)
              setShowFontSelector(false)
              setShowThemeSelector(false)
              setShowAlignSelector(false)
            }}
            className="p-2 hover:bg-secondary cursor-pointer"
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

        {/* Theme Selector */}
        <div className="relative" data-menu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowThemeSelector((v) => !v)
              setShowFontSelector(false)
              setShowSizeSelector(false)
              setShowAlignSelector(false)
            }}
            className="p-2 cursor-pointer"
            aria-label="Open theme selector"
          >
            <span className="text-sm">{selectedTheme.name}</span>
          </Button>
          {showThemeSelector && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="p-2">
                <Select value={selectedThemeId} onValueChange={(value) => setSelectedThemeId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: t.backgroundColor }} />
                          {t.name}
                        </span>
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
          className="relative shadow-lg border-0 p-10 rounded-2xl resize overflow-hidden"
          style={{
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            backgroundColor: selectedTheme.cardColor,
            width: "800px",
            height: "420px",
            maxWidth: "100%",
            minWidth: "320px",
            minHeight: "240px",
          }}
          ref={cardRef}
        >
          {/* macOS Traffic Lights */}
          <div className="absolute top-6 left-6 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          {/* Text Content */}
          <div className="w-full" style={{ height: "calc(100% - 56px)", marginTop: 56 }}>
            <div className="flex items-center justify-center w-full h-full">
              <Textarea
                key={selectedFontSize}
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full max-w-full border-0 bg-transparent resize-none focus:ring-0 leading-relaxed break-words overflow-hidden text-center"
                style={{ fontFamily: selectedFontCss, fontSize: selectedFontSize, color: selectedTheme.textColor, whiteSpace: "pre-wrap", textAlign: selectedAlign as any }}
                placeholder="Start typing your thoughts..."
                autoFocus
              />
            </div>
          </div>
          {/* Preset preview removed */}
        </Card>

        {/* History UI removed */}
      </div>

      {/* Hidden canvas retained for potential future use */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
