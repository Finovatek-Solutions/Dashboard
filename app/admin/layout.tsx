import { AppShell, Burger, Group, Skeleton } from '@mantine/core';

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { MantineLogo } from '@mantinex/mantine-logo';
import { authOptions } from '../api/auth/[...nextauth]/route';

import { LockWhenSignedOut } from '@/components/LockWhenSignedOut/LockWhenSignedOut';
import { AdminNavBar } from '@/components/AdminNavBar/AdminNavBar';

export default async function AdminLayout({ children }: { children: any }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <LockWhenSignedOut />
      <AdminNavBar>{children}</AdminNavBar>
    </>
  );
}
