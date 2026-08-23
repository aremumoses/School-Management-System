import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/hr/payroll/runs/${id}/bank-schedule/export`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );

  if (!response.ok) {
    return NextResponse.json({ message: 'Export failed' }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bank-schedule-${id}.csv"`,
    },
  });
}
