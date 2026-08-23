import { randomBytes } from 'node:crypto';

/**
 * A reasonably strong, easy-to-type temporary password for newly-created
 * accounts that don't specify their own — returned once in the API
 * response so an admin can hand it to the new staff member out of band.
 * No "change password" flow exists yet (a later stage's concern).
 */
export function generateTempPassword(): string {
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}
