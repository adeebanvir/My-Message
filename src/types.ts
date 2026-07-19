export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  online: boolean;
  lastSeen?: number; // timestamp
  description?: string; // bio/description
  addedContactIds?: string[]; // 12-digit numeric IDs of added friends
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string; // Could be another userId or a group channel
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
}

export interface ChatSession {
  id: string; // recipient userId
  user: User;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface TypingState {
  userId: string;
  recipientId: string;
  isTyping: boolean;
}

// WebSocket client-to-server payloads
export type ClientMessage =
  | { type: 'auth'; payload: { user: User } }
  | { type: 'send_message'; payload: { recipientId: string; text: string; id?: string } }
  | { type: 'typing'; payload: { recipientId: string; isTyping: boolean } }
  | { type: 'mark_read'; payload: { senderId: string } }
  | { type: 'request_history'; payload: { contactId: string } };

// WebSocket server-to-client payloads
export type ServerMessage =
  | { type: 'users_update'; payload: { users: User[] } }
  | { type: 'receive_message'; payload: Message }
  | { type: 'message_status_update'; payload: { id: string; recipientId: string; status: 'delivered' | 'read' } }
  | { type: 'typing_update'; payload: TypingState }
  | { type: 'history'; payload: { recipientId: string; messages: Message[] } };
