import webpush from 'web-push';
import { prisma } from './prisma';

// VAPID keys - En producción, usa variables de entorno
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BAzZx4mV583ned78UFdL-GNOQ7zU27RhcAcZC8JVvGljZP1yJ8o7cOxTPQTfyhaNh2DsObWWnqHONXIyhz_E4mo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'u0N_2eOJM5PXc3AhPFphBKEH6Z2zFl33YipLxPKvcfk';

webpush.setVapidDetails(
  'mailto:admin@hotel-housekeeping.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

export async function sendPushNotification(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: false, reason: 'no_subscriptions' };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              ...payload,
              icon: payload.icon || '/icons/icon-192x192.png',
              badge: payload.badge || '/icons/icon-72x72.png',
            })
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          // Si la suscripción expiró o es inválida, eliminarla
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            console.log(`Removed expired subscription ${sub.endpoint}`);
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

    return { success: successful > 0, successful, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

export async function sendAssignmentNotification(
  userId: string,
  roomNumbers: string[],
  assignedBy: string
) {
  const roomList = roomNumbers.join(', ');
  const title = roomNumbers.length === 1
    ? `Nueva asignación: Habitación ${roomList}`
    : `Nuevas asignaciones: ${roomNumbers.length} habitaciones`;

  const body = roomNumbers.length === 1
    ? `Se te ha asignado la habitación ${roomList} para limpiar.`
    : `Se te han asignado las habitaciones ${roomList} para limpiar.`;

  return sendPushNotification(userId, {
    title,
    body,
    tag: 'assignment',
    data: {
      type: 'assignment',
      rooms: roomNumbers,
      assignedBy,
      url: '/housekeeper',
    },
  });
}

export { VAPID_PUBLIC_KEY };
