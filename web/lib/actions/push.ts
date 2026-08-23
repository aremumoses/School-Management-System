'use server';

import { apiFetch } from '@/lib/api';

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribeToPush(input: WebPushSubscriptionInput): Promise<void> {
  await apiFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await apiFetch('/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}
