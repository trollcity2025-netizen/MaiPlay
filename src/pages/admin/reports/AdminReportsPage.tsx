import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { AppHeader } from '../../../components/layout/AppHeader'
import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'

export function AdminReportsPage() {
  const [filter, setFilter] = useState<'all' | 'user' | 'broadcast'>('all')

  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const [userReports, broadcastReports] = await Promise.all([
        supabase
          .from('admin_user_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('admin_broadcast_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (userReports.error) throw userReports.error
      if (broadcastReports.error) throw broadcastReports.error

      return {
        userReports: userReports.data ?? [],
        broadcastReports: broadcastReports.data ?? [],
      }
    },
  })

  const userReports = reports.data?.userReports ?? []
  const broadcastReports = reports.data?.broadcastReports ?? []

  const combined =
    filter === 'user'
      ? userReports
      : filter === 'broadcast'
      ? broadcastReports
      : [...userReports, ...broadcastReports]

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            MaiCorp Moderation
          </p>
          <h1 className="mt-3 text-4xl font-black">Reports Command Center</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Manage all reports across users, broadcasts, and content. Workflow: open → reviewing → resolved → dismissed.
          </p>
        </section>

        <section className="flex gap-2">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          <FilterBtn active={filter === 'user'} onClick={() => setFilter('user')} label="User Reports" />
          <FilterBtn active={filter === 'broadcast'} onClick={() => setFilter('broadcast')} label="Broadcast Reports" />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Reports" value={(userReports.length + broadcastReports.length).toString()} />
          <Stat label="User Reports" value={userReports.length.toString()} />
          <Stat label="Broadcast Reports" value={broadcastReports.length.toString()} />
          <Stat label="Open Queue" value={combined.length.toString()} />
        </section>

        <section className="space-y-4">
          {reports.isLoading ? (
            <Empty text="Loading reports..." />
          ) : combined.length === 0 ? (
            <Empty text="No reports found." />
          ) : (
            combined.map((report: any) => (
              <Card key={report.id} className="border-white/10 bg-black/50 p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <p className="text-xs text-zinc-500">
                      {report.created_at ? new Date(report.created_at).toLocaleString() : 'Unknown time'}
                    </p>

                    <h2 className="mt-1 font-black text-yellow-300">
                      {report.report_type || 'Report'}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-300">
                      {report.description || report.reason || 'No description provided.'}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      Reporter: {report.reporter_id || 'Unknown'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBtn label="Open" />
                    <StatusBtn label="Reviewing" />
                    <StatusBtn label="Resolved" />
                    <StatusBtn label="Dismiss" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </section>
      </main>
    </div>
  )
}

/* ---------- COMPONENTS ---------- */

function FilterBtn({ active, label, onClick }: any) {
  return (
    <Button
      onClick={onClick}
      className={
        active
          ? 'bg-yellow-400 text-black font-black'
          : 'bg-black/40 border border-white/10 text-zinc-300'
      }
    >
      {label}
    </Button>
  )
}

function StatusBtn({ label }: { label: string }) {
  return (
    <Button variant="outline" className="border-yellow-400/20 text-yellow-300 hover:bg-yellow-400/10">
      {label}
    </Button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-black/50 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 p-10 text-center text-zinc-400">
      {text}
    </div>
  )
}