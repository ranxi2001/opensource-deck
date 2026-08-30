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
            <span className="eyebrow">数据来源</span>
            <h2 id="account-title">选择 GitHub 视图</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="关闭数据来源设置"
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
            {data.accessMode === "private" ? "私有" : "公开"}
          </span>
        </div>
        <form className="public-lookup" onSubmit={submit}>
          <div className="account-option-title">
            <Globe2 size={18} />
            <div>
              <strong>公开账户</strong>
              <span>查询该账户近期的公开贡献和候选 Issue。</span>
            </div>
          </div>
          <label>
            <span>GitHub 用户名</span>
            <div>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                spellCheck="false"
                required
              />
              <button type="submit" disabled={busy}>
                加载公开数据
              </button>
            </div>
          </label>
        </form>
        <div className="private-login">
          <div className="account-option-title">
            <LockKeyhole size={18} />
            <div>
              <strong>私有仓库</strong>
              <span>通过服务端保护的 GitHub 会话读取。</span>
            </div>
          </div>
          {data.accessMode === "private" ? (
            <button
              className="private-button"
              type="button"
              onClick={onLogout}
              disabled={busy}
            >
              断开私有会话
            </button>
          ) : (
            <button
              className="private-button"
              type="button"
              onClick={onConnectGitHub}
              disabled={!authConfigured || busy}
              title={authConfigured ? "连接 GitHub" : "尚未配置 OAuth 中继"}
            >
              <ShieldCheck size={16} />
              {authConfigured ? "连接 GitHub" : "尚未配置私有访问"}
            </button>
          )}
        </div>
        {error && <p className="account-error">{error}</p>}
        <div className="account-panel-footer">
          <button type="button" onClick={onUseSnapshot} disabled={busy}>
            使用已部署快照
          </button>
          <span>私有数据不会写入 GitHub Pages 静态文件。</span>
        </div>
      </div>
    </div>
  );
}
