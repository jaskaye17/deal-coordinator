import type { Guard, TransitionRequest } from '../types';

export function requireRole(allowedRoles: string[]): Guard {
  return (request: TransitionRequest) => {
    if (allowedRoles.includes(request.actor.role)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Role "${request.actor.role}" is not allowed for this transition; required one of: ${allowedRoles.join(', ')}`,
    };
  };
}

/** Only a reviewer may advance listing docs from review to signature or back to drafting.
 * Admin can still override via the TransitionRequest.reason mechanism. */
export const reviewerOrAdminGuard = requireRole(['reviewer']);

/** Typical listing actions performed by the listing agent (or admin). */
export const agentOrAdminGuard = requireRole(['agent', 'admin']);

/** Closing a listing or moving out of under_contract to closed. */
export const requireListingClosureRoles = requireRole(['agent', 'admin']);
