/** Shared continue / ack detection — keep widget, server, and coach in sync. */
export const COACH_CONTINUE_ACK_RE =
  /^(下一步|next(?: step)?|continue|繼續|继续|然後|然后|好|好了|ok|done)[\s!.?。]*$/i;

export function isCoachContinueReply(text: string): boolean {
  return COACH_CONTINUE_ACK_RE.test(text.trim());
}
