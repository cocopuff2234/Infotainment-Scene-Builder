import type { ChangeEvent, ReactNode } from "react";
import { useRef } from "react";
import type { RuntimeTheme } from "../types/scene";
import type { RuntimeCompatibilityReport } from "../utils/runtimeCompatibility";
import { BackLink } from "./BackLink";
import { RuntimeCompatibilityButton } from "./RuntimeCompatibilityButton";

type TopBarProps = {
  projectName: string;
  onRename: (name: string) => void;
  projectActions: ReactNode;
  saveStatus: string;
  preview: boolean;
  onTogglePreview: () => void;
  onExportJson: () => void;
  onExportPackage: () => void;
  onImportJson: (file: File) => void;
  theme: RuntimeTheme;
  onToggleTheme: () => void;
  compatibility: RuntimeCompatibilityReport;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function TopBar({ projectName, onRename, projectActions, saveStatus, preview, onTogglePreview, onExportJson, onExportPackage, onImportJson, theme, onToggleTheme, compatibility, onUndo, onRedo, canUndo, canRedo }: TopBarProps) {
  const importInput = useRef<HTMLInputElement>(null);
  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImportJson(file);
  }

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
        <RuntimeCompatibilityButton report={compatibility} />
        <span className="save-status" role="status"><span className="editor-status-dot" />{saveStatus}</span>
        <div className="editor-history">
          <button className="editor-icon-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘/Ctrl Z)">↶</button>
          <button className="editor-icon-button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)">↷</button>
        </div>
        <button className="secondary-button" onClick={onToggleTheme} disabled={preview} title="Use this theme in the editor and Pi runtime">{theme === "light" ? "☾ Dark" : "☀ Light"}</button>
        <button className={`secondary-button preview-toggle${preview ? " active" : ""}`} onClick={onTogglePreview} aria-pressed={preview}>{preview ? "◈ Back to edit" : "▷ Preview"}</button>
        <input ref={importInput} className="sr-only" type="file" accept="application/json,.json" onChange={importFile} />
        <button className="secondary-button" onClick={() => importInput.current?.click()} disabled={preview}>Import JSON</button>
        <button className="secondary-button" onClick={onExportJson}>JSON</button>
        <button className="editor-primary-button" onClick={onExportPackage}>Export package <span aria-hidden="true">↗</span></button>
      </div>
    </header>
  );
}
