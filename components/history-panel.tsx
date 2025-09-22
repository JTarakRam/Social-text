"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  X,
  Search,
  Download,
  Upload,
  Trash2,
  MoreVertical,
  Star,
  StarOff,
  Calendar,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react"
import { type SavedSnap, SnapStorage, type StorageStats } from "@/lib/storage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HistoryPanelProps {
  onClose: () => void
  onLoadSnap: (snap: SavedSnap) => void
  onDeleteSnap: (id: string) => void
  savedSnaps: SavedSnap[]
  onRefresh: () => void
}

type SortOption = "newest" | "oldest" | "alphabetical" | "length"
type FilterOption = "all" | "favorites" | "recent" | "long" | "short"

export function HistoryPanel({ onClose, onLoadSnap, onDeleteSnap, savedSnaps, onRefresh }: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [selectedSnaps, setSelectedSnaps] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Filter and sort snaps
  const processedSnaps = useMemo(() => {
    let filtered = savedSnaps

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = SnapStorage.searchSnaps(searchQuery)
    }

    // Apply category filter
    switch (filterBy) {
      case "favorites":
        filtered = filtered.filter((snap) => snap.tags?.includes("favorite"))
        break
      case "recent":
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        filtered = filtered.filter((snap) => snap.timestamp > weekAgo)
        break
      case "long":
        filtered = filtered.filter((snap) => snap.text.length > 500)
        break
      case "short":
        filtered = filtered.filter((snap) => snap.text.length <= 100)
        break
    }

    // Apply sorting
    switch (sortBy) {
      case "oldest":
        filtered = [...filtered].sort((a, b) => a.timestamp - b.timestamp)
        break
      case "alphabetical":
        filtered = [...filtered].sort((a, b) => (a.title || a.text).localeCompare(b.title || b.text))
        break
      case "length":
        filtered = [...filtered].sort((a, b) => b.text.length - a.text.length)
        break
      case "newest":
      default:
        filtered = [...filtered].sort((a, b) => b.timestamp - a.timestamp)
        break
    }

    return filtered
  }, [savedSnaps, searchQuery, sortBy, filterBy])

  const loadStats = () => {
    setStats(SnapStorage.getStats())
  }

  const handleExport = () => {
    const data = SnapStorage.exportData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `snap-editor-backup-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const result = SnapStorage.importData(content)

        if (result.success) {
          onRefresh()
          alert(`${result.message}`)
        } else {
          alert(`Import failed: ${result.message}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete all saved snaps? This cannot be undone.")) {
      SnapStorage.clearAll()
      onRefresh()
      setSelectedSnaps(new Set())
    }
  }

  const toggleFavorite = (snap: SavedSnap) => {
    const currentTags = snap.tags || []
    const isFavorite = currentTags.includes("favorite")

    const updatedTags = isFavorite ? currentTags.filter((tag) => tag !== "favorite") : [...currentTags, "favorite"]

    SnapStorage.updateSnap(snap.id, { tags: updatedTags })
    onRefresh()
  }

  const handleSelectSnap = (snapId: string, checked: boolean) => {
    const newSelected = new Set(selectedSnaps)
    if (checked) {
      newSelected.add(snapId)
    } else {
      newSelected.delete(snapId)
    }
    setSelectedSnaps(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedSnaps.size === processedSnaps.length) {
      setSelectedSnaps(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedSnaps(new Set(processedSnaps.map((snap) => snap.id)))
      setShowBulkActions(true)
    }
  }

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedSnaps.size} selected snaps? This cannot be undone.`)) {
      selectedSnaps.forEach((id) => SnapStorage.deleteSnap(id))
      onRefresh()
      setSelectedSnaps(new Set())
      setShowBulkActions(false)
    }
  }

  const handleBulkFavorite = () => {
    selectedSnaps.forEach((id) => {
      const snap = savedSnaps.find((s) => s.id === id)
      if (snap) {
        const currentTags = snap.tags || []
        if (!currentTags.includes("favorite")) {
          SnapStorage.updateSnap(id, { tags: [...currentTags, "favorite"] })
        }
      }
    })
    onRefresh()
    setSelectedSnaps(new Set())
    setShowBulkActions(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(timestamp)
  }

  const getFilterCount = (filter: FilterOption): number => {
    switch (filter) {
      case "favorites":
        return savedSnaps.filter((snap) => snap.tags?.includes("favorite")).length
      case "recent":
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        return savedSnaps.filter((snap) => snap.timestamp > weekAgo).length
      case "long":
        return savedSnaps.filter((snap) => snap.text.length > 500).length
      case "short":
        return savedSnaps.filter((snap) => snap.text.length <= 100).length
      default:
        return savedSnaps.length
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md z-50">
        <Card className="h-full bg-card shadow-xl border-l p-6 rounded-none">
          <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">History</h3>
          {stats && (
            <Badge variant="secondary" className="text-xs">
              {stats.totalSnaps} snaps
            </Badge>
          )}
        </div>

          <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2" aria-label="More actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={loadStats}>
                <Calendar className="w-4 h-4 mr-2" />
                View Stats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearAll} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={onClose} className="p-2" aria-label="Close history">
            <X className="w-4 h-4" />
          </Button>
        </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your snaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="w-4 h-4" />
                {filterBy === "all" ? "All" : filterBy.charAt(0).toUpperCase() + filterBy.slice(1)}
                <Badge variant="secondary" className="text-xs">
                  {getFilterCount(filterBy)}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterBy("all")}>All ({savedSnaps.length})</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("favorites")}>
                Favorites ({getFilterCount("favorites")})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("recent")}>
                Recent ({getFilterCount("recent")})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("long")}>Long ({getFilterCount("long")})</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("short")}>
                Short ({getFilterCount("short")})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                {sortBy === "newest" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>Alphabetical</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("length")}>By Length</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {processedSnaps.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedSnaps.size === processedSnaps.length ? "Deselect All" : "Select All"}
            </Button>
          )}
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedSnaps.size} selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkFavorite}>
                  <Star className="w-4 h-4 mr-1" />
                  Favorite
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Display */}
        {stats && (
          <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Snaps:</span>
                <span className="ml-2 font-medium">{stats.totalSnaps}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Characters:</span>
                <span className="ml-2 font-medium">{stats.totalCharacters.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Snaps List */}
        {processedSnaps.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchQuery || filterBy !== "all"
              ? "No snaps match your criteria."
              : "No saved snaps yet. Start writing to build your history!"}
          </p>
        ) : (
          <div className="space-y-3 h-[calc(100%-160px)] overflow-y-auto pr-1">
            {processedSnaps.map((snap) => {
              const isFavorite = snap.tags?.includes("favorite")
              const isSelected = selectedSnaps.has(snap.id)

              return (
                <div
                  key={snap.id}
                  className={`group flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectSnap(snap.id, checked as boolean)}
                  className="mt-1"
                  aria-label={isSelected ? "Deselect" : "Select"}
                  onClick={(e) => e.stopPropagation()}
                />

                <button
                  type="button"
                  className="flex-1 min-w-0 text-left cursor-pointer"
                  onClick={() => onLoadSnap(snap)}
                >
                    {snap.title && <h4 className="font-medium text-sm mb-1 truncate">{snap.title}</h4>}
                    <p className="font-mono text-sm text-foreground/80 line-clamp-2">{snap.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(snap.timestamp)}</p>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {snap.text.length} chars
                      </Badge>
                      {snap.tags &&
                        snap.tags
                          .filter((tag) => tag !== "favorite")
                          .slice(0, 2)
                          .map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                    </div>
                </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(snap)
                      }}
                      className="p-1"
                      aria-label={isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      {isFavorite ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSnap(snap.id)
                      }}
                      className="p-1"
                      aria-label="Delete snap"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </Card>
      </div>
    </div>
  )
}
