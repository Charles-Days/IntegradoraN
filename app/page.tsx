import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/lib/enums';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role === UserRole.ADMIN) {
    redirect('/admin');
  }

  if (session.user.role === UserRole.RECEPTION) {
    redirect('/reception');
  }

  if (session.user.role === UserRole.HOUSEKEEPER) {
    redirect('/housekeeper');
  }

  return null;
}

