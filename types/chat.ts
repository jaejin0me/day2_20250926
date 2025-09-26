export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoomsData {
  rooms: ChatRoom[];
  activeRoomId: string | null;
}
