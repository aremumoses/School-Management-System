import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await req.json();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/scores/bulk-import/commit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const data: unknown = await response.json();
  return NextResponse.json(data, { status: response.status });
}
