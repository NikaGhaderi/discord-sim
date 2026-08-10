export interface Message {
    id: string;
    channel_id?: string;
    sender_id: string;
    sender_username: string;
    sender_avatar_url?: string | null;
    content: string;
    media_url?: string | null;
    created_at: string;
  }
  
  export interface SearchFilter {
    query: string;
  }
  