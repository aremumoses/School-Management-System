import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hr/staff/export`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return NextResponse.json({ message: 'Export failed' }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="staff-roster-${Date.now()}.xlsx"`,
    },
  });
}
