import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { CheckCircle, Clock, Users, Video, Eye, AlertCircle } from 'lucide-react'

export function CreatorApplicationPage() {
  const { account, user } = useAuthAccount()
  const navigate = useNavigate()
  const [showSuccess, setShowSuccess] = useState(false)

  const applicationQuery = useQuery({
    queryKey: ['creator-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(user?.id),
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('apply_for_creator')
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.auto_approved) {
        setShowSuccess(true)
        setTimeout(() => navigate('/creator-hub'), 3000)
      } else {
        applicationQuery.refetch()
      }
    },
  })

  const checkApprovalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check_creator_approval')
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.approved) {
        setShowSuccess(true)
        setTimeout(() => navigate('/creator-hub'), 3000)
      }
    },
  })

  if (account?.is_creator) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card className="border-yellow-400/20 bg-yellow-500/10 p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
            <h1 className="text-2xl font-black mb-2">You're Already a Creator!</h1>
            <p className="text-zinc-300 mb-6">
              You have creator privileges and can upload content, go live, and earn money.
            </p>
            <Button onClick={() => navigate('/creator-hub')}>
              Go to Creator Hub
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const application = applicationQuery.data

  if (application?.status === 'approved') {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card className="border-green-400/20 bg-green-500/10 p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h1 className="text-2xl font-black mb-2">Application Approved!</h1>
            <p className="text-zinc-300 mb-6">
              Congratulations! Your creator application has been approved.
            </p>
            <Button onClick={() => navigate('/creator-hub')}>
              Go to Creator Hub
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black mb-4">Become a MAI Creator</h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            Join our creator community and start earning money from your content
          </p>
        </div>

        {showSuccess && (
          <Card className="border-green-400/20 bg-green-500/10 p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h3 className="font-bold text-green-400">Application Submitted!</h3>
                <p className="text-sm text-zinc-300">
                  Since you're one of our first 10 creators, you've been auto-approved!
                  Redirecting to creator hub...
                </p>
              </div>
            </div>
          </Card>
        )}

        {!application && (
          <Card className="border-white/10 bg-black/40 p-8 mb-8">
            <h2 className="text-2xl font-black mb-4">Apply to Become a Creator</h2>
            <p className="text-zinc-300 mb-6">
              Start your journey as a MAI creator. Upload content, build your audience, and earn money.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="font-bold text-yellow-400">What You Get:</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• Upload shorts, music, and movies</li>
                  <li>• Go live and interact with fans</li>
                  <li>• Earn money from subscriptions and tips</li>
                  <li>• Access to creator analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-yellow-400">Requirements:</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li>• Valid account with profile</li>
                  <li>• Agreement to community guidelines</li>
                  <li>• For first 10 creators: Auto-approved</li>
                  <li>• After that: Meet activity requirements</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="w-full"
              size="lg"
            >
              {applyMutation.isPending ? 'Applying...' : 'Apply to Become a Creator'}
            </Button>
          </Card>
        )}

        {application?.status === 'pending' && application.application_type === 'standard' && (
          <Card className="border-yellow-400/20 bg-yellow-500/10 p-8">
            <h2 className="text-2xl font-black mb-4">Creator Application Pending</h2>
            <p className="text-zinc-300 mb-6">
              Your application is being reviewed. Complete these requirements to get auto-approved:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <RequirementItem
                icon={Clock}
                label="Account Age"
                current={application.requirement_days_active || 0}
                required={3}
                unit="days"
              />
              <RequirementItem
                icon={Users}
                label="Fan Count"
                current={application.requirement_fans_count || 0}
                required={100}
                unit="fans"
              />
              <RequirementItem
                icon={Video}
                label="Short Videos"
                current={application.requirement_shorts_count || 0}
                required={4}
                unit="shorts"
              />
              <RequirementItem
                icon={Eye}
                label="Total Views"
                current={application.requirement_total_views || 0}
                required={800}
                unit="views"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => checkApprovalMutation.mutate()}
                disabled={checkApprovalMutation.isPending}
                className="flex-1"
              >
                {checkApprovalMutation.isPending ? 'Checking...' : 'Check Approval Status'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/upload')}>
                Upload Content
              </Button>
            </div>

            {checkApprovalMutation.data && !checkApprovalMutation.data.approved && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-400 mb-2">Requirements Not Met</h4>
                    <div className="space-y-1 text-sm text-zinc-300">
                      <p>Days Active: {checkApprovalMutation.data.requirements.days_active.current}/{checkApprovalMutation.data.requirements.days_active.required}</p>
                      <p>Fans: {checkApprovalMutation.data.requirements.fans_count.current}/{checkApprovalMutation.data.requirements.fans_count.required}</p>
                      <p>Shorts: {checkApprovalMutation.data.requirements.shorts_count.current}/{checkApprovalMutation.data.requirements.shorts_count.required}</p>
                      <p>Views: {checkApprovalMutation.data.requirements.total_views.current}/{checkApprovalMutation.data.requirements.total_views.required}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {application?.status === 'pending' && application.application_type === 'auto_approved' && (
          <Card className="border-blue-400/20 bg-blue-500/10 p-8 text-center">
            <Clock className="mx-auto h-16 w-16 text-blue-400 mb-4" />
            <h2 className="text-2xl font-black mb-2">Application Under Review</h2>
            <p className="text-zinc-300">
              Your application is being processed. You'll be notified once approved.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function RequirementItem({
  icon: Icon,
  label,
  current,
  required,
  unit
}: {
  icon: any
  label: string
  current: number
  required: number
  unit: string
}) {
  const progress = Math.min((current / required) * 100, 100)
  const isComplete = current >= required

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${isComplete ? 'text-green-400' : 'text-zinc-400'}`} />
        <span className="text-sm font-medium">{label}</span>
        {isComplete && <CheckCircle className="h-4 w-4 text-green-400" />}
      </div>
      <div className="text-xs text-zinc-400">
        {current}/{required} {unit}
      </div>
      <div className="w-full bg-zinc-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-400' : 'bg-yellow-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}