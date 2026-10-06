import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { AuthScreen } from "./components/AuthScreen";
import { api, getAccessToken, logout, refreshSession } from "./lib/api";
import { connectRealtime } from "./lib/realtime";
import type {
  DirectConversation,
  DirectMessage,
  Message,
  PresenceStatus,
  PresenceUser,
  Room,
  Session,
  User
} from "./types";

type ActiveView =
  | { kind: "room"; room: Room }
  | { kind: "dm"; conversation: DirectConversation };

function timeOf(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [presence, setPresence] = useState<Map<string, PresenceUser>>(new Map());
  const [active, setActive] = useState<ActiveView | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [typing, setTyping] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState("bağlanıyor");
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<ActiveView | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    refreshSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    Promise.all([
      api<User[]>("/api/users"),
      api<Room[]>("/api/rooms"),
      api<DirectConversation[]>("/api/dm")
    ]).then(([nextUsers, nextRooms, nextDms]) => {
      if (cancelled) return;
      setUsers(nextUsers);
      setRooms(nextRooms);
      setConversations(nextDms);
      const general = nextRooms.find((room) => room.slug === "genel") ?? nextRooms[0];
      if (general) void openRoom(general);
    }).catch(console.error);

    const socket = connectRealtime(getAccessToken());
    socketRef.current = socket;

    socket.on("connect", () => setConnectionState("bağlı"));
    socket.on("disconnect", () => setConnectionState("yeniden bağlanıyor"));
    socket.on("connect_error", () => setConnectionState("bağlantı hatası"));
    socket.on("auth:error", () => setConnectionState("oturum hatası"));

    socket.on("presence:snapshot", (items: PresenceUser[]) => {
      setPresence(new Map(items.map((item) => [item.id, item])));
    });

    socket.on("message:new", (message: Message) => {
      const current = activeRef.current;
      if (current?.kind === "room" && current.room.id === message.roomId) {
        setRoomMessages((items) =>
          items.some((item) => item.id === message.id) ? items : [...items, message]
        );
      }
    });

    socket.on("dm:new", (message: DirectMessage) => {
      const current = activeRef.current;
      if (current?.kind === "dm" && current.conversation.id === message.conversationId) {
        setDmMessages((items) =>
          items.some((item) => item.id === message.id) ? items : [...items, message]
        );
      }
      void api<DirectConversation[]>("/api/dm").then(setConversations).catch(() => undefined);
    });

    socket.on("typing:update", (event: {
      roomId: string;
      userId: string;
      username: string;
      typing: boolean;
    }) => {
      const current = activeRef.current;
      if (current?.kind !== "room" || current.room.id !== event.roomId) return;
      if (event.userId === session.user.id) return;
      setTyping((items) => {
        const without = items.filter((name) => name !== event.username);
        return event.typing ? [...without, event.username] : without;
      });
    });

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  const onlineUsers = useMemo(
    () => users.filter((user) => presence.has(user.id)),
    [users, presence]
  );
  const offlineUsers = useMemo(
    () => users.filter((user) => !presence.has(user.id)),
    [users, presence]
  );

  async function openRoom(room: Room) {
    const previous = activeRef.current;
    if (previous?.kind === "room") {
      socketRef.current?.emit("room:leave", { roomId: previous.room.id });
    }
    setActive({ kind: "room", room });
    setTyping([]);
    setDmMessages([]);
    const messages = await api<Message[]>(`/api/rooms/${room.id}/messages?take=80`);
    setRoomMessages(messages);
    socketRef.current?.emit("room:join", { roomId: room.id });
  }

  async function openDm(user: User) {
    if (!session || user.id === session.user.id) return;
    const conversation = await api<DirectConversation>(`/api/dm/with/${user.id}`, {
      method: "POST"
    });
    setActive({ kind: "dm", conversation });
    setRoomMessages([]);
    setTyping([]);
    const messages = await api<DirectMessage[]>(
      `/api/dm/${conversation.id}/messages?take=80`
    );
    setDmMessages(messages);
    setConversations((items) => {
      const without = items.filter((item) => item.id !== conversation.id);
      return [conversation, ...without];
    });
  }

  function dmTitle(conversation: DirectConversation): string {
    const other = conversation.members.find((member) => member.userId !== session?.user.id);
    return other?.user.username ?? "Özel mesaj";
  }

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    const content = messageText.trim();
    if (!content || !active || !socketRef.current) return;

    if (active.kind === "room") {
      socketRef.current.emit("typing:stop", { roomId: active.room.id });
      socketRef.current.emit("message:send", {
        roomId: active.room.id,
        content
      });
    } else {
      socketRef.current.emit("dm:send", {
        conversationId: active.conversation.id,
        content
      });
    }
    setMessageText("");
  }

  function changeMessage(value: string) {
    setMessageText(value);
    if (active?.kind === "room") {
      socketRef.current?.emit(value.trim() ? "typing:start" : "typing:stop", {
        roomId: active.room.id
      });
    }
  }

  function setMyPresence(status: PresenceStatus) {
    socketRef.current?.emit("presence:set", { status });
  }

  async function signOut() {
    await logout();
    socketRef.current?.disconnect();
    setSession(null);
    setActive(null);
  }

  if (booting) {
    return <div className="splash"><div className="loader" /><span>Derdo açılıyor</span></div>;
  }

  if (!session) {
    return <AuthScreen onSession={setSession} />;
  }

  const messages = active?.kind === "dm" ? dmMessages : roomMessages;

  return (
    <div className="app-shell">
      <aside className="server-rail">
        <div className="server-logo">D</div>
        <button className="server-button active">İ</button>
        <button className="server-button">+</button>
      </aside>

      <aside className="channel-panel">
        <header className="workspace-title">
          <div>
            <strong>Derdo İstanbul</strong>
            <small>{connectionState}</small>
          </div>
          <button onClick={signOut} title="Çıkış">↪</button>
        </header>

        <div className="channel-scroll">
          <div className="section-title">YAZI KANALLARI</div>
          {rooms.map((room) => (
            <button
              className={
                active?.kind === "room" && active.room.id === room.id
                  ? "channel active"
                  : "channel"
              }
              key={room.id}
              onClick={() => void openRoom(room)}
            >
              <span>#</span>
              <b>{room.name}</b>
              {room.type === "PRIVATE" && <em>🔒</em>}
            </button>
          ))}

          <div className="section-title spaced">ÖZEL MESAJLAR</div>
          {conversations.map((conversation) => (
            <button
              className={
                active?.kind === "dm" && active.conversation.id === conversation.id
                  ? "channel active"
                  : "channel"
              }
              key={conversation.id}
              onClick={() => {
                const other = conversation.members.find(
                  (member) => member.userId !== session.user.id
                );
                if (other) void openDm(other.user as User);
              }}
            >
              <span>@</span>
              <b>{dmTitle(conversation)}</b>
            </button>
          ))}
        </div>

        <footer className="profile-bar">
          <div className="avatar">{session.user.username.slice(0, 1).toUpperCase()}</div>
          <div className="profile-copy">
            <strong>{session.user.username}</strong>
            <small>{presence.get(session.user.id)?.status ?? "online"}</small>
          </div>
          <select
            aria-label="Durum"
            defaultValue="online"
            onChange={(event) => setMyPresence(event.target.value as PresenceStatus)}
          >
            <option value="online">🟢</option>
            <option value="away">🟡</option>
            <option value="busy">🔴</option>
          </select>
        </footer>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <span className="header-icon">{active?.kind === "dm" ? "@" : "#"}</span>
          <strong>
            {active?.kind === "room"
              ? active.room.name
              : active?.kind === "dm"
                ? dmTitle(active.conversation)
                : "Sohbet"}
          </strong>
          <span className="header-sub">
            {active?.kind === "room" && active.room.type === "PRIVATE"
              ? "Özel oda"
              : active?.kind === "dm"
                ? "Direkt mesaj"
                : "Topluluk kanalı"}
          </span>
        </header>

        <section className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <div>💬</div>
              <h2>Henüz mesaj yok</h2>
              <p>İlk mesajı sen gönder.</p>
            </div>
          )}
          {messages.map((message) => (
            <article className="message" key={message.id}>
              <div className="message-avatar">
                {message.author.username.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="message-meta">
                  <strong>{message.author.username}</strong>
                  <time>{timeOf(message.createdAt)}</time>
                </div>
                <p>{message.content}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="typing-line">
          {typing.length > 0 ? `${typing.join(", ")} yazıyor...` : ""}
        </div>

        <form className="composer" onSubmit={submitMessage}>
          <button type="button" title="Dosya yükleme sonraki aşamada">＋</button>
          <input
            value={messageText}
            onChange={(event) => changeMessage(event.target.value)}
            placeholder={
              active?.kind === "room"
                ? `#${active.room.name} kanalına mesaj gönder`
                : "Mesaj gönder"
            }
            maxLength={4000}
            disabled={!active}
          />
          <button className="send-button" type="submit" disabled={!active || !messageText.trim()}>
            Gönder
          </button>
        </form>
      </main>

      <aside className="member-panel">
        <div className="member-heading">ÇEVRİMİÇİ — {onlineUsers.length}</div>
        {onlineUsers.map((user) => (
          <button className="member" key={user.id} onClick={() => void openDm(user)}>
            <div className="member-avatar">
              {user.username.slice(0, 1).toUpperCase()}
              <i className={presence.get(user.id)?.status ?? "online"} />
            </div>
            <span>{user.username}</span>
            {user.role === "ADMIN" && <small>Yönetici</small>}
          </button>
        ))}

        <div className="member-heading offline-title">ÇEVRİMDIŞI — {offlineUsers.length}</div>
        {offlineUsers.map((user) => (
          <button className="member offline" key={user.id} onClick={() => void openDm(user)}>
            <div className="member-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
            <span>{user.username}</span>
          </button>
        ))}
      </aside>
    </div>
  );
}
