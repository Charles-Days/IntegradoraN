'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribe = async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // Get VAPID public key
      const vapidRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await vapidRes.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey),
          },
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log('Push notification subscription successful');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setIsSubscribed(false);
        console.log('Push notification unsubscription successful');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const result = await res.json();
      console.log('Test notification result:', result);
      if (result.success) {
        alert('Notificación enviada. Revisa si la recibes.');
      } else {
        alert('Error: ' + (result.reason || result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      alert('Error al enviar notificación de prueba');
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
        <p className="text-sm text-warning-700">
          Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-primary-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium text-primary-900">Notificaciones Push</h4>
          <p className="text-xs text-primary-500 mt-1">
            {isSubscribed
              ? 'Recibirás notificaciones de nuevas asignaciones'
              : 'Activa las notificaciones para recibir alertas'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSubscribed && (
            <Button
              onClick={testNotification}
              variant="ghost"
              size="sm"
            >
              Probar
            </Button>
          )}
          <Button
            onClick={isSubscribed ? unsubscribe : subscribe}
            variant={isSubscribed ? 'outline' : 'primary'}
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? 'Cargando...' : isSubscribed ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
