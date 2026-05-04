import { createContext, useContext, ReactNode } from 'react'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

interface PayPalContextType {
  loadPayPalScript: () => Promise<boolean>
  isPayPalLoaded: boolean
}

const PayPalContext = createContext<PayPalContextType>({
  loadPayPalScript: async () => false,
  isPayPalLoaded: false
})

export const usePayPal = () => useContext(PayPalContext)

interface PayPalProviderProps {
  children: ReactNode
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID ?? 'sb'

  const loadPayPalScript = async (): Promise<boolean> => {
    if (window.paypal) return true

    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  return (
    <PayPalContext.Provider value={{ loadPayPalScript, isPayPalLoaded: !!window.paypal }}>
      <PayPalScriptProvider options={{ 'client-id': clientId, currency: 'USD', components: 'buttons' }}>
        {children}
      </PayPalScriptProvider>
    </PayPalContext.Provider>
  )
}
