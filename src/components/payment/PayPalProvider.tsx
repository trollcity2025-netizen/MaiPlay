import { createContext, useContext, ReactNode } from 'react'
import {
  PayPalScriptProvider,
  usePayPalScriptReducer
} from '@paypal/react-paypal-js'

interface PayPalContextType {
  isPayPalLoaded: boolean
}

const PayPalContext = createContext<PayPalContextType>({
  isPayPalLoaded: false
})

export const usePayPal = () => useContext(PayPalContext)

interface PayPalProviderProps {
  children: ReactNode
}

function PayPalStatusProvider({ children }: PayPalProviderProps) {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer()

  return (
    <PayPalContext.Provider
      value={{
        isPayPalLoaded: !isPending && isResolved && !isRejected
      }}
    >
      {children}
    </PayPalContext.Provider>
  )
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const clientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim()

  if (!clientId || clientId === 'your_paypal_client_id') {
    throw new Error(
      'Missing VITE_PAYPAL_CLIENT_ID. Add your real PayPal client ID to Vercel/local env.'
    )
  }

  return (
    <PayPalScriptProvider
      key={clientId}
      options={{
        'client-id': clientId,
        currency: 'USD',
        components: 'buttons',
        intent: 'capture'
      }}
    >
      <PayPalStatusProvider>{children}</PayPalStatusProvider>
    </PayPalScriptProvider>
  )
}