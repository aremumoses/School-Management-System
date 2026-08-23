'use client';

import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { subscribeToPush } from '@/lib/actions/push';
import { isPushSupported, subscribeBrowserToPush } from '@/lib/push/subscribe';

const DISMISSED_KEY = 'sms-push-prompt-dismissed';

/**
 * Contextual notification-permission prompt (docs/18-technical-architecture.md
 * §7, Stage 28 frontend prompt) — rendered only when the parent page passes
 * `show=true`, which should happen after a meaningful first action (e.g.
 * a teacher's first successful attendance save that session), never on
 * page load. Persists a dismissal in localStorage so declining once
 * doesn't nag on every subsequent visit.
 */
export function NotificationPermissionPrompt({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!show) return;
      if (!isPushSupported()) return;
      if (Notification.permission !== 'default') return;
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setVisible(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [show]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function enable() {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }
      const subscription = await subscribeBrowserToPush();
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error('Browser did not return a usable push subscription');
      }
      await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      toast.success("Notifications enabled — you'll get alerts even when the app is closed.");
      setVisible(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't enable notifications.");
    } finally {
      setIsSubscribing(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
      <Bell className="size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">Enable notifications to get instant alerts, even with the app closed.</p>
      <Button size="sm" onClick={() => void enable()} disabled={isSubscribing}>
        {isSubscribing ? 'Enabling…' : 'Enable'}
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-info-soft-foreground/70 hover:text-info-soft-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
