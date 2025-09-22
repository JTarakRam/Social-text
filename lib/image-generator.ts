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
}

export const defaultImageOptions: ImageOptions = {
  format: "png",
  quality: 1.0,
  width: 1080,
  height: 1080,
  scale: 2,
  backgroundColor: "#F3EBDD",
  textColor: "#2A2926",
  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
  fontSize: 16,
  padding: 40,
  borderRadius: 20,
  autoFit: true,
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

    // Determine font size; optionally auto-fit to width and scale up to use available space
    const targetWidth = opts.width - 96 - opts.padding * 2
    let workingFontSize = opts.fontSize
    this.ctx.font = `${workingFontSize}px ${opts.fontFamily}`
    if (opts.autoFit) {
      const sampleLine = text.split("\n").reduce((a, b) => (b.length > a.length ? b : a), "")
      // Shrink until it fits
      while (workingFontSize > 10 && this.ctx.measureText(sampleLine).width > targetWidth) {
        workingFontSize -= 1
        this.ctx.font = `${workingFontSize}px ${opts.fontFamily}`
      }
      // Grow back up to utilize space if much smaller than target
      while (this.ctx.measureText(sampleLine).width < targetWidth * 0.9) {
        workingFontSize += 1
        this.ctx.font = `${workingFontSize}px ${opts.fontFamily}`
        if (this.ctx.measureText(sampleLine).width > targetWidth) {
          workingFontSize -= 1
          this.ctx.font = `${workingFontSize}px ${opts.fontFamily}`
          break
        }
        if (workingFontSize > opts.fontSize * 3) break
      }
    }

    const lines = text.split("\n")
    const lineHeight = workingFontSize * 1.6
    const textHeight = lines.length * lineHeight
    const dynamicHeight = Math.max(opts.height, textHeight + opts.padding * 4 + 160)

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
    const cardX = 48
    const cardY = 48
    const cardWidth = opts.width - 96
    const cardHeight = dynamicHeight - 96

    // Draw card with shadow
    this.drawCardWithShadow(cardX, cardY, cardWidth, cardHeight, opts.borderRadius)

    // macOS traffic lights on the card
    this.drawTrafficLights(cardX + 25, cardY + 25)

    // Draw text content
    await this.drawText(text, cardX + opts.padding, cardY + 80, cardWidth - opts.padding * 2, {
      ...opts,
      fontSize: workingFontSize,
    })

    // No share icon in the output

    // Return data URL
    return this.canvas.toDataURL(`image/${opts.format}`, opts.quality)
  }

  private drawCardWithShadow(x: number, y: number, width: number, height: number, radius: number) {
    // Shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
    this.ctx.shadowBlur = 20
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 10

    // Card background - slightly darker than page
    this.ctx.fillStyle = "#EFE3CF"
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
      "instagram-story": { width: 1080, height: 1920 },
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
    this.ctx.textAlign = "left"
    this.ctx.textBaseline = "top"

    const lineHeight = options.fontSize * 1.6
    const paragraphs = text.split("\n")
    let currentY = y

    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) {
        currentY += lineHeight * 0.5 // Extra space between paragraphs
      }

      if (paragraph.trim() === "") {
        currentY += lineHeight
        return
      }

      const words = paragraph.split(" ")
      const lines: string[] = []
      let currentLine = ""

      // Word wrapping
      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? " " : "") + word
        const metrics = this.ctx.measureText(testLine)

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }

      // Draw lines
      lines.forEach((line) => {
        this.ctx.fillText(line, x, currentY)
        currentY += lineHeight
      })
    })
  }
}
