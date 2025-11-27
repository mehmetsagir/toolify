import React, { useState, useEffect, useRef } from 'react'
import {
  History as HistoryIcon,
  Search,
  Star,
  Trash2,
  Copy,
  Clock,
  Globe,
  Filter,
  Trash,
  CheckCircle2
} from 'lucide-react'
import type { HistoryItem } from '../../../shared/types'

interface HistoryProps {
  onClose: () => void
  onCopy: (text: string) => void
}

export const History: React.FC<HistoryProps> = ({ onClose, onCopy }) => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadHistory()
    // Focus search input on mount
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [])

  useEffect(() => {
    filterHistory()
  }, [history, searchQuery, filter])

  const loadHistory = async (): Promise<void> => {
    try {
      const items = await window.api.getAllHistory()
      setHistory(items)
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const filterHistory = (): void => {
    let filtered = history

    // Apply filter
    if (filter === 'favorites') {
      filtered = filtered.filter((item) => item.isFavorite)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.text.toLowerCase().includes(query) ||
          (item.sourceLanguage && item.sourceLanguage.toLowerCase().includes(query)) ||
          (item.targetLanguage && item.targetLanguage.toLowerCase().includes(query))
      )
    }

    setFilteredHistory(filtered)
  }

  const handleToggleFavorite = async (id: string): Promise<void> => {
    try {
      const newFavoriteState = await window.api.toggleFavorite(id)
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavorite: newFavoriteState } : item))
      )
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const success = await window.api.deleteHistoryItem(id)
      if (success) {
        setHistory((prev) => prev.filter((item) => item.id !== id))
        setSelectedItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedItems.size === 0) return

    try {
      const ids = Array.from(selectedItems)
      await window.api.deleteHistoryItems(ids)
      setHistory((prev) => prev.filter((item) => !ids.includes(item.id)))
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Failed to delete items:', error)
    }
  }

  const handleCopy = async (text: string, id: string): Promise<void> => {
    onCopy(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSelectAll = (): void => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredHistory.map((item) => item.id)))
    }
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <HistoryIcon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold">History</h2>
            <p className="text-xs text-zinc-500">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-white/5">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-zinc-900/50 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:border-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === 'favorites'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:border-white/10'
              }`}
            >
              <Star size={12} className={filter === 'favorites' ? 'fill-current' : ''} />
              Favorites
            </button>
          </div>

          {selectedItems.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="no-drag px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center gap-1.5"
            >
              <Trash size={12} />
              Delete ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="p-4 rounded-full bg-zinc-900/50 mb-4">
              <HistoryIcon size={32} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">
              {searchQuery || filter === 'favorites'
                ? 'No items found'
                : 'No history yet. Start recording to see your transcriptions here.'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={`group bg-zinc-900/30 rounded-xl p-4 border transition-all ${
                  selectedItems.has(item.id)
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => {
                      const newSet = new Set(selectedItems)
                      if (newSet.has(item.id)) {
                        newSet.delete(item.id)
                      } else {
                        newSet.add(item.id)
                      }
                      setSelectedItems(newSet)
                    }}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      selectedItems.has(item.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-zinc-600 hover:border-zinc-500'
                    }`}
                  >
                    {selectedItems.has(item.id) && (
                      <CheckCircle2 size={12} className="text-white" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 leading-relaxed break-words">
                      {item.text}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{formatDate(item.timestamp)}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{formatTime(item.timestamp)}</span>
                      </div>
                      {item.translated && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Globe size={12} />
                            <span>
                              {item.sourceLanguage || 'auto'} → {item.targetLanguage || 'en'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(item.text, item.id)}
                      className="no-drag p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                      title="Copy"
                    >
                      {copiedId === item.id ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(item.id)}
                      className={`no-drag p-2 rounded-lg hover:bg-white/5 transition-colors ${
                        item.isFavorite
                          ? 'text-yellow-400 hover:text-yellow-300'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={16} className={item.isFavorite ? 'fill-current' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="no-drag p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

