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
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (session.user.role === UserRole.HOUSEKEEPER && userId) {
      const assignments = await prisma.assignment.findMany({
        where: {
          userId: session.user.id,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          room: {
            include: {
              cleanings: {
                where: {
                  date: date ? new Date(date) : new Date(),
                  userId: session.user.id,
                },
                take: 1,
                orderBy: { cleanedAt: 'desc' },
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

      return NextResponse.json(assignments.map((a) => a.room));
    }

    if (session.user.role === UserRole.RECEPTION || session.user.role === UserRole.ADMIN) {
      const rooms = await prisma.room.findMany({
        include: {
          assignments: {
            where: date ? { date: new Date(date) } : undefined,
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          cleanings: {
            where: date ? { date: new Date(date) } : undefined,
            take: 1,
            orderBy: { cleanedAt: 'desc' },
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
          incidents: {
            where: { status: 'OPEN' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { number: 'asc' },
      });

      return NextResponse.json(rooms);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Error fetching rooms:', error);
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
    const { number, floor, status, isOccupied } = body;

    const room = await prisma.room.create({
      data: {
        number,
        floor,
        status: status || (RoomStatus.VACANT as string),
        isOccupied: isOccupied || false,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== UserRole.RECEPTION && session.user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, isOccupied, number, floor } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (isOccupied !== undefined) updateData.isOccupied = isOccupied;
    if (number) updateData.number = number;
    if (floor !== undefined) updateData.floor = floor;

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

