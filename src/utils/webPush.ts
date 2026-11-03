import { PushDeviceSubscription } from '../types';

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function detectDeviceName(): { name: string; platform: string } {
  if (typeof navigator === 'undefined') {
    return { name: 'Dispositivo Desconhecido', platform: 'Web' };
  }

  const ua = navigator.userAgent;
  let platform = 'Android';
  let name = 'Celular Android';

  const isAndroid = /Android/i.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  if (isAndroid) {
    platform = isPWA ? 'Android PWA (Instalado)' : 'Android Chrome';
    // Try to extract Android model
    const match = ua.match(/Android\s+[\d.]+;\s*([^;]+)\s*Build/i) || ua.match(/Android\s+[\d.]+;\s*([^;)]+)/i);
    if (match && match[1]) {
      const model = match[1].trim();
      name = isPWA ? `${model} (App Instalado)` : `${model} (Navegador)`;
    } else {
      name = isPWA ? 'Android (App Instalado)' : 'Celular Android (Navegador)';
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = isPWA ? 'iOS PWA' : 'iOS Safari';
    name = isPWA ? 'iPhone / iPad (App Instalado)' : 'iPhone / iPad (Safari)';
  } else if (/Windows/i.test(ua)) {
    platform = 'Windows PC';
    name = 'Computador Windows';
  } else if (/Macintosh/i.test(ua)) {
    platform = 'Mac';
    name = 'Mac OS';
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux';
    name = 'Dispositivo Linux';
  }

  return { name, platform };
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch (err) {
    console.error('Falha ao obter VAPID public key', err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isPermissionDenied(): boolean {
  return getNotificationPermission() === 'denied';
}

export function isPermissionGranted(): boolean {
  return getNotificationPermission() === 'granted';
}

export function isPermissionDefault(): boolean {
  return getNotificationPermission() === 'default';
}

export function listenToPermissionChanges(onChange: (status: NotificationPermission) => void): () => void {
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
    return () => {};
  }
  let isCleanedUp = false;
  let statusObj: PermissionStatus | null = null;

  try {
    (navigator.permissions as any).query({ name: 'notifications' }).then((status: PermissionStatus) => {
      if (isCleanedUp) return;
      statusObj = status;
      const handler = () => {
        onChange(Notification.permission);
      };
      status.addEventListener('change', handler);
    }).catch(() => {
      // ignore unsupported query
    });
  } catch {
    // ignore
  }

  return () => {
    isCleanedUp = true;
    if (statusObj) {
      statusObj.onchange = null;
    }
  };
}

export async function registerDeviceForPush(): Promise<{ success: boolean; message: string; isDenied?: boolean; subscription?: PushDeviceSubscription }> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      message: 'Seu navegador ou dispositivo não possui suporte nativo à API Web Push / PushManager.'
    };
  }

  // Pre-check if Android has blocked notifications
  if (Notification.permission === 'denied') {
    return {
      success: false,
      isDenied: true,
      message: 'As notificações estão bloqueadas no seu navegador/Android. Você precisa alterar a permissão para "Permitir" nas configurações do site.'
    };
  }

  try {
    // 1. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        isDenied: permission === 'denied',
        message: permission === 'denied'
          ? 'A permissão foi negada no Android. Toque no ícone do cadeado ou configurações do site no Chrome para desbloquear.'
          : 'A permissão de notificações não foi concedida.'
      };
    }

    // 2. Fetch VAPID key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return {
        success: false,
        message: 'Não foi possível obter a chave do servidor Push. Verifique a conexão com o servidor.'
      };
    }

    // 3. Ensure Service Worker is registered and ready
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    } catch (swErr: any) {
      return {
        success: false,
        message: `Falha ao registrar Service Worker: ${swErr.message || swErr}`
      };
    }

    // 4. Subscribe with PushManager
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let sub = await registration.pushManager.getSubscription();

    if (sub) {
      // Check if existing subscription is valid or key changed
      try {
        await sub.unsubscribe();
      } catch (unsubErr) {
        console.warn('Could not cleanly unsubscribe old sub', unsubErr);
      }
      sub = null;
    }

    try {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource
      });
    } catch (subErr: any) {
      return {
        success: false,
        message: `Erro ao ativar canal push: ${subErr.message || subErr}`
      };
    }

    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      return {
        success: false,
        message: 'Falha ao gerar credenciais seguras de criptografia do dispositivo.'
      };
    }

    // 5. Send to backend
    const deviceInfo = detectDeviceName();
    const payload = {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      deviceName: deviceInfo.name,
      platform: deviceInfo.platform,
      userAgent: navigator.userAgent
    };

    const res = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error || 'Erro ao registrar dispositivo no servidor.'
      };
    }

    const result = await res.json();
    return {
      success: true,
      message: 'Dispositivo Android registrado com sucesso no Gerenciapró!',
      subscription: result.device
    };
  } catch (err: any) {
    console.error('Erro ao registrar Push:', err);
    return {
      success: false,
      message: err.message || 'Erro inesperado ao registrar notificações Push.'
    };
  }
}

export async function unregisterDeviceFromPush(): Promise<{ success: boolean; message: string }> {
  try {
    const sub = await getCurrentPushSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch('/api/push/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
    }
    return { success: true, message: 'Dispositivo desconectado do serviço de notificações.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao desconectar.' };
  }
}

export async function fetchConnectedDevices(): Promise<PushDeviceSubscription[]> {
  try {
    const res = await fetch('/api/push/devices');
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  } catch {
    return [];
  }
}

export async function removeDeviceById(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/push/devices/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTestPushToAll(): Promise<{ success: boolean; sentCount: number; message: string }> {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return {
      success: res.ok,
      sentCount: data.sentCount || 0,
      message: data.message || (res.ok ? 'Notificação enviada com sucesso!' : 'Falha ao enviar.')
    };
  } catch (err: any) {
    return {
      success: false,
      sentCount: 0,
      message: err.message || 'Erro ao disparar teste.'
    };
  }
}

export async function triggerManualAlertsDispatch(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const res = await fetch('/api/push/dispatch-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return {
      success: res.ok,
      count: data.dispatchedCount || 0,
      message: data.message || 'Varredura de alertas concluída.'
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err.message || 'Erro ao disparar verificação de alertas.'
    };
  }
}
