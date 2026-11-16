import type { ReactNode } from "react";
import { BackLink } from "./BackLink";

type TopBarProps = {
  projectName: string;
  onRename: (name: string) => void;
  projectActions: ReactNode;
  saveStatus: string;
  preview: boolean;
  onTogglePreview: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function TopBar({ projectName, onRename, projectActions, saveStatus, preview, onTogglePreview, onExport, onUndo, onRedo, canUndo, canRedo }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="editor-brand-group">
        <BackLink href="/" title="Back to home">Home</BackLink>
        <div><p className="eyebrow">Infotainment Scene Builder</p><h1><button className="editor-project-name" title="Rename project" disabled={preview} onClick={() => {
                  const name = window.prompt("Project name", projectName);
                  if (name?.trim()) onRename(name.trim().slice(0, 100));
                }}>{projectName} <span aria-hidden="true">✎</span></button><span className="editor-project-badge">PERSONAL WORKSPACE</span></h1></div>
      </div>
      <div className="topbar-actions">
        {projectActions}
        <span className="save-status" role="status"><span className="editor-status-dot" />{saveStatus}</span>
        <div className="editor-history">
          <button className="editor-icon-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘/Ctrl Z)">↶</button>
          <button className="editor-icon-button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)">↷</button>
        </div>
        <button className={`secondary-button preview-toggle${preview ? " active" : ""}`} onClick={onTogglePreview} aria-pressed={preview}>{preview ? "◈ Back to edit" : "▷ Preview"}</button>
        <button className="editor-primary-button" onClick={onExport}>Export JSON <span aria-hidden="true">↗</span></button>
      </div>
    </header>
  );
}
