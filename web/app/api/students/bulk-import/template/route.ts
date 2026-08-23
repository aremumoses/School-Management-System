import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Proxies the NestJS template download so the browser can hit a plain
 * same-origin <a href> (a real file download, not a fetch the client has
 * to handle) without ever needing the API base URL or bearer token
 * client-side.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/students/bulk-import/template`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );

  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to fetch template' }, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        response.headers.get('content-type') ??
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        response.headers.get('content-disposition') ??
        'attachment; filename="student-import-template.xlsx"',
    },
  });
}
