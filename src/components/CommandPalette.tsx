import { ExternalLink, GitPullRequest, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project, WorkItem } from "../domain/schema";

interface CommandPaletteProps {
  open: boolean;
  projects: Project[];
  items: WorkItem[];
  onClose: () => void;
  onSelectProject: (repository: string) => void;
  onSelectItem: (item: WorkItem) => void;
}

export function CommandPalette({
  open,
  projects,
  items,
  onClose,
  onSelectProject,
  onSelectItem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  const normalized = query.trim().toLocaleLowerCase();
  const projectMatches = useMemo(
    () =>
      projects
        .filter((project) =>
          [project.repository, project.alias ?? "", project.description]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalized),
        )
        .slice(0, 5),
    [normalized, projects],
  );
  const itemMatches = useMemo(
    () =>
      items
        .filter((item) =>
          [item.repository, item.title, `#${item.number}`]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalized),
        )
        .slice(0, 8),
    [items, normalized],
  );
  if (!open) return null;

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="查找项目和贡献"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-search">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="查找项目、Issue 或 Pull Request"
            aria-label="查找项目、Issue 或 Pull Request"
          />
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="关闭搜索"
          >
            <X size={17} />
          </button>
        </div>
        <div className="palette-results">
          {projectMatches.length > 0 && (
            <section>
              <h2>项目</h2>
              {projectMatches.map((project) => (
                <button
                  type="button"
                  key={project.repository}
                  onClick={() => {
                    onSelectProject(project.repository);
                    onClose();
                  }}
                >
                  <img src={project.avatarUrl} alt="" />
                  <span>
                    <strong>{project.alias ?? project.name}</strong>
                    <small>{project.repository}</small>
                  </span>
                  <ExternalLink size={15} />
                </button>
              ))}
            </section>
          )}
          {itemMatches.length > 0 && (
            <section>
              <h2>贡献</h2>
              {itemMatches.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                >
                  {item.type === "pull_request" ? (
                    <GitPullRequest size={17} />
                  ) : (
                    <span className="issue-mark" />
                  )}
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.repository} #{item.number}
                    </small>
                  </span>
                  <ExternalLink size={15} />
                </button>
              ))}
            </section>
          )}
          {projectMatches.length === 0 && itemMatches.length === 0 && (
            <div className="palette-empty">没有匹配的公开数据。</div>
          )}
        </div>
      </div>
    </div>
  );
}
