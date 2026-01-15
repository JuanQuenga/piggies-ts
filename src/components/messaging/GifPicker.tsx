import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const GIPHY_API_KEY = import.meta.env.VITE_PUBLIC_GIPHY_API_KEY

interface GifResult {
  id: string
  images: {
    fixed_height: {
      url: string
      width: string
      height: string
    }
    original: {
      url: string
    }
  }
  title: string
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGifs = useCallback(async (searchQuery: string) => {
    if (!GIPHY_API_KEY) {
      setError("Giphy API key not configured")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = searchQuery
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=24&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`

      const response = await fetch(endpoint)
      if (!response.ok) throw new Error("Failed to fetch GIFs")

      const data = await response.json()
      setGifs(data.data)
    } catch (err) {
      setError("Failed to load GIFs")
      console.error("GIF fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load trending GIFs on mount
  useEffect(() => {
    fetchGifs("")
  }, [fetchGifs])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGifs(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, fetchGifs])

  const handleSelect = (gif: GifResult) => {
    onSelect(gif.images.original.url)
    onClose()
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
      {/* Header with search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="pl-9 bg-background"
            autoFocus
          />
        </div>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="h-64">
        {isLoading && gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {error}
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 p-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleSelect(gif)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg",
                  "hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                )}
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Powered by Giphy */}
      <div className="p-2 border-t border-border bg-muted/50 text-center">
        <span className="text-xs text-muted-foreground">Powered by GIPHY</span>
      </div>
    </div>
  )
}



