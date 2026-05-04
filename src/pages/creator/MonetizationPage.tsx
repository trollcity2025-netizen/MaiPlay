import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { AppHeader } from '../../components/layout/AppHeader'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { Plus, Edit, Trash2, Users, DollarSign, Crown } from 'lucide-react'

interface MaiCirclePlan {
  id: string
  name: string
  description: string
  price_coins: number
  features: string[]
  is_active: boolean
  subscriber_count?: number
  created_at?: string
  updated_at?: string
}

export function MonetizationPage() {
  const { account } = useAuthAccount()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MaiCirclePlan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    features: ['']
  })

  const plansQuery = useQuery({
    queryKey: ['mai-circle-plans', account?.id],
    queryFn: async () => {
      if (!account?.id) return []
      const { data, error } = await supabase
        .from('mai_circle_plans')
        .select('id, creator_id, name, description, price_coins, features, is_active, subscriber_count, created_at, updated_at')
        .eq('creator_id', account.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: Boolean(account?.id),
  })

  const revenueQuery = useQuery({
    queryKey: ['creator-revenue', account?.id],
    queryFn: async () => {
      if (!account?.id) return null
      const { data, error } = await supabase
        .from('creator_revenue')
        .select('*')
        .eq('creator_id', account.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(account?.id),
  })

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const { data, error } = await supabase
        .from('mai_circle_plans')
        .insert({
          creator_id: account?.id,
          name: planData.name,
          description: planData.description,
          price_coins: parseInt(planData.price),
          features: planData.benefits.filter((b: string) => b.trim()),
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      plansQuery.refetch()
      setShowCreateForm(false)
      resetForm()
    },
  })

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { data, error } = await supabase
        .from('mai_circle_plans')
        .update({
          name: updates.name,
          description: updates.description,
          price_coins: parseInt(updates.price),
          features: updates.features.filter((f: string) => f.trim()),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      plansQuery.refetch()
      setEditingPlan(null)
      resetForm()
    },
  })

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mai_circle_plans')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      plansQuery.refetch()
    },
  })

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { data, error } = await supabase
        .from('mai_circle_plans')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      plansQuery.refetch()
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      features: ['']
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingPlan) {
      updatePlanMutation.mutate({
        id: editingPlan.id,
        updates: formData
      })
    } else {
      createPlanMutation.mutate(formData)
    }
  }

  const startEdit = (plan: MaiCirclePlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price_coins.toString(),
      features: plan.features.length > 0 ? plan.features : ['']
    })
    setShowCreateForm(true)
  }

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }))
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const revenue = revenueQuery.data

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-4">Monetization</h1>
          <p className="text-xl text-zinc-300">
            Manage your MAI Circle subscriptions and track your earnings
          </p>
        </div>

        {/* Revenue Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-white/10 bg-black/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-6 w-6 text-green-400" />
              <h3 className="font-bold">Total Earnings</h3>
            </div>
            <div className="text-3xl font-black text-green-400">
              ${revenue?.total_earnings?.toFixed(2) || '0.00'}
            </div>
          </Card>

          <Card className="border-white/10 bg-black/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-blue-400" />
              <h3 className="font-bold">MAI Circle Members</h3>
            </div>
            <div className="text-3xl font-black text-blue-400">
              {revenue?.mai_circle_members || 0}
            </div>
          </Card>

          <Card className="border-white/10 bg-black/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-6 w-6 text-yellow-400" />
              <h3 className="font-bold">Monthly Revenue</h3>
            </div>
            <div className="text-3xl font-black text-yellow-400">
              ${revenue?.monthly_revenue?.toFixed(2) || '0.00'}
            </div>
          </Card>
        </div>

        {/* MAI Circle Plans */}
        <Card className="border-white/10 bg-black/40 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black mb-2">MAI Circle Plans</h2>
              <p className="text-zinc-300">
                Create subscription tiers for your most dedicated fans
              </p>
            </div>
            <Button
              onClick={() => {
                setShowCreateForm(true)
                setEditingPlan(null)
                resetForm()
              }}
              disabled={showCreateForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>

          {showCreateForm && (
            <Card className="border-yellow-400/20 bg-yellow-500/10 p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Plan Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., VIP Fan, Super Supporter"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Monthly Price (MAI Coins)</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what fans get with this plan..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Features</label>
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          placeholder="e.g., Early access to new videos"
                        />
                        {formData.features.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFeature}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Feature
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  >
                    {createPlanMutation.isPending || updatePlanMutation.isPending
                      ? 'Saving...'
                      : editingPlan ? 'Update Plan' : 'Create Plan'
                    }
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingPlan(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plansQuery.data?.map((plan) => (
              <Card key={plan.id} className="border-white/10 bg-black/60 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="text-2xl font-black text-yellow-400">
                      {plan.price_coins} MAI coins/month
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlanMutation.mutate(plan.id)}
                      disabled={deletePlanMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-zinc-300 text-sm mb-4">{plan.description}</p>
                )}

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm text-zinc-400 flex items-center gap-2">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  variant={plan.is_active ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlanMutation.mutate({
                    id: plan.id,
                    is_active: !plan.is_active
                  })}
                  disabled={togglePlanMutation.isPending}
                  className="w-full"
                >
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Button>
              </Card>
            ))}

            {plansQuery.data?.length === 0 && !showCreateForm && (
              <div className="col-span-full text-center py-12">
                <Crown className="mx-auto h-16 w-16 text-zinc-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">No MAI Circle Plans Yet</h3>
                <p className="text-zinc-400 mb-6">
                  Create your first subscription plan to start earning from your fans
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}