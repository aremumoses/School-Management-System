import { redirect } from 'next/navigation';

/**
 * The spec lists Gate Pass Issuance and Pickup Verification as separate
 * screens, but they're one workflow (verify → issue) — the combined screen
 * lives at /front-desk/gate-pass; this route just points there so the nav
 * entry resolves.
 */
export default function PickupVerificationPage() {
  redirect('/front-desk/gate-pass');
}
