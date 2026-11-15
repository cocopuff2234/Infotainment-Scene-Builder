type TopBarProps = {
  saveStatus: string;
  preview: boolean;
  onTogglePreview: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function TopBar({ saveStatus, preview, onTogglePreview, onExport, onUndo, onRedo, canUndo, canRedo }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="editor-brand-group">
        <a className="editor-home" href="/" aria-label="Back to home">▣</a>
        <div><p className="eyebrow">Infotainment Scene Builder</p><h1>My cockpit <span className="editor-project-badge">PERSONAL WORKSPACE</span></h1></div>
      </div>
      <div className="topbar-actions">
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
