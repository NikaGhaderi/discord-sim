export interface MediaSummary {
  file_url: string;
  file_type: string;
}

export interface Message {
  base_message_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  sent_at: string;
  is_edited: boolean;
  media?: MediaSummary[];
}
