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

    if (session.user.role === UserRole.HOUSEKEEPER) {
      const viewAll = searchParams.get('viewAll') === 'true';

      if (viewAll) {
        // Return all rooms (not disabled) for housekeeper to see
        const rooms = await prisma.room.findMany({
          where: {
            status: { not: RoomStatus.DISABLED as string },
          },
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
            },
          },
          orderBy: { number: 'asc' },
        });

        return NextResponse.json(rooms);
      }

      // Return only assigned rooms for housekeeper
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

      // Include assignedAt to compare with cleaning time
      return NextResponse.json(assignments.map((a) => ({
        ...a.room,
        assignedAt: a.assignedAt,
      })));
    }

    if (session.user.role === UserRole.RECEPTION || session.user.role === UserRole.ADMIN) {
      const rooms = await prisma.room.findMany({
        include: {
          lastCleanedBy: {
            select: { id: true, name: true, email: true },
          },
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

    // Get current room state to check for occupy/vacate transitions
    const currentRoom = await prisma.room.findUnique({
      where: { id },
    });

    if (!currentRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (number) updateData.number = number;
    if (floor !== undefined) updateData.floor = floor;

    // Handle occupy/vacate transitions
    if (isOccupied !== undefined) {
      updateData.isOccupied = isOccupied;

      if (isOccupied && !currentRoom.isOccupied) {
        // Room is being occupied - set status to OCCUPIED
        updateData.status = RoomStatus.OCCUPIED as string;
      } else if (!isOccupied && currentRoom.isOccupied) {
        // Room is being vacated (checkout) - set status to CHECKOUT_PENDING
        // This indicates the room needs cleaning after checkout
        updateData.status = RoomStatus.CHECKOUT_PENDING as string;
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: {
        lastCleanedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

