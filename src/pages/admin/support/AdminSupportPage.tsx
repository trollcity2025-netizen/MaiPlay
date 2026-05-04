import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { AppHeader } from '../../../components/layout/AppHeader'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'

type Filter = 'all' | 'open' | 'reviewing' | 'resolved' | 'closed'

export function AdminSupportPage() {
  const [filter, setFilter] = useState<Filter>('all')

  const tickets = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data ?? []
    },
  })

  const allTickets = tickets.data ?? []
  const filteredTickets =
    filter === 'all' ? allTickets : allTickets.filter((ticket: any) => ticket.status === filter)

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            MaiCorp Support
          </p>
          <h1 className="mt-3 text-4xl font-black">Support Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Review creator, buyer, commerce, payment, live, and account support issues from one admin queue.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Tickets" value={allTickets.length} />
          <Stat label="Open" value={countByStatus(allTickets, 'open')} />
          <Stat label="Reviewing" value={countByStatus(allTickets, 'reviewing')} />
          <Stat label="Resolved" value={countByStatus(allTickets, 'resolved')} />
        </section>

        <section className="flex flex-wrap gap-2">
          {(['all', 'open', 'reviewing', 'resolved', 'closed'] as Filter[]).map((item) => (
            <Button
              key={item}
              onClick={() => setFilter(item)}
              className={
                filter === item
                  ? 'bg-yellow-400 font-black text-black hover:bg-yellow-300'
                  : 'border border-white/10 bg-black/40 text-zinc-300 hover:bg-yellow-400/10 hover:text-yellow-300'
              }
            >
              {item}
            </Button>
          ))}
        </section>

        <section className="space-y-4">
          {tickets.isLoading ? (
            <EmptyCard text="Loading support tickets..." />
          ) : filteredTickets.length === 0 ? (
            <EmptyCard text="No support tickets found." />
          ) : (
            filteredTickets.map((ticket: any) => (
              <Card key={ticket.id} className="border-white/10 bg-black/50 p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status ?? 'open'} />
                      <PriorityBadge priority={ticket.priority ?? 'normal'} />
                      <span className="text-xs text-zinc-500">
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'Unknown time'}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-yellow-300">
                      {ticket.subject ?? ticket.title ?? 'Support Ticket'}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {ticket.description ?? ticket.message ?? 'No message provided.'}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="Ticket ID" value={ticket.id} />
                      <Info label="User" value={ticket.user_id ?? ticket.creator_id ?? 'Unknown'} />
                      <Info label="Type" value={ticket.ticket_type ?? ticket.category ?? 'General'} />
                      <Info label="Updated" value={formatDate(ticket.updated_at)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
                    <Button variant="outline" className="border-yellow-400/20 text-yellow-300 hover:bg-yellow-400/10">
                      Mark Reviewing
                    </Button>
                    <Button variant="outline" className="border-green-400/20 text-green-300 hover:bg-green-400/10">
                      Resolve
                    </Button>
                    <Button variant="outline" className="border-red-400/20 text-red-300 hover:bg-red-400/10">
                      Close
                    </Button>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-white/10 bg-black/50 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-yellow-400/30 bg-yellow-950/30 px-3 py-1 text-xs font-bold text-yellow-300">
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className="rounded-full border border-red-400/30 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-200">
      {priority}
    </span>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 truncate text-zinc-300">{String(value ?? 'N/A')}</p>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 p-10 text-center text-zinc-400">
      {text}
    </div>
  )
}

function countByStatus(tickets: any[], status: string) {
  return tickets.filter((ticket) => ticket.status === status).length
}

function formatDate(value?: string) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}