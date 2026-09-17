import { registerPlugin } from '@capacitor/core';
export * from './definitions';
export const PortalCapture = registerPlugin('PortalCapture', {
    web: () => import('./web').then(module => new module.PortalCaptureWeb()),
});
