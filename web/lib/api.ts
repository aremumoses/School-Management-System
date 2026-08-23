import 'server-only';
import { auth } from '@/auth';

/**
 * Thin typed wrapper around fetch for calling the NestJS API.
 *
 * Server-only (see the `server-only` import above) — it calls NextAuth's
 * `auth()` to read the current session and automatically attaches
 * `Authorization: Bearer <accessToken>` when one exists. This is meant to
 * be called from Server Components, Server Actions, and Route Handlers, per
 * docs/18-technical-architecture.md §4 — there is no client-side equivalent
 * yet, since the app doesn't need to call the API directly from the browser
 * at this stage.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set — copy .env.local.example to .env.local',
    );
  }

  const session = await auth();
  // Skip the default JSON content-type for FormData bodies (file uploads) —
  // fetch needs to set its own multipart boundary, which a forced
  // "application/json" header would clobber.
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    // Admin setup screens must always see the latest data after a mutation;
    // explicit `revalidatePath` calls in Server Actions handle the RSC
    // cache, but the underlying fetch itself should never serve stale data.
    cache: 'no-store',
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}
