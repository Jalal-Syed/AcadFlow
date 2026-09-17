import { WebPlugin } from '@capacitor/core';
import type { PortalCaptureOptions, PortalCapturePayload } from './definitions';
export declare class PortalCaptureWeb extends WebPlugin {
    open(_options: PortalCaptureOptions): Promise<void>;
    close(): Promise<void>;
    protected notifyCapture(payload: PortalCapturePayload): void;
}
