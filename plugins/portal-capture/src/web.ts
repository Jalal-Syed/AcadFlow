import { WebPlugin } from '@capacitor/core'
import type { PortalCaptureOptions, PortalCapturePayload } from './definitions'

export class PortalCaptureWeb extends WebPlugin {
  async open(_options: PortalCaptureOptions): Promise<void> {
    throw this.unimplemented('Portal capture is available in the Android and Electron apps.')
  }

  async close(): Promise<void> {
    this.unimplemented('Portal capture is not available on the web.')
  }

  protected notifyCapture(payload: PortalCapturePayload): void {
    this.notifyListeners('capture', payload)
  }
}
