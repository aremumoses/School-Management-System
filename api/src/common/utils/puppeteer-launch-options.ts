import type { LaunchOptions } from 'puppeteer';

/**
 * Shared Chrome launch options for every PDF processor (report cards,
 * receipts, offer letters, payslips, documents). Previously each of the five
 * called `puppeteer.launch({ headless: true })` directly, which works on a
 * developer's macOS machine but cannot start Chrome inside a container.
 *
 * Chrome's setuid sandbox refuses to run as uid 0, and container images run
 * as root by default — so a deployed build would fail on the *first* PDF job
 * with "Running as root without --no-sandbox is not supported", long after
 * boot looked healthy. Dropping the sandbox is safe here specifically because
 * the only HTML Chrome ever renders is our own server-side templates, never
 * third-party or user-navigated pages.
 *
 * The check is `getuid() === 0` rather than a NODE_ENV/env-var flag so the
 * behaviour follows the actual condition that breaks Chrome. Local dev (a
 * non-root user) keeps the exact previous launch options, and any root
 * container gets the flags without needing a deploy-time variable set
 * correctly. getuid is undefined on Windows, hence the optional call.
 */
export function puppeteerLaunchOptions(): LaunchOptions {
  const isRoot = process.getuid?.() === 0;
  if (!isRoot) {
    return { headless: true };
  }
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Containers default to a 64MB /dev/shm, which Chrome exhausts and
      // then crashes mid-render; this makes it write shared memory to /tmp
      // instead. Costs a little speed, avoids an intermittent tab crash.
      '--disable-dev-shm-usage',
    ],
  };
}
