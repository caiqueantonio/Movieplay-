import { detectDeviceName } from './webPush';

export interface SyncEventPayload {
  type: 'SYNC_UPDATE' | 'DEVICE_CONNECTED' | 'DEVICE_DISCONNECTED' | 'HEARTBEAT';
  originDeviceId: string;
  originDeviceName: string;
  action: string;
  actionText: string;
  entity: 'client' | 'payment' | 'payment_method' | 'setting' | 'server' | 'plan' | 'template' | 'user' | 'all';
  timestamp: string;
  data?: any;
}

export interface ActiveConnectedDevice {
  deviceId: string;
  deviceName: string;
  platform: string;
  connectedAt: string;
  isCurrentDevice?: boolean;
}

const STORAGE_DEVICE_ID_KEY = 'gerenciapro_device_id';
const STORAGE_DEVICE_NAME_KEY = 'gerenciapro_device_custom_name';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(STORAGE_DEVICE_ID_KEY);
  if (!id) {
    id = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem(STORAGE_DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceDisplayName(): string {
  if (typeof window === 'undefined') return 'Dispositivo';
  const custom = localStorage.getItem(STORAGE_DEVICE_NAME_KEY);
  if (custom && custom.trim()) {
    return custom.trim();
  }
  const detected = detectDeviceName();
  return detected.name || 'Dispositivo Desconhecido';
}

export function setCustomDeviceDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  if (name.trim()) {
    localStorage.setItem(STORAGE_DEVICE_NAME_KEY, name.trim());
  } else {
    localStorage.removeItem(STORAGE_DEVICE_NAME_KEY);
  }
}

export function getSyncHeaders(): Record<string, string> {
  const deviceId = getOrCreateDeviceId();
  const deviceName = getDeviceDisplayName();
  return {
    'x-device-id': deviceId,
    'x-device-name': encodeURIComponent(deviceName)
  };
}
