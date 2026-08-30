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
  open: boolean;
  onSelect: (repository: string | "all") => void;
  onClose: () => void;
}

function actionCount(project: Project): number {
  return project.counts.needs_action;
}

export function ProjectSidebar({
  projects,
  selected,
  open,
  onSelect,
  onClose,
}: ProjectSidebarProps) {
  const totalAction = projects.reduce(
    (sum, project) => sum + actionCount(project),
    0,
  );
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close projects"
          onClick={onClose}
        />
      )}
      <aside
        className={`project-sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="Projects"
      >
        <div className="sidebar-header">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>Projects</h2>
          </div>
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={onClose}
            aria-label="Close projects"
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
            <strong>All projects</strong>
            <small>{projects.length} active repositories</small>
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
                      <Pin className="pin-icon" size={12} aria-label="Pinned" />
                    )}
                    {project.visibility === "private" && (
                      <LockKeyhole
                        className="private-icon"
                        size={12}
                        aria-label="Private repository"
                      />
                    )}
                  </strong>
                  <small>{project.owner}</small>
                </span>
                {actionCount(project) > 0 && (
                  <span className="project-action-count">
                    {actionCount(project)}
                  </span>
                )}
              </button>
              <div
                className="project-quick-links"
                aria-label={`${project.repository} links`}
              >
                <a
                  href={project.links.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Repository"
                  aria-label={`Open ${project.repository}`}
                >
                  <ExternalLink size={13} />
                </a>
                <a
                  href={project.links.actions}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Actions"
                  aria-label={`Open ${project.repository} Actions`}
                >
                  <Workflow size={13} />
                </a>
                {project.links.fork && (
                  <a
                    href={project.links.fork}
                    target="_blank"
                    rel="noreferrer noopener"
                    title="Your fork"
                    aria-label={`Open your ${project.repository} fork`}
                  >
                    <GitFork size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span>Public data</span>
          <span aria-hidden="true">/</span>
          <span>Read only</span>
        </div>
      </aside>
    </>
  );
}
