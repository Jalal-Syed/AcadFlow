/**
 * scraper/portals.ts
 * Portal registry — known college portals with their URLs.
 *
 * No adapter logic. Each entry is just a config that tells the app
 * which URL to open in the WebView. The AI handles all parsing.
 *
 * To add a new portal: append a PortalConfig entry. That's it.
 */

import type { PortalConfig } from './types'

export const PORTAL_CONFIGS: PortalConfig[] = [
  {
    id: 'tkrec',
    name: 'TKREC Student Portal',
    baseUrl: 'https://tkrec.in',
    description: 'TKR Engineering College — Hyderabad',
  },
  {
    id: 'jntuh',
    name: 'JNTUH Results Portal',
    baseUrl: 'https://results.jntuh.ac.in',
    description: 'JNTUH official results',
  },
  {
    id: 'custom',
    name: 'Custom Portal',
    baseUrl: '',
    description: 'Enter your college portal URL manually',
  },
]

export function getPortalConfig(id: string): PortalConfig | null {
  return PORTAL_CONFIGS.find(p => p.id === id) ?? null
}

export function getAllPortals(): PortalConfig[] {
  return PORTAL_CONFIGS
}
