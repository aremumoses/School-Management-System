import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/scores/bulk-import/template${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );

  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to fetch template' }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="scores-import-template.xlsx"',
    },
  });
}
