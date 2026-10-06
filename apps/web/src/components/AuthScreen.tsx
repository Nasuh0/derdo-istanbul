import { FormEvent, useState } from "react";
import { login, register } from "../lib/api";
import type { Session } from "../types";

interface Props {
  onSession(session: Session): void;
}

export function AuthScreen({ onSession }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = mode === "login"
        ? await login(username, password)
        : await register(username, password);
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">D</div>
        <h1>Derdo İstanbul</h1>
        <p>Topluluğuna bağlan, yazış ve konuş.</p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            Giriş
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            Kayıt
          </button>
        </div>

        <form onSubmit={submit}>
          <label>
            Kullanıcı adı
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={32}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "register" ? 10 : 1}
              maxLength={72}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Bekle..." : mode === "login" ? "Giriş yap" : "Hesap oluştur"}
          </button>
        </form>
      </section>
    </main>
  );
}
