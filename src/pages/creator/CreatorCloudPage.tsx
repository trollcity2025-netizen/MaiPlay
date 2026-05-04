import { useState } from 'react'
import { Music, Film, Video, Album as AlbumIcon, Upload, Calendar } from 'lucide-react'
import { AppHeader } from '../../components/layout/AppHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Link } from 'react-router-dom'
import { useCreatorTracks } from '../../hooks/useVideos'
import { useCreatorAlbums } from '../../hooks/useVideos'
import { useCreatorShorts } from '../../hooks/useVideos'
import { useCreatorMovies } from '../../hooks/useVideos'

type ContentType = 'track' | 'album' | 'short' | 'movie'

interface CloudItem {
  id: string
  title: string
  type: ContentType
  view_count?: number
  moderation_status?: string
}

export function CreatorCloudPage() {
  const { data: tracks = [] } = useCreatorTracks()
  const { data: albums = [] } = useCreatorAlbums()
  const { data: shorts = [] } = useCreatorShorts()
  const { data: movies = [] } = useCreatorMovies()

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<ContentType>('track')

  const allContent: CloudItem[] = [
    ...tracks.map(t => ({ ...t, type: 'track' as const })),
    ...albums.map(a => ({ ...a, type: 'album' as const })),
    ...shorts.map(s => ({ ...s, type: 'short' as const })),
    ...movies.map(m => ({ ...m, type: 'movie' as const })),
  ]

  const filteredContent = allContent.filter(item => item.type === activeTab)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'track': return Music
      case 'album': return AlbumIcon
      case 'short': return Video
      case 'movie': return Film
    }
  }

  const getStatusColor = (status?: string) => {
    if (status === 'approved') return 'text-green-400'
    if (status === 'flagged') return 'text-red-400'
    return 'text-yellow-400'
  }

  const typeTabs: { type: ContentType; label: string; icon: any }[] = [
    { type: 'track', label: 'Tracks', icon: Music },
    { type: 'album', label: 'Albums', icon: AlbumIcon },
    { type: 'short', label: 'Shorts', icon: Video },
    { type: 'movie', label: 'Movies', icon: Film },
  ]

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">Creator Cloud</p>
              <h1 className="mt-3 text-4xl font-black">Your Content Library</h1>
              <p className="mt-3 max-w-3xl text-sm text-zinc-300">
                Select content to schedule to your calendar or upload new content.
              </p>
            </div>
            <Link to="/creator-hub/uploads">
              <Button className="rounded-2xl bg-gradient-to-r from-yellow-400 to-red-500 font-black text-black hover:from-yellow-300 hover:to-red-400">
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
            </Link>
          </div>
        </section>

        <section className="flex gap-2">
          {typeTabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.type
                    ? 'bg-yellow-400 text-black'
                    : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <Icon className="mr-2 inline h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </section>

        <section>
          {filteredContent.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContent.map(item => {
                const Icon = getIcon(item.type)
                const isSelected = selectedItems.has(item.id)
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer border-yellow-400/20 bg-black/50 p-4 transition ${
                      isSelected ? 'border-yellow-400 bg-yellow-400/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-yellow-400/10">
                        <Icon className="h-6 w-6 text-yellow-300" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black">{item.title}</p>
                        <p className={`text-xs capitalize ${getStatusColor(item.moderation_status)}`}>
                          {item.moderation_status || 'pending'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {item.view_count?.toLocaleString() || 0} views
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="h-5 w-5 rounded border-white/20 bg-black/50"
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/50 p-8 text-center">
              <p className="text-zinc-400">No {activeTab}s found. Upload your first {activeTab}!</p>
              <Link to="/creator-hub/uploads">
                <Button className="mt-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-red-500 font-black text-black">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Button>
              </Link>
            </div>
          )}
        </section>

        {selectedItems.size > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-4 rounded-2xl border border-yellow-400/30 bg-black/80 px-6 py-4 shadow-2xl backdrop-blur-xl">
              <span className="text-sm font-bold">{selectedItems.size} selected</span>
              <Link to={`/calendar?schedule=${Array.from(selectedItems).join(',')}`}>
                <Button className="rounded-xl bg-gradient-to-r from-yellow-400 to-red-500 font-black text-black">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule to Calendar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}