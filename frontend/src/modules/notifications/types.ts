/**
 * types — data contract for the notifications module (SCRUM-51's pull
 * fallback + SCRUM-50/54's live push, same source of truth for both).
 *
 * `event_type`/`payload` match the real `Notification` model exactly
 * (`backend/apps/notifications/models.py`) -- the Phase 1 doc's own
 * illustrative example uses `type`/`content` instead, but the actual
 * ticket (SCRUM-51, more specific and more authoritative) defines
 * `event_type`/`payload`, which is what's implemented.
 */
export interface Notification {
  notification_id: number;
  event_type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
