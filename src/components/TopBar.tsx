export function TopBar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Infotainment Scene Builder</p>
        <h1>Scene Editor</h1>
      </div>

      <div className="topbar-actions">
        <span className="save-status">Unsaved changes</span>

        <button className="secondary-button">
          Export JSON
        </button>
      </div>
    </header>
  );
}
