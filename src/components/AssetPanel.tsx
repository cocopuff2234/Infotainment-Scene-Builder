type AssetPanelProps = {
  elementCount: number;
  onAddButton: () => void;
};

export function AssetPanel({
  elementCount,
  onAddButton,
}: AssetPanelProps) {
  return (
    <aside className="panel asset-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Library</p>
          <h2>Assets</h2>
        </div>

        <span className="asset-count">{elementCount}</span>
      </div>

      <p className="panel-description">
        Add building blocks to your scene.
      </p>

      <button className="asset-card" onClick={onAddButton}>
        <span className="asset-icon">+</span>

        <span>
          <strong>Button</strong>
          <small>Interactive control</small>
        </span>
      </button>
    </aside>
  );
}
