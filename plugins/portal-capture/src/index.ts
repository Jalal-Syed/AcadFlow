import { registerPlugin } from '@capacitor/core'
import type { PortalCapturePlugin } from './definitions'

export * from './definitions'

export const PortalCapture = registerPlugin<PortalCapturePlugin>('PortalCapture', {
  web: () => import('./web').then(module => new module.PortalCaptureWeb()),
})
