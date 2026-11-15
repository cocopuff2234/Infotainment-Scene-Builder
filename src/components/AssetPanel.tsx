import type { ElementType, SceneElement } from "../types/scene";
import { ASSETS, ASSET_BY_TYPE, ASSET_DRAG_MIME, ASSET_GROUPS, GROUP_ACCENT } from "../data/assets";
import "./AssetPanel.css";

type AssetPanelProps = {
  elements: SceneElement[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (type: ElementType) => void;
  onReset: () => void;
  preview: boolean;
};

export function AssetPanel({ elements, selectedId, onSelect, onAdd, onReset, preview }: AssetPanelProps) {
  return (
    <aside className="panel asset-panel editor-asset-panel">
      <div className="panel-heading"><div><p className="eyebrow">Your building blocks</p><h2>Components</h2></div><span className="asset-count">{String(ASSETS.length).padStart(2, "0")}</span></div>
      <p className="panel-description">Small pieces. A whole new experience.<br />Click or drag a component to add it.</p>
      <div className="editor-asset-library" role="region" aria-label="Component library" tabIndex={0}>
        {ASSET_GROUPS.map((group) => (
          <section className="asset-group" key={group}>
            <h3 className="asset-group-title" style={{ color: GROUP_ACCENT[group] }}>{group}</h3>
            <div className="editor-asset-list">
              {ASSETS.filter((asset) => asset.group === group).map((asset) => (
                <button
                  key={asset.type}
                  type="button"
                  className="asset-card"
                  onClick={() => onAdd(asset.type)}
                  draggable={!preview}
                  onDragStart={(event) => {
                    if (preview) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.setData(ASSET_DRAG_MIME, asset.type);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  disabled={preview}
                >
                  <span className={`asset-icon asset-icon-${asset.type}`} aria-hidden="true">{asset.icon}</span>
                  <span className="asset-card-copy"><strong>{asset.label}</strong><small>{asset.description}</small></span>
                  <span className="asset-add" aria-hidden="true">+</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="editor-layers">
        <div className="panel-heading"><h3>Scene layers</h3><span>{elements.length}</span></div>
        <p className="editor-microcopy">Front to back · select to inspect</p>
        <div className="editor-layer-list">
          {[...elements].reverse().map((element) => <button key={element.id} type="button" className={`editor-layer${selectedId === element.id ? " selected" : ""}`} onClick={() => onSelect(element.id)} disabled={preview}>
            <span aria-hidden="true">{ASSET_BY_TYPE[element.type]?.icon ?? "◇"}</span><span>{element.text || ASSET_BY_TYPE[element.type]?.label || element.type}</span><span className="editor-layer-type">{element.type}</span>
          </button>)}
          {elements.length === 0 && <p className="empty-state">A fresh canvas. Add a component above to get started.</p>}
        </div>
      </div>
      <div className="editor-library-footer"><span className="editor-offline-badge">● BUILT FOR EXPLORATION</span><p>Everything runs locally. The map and media are design previews.</p><button type="button" className="editor-text-button" onClick={onReset} disabled={preview}>↻ Restore starter scene</button></div>
    </aside>
  );
}
