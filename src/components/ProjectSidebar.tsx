import {
  ExternalLink,
  GitFork,
  LockKeyhole,
  Network,
  Pin,
  Workflow,
  X,
} from "lucide-react";
import type { Project } from "../domain/schema";

interface ProjectSidebarProps {
  projects: Project[];
  selected: string | "all";
  view: "work" | "issues";
  candidateCounts: Record<string, number>;
  open: boolean;
  onSelect: (repository: string | "all") => void;
  onClose: () => void;
}

function displayCount(
  project: Project,
  view: "work" | "issues",
  candidateCounts: Record<string, number>,
): number {
  return view === "issues"
    ? (candidateCounts[project.repository] ?? 0)
    : project.counts.needs_action;
}

export function ProjectSidebar({
  projects,
  selected,
  view,
  candidateCounts,
  open,
  onSelect,
  onClose,
}: ProjectSidebarProps) {
  const totalAction = projects.reduce(
    (sum, project) => sum + displayCount(project, view, candidateCounts),
    0,
  );
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="关闭项目列表"
          onClick={onClose}
        />
      )}
      <aside
        className={`project-sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="项目"
      >
        <div className="sidebar-header">
          <div>
            <span className="eyebrow">工作区</span>
            <h2>项目</h2>
          </div>
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={onClose}
            aria-label="关闭项目列表"
          >
            <X size={18} />
          </button>
        </div>
        <button
          className={`project-row all-projects ${selected === "all" ? "project-selected" : ""}`}
          type="button"
          onClick={() => {
            onSelect("all");
            onClose();
          }}
        >
          <span className="project-avatar all-avatar" aria-hidden="true">
            <Network size={18} />
          </span>
          <span className="project-copy">
            <strong>全部项目</strong>
            <small>{projects.length} 个近期活跃仓库</small>
          </span>
          {totalAction > 0 && (
            <span className="project-action-count">{totalAction}</span>
          )}
        </button>
        <div className="project-list">
          {projects.map((project) => (
            <div className="project-entry" key={project.repository}>
              <button
                className={`project-row ${selected === project.repository ? "project-selected" : ""}`}
                type="button"
                onClick={() => {
                  onSelect(project.repository);
                  onClose();
                }}
              >
                <img
                  className="project-avatar"
                  src={project.avatarUrl}
                  alt=""
                  loading="lazy"
                />
                <span className="project-copy">
                  <strong>
                    {project.alias ?? project.name}
                    {project.pinned && (
                      <Pin className="pin-icon" size={12} aria-label="已置顶" />
                    )}
                    {project.visibility === "private" && (
                      <LockKeyhole
                        className="private-icon"
                        size={12}
                        aria-label="私有仓库"
                      />
                    )}
                  </strong>
                  <small>{project.owner}</small>
                </span>
                {displayCount(project, view, candidateCounts) > 0 && (
                  <span className="project-action-count">
                    {displayCount(project, view, candidateCounts)}
                  </span>
                )}
              </button>
              <div
                className="project-quick-links"
                aria-label={`${project.repository} 快捷链接`}
              >
                <a
                  href={project.links.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="仓库"
                  aria-label={`打开 ${project.repository}`}
                >
                  <ExternalLink size={13} />
                </a>
                <a
                  href={project.links.actions}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Actions"
                  aria-label={`打开 ${project.repository} Actions`}
                >
                  <Workflow size={13} />
                </a>
                {project.links.fork && (
                  <a
                    href={project.links.fork}
                    target="_blank"
                    rel="noreferrer noopener"
                    title="你的 Fork"
                    aria-label={`打开你的 ${project.repository} Fork`}
                  >
                    <GitFork size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span>{view === "issues" ? "公开筛选信号" : "GitHub 元数据"}</span>
          <span aria-hidden="true">/</span>
          <span>只读</span>
        </div>
      </aside>
    </>
  );
}
