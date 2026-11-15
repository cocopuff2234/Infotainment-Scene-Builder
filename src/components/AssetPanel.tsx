import type { ElementType, SceneElement } from "../types/scene";

const assets: { type: ElementType; icon: string; label: string; description: string }[] = [
  { type: "map", icon: "◇", label: "Navigation map", description: "A route worth taking" },
  { type: "music", icon: "♫", label: "Media player", description: "Set the soundtrack" },
  { type: "volume", icon: "◉", label: "Volume knob", description: "A tactile finishing touch" },
  { type: "climate", icon: "✣", label: "Climate control", description: "Find your comfort zone" },
  { type: "button", icon: "ϟ", label: "Action button", description: "One tap. More possibilities." },
];

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
    <aside className="panel asset-panel">
      <div className="panel-heading"><div><p className="eyebrow">Your building blocks</p><h2>Components</h2></div><span className="asset-count">05</span></div>
      <p className="panel-description">Small pieces. A whole new experience.<br />Click a component to add it.</p>
      <div className="editor-asset-list">
        {assets.map((asset) => <button key={asset.type} className="asset-card" onClick={() => onAdd(asset.type)} disabled={preview}>
          <span className={`asset-icon asset-icon-${asset.type}`} aria-hidden="true">{asset.icon}</span>
          <span><strong>{asset.label}</strong><small>{asset.description}</small></span><span className="asset-add" aria-hidden="true">+</span>
        </button>)}
      </div>
      <div className="editor-layers">
        <div className="panel-heading"><h3>Scene layers</h3><span>{elements.length}</span></div>
        <p className="editor-microcopy">Front to back · select to inspect</p>
        <div className="editor-layer-list">
          {[...elements].reverse().map((element) => <button key={element.id} className={`editor-layer${selectedId === element.id ? " selected" : ""}`} onClick={() => onSelect(element.id)} disabled={preview}>
            <span aria-hidden="true">{assets.find((a) => a.type === element.type)?.icon}</span><span>{element.text}</span><span className="editor-layer-type">{element.type}</span>
          </button>)}
          {elements.length === 0 && <p className="empty-state">A fresh canvas. Add a component above to get started.</p>}
        </div>
      </div>
      <div className="editor-library-footer"><span className="editor-offline-badge">● BUILT FOR EXPLORATION</span><p>Everything runs locally. The map and media are design previews.</p><button className="editor-text-button" onClick={onReset} disabled={preview}>↻ Restore starter scene</button></div>
    </aside>
  );
}
