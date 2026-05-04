import { AppHeader } from '../components/layout/AppHeader'

export function CreatorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Creators</h1>
        <p className="text-gray-400">Browse creators coming soon...</p>
      </div>
    </div>
  )
}