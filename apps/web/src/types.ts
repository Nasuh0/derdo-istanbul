export interface User {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
}

export interface Attachment {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  type: "PUBLIC" | "PRIVATE";
  createdById?: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: Pick<User, "id" | "username">;
  attachments: Attachment[];
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: Pick<User, "id" | "username">;
  attachments: Attachment[];
}

export interface DirectConversation {
  id: string;
  members: Array<{
    userId: string;
    user: Pick<User, "id" | "username">;
  }>;
  messages: DirectMessage[];
}

export type PresenceStatus = "online" | "away" | "busy";

export interface PresenceUser {
  id: string;
  username: string;
  status: PresenceStatus;
}

export interface Session {
  user: User;
  accessToken: string;
  accessTokenExpiresIn: number;
}

export interface VoiceChannel {
  id: string;
  name: string;
  slug: string;
  type: "PUBLIC" | "PRIVATE";
}

export interface VoiceParticipant {
  id: string;
  name: string;
  microphoneEnabled: boolean;
  speaking: boolean;
}

export interface VoiceJoinResponse {
  token: string;
  url: string;
  channel: {
    id: string;
    name: string;
  };
  expiresIn: number;
}
