import type { PluginListenerHandle } from '@capacitor/core'

export interface PortalCaptureOptions {
  url: string
}

export interface PortalCapturePayload {
  url: string
  title: string
  tables: string
}

export interface PortalCapturePlugin {
  open(options: PortalCaptureOptions): Promise<void>
  close(): Promise<void>
  addListener(
    eventName: 'capture',
    listenerFunc: (payload: PortalCapturePayload) => void
  ): Promise<PluginListenerHandle>
  addListener(eventName: 'closed', listenerFunc: () => void): Promise<PluginListenerHandle>
  addListener(
    eventName: 'error',
    listenerFunc: (payload: { message: string }) => void
  ): Promise<PluginListenerHandle>
}
