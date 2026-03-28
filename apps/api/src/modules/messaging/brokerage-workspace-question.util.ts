/** Strip smart quotes / zero-width chars so SMS and copy-paste still match. */
export function normalizeMessageForBrokerageMatch(message: string): string {
  if (message == null || typeof message !== 'string') return '';
  return message
    .normalize('NFKC')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u02BC/g, "'")
    .replace(/\uFF07/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Detect questions about the workspace / brokerage label stored on Workspace.name.
 * Used to answer from DB without relying on the LLM to invent a name.
 */
export function isBrokerageOrWorkspaceNameQuestion(message: string): boolean {
  const lower = normalizeMessageForBrokerageMatch(message).toLowerCase();
  if (!lower) return false;

  // "what brokerage …" / "which brokerage …" (name optional, ? optional)
  if (/\b(what|which|whats|what's|tell me)\b[\s,]*\b(brokerage|broker)\b/.test(lower)) return true;
  if (/\bbrokerage\b[\s\w]{0,12}\bname\b/.test(lower) && /\b(what|which|my|the|our|your)\b/.test(lower))
    return true;

  if (/\bbrokerage'?s?\s+name\b/.test(lower)) return true;
  if (/\bname\s+of\s+(my|the|our)\s+brokerage\b/.test(lower)) return true;
  if (/\bwhat\s+(is|’s|'s)\s+my\s+brokerage\b/.test(lower)) return true;
  if (/\bwhat\s+is\s+my\s+brokerage'?s?\s+name\b/.test(lower)) return true;
  if (/\bmy\s+brokerage\b/.test(lower) && /\b(name|called)\b/.test(lower)) return true;
  if (/\b(tell me|give me)\s+(my\s+)?brokerage\b/.test(lower)) return true;

  if (/\bworkspace'?s?\s+name\b/.test(lower)) return true;
  if (/\bwhat\s+(is|’s|'s)\s+my\s+workspace\b/.test(lower)) return true;
  if (/\bname\s+of\s+(my|the|our)\s+workspace\b/.test(lower)) return true;

  if (/\bwhat\s+(company|firm)\s+(am i|are we)\b/.test(lower)) return true;
  if (/\bwhat\s+(is|’s|'s)\s+the\s+name\s+of\s+(my|our|the)\s+(office|firm|company)\b/.test(lower))
    return true;

  // Broad: any question that mentions brokerage / this workspace’s brand
  const looksLikeQuestion =
    lower.includes('?') ||
    /^(what|which|who|tell me|do you know|can you|could you|hey[, ]|hi[, ])/i.test(lower.trim());
  if (looksLikeQuestion && /\bbrokerage\b/.test(lower)) return true;
  if (looksLikeQuestion && /\bthis\s+workspace\b/.test(lower) && /\bname\b/.test(lower)) return true;
  if (looksLikeQuestion && /\b(my|our)\s+(firm|company)\b/.test(lower) && /\bname\b/.test(lower))
    return true;

  return false;
}

/**
 * Secondary match for overriding parse suggestedResponse only. Tighter than “brokerage + ?”.
 */
export function looksLikeBrokerageNameQuestionLoose(message: string): boolean {
  const lower = normalizeMessageForBrokerageMatch(message).toLowerCase();
  if (!/\bbrokerage\b/.test(lower)) return false;
  if (/\bwhat\b[\s\w,'’]{0,52}\bbrokerage\b/.test(lower)) return true;
  if (/\bwhich\b[\s\w,'’]{0,52}\bbrokerage\b/.test(lower)) return true;
  if (/\b(my|our)\s+brokerage\b/.test(lower)) return true;
  if (/\bbrokerage['’]?\s*s?\s+name\b/.test(lower)) return true;
  if (
    /\b(my|what|which|our)\b/.test(lower) &&
    /\bbrokerage\b[\s\w,'’]{0,24}\bname\b/.test(lower)
  )
    return true;
  return false;
}

export function formatBrokerageWorkspaceReply(workspaceName: string): string {
  const n = workspaceName.trim() || 'this workspace';
  return `Your brokerage here is ${n} — that's your workspace name in Deal Coordinator.`;
}

export function formatMissingWorkspaceNameReply(): string {
  return "I don't have a workspace (brokerage) display name on file yet. Ask an admin to set the workspace name in Deal Coordinator, or check Settings / workspace details.";
}
