import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { Film, CheckCircle, CreditCard, AlertCircle } from 'lucide-react'

export function MoviePermissionPage() {
  const { account, user } = useAuthAccount()
  const navigate = useNavigate()
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  const permissionQuery = useQuery({
    queryKey: ['movie-permission', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('movie_upload_permissions')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(user?.id),
  })

  const purchaseMutation = useMutation({
    mutationFn: async (paypalOrderId: string) => {
      const { data, error } = await supabase.functions.invoke('purchase_movie_permission', {
        body: { paypal_order_id: paypalOrderId }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      permissionQuery.refetch()
    },
  })

  const hasPermission = permissionQuery.data && !permissionQuery.data.used

  if (hasPermission) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card className="border-green-400/20 bg-green-500/10 p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h1 className="text-2xl font-black mb-2">Movie Upload Permission Active</h1>
            <p className="text-zinc-300 mb-6">
              You can upload movies to MAI Play. Your permission is valid for one movie upload.
            </p>
            <Button onClick={() => navigate('/upload')}>
              Upload a Movie
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center mb-8">
          <Film className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
          <h1 className="text-4xl font-black mb-4">Upload Movies on MAI Play</h1>
          <p className="text-xl text-zinc-300">
            Get permission to upload full-length movies and reach a wider audience
          </p>
        </div>

        <Card className="border-white/10 bg-black/40 p-8">
          <div className="text-center mb-8">
            <div className="text-5xl font-black text-yellow-400 mb-2">$5.00</div>
            <div className="text-zinc-300">One-time payment for movie upload permission</div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Upload one full-length movie</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Reach millions of viewers</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Earn money from views and subscriptions</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Professional creator tools</span>
            </div>
          </div>

          {!account?.is_creator && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-400 mb-1">Creator Status Required</h4>
                  <p className="text-sm text-zinc-300 mb-3">
                    You need to be a creator to upload movies. Apply now to get started.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/creator-application')}
                  >
                    Apply to Become a Creator
                  </Button>
                </div>
              </div>
            </div>
          )}

          {account?.is_creator && (
            <div id="paypal-button-container" className="flex justify-center">
              {!paypalLoaded && (
                <Button disabled className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Loading PayPal...
                </Button>
              )}
            </div>
          )}
        </Card>

        <div className="mt-8 text-center text-sm text-zinc-400">
          <p>Payment processed securely by PayPal</p>
          <p>Permission is valid for one movie upload</p>
        </div>
      </div>

      {account?.is_creator && (
        <script
          src="https://www.paypal.com/sdk/js?client-id=AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R&currency=USD"
          onLoad={() => {
            setPaypalLoaded(true)
            // @ts-ignore
            window.paypal.Buttons({
              createOrder: function(data: any, actions: any) {
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: '5.00'
                    },
                    description: 'MAI Play Movie Upload Permission'
                  }]
                })
              },
              onApprove: function(data: any, actions: any) {
                return actions.order.capture().then(function(details: any) {
                  purchaseMutation.mutate(data.orderID)
                })
              }
            }).render('#paypal-button-container')
          }}
        />
      )}
    </div>
  )
}