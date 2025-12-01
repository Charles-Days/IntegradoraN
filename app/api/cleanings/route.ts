import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, RoomStatus } from '@/lib/enums';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    const where: any = {
      date: new Date(date),
    };

    if (session.user.role === UserRole.HOUSEKEEPER) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    const cleanings = await prisma.cleaning.findMany({
      where,
      include: {
        room: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { cleanedAt: 'desc' },
    });

    return NextResponse.json(cleanings);
  } catch (error) {
    console.error('Error fetching cleanings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, date } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const cleaningDate = date ? new Date(date) : new Date();

    const cleaning = await prisma.cleaning.create({
      data: {
        roomId,
        userId: session.user.id,
        date: cleaningDate,
        cleanedAt: new Date(),
      },
      include: {
        room: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.CLEAN as string,
      },
    });

    await prisma.assignment.updateMany({
      where: {
        roomId,
        userId: session.user.id,
        date: cleaningDate,
      },
      data: {
        completed: true,
      },
    });

    return NextResponse.json(cleaning, { status: 201 });
  } catch (error) {
    console.error('Error creating cleaning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

