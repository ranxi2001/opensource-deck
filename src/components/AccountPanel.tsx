import { Globe2, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { DashboardData } from "../domain/schema";

interface AccountPanelProps {
  open: boolean;
  data: DashboardData;
  authConfigured: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPublicLookup: (username: string) => void;
  onConnectGitHub: () => void;
  onUseSnapshot: () => void;
  onLogout: () => void;
}

export function AccountPanel({
  open,
  data,
  authConfigured,
  busy,
  error,
  onClose,
  onPublicLookup,
  onConnectGitHub,
  onUseSnapshot,
  onLogout,
}: AccountPanelProps) {
  const [username, setUsername] = useState(data.sourceUser.login);
  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    onPublicLookup(username);
  }

  return (
    <div className="account-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="account-panel-header">
          <div>
            <span className="eyebrow">Data access</span>
            <h2 id="account-title">Choose a GitHub view</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close data access"
          >
            <X size={18} />
          </button>
        </div>
        <div className="account-current">
          <img src={data.sourceUser.avatarUrl} alt="" />
          <div>
            <strong>{data.sourceUser.name}</strong>
            <span>@{data.sourceUser.login}</span>
          </div>
          <span className={`access-mode access-${data.accessMode}`}>
            {data.accessMode === "private" ? (
              <LockKeyhole size={13} />
            ) : (
              <Globe2 size={13} />
            )}
            {data.accessMode}
          </span>
        </div>
        <form className="public-lookup" onSubmit={submit}>
          <div className="account-option-title">
            <Globe2 size={18} />
            <div>
              <strong>Public profile</strong>
              <span>Look up recent public contribution activity.</span>
            </div>
          </div>
          <label>
            <span>GitHub username</span>
            <div>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                spellCheck="false"
                required
              />
              <button type="submit" disabled={busy}>
                Load public work
              </button>
            </div>
          </label>
        </form>
        <div className="private-login">
          <div className="account-option-title">
            <LockKeyhole size={18} />
            <div>
              <strong>Private repositories</strong>
              <span>Use a server-protected GitHub session.</span>
            </div>
          </div>
          {data.accessMode === "private" ? (
            <button
              className="private-button"
              type="button"
              onClick={onLogout}
              disabled={busy}
            >
              Disconnect private session
            </button>
          ) : (
            <button
              className="private-button"
              type="button"
              onClick={onConnectGitHub}
              disabled={!authConfigured || busy}
              title={
                authConfigured ? "Connect GitHub" : "OAuth relay not configured"
              }
            >
              <ShieldCheck size={16} />
              {authConfigured
                ? "Connect GitHub"
                : "Private access not configured"}
            </button>
          )}
        </div>
        {error && <p className="account-error">{error}</p>}
        <div className="account-panel-footer">
          <button type="button" onClick={onUseSnapshot} disabled={busy}>
            Use deployed snapshot
          </button>
          <span>Private data is never written to the Pages artifact.</span>
        </div>
      </div>
    </div>
  );
}
