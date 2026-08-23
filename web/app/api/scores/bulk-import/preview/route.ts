import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const qs = req.nextUrl.searchParams.toString();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/scores/bulk-import/preview${qs ? `?${qs}` : ''}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: formData,
    },
  );

  const data: unknown = await response.json();
  return NextResponse.json(data, { status: response.status });
}
