export interface ImageOptions {
  format: "png" | "jpeg" | "webp"
  quality: number
  width: number
  height: number
  scale: number
  backgroundColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  padding: number
  borderRadius: number
  autoFit?: boolean
  cardColor?: string
}

export const defaultImageOptions: ImageOptions = {
  format: "png",
  quality: 1.0,
  width: 1080,
  height: 1080,
  scale: 3,
  backgroundColor: "#F3EBDD",
  textColor: "#2A2926",
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
  fontSize: 16,
  padding: 40,
  borderRadius: 20,
  autoFit: true,
  cardColor: "#EFE3CF",
}

export class ImageGenerator {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not get canvas context")
    this.ctx = ctx
  }

  async generateImage(text: string, options: Partial<ImageOptions> = {}): Promise<string> {
    const opts = { ...defaultImageOptions, ...options }
    const normalizedFontFamily = this.normalizeFontFamily(opts.fontFamily)

    // Determine font size; optionally auto-fit to width and scale up to use available space
    const targetWidth = opts.width - 96 - opts.padding * 2
    let workingFontSize = opts.fontSize
    this.ctx.font = `${workingFontSize}px ${normalizedFontFamily}`
    if (opts.autoFit) {
      const sampleLine = text.split("\n").reduce((a, b) => (b.length > a.length ? b : a), "")
      // Shrink until it fits
      while (workingFontSize > 10 && this.ctx.measureText(sampleLine).width > targetWidth) {
        workingFontSize -= 1
        this.ctx.font = `${workingFontSize}px ${normalizedFontFamily}`
      }
      // Grow back up to utilize space if much smaller than target
      while (this.ctx.measureText(sampleLine).width < targetWidth * 0.9) {
        workingFontSize += 1
        this.ctx.font = `${workingFontSize}px ${normalizedFontFamily}`
        if (this.ctx.measureText(sampleLine).width > targetWidth) {
          workingFontSize -= 1
          this.ctx.font = `${workingFontSize}px ${normalizedFontFamily}`
          break
        }
        if (workingFontSize > opts.fontSize * 3) break
      }
    }

    // Precompute wrapping to determine exact height so content never overflows
    const lineHeight = workingFontSize * 1.6
    const cardX = 48
    const cardY = 48
    const cardWidth = opts.width - 96
    const maxTextWidth = cardWidth - opts.padding * 2
    const wrapped = this.wrapText(text, maxTextWidth, workingFontSize, normalizedFontFamily)
    const paragraphSeparatorExtra = Math.max(0, wrapped.paragraphCount - 1) * lineHeight * 0.5
    const textHeight = wrapped.lines.length * lineHeight + paragraphSeparatorExtra
    const dynamicHeight = Math.max(opts.height, textHeight + opts.padding * 2 + 160)

    // Set canvas size
    this.canvas.width = opts.width * opts.scale
    this.canvas.height = dynamicHeight * opts.scale
    this.ctx.scale(opts.scale, opts.scale)

    // Clear canvas
    this.ctx.clearRect(0, 0, opts.width, dynamicHeight)

    // Background
    this.ctx.fillStyle = opts.backgroundColor
    this.ctx.fillRect(0, 0, opts.width, dynamicHeight)

    // Card dimensions (typing area) - slightly darker to highlight area
    const cardHeight = dynamicHeight - 96

    // Draw card with shadow
    this.drawCardWithShadow(cardX, cardY, cardWidth, cardHeight, opts.borderRadius, opts.cardColor || "#EFE3CF")

    // macOS traffic lights on the card
    this.drawTrafficLights(cardX + 25, cardY + 25)

    // Draw text content centered
    const textMetrics = this.measureWrapped(text, cardWidth - opts.padding * 2, workingFontSize, normalizedFontFamily)
    const totalTextHeight = textMetrics.totalHeight
    const startY = cardY + (cardHeight - totalTextHeight) / 2
    await this.drawText(text, cardX + opts.padding, Math.max(cardY + 80, startY), cardWidth - opts.padding * 2, {
      ...opts,
      fontSize: workingFontSize,
      fontFamily: normalizedFontFamily,
      textAlign: "center" as any,
    })

    // No share icon in the output

    // Return data URL
    return this.canvas.toDataURL(`image/${opts.format}`, opts.quality)
  }

  private drawCardWithShadow(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    cardColor: string,
  ) {
    // Shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
    this.ctx.shadowBlur = 20
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 10

    // Card background
    this.ctx.fillStyle = cardColor
    this.ctx.beginPath()
    this.ctx.roundRect(x, y, width, height, radius)
    this.ctx.fill()

    // Reset shadow
    this.ctx.shadowColor = "transparent"
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0
  }

  // Social presets for downloads
  static getSocialMediaPresets(): Record<string, Partial<ImageOptions>> {
    return {
      "instagram-square": { width: 1080, height: 1080 },
      "instagram-post": { width: 1080, height: 1080 },
      "twitter-post": { width: 1200, height: 675 },
      "linkedin-post": { width: 1200, height: 627 },
    }
  }

  private drawTrafficLights(x: number, y: number) {
    // Red
    this.ctx.fillStyle = "#ff5f57"
    this.ctx.beginPath()
    this.ctx.arc(x, y, 6, 0, 2 * Math.PI)
    this.ctx.fill()

    // Yellow
    this.ctx.fillStyle = "#ffbd2e"
    this.ctx.beginPath()
    this.ctx.arc(x + 20, y, 6, 0, 2 * Math.PI)
    this.ctx.fill()

    // Green
    this.ctx.fillStyle = "#28ca42"
    this.ctx.beginPath()
    this.ctx.arc(x + 40, y, 6, 0, 2 * Math.PI)
    this.ctx.fill()
  }

  private async drawText(text: string, x: number, y: number, maxWidth: number, options: ImageOptions) {
    this.ctx.fillStyle = options.textColor
    this.ctx.font = `${options.fontSize}px ${options.fontFamily}`
    this.ctx.textAlign = options["textAlign" as never] || "left"
    this.ctx.textBaseline = "top"

    const lineHeight = options.fontSize * 1.6
    const wrapped = this.wrapText(text, maxWidth, options.fontSize, options.fontFamily)
    let currentY = y

    let currentParagraphIndex = 0
    wrapped.lines.forEach((line) => {
      if (line === "__PARA_BREAK__") {
        currentParagraphIndex += 1
        currentY += lineHeight * 0.5
        return
      }
      if (this.ctx.textAlign === "center") {
        this.ctx.fillText(line, x + maxWidth / 2, currentY)
      } else {
        this.ctx.fillText(line, x, currentY)
      }
      currentY += lineHeight
    })
  }
}

// Normalize CSS variable based font stacks (from next/font) into concrete family names for Canvas API
// For example: 'var(--font-jetbrains-mono), monospace' -> '"JetBrains Mono", monospace'
// Also strips any raw var(...) tokens that Canvas cannot interpret.
ImageGenerator.prototype["normalizeFontFamily"] = function (fontFamily: string): string {
  let normalized = fontFamily
  normalized = normalized.replace(/var\(--font-jetbrains-mono\)/g, '"JetBrains Mono"')
  normalized = normalized.replace(/var\(--font-fira-code\)/g, '"Fira Code"')
  normalized = normalized.replace(/var\(--font-source-code-pro\)/g, '"Source Code Pro"')
  // Remove any remaining var(...) tokens just in case
  normalized = normalized.replace(/var\([^)]*\)\s*,?/g, "")
  // Collapse duplicate commas and whitespace
  normalized = normalized.replace(/\s*,\s*,+/g, ", ").trim()
  // Ensure there is at least one fallback
  if (!/monospace|serif|sans-serif/.test(normalized)) {
    normalized = `${normalized}, monospace`
  }
  return normalized
} as any

// Text wrapping helpers to ensure content does not overflow the card
ImageGenerator.prototype["wrapText"] = function (
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): { lines: string[]; paragraphCount: number } {
  const ctx = this.ctx as CanvasRenderingContext2D
  ctx.font = `${fontSize}px ${fontFamily}`
  const paragraphs = text.split("\n")
  const allLines: string[] = []
  let totalHeight = 0

  paragraphs.forEach((paragraph, idx) => {
    if (idx > 0) {
      allLines.push("__PARA_BREAK__")
    }

    if (paragraph.trim() === "") {
      // Preserve empty line
      allLines.push("")
      totalHeight += fontSize * 1.6
      return
    }

    const words = paragraph.split(" ")
    let currentLine = ""

    const pushLine = () => {
      if (currentLine.length > 0 || allLines.length === 0 || allLines[allLines.length - 1] !== "") {
        allLines.push(currentLine)
        totalHeight += fontSize * 1.6
      }
      currentLine = ""
    }

    const measure = (s: string) => ctx.measureText(s).width

    const splitLongWord = (word: string) => {
      // Break a single long word into chunks that fit maxWidth
      let chunk = ""
      for (const ch of word) {
        const next = chunk + ch
        if (measure(next) > maxWidth) {
          if (chunk.length === 0) {
            // Force at least one char to avoid infinite loop
            allLines.push(ch)
            totalHeight += fontSize * 1.6
          } else {
            allLines.push(chunk)
            totalHeight += fontSize * 1.6
            chunk = ch
          }
        } else {
          chunk = next
        }
      }
      if (chunk) {
        if (currentLine) {
          // Try to append to current line if possible
          const candidate = currentLine + (currentLine ? " " : "") + chunk
          if (measure(candidate) <= maxWidth) {
            currentLine = candidate
          } else {
            pushLine()
            currentLine = chunk
          }
        } else {
          currentLine = chunk
        }
      }
    }

    for (const word of words) {
      const tentative = currentLine + (currentLine ? " " : "") + word
      if (measure(tentative) <= maxWidth) {
        currentLine = tentative
        continue
      }
      // Current line full; push and start new line
      if (currentLine) pushLine()

      if (measure(word) <= maxWidth) {
        currentLine = word
      } else {
        // Very long word; split by characters
        splitLongWord(word)
      }
    }

    if (currentLine) pushLine()
  })

  return { lines: allLines, paragraphCount: paragraphs.length }
} as any

// Helper to measure wrapped height for vertical centering
ImageGenerator.prototype["measureWrapped"] = function (
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
) {
  const ctx = this.ctx as CanvasRenderingContext2D
  ctx.font = `${fontSize}px ${fontFamily}`
  const paragraphs = text.split("\n")
  const lineHeight = fontSize * 1.6
  let totalHeight = 0
  paragraphs.forEach((p, idx) => {
    if (idx > 0) totalHeight += lineHeight * 0.5
    if (p.trim() === "") {
      totalHeight += lineHeight
      return
    }
    const words = p.split(" ")
    let current = ""
    const measure = (s: string) => ctx.measureText(s).width
    for (const word of words) {
      const tentative = current + (current ? " " : "") + word
      if (measure(tentative) <= maxWidth) {
        current = tentative
      } else {
        totalHeight += lineHeight
        current = word
      }
    }
    if (current) totalHeight += lineHeight
  })
  return { totalHeight }
} as any
