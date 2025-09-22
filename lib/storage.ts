export interface SavedSnap {
  id: string
  text: string
  timestamp: number
  title?: string
  tags?: string[]
}

export interface StorageStats {
  totalSnaps: number
  totalCharacters: number
  oldestSnap?: number
  newestSnap?: number
}

const STORAGE_KEY = "snap-editor-history"
const SETTINGS_KEY = "snap-editor-settings"
const MAX_SNAPS = 100

const SERVER_HISTORY_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SERVER_HISTORY === "true"

export interface AppSettings {
  autoSave: boolean
  maxHistory: number
  theme: "light" | "dark" | "auto"
}

const defaultSettings: AppSettings = {
  autoSave: true,
  maxHistory: MAX_SNAPS,
  theme: "auto",
}

export class SnapStorage {
  static getSnaps(): SavedSnap[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error("Error loading snaps:", error)
      return []
    }
  }

  // Load from server file and mirror to localStorage
  static async syncFromServer(): Promise<SavedSnap[]> {
    if (!SERVER_HISTORY_ENABLED) {
      return this.getSnaps()
    }
    try {
      const res = await fetch('/api/history', { cache: 'no-store' })
      if (!res.ok) return this.getSnaps()
      const data = (await res.json()) as { snaps: SavedSnap[] }
      const snaps = Array.isArray(data.snaps) ? data.snaps : []
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps.slice(0, MAX_SNAPS)))
      return snaps
    } catch {
      return this.getSnaps()
    }
  }

  static saveSnap(text: string, title?: string, tags?: string[]): SavedSnap {
    const snaps = this.getSnaps()

    const newSnap: SavedSnap = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: Date.now(),
      title: title || this.generateTitle(text),
      tags: tags || [],
    }

    // Add to beginning and limit total
    const updatedSnaps = [newSnap, ...snaps].slice(0, MAX_SNAPS)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSnaps))
    } catch (error) {
      console.error("Error saving snap:", error)
      // If storage is full, try removing oldest snaps
      const reducedSnaps = updatedSnaps.slice(0, Math.floor(MAX_SNAPS / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedSnaps))
    }

    // Fire-and-forget server persistence
    this.persistToServer(newSnap).catch(() => {})

    return newSnap
  }

  static updateSnap(id: string, updates: Partial<SavedSnap>): boolean {
    const snaps = this.getSnaps()
    const index = snaps.findIndex((snap) => snap.id === id)

    if (index === -1) return false

    snaps[index] = { ...snaps[index], ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps))
    return true
  }

  private static async persistToServer(snap: SavedSnap): Promise<void> {
    if (!SERVER_HISTORY_ENABLED) return
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap),
      })
    } catch (e) {
      // Non-fatal in client; data remains in localStorage
      console.warn('Failed to persist history to server file', e)
    }
  }

  static deleteSnap(id: string): boolean {
    const snaps = this.getSnaps()
    const filtered = snaps.filter((snap) => snap.id !== id)

    if (filtered.length === snaps.length) return false

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  }

  static searchSnaps(query: string): SavedSnap[] {
    const snaps = this.getSnaps()
    const lowercaseQuery = query.toLowerCase()

    return snaps.filter(
      (snap) =>
        snap.text.toLowerCase().includes(lowercaseQuery) ||
        snap.title?.toLowerCase().includes(lowercaseQuery) ||
        snap.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
    )
  }

  static getStats(): StorageStats {
    const snaps = this.getSnaps()

    return {
      totalSnaps: snaps.length,
      totalCharacters: snaps.reduce((total, snap) => total + snap.text.length, 0),
      oldestSnap: snaps.length > 0 ? Math.min(...snaps.map((s) => s.timestamp)) : undefined,
      newestSnap: snaps.length > 0 ? Math.max(...snaps.map((s) => s.timestamp)) : undefined,
    }
  }

  static exportData(): string {
    const snaps = this.getSnaps()
    const settings = this.getSettings()

    return JSON.stringify(
      {
        snaps,
        settings,
        exportDate: new Date().toISOString(),
        version: "1.0",
      },
      null,
      2,
    )
  }

  static importData(jsonData: string): { success: boolean; message: string; imported: number } {
    try {
      const data = JSON.parse(jsonData)

      if (!data.snaps || !Array.isArray(data.snaps)) {
        return { success: false, message: "Invalid data format", imported: 0 }
      }

      const existingSnaps = this.getSnaps()
      const existingIds = new Set(existingSnaps.map((s) => s.id))

      // Filter out duplicates
      const newSnaps = data.snaps.filter((snap: SavedSnap) => !existingIds.has(snap.id))

      if (newSnaps.length === 0) {
        return { success: false, message: "No new snaps to import", imported: 0 }
      }

      // Merge and sort by timestamp
      const mergedSnaps = [...existingSnaps, ...newSnaps].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_SNAPS)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSnaps))

      return {
        success: true,
        message: `Successfully imported ${newSnaps.length} snaps`,
        imported: newSnaps.length,
      }
    } catch (error) {
      return { success: false, message: "Failed to parse import data", imported: 0 }
    }
  }

  static clearAll(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY)
      return true
    } catch (error) {
      console.error("Error clearing storage:", error)
      return false
    }
  }

  static getSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
    } catch (error) {
      console.error("Error loading settings:", error)
      return defaultSettings
    }
  }

  static saveSettings(settings: Partial<AppSettings>): void {
    try {
      const current = this.getSettings()
      const updated = { ...current, ...settings }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error("Error saving settings:", error)
    }
  }

  private static generateTitle(text: string): string {
    // Generate a title from the first line or first few words
    const firstLine = text.split("\n")[0].trim()
    const words = firstLine.split(" ").slice(0, 6)
    return words.join(" ") + (firstLine.split(" ").length > 6 ? "..." : "")
  }
}
