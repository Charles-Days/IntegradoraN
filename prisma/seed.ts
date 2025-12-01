import { PrismaClient } from '@prisma/client';
import { UserRole } from '../lib/enums';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hotel.com' },
    update: {},
    create: {
      email: 'admin@hotel.com',
      name: 'Administrador',
      password: hashedPassword,
      role: UserRole.ADMIN as string,
    },
  });

  const reception = await prisma.user.upsert({
    where: { email: 'reception@hotel.com' },
    update: {},
    create: {
      email: 'reception@hotel.com',
      name: 'Recepción',
      password: hashedPassword,
      role: UserRole.RECEPTION as string,
    },
  });

  const housekeeper1 = await prisma.user.upsert({
    where: { email: 'camarera1@hotel.com' },
    update: {},
    create: {
      email: 'camarera1@hotel.com',
      name: 'María González',
      password: hashedPassword,
      role: UserRole.HOUSEKEEPER as string,
    },
  });

  const housekeeper2 = await prisma.user.upsert({
    where: { email: 'camarera2@hotel.com' },
    update: {},
    create: {
      email: 'camarera2@hotel.com',
      name: 'Ana Martínez',
      password: hashedPassword,
      role: UserRole.HOUSEKEEPER as string,
    },
  });

  for (let floor = 1; floor <= 3; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomNumber = `${floor}${String(room).padStart(2, '0')}`;
      await prisma.room.upsert({
        where: { number: roomNumber },
        update: {},
        create: {
          number: roomNumber,
          floor,
          status: 'VACANT',
          isOccupied: false,
        },
      });
    }
  }

  console.log('Seed completed:', {
    admin: admin.email,
    reception: reception.email,
    housekeepers: [housekeeper1.email, housekeeper2.email],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

