import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RoomStatus, IncidentStatus } from '@/lib/enums';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cleanings, incidents } = body;

    const results = {
      cleanings: { synced: 0, failed: 0 },
      incidents: { synced: 0, failed: 0 },
    };

    if (cleanings && Array.isArray(cleanings)) {
      for (const cleaning of cleanings) {
        try {
          const cleaningDate = cleaning.date ? new Date(cleaning.date) : new Date();

          await prisma.cleaning.create({
            data: {
              roomId: cleaning.roomId,
              userId: cleaning.userId,
              date: cleaningDate,
              cleanedAt: new Date(cleaning.cleanedAt),
            },
          });

          await prisma.room.update({
            where: { id: cleaning.roomId },
            data: {
              status: RoomStatus.CLEAN as string,
            },
          });

          await prisma.assignment.updateMany({
            where: {
              roomId: cleaning.roomId,
              userId: cleaning.userId,
              date: cleaningDate,
            },
            data: {
              completed: true,
            },
          });

          results.cleanings.synced++;
        } catch (error) {
          console.error('Error syncing cleaning:', error);
          results.cleanings.failed++;
        }
      }
    }

    if (incidents && Array.isArray(incidents)) {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'incidents');
      await mkdir(uploadsDir, { recursive: true });

      for (const incident of incidents) {
        try {
          const createdIncident = await prisma.incident.create({
            data: {
              roomId: incident.roomId,
              userId: incident.userId,
              description: incident.description,
              status: IncidentStatus.OPEN as string,
            },
          });

          for (let i = 0; i < incident.photos.length; i++) {
            try {
              const photoDataUrl = incident.photos[i];
              if (!photoDataUrl || typeof photoDataUrl !== 'string') {
                console.error('Invalid photo data at index', i);
                continue;
              }

              // Handle both data URL format and raw base64
              const base64Data = photoDataUrl.includes('base64,')
                ? photoDataUrl.split('base64,')[1]
                : photoDataUrl;

              if (!base64Data) {
                console.error('Could not extract base64 data from photo at index', i);
                continue;
              }

              const buffer = Buffer.from(base64Data, 'base64');

              // Detect image type from data URL or default to jpg
              let extension = 'jpg';
              if (photoDataUrl.includes('image/png')) extension = 'png';
              else if (photoDataUrl.includes('image/jpeg')) extension = 'jpg';
              else if (photoDataUrl.includes('image/webp')) extension = 'webp';

              const filename = `${createdIncident.id}-${Date.now()}-${i}.${extension}`;
              const filePath = join(uploadsDir, filename);

              await writeFile(filePath, buffer);

              await prisma.incidentPhoto.create({
                data: {
                  incidentId: createdIncident.id,
                  url: `/uploads/incidents/${filename}`,
                },
              });
            } catch (photoError) {
              console.error('Error processing photo at index', i, ':', photoError);
            }
          }

          await prisma.room.update({
            where: { id: incident.roomId },
            data: {
              status: RoomStatus.DISABLED as string,
            },
          });

          results.incidents.synced++;
        } catch (error) {
          console.error('Error syncing incident:', error);
          results.incidents.failed++;
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

