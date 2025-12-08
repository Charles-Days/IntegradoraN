import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPushNotification } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send test notification to current user
    const result = await sendPushNotification(session.user.id, {
      title: 'Notificación de prueba',
      body: 'Si ves este mensaje, las notificaciones push funcionan correctamente.',
      tag: 'test',
      data: {
        type: 'test',
        url: '/housekeeper',
      },
    });

    console.log('Test notification result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
