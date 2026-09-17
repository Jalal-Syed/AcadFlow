import { WebPlugin } from '@capacitor/core';
export class PortalCaptureWeb extends WebPlugin {
    async open(_options) {
        throw this.unimplemented('Portal capture is available in the Android and Electron apps.');
    }
    async close() {
        this.unimplemented('Portal capture is not available on the web.');
    }
    notifyCapture(payload) {
        this.notifyListeners('capture', payload);
    }
}
