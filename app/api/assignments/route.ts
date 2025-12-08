import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, RoomStatus } from '@/lib/enums';
import { sendAssignmentNotification } from '@/lib/push-notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const userId = searchParams.get('userId');

    if (session.user.role === UserRole.RECEPTION || session.user.role === UserRole.ADMIN) {
      const assignments = await prisma.assignment.findMany({
        where: {
          date: new Date(date),
          ...(userId && { userId }),
        },
        include: {
          room: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      return NextResponse.json(assignments);
    }

    if (session.user.role === UserRole.HOUSEKEEPER) {
      const assignments = await prisma.assignment.findMany({
        where: {
          userId: session.user.id,
          date: new Date(date),
        },
        include: {
          room: {
            include: {
              cleanings: {
                where: {
                  date: new Date(date),
                  userId: session.user.id,
                },
                take: 1,
              },
              incidents: {
                where: { status: 'OPEN' },
                take: 1,
              },
            },
          },
        },
        orderBy: { room: { number: 'asc' } },
      });

      return NextResponse.json(assignments);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== UserRole.RECEPTION && session.user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomIds, userId, date } = body;

    if (!roomIds || !Array.isArray(roomIds) || !userId || !date) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const assignments = await prisma.$transaction(
      roomIds.map((roomId: string) =>
        prisma.assignment.upsert({
          where: {
            roomId_userId_date: {
              roomId,
              userId,
              date: new Date(date),
            },
          },
          update: {
            assignedAt: new Date(),
          },
          create: {
            roomId,
            userId,
            date: new Date(date),
          },
        })
      )
    );

    // Update room status to CLEANING_PENDING when assigned
    await prisma.room.updateMany({
      where: {
        id: { in: roomIds },
      },
      data: {
        status: RoomStatus.CLEANING_PENDING as string,
      },
    });

    // Get room numbers for notification
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { number: true },
    });
    const roomNumbers = rooms.map((r) => r.number);

    // Send push notification to the assigned housekeeper
    try {
      await sendAssignmentNotification(
        userId,
        roomNumbers,
        session.user.name || session.user.email || 'Recepción'
      );
    } catch (notifError) {
      console.error('Error sending push notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(assignments, { status: 201 });
  } catch (error) {
    console.error('Error creating assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== UserRole.RECEPTION && session.user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await prisma.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

