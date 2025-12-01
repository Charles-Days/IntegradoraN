import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, RoomStatus, IncidentStatus } from '@/lib/enums';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status') as string | null;

    const where: any = {};

    if (roomId) {
      where.roomId = roomId;
    }

    if (status) {
      where.status = status;
    }

    if (session.user.role === UserRole.HOUSEKEEPER) {
      where.userId = session.user.id;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        room: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const roomId = formData.get('roomId') as string;
    const description = formData.get('description') as string;
    const photos = formData.getAll('photos') as File[];

    if (!roomId || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (photos.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 photos allowed' }, { status: 400 });
    }

    const incident = await prisma.incident.create({
      data: {
        roomId,
        userId: session.user.id,
        description,
        status: IncidentStatus.OPEN as string,
      },
    });

    const photoUrls: string[] = [];

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'incidents');
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadsDir, { recursive: true });

    for (const photo of photos) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${incident.id}-${Date.now()}-${photo.name}`;
      const path = join(uploadsDir, filename);

      await writeFile(path, buffer);
      photoUrls.push(`/uploads/incidents/${filename}`);

      await prisma.incidentPhoto.create({
        data: {
          incidentId: incident.id,
          url: `/uploads/incidents/${filename}`,
        },
      });
    }

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.DISABLED as string,
      },
    });

    const incidentWithPhotos = await prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        room: true,
        user: {
          select: { id: true, name: true },
        },
        photos: true,
      },
    });

    return NextResponse.json(incidentWithPhotos, { status: 201 });
  } catch (error) {
    console.error('Error creating incident:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.RECEPTION) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, roomId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updateData: any = {
      status,
      resolvedAt: status === (IncidentStatus.RESOLVED as string) ? new Date() : null,
      resolvedBy: status === (IncidentStatus.RESOLVED as string) ? session.user.id : null,
    };

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        room: true,
        photos: true,
      },
    });

    if (status === (IncidentStatus.RESOLVED as string) && roomId) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          status: RoomStatus.CLEAN as string,
        },
      });
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

