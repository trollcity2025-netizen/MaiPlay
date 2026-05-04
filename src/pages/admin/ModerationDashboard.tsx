import { useState } from 'react'
import { AppHeader } from '../../components/layout/AppHeader'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function ModerationDashboard() {
  const [selectedReport, setSelectedReport] = useState<any>(null)

  const { data: reports } = useQuery({
    queryKey: ['moderation-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mai_reports')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: actions } = useQuery({
    queryKey: ['moderation-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mai_moderation_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    }
  })

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            MaiPlay Moderation
          </p>
          <h1 className="mt-3 text-4xl font-black">Moderation Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300">
            Review reports, take actions, and maintain platform safety.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Reports Queue</h2>
            <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
              {(reports || []).map((report: any) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10"
                  onClick={() => setSelectedReport(report)}
                >
                  <p className="font-bold">{report.content_type} Report</p>
                  <p className="text-sm text-zinc-400">{report.reason}</p>
                  <p className="text-xs text-zinc-500">{new Date(report.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Actions Panel</h2>
            {selectedReport ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-bold">Report Details</p>
                  <p>Type: {selectedReport.content_type}</p>
                  <p>Reason: {selectedReport.reason}</p>
                  <p>Details: {selectedReport.details}</p>
                </div>
                <div className="space-y-2">
                  <Button className="w-full bg-red-600 hover:bg-red-700">Hide Content</Button>
                  <Button className="w-full bg-red-600 hover:bg-red-700">Delete Content</Button>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">Timeout User</Button>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">Ban User</Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">End Live</Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Disable Chat</Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-zinc-400">Select a report to take action</p>
            )}
          </Card>
        </div>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Recent Actions</h2>
          <div className="mt-4 max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="pb-2 text-left">Action</th>
                  <th className="pb-2 text-left">Target</th>
                  <th className="pb-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {(actions || []).map((action: any) => (
                  <tr key={action.id} className="border-b border-white/5">
                    <td className="py-2">{action.action_type}</td>
                    <td className="py-2">{action.target_user_id}</td>
                    <td className="py-2">{new Date(action.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}