import { ASSETS, ASSET_DRAG_MIME, ASSET_GROUPS } from "../data/assets";
import type { AssetType } from "../types/scene";
import "./AssetPanel.css";

type AssetPanelProps = {
  elementCount: number;
  onAddAsset: (type: AssetType) => void;
};

export function AssetPanel({
  elementCount,
  onAddAsset,
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
        Click an asset, or drag it onto the canvas.
      </p>

      {ASSET_GROUPS.map((group) => (
        <section key={group} className="asset-group">
          <h3 className="asset-group-title">{group}</h3>

          {ASSETS.filter((asset) => asset.group === group).map(
            (asset) => (
              <div
                key={asset.type}
                className="asset-card"
                role="button"
                tabIndex={0}
                draggable
                onClick={() => onAddAsset(asset.type)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onAddAsset(asset.type);
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    ASSET_DRAG_MIME,
                    asset.type,
                  );
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span className="asset-icon">{asset.icon}</span>

                <span>
                  <strong>{asset.label}</strong>
                  <small>{asset.description}</small>
                </span>
              </div>
            ),
          )}
        </section>
      ))}
    </aside>
  );
}
