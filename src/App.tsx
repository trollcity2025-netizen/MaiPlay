import { Suspense, lazy, useEffect, useMemo, useState, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthAccountProvider, useAuthAccount } from './auth/AuthAccountProvider'
import { PayPalProvider } from './components/payment/PayPalProvider'
import { DailyLoginCalendar } from './components/ui/daily-login-calendar'
import { useMaiWallet } from './hooks/useMaiWallet'

const queryClient = new QueryClient()

import { RequireAuth, RequireModerator, RequireAdminOrModerator } from './components/auth/RouteGuards'

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))

const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage').then(m => ({ default: m.VideoPlayerPage })))
const TrackPlayerPage = lazy(() => import('./pages/TrackPlayerPage').then(m => ({ default: m.TrackPlayerPage })))
const AlbumPage = lazy(() => import('./pages/AlbumPage').then(m => ({ default: m.AlbumPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage').then(m => ({ default: m.EditProfilePage })))
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })))

const CreatorHubDashboard = lazy(() => import('./pages/creator-hub/CreatorHubDashboard').then(m => ({ default: m.CreatorHubDashboard })))
const CreatorLiveSetupPage = lazy(() => import('./pages/live/CreatorLiveSetupPage').then(m => ({ default: m.CreatorLiveSetupPage })))
const MonetizationPage = lazy(() => import('./pages/creator/MonetizationPage').then(m => ({ default: m.MonetizationPage })))
const UploadVideo = lazy(() => import('./pages/creator/UploadVideo').then(m => ({ default: m.UploadVideo })))
const CreatorCloudPage = lazy(() => import('./pages/creator/CreatorCloudPage').then(m => ({ default: m.CreatorCloudPage })))

const AgoraLivePage = lazy(() => import('./pages/live/AgoraLivePage').then(m => ({ default: m.AgoraLivePage })))
const LivePage = lazy(() => import('./pages/LivePage').then(m => ({ default: m.LivePage })))

const FanbasePage = lazy(() => import('./pages/fanbase/FanbasePage').then(m => ({ default: m.FanbasePage })))
const StorePage = lazy(() => import('./pages/StorePage').then(m => ({ default: m.StorePage })))
const CommercePage = lazy(() => import('./pages/commerce/CommercePage').then(m => ({ default: m.CommercePage })))

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminReportsPage = lazy(() => import('./pages/admin/reports/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })))
const AdminSupportPage = lazy(() => import('./pages/admin/support/AdminSupportPage').then(m => ({ default: m.AdminSupportPage })))
const AdminCoinPackPricingPage = lazy(() => import('./pages/admin/AdminCoinPackPricingPage').then(m => ({ default: m.AdminCoinPackPricingPage })))
const AdminCashoutTiersPage = lazy(() => import('./pages/admin/AdminCashoutTiersPage').then(m => ({ default: m.AdminCashoutTiersPage })))
const ModerationDashboard = lazy(() => import('./pages/admin/ModerationDashboard').then(m => ({ default: m.ModerationDashboard })))

const FollowingPage = lazy(() => import('./pages/FollowingPage').then(m => ({ default: m.FollowingPage })))
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage').then(m => ({ default: m.SubscriptionsPage })))
const WatchLaterPage = lazy(() => import('./pages/WatchLaterPage').then(m => ({ default: m.WatchLaterPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const WalletPage = lazy(() => import('./pages/WalletPage').then(m => ({ default: m.WalletPage })))
const LeaderboardsPage = lazy(() => import('./pages/LeaderboardsPage').then(m => ({ default: m.LeaderboardsPage })))
const RewardsPage = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.RewardsPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const CreatorsPage = lazy(() => import('./pages/CreatorsPage').then(m => ({ default: m.CreatorsPage })))

const ShortsPage = lazy(() => import('./pages/ShortsPage').then(m => ({ default: m.ShortsPage })))
const MoviesPage = lazy(() => import('./pages/MoviesPage').then(m => ({ default: m.MoviesPage })))
const SpotlightPage = lazy(() => import('./pages/SpotlightPage').then(m => ({ default: m.SpotlightPage })))
const TrendingPage = lazy(() => import('./pages/TrendingPage').then(m => ({ default: m.TrendingPage })))
const NewDropsPage = lazy(() => import('./pages/NewDropsPage').then(m => ({ default: m.NewDropsPage })))
const MusicPage = lazy(() => import('./pages/MusicPage').then(m => ({ default: m.MusicPage })))
const ArtistsPage = lazy(() => import('./pages/ArtistsPage').then(m => ({ default: m.ArtistsPage })))

const CreatorApplicationPage = lazy(() => import('./pages/CreatorApplicationPage').then(m => ({ default: m.CreatorApplicationPage })))
const MoviePermissionPage = lazy(() => import('./pages/MoviePermissionPage').then(m => ({ default: m.MoviePermissionPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })))

function Protected({ children }: { children: ReactElement }) {
  return <RequireAuth>{children}</RequireAuth>
}

function StaffOnly({ children }: { children: ReactElement }) {
  return <RequireAdminOrModerator>{children}</RequireAdminOrModerator>
}

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070202] px-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
        <h1 className="mb-2 text-2xl font-black text-yellow-400">MaiPlay</h1>
        <p className="text-sm text-zinc-400 sm:text-base">Loading your creator experience...</p>
      </div>
    </div>
  )
}

function DailyLoginModal() {
  const { user } = useAuthAccount()
  const { todayReward } = useMaiWallet()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user || todayReward !== null) return

    const timer = window.setTimeout(() => setOpen(true), 2000)
    return () => window.clearTimeout(timer)
  }, [user, todayReward])

  if (!user || todayReward !== null) return null

  return <DailyLoginCalendar open={open} onOpenChange={setOpen} />
}

function AppRoutes() {
  const { user, loading } = useAuthAccount()

  const homeElement = useMemo(() => {
    return user ? <HomePage /> : <LandingPage />
  }, [user])

  if (loading) return <AppLoading />

  return (
    <Suspense fallback={<AppLoading />}>
      <PayPalProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={homeElement} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Legacy video route */}
          <Route path="/video/:id" element={<VideoPlayerPage />} />
          {/* New content routes */}
          <Route path="/track/:id" element={<TrackPlayerPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/short/:id" element={<VideoPlayerPage type="short" />} />
          <Route path="/movie/:id" element={<VideoPlayerPage type="movie" />} />
          <Route path="/profile/:username" element={<ProfilePage />} />

          {/* Creator Hub */}
          <Route path="/creator-hub" element={<Protected><CreatorHubDashboard /></Protected>} />
          <Route path="/creator-hub/uploads" element={<Protected><UploadVideo /></Protected>} />
          <Route path="/creator-hub/live/setup" element={<Protected><CreatorLiveSetupPage /></Protected>} />
          <Route path="/creator-hub/monetization" element={<Protected><MonetizationPage /></Protected>} />
          <Route path="/creator-hub/cloud" element={<Protected><CreatorCloudPage /></Protected>} />
          <Route path="/creator-hub/live/:sessionId" element={<AgoraLivePage />} />

          {/* Uploads */}
          <Route path="/upload" element={<Navigate to="/upload/short" replace />} />
          <Route path="/upload/short" element={<Protected><UploadVideo fixedType="short" /></Protected>} />
          <Route path="/upload/music" element={<Protected><UploadVideo fixedType="music" /></Protected>} />
          <Route path="/upload/music-video" element={<Protected><UploadVideo fixedType="music-video" /></Protected>} />
          <Route path="/upload/movie" element={<Protected><UploadVideo fixedType="movie" /></Protected>} />

          {/* Live */}
          <Route path="/live" element={<LivePage />} />
          <Route path="/live/setup" element={<Protected><CreatorLiveSetupPage /></Protected>} />

          {/* User Account */}
          <Route path="/edit-profile" element={<Protected><EditProfilePage /></Protected>} />
          <Route path="/messages/:username?" element={<Protected><MessagesPage /></Protected>} />
          <Route path="/fan-base" element={<Protected><FanbasePage /></Protected>} />
          <Route path="/store" element={<Protected><StorePage /></Protected>} />
          <Route path="/commerce" element={<Protected><CommercePage /></Protected>} />
          <Route path="/movie-permission" element={<Protected><MoviePermissionPage /></Protected>} />

          {/* Admin / Moderation */}
          <Route path="/admin" element={<StaffOnly><AdminDashboardPage /></StaffOnly>} />
          <Route path="/admin/reports" element={<StaffOnly><AdminReportsPage /></StaffOnly>} />
          <Route path="/admin/support" element={<StaffOnly><AdminSupportPage /></StaffOnly>} />
          <Route path="/admin/coin-pack-pricing" element={<StaffOnly><AdminCoinPackPricingPage /></StaffOnly>} />
          <Route path="/admin/cashout-tiers" element={<StaffOnly><AdminCashoutTiersPage /></StaffOnly>} />
          <Route path="/moderation" element={<RequireModerator><ModerationDashboard /></RequireModerator>} />

          {/* Discovery */}
          <Route path="/following" element={<FollowingPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/watch-later" element={<WatchLaterPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/shorts" element={<ShortsPage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/spotlight" element={<SpotlightPage />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route path="/new-drops" element={<NewDropsPage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/track/:id" element={<TrackPlayerPage />} />
          <Route path="/music/:id" element={<TrackPlayerPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/creator-application" element={<CreatorApplicationPage />} />
          <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />

          {/* Wallet */}
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/buy" element={<WalletPage />} />
          <Route path="/rewards" element={<RewardsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <DailyLoginModal />
      </PayPalProvider>
    </Suspense>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthAccountProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthAccountProvider>
    </QueryClientProvider>
  )
}