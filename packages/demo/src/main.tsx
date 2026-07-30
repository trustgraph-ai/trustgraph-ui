import { StrictMode } from 'react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as ReactJSX from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationProvider, NotificationHandler } from '@trustgraph/react-state'
import * as ReactProvider from '@trustgraph/react-provider'
import * as ReactState from '@trustgraph/react-state'
import * as TrustKit from '@trustgraph/trustkit'
import { toast } from '@trustgraph/trustkit'
import './index.css'
import { AuthGate } from './AuthGate'

declare global {
  interface Window { TrustKitShared: Record<string, unknown>; }
}

window.TrustKitShared = {
  React,
  ReactDOM,
  ReactJSX,
  TrustKit,
  ReactProvider,
  ReactState,
};

const queryClient = new QueryClient()

const notificationHandler: NotificationHandler = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider handler={notificationHandler}>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </NotificationProvider>
    </QueryClientProvider>
  </StrictMode>,
)
