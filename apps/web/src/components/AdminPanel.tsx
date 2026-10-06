import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Room } from "../types";

interface AdminUser {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; username: string } | null;
}

interface Props {
  onClose(): void;
  onRoomsChanged?(rooms: Room[]): void;
}

type Tab = "users" | "rooms" | "logs";

export function AdminPanel({ onClose, onRoomsChanged }: Props) {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomType, setRoomType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  async function refreshUsers() {
    setUsers(await api<AdminUser[]>("/api/admin/users"));
  }

  async function refreshRooms() {
    const next = await api<Room[]>("/api/admin/rooms");
    setRooms(next);
    onRoomsChanged?.(next);
  }

  async function refreshLogs() {
    setLogs(await api<AuditLog[]>("/api/admin/audit-logs"));
  }

  useEffect(() => {
    setError("");
    const action =
      tab === "users" ? refreshUsers() :
      tab === "rooms" ? refreshRooms() :
      refreshLogs();
    void action.catch((err) => {
      setError(err instanceof Error ? err.message : "Admin verisi alınamadı");
    });
  }, [tab]);

  async function toggleBan(user: AdminUser) {
    setBusyId(user.id);
    setError("");
    try {
      await api(`/api/admin/users/${user.id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ banned: !user.isBanned })
      });
      await refreshUsers();
      await refreshLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId("");
    }
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/admin/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: roomName,
          slug: roomSlug.toLowerCase(),
          type: roomType
        })
      });
      setRoomName("");
      setRoomSlug("");
      await refreshRooms();
      await refreshLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oda oluşturulamadı");
    }
  }

  async function deleteRoom(room: Room) {
    if (room.slug === "genel") return;
    if (!window.confirm(`${room.name} odası silinsin mi?`)) return;
    setBusyId(room.id);
    setError("");
    try {
      await api(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
      await refreshRooms();
      await refreshLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oda silinemedi");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-label="Yönetim paneli">
      <section className="admin-panel">
        <header className="admin-header">
          <div>
            <span>YÖNETİM</span>
            <h2>Derdo Admin Paneli</h2>
          </div>
          <button onClick={onClose} aria-label="Kapat">×</button>
        </header>

        <nav className="admin-tabs">
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
            Kullanıcılar
          </button>
          <button className={tab === "rooms" ? "active" : ""} onClick={() => setTab("rooms")}>
            Odalar
          </button>
          <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
            Loglar
          </button>
        </nav>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-content">
          {tab === "users" && (
            <div className="admin-table">
              <div className="admin-row admin-row-head">
                <span>Kullanıcı</span><span>Rol</span><span>Durum</span><span>İşlem</span>
              </div>
              {users.map((user) => (
                <div className="admin-row" key={user.id}>
                  <span><b>{user.username}</b><small>{new Date(user.createdAt).toLocaleDateString("tr-TR")}</small></span>
                  <span>{user.role}</span>
                  <span className={user.isBanned ? "status-banned" : "status-ok"}>
                    {user.isBanned ? "Banlı" : "Aktif"}
                  </span>
                  <span>
                    <button
                      disabled={busyId === user.id || user.role === "ADMIN"}
                      className={user.isBanned ? "admin-action success" : "admin-action danger"}
                      onClick={() => void toggleBan(user)}
                    >
                      {user.isBanned ? "Banı kaldır" : "Banla"}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "rooms" && (
            <>
              <form className="admin-room-form" onSubmit={createRoom}>
                <input
                  placeholder="Oda adı"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  minLength={2}
                  maxLength={64}
                  required
                />
                <input
                  placeholder="oda-slug"
                  value={roomSlug}
                  onChange={(event) => setRoomSlug(event.target.value.replace(/[^a-z0-9-]/g, ""))}
                  minLength={2}
                  maxLength={64}
                  required
                />
                <select value={roomType} onChange={(event) => setRoomType(event.target.value as "PUBLIC" | "PRIVATE")}>
                  <option value="PUBLIC">Genel</option>
                  <option value="PRIVATE">Özel</option>
                </select>
                <button type="submit">Oluştur</button>
              </form>
              <div className="admin-table">
                <div className="admin-row room-row admin-row-head">
                  <span>Oda</span><span>Tür</span><span>İşlem</span>
                </div>
                {rooms.map((room) => (
                  <div className="admin-row room-row" key={room.id}>
                    <span><b>{room.name}</b><small>#{room.slug}</small></span>
                    <span>{room.type === "PUBLIC" ? "Genel" : "Özel"}</span>
                    <span>
                      <button
                        className="admin-action danger"
                        disabled={room.slug === "genel" || busyId === room.id}
                        onClick={() => void deleteRoom(room)}
                      >
                        Sil
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "logs" && (
            <div className="audit-list">
              {logs.map((log) => (
                <article key={log.id}>
                  <div>
                    <b>{log.action}</b>
                    <span>{log.targetType}{log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}</span>
                  </div>
                  <div>
                    <span>{log.actor?.username ?? "sistem"}</span>
                    <time>{new Date(log.createdAt).toLocaleString("tr-TR")}</time>
                  </div>
                </article>
              ))}
              {logs.length === 0 && <div className="admin-empty">Henüz audit log yok.</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
