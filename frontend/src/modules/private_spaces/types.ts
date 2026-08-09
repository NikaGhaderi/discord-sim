export interface DirectMessage {
    id: string;
    recipient_username: string;
    last_message: string;
    updated_at: string;
  }
  
  export interface Group {
    id: string;
    name: string;
    is_admin: boolean;
    member_count: number;
  }
  
  export interface Invitation {
    id: string;
    group_name: string;
    invited_by: string;
    created_at: string;
  }