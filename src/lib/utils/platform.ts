/**
 * Platform detection utilities
 */

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && (!!(window as any).scraperBridge || !!(window as any).webviewBridge)
}

export const isCapacitorNative = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform()
}

export const isAndroid = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.getPlatform() === 'android'
}
