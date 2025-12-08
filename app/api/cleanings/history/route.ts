import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/enums';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    const where: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (session.user.role === UserRole.HOUSEKEEPER) {
      where.userId = session.user.id;
    } else if (session.user.role === UserRole.ADMIN && userId) {
      where.userId = userId;
    }

    const cleanings = await prisma.cleaning.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { cleanedAt: 'desc' },
      ],
    });

    return NextResponse.json(cleanings);
  } catch (error) {
    console.error('Error fetching cleaning history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
