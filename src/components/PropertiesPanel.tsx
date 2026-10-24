import type { SceneElement } from "../types/scene";

type PropertiesPanelProps = {
  selectedElement: SceneElement | undefined;
};

export function PropertiesPanel({
  selectedElement,
}: PropertiesPanelProps) {
  return (
    <aside className="panel properties-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Inspector</p>
          <h2>Properties</h2>
        </div>
      </div>

      {selectedElement ? (
        <div className="properties-content">
          <div className="selected-preview">
            <span className="preview-dot" />

            <div>
              <strong>{selectedElement.text}</strong>
              <small>{selectedElement.type}</small>
            </div>
          </div>

          <label>
            Element ID
            <input value={selectedElement.id} readOnly />
          </label>

          <div className="property-grid">
            <label>
              X
              <input
                value={Math.round(selectedElement.x)}
                readOnly
              />
            </label>

            <label>
              Y
              <input
                value={Math.round(selectedElement.y)}
                readOnly
              />
            </label>
          </div>

          <div className="property-grid">
            <label>
              Width
              <input value={selectedElement.width} readOnly />
            </label>

            <label>
              Height
              <input value={selectedElement.height} readOnly />
            </label>
          </div>

          <p className="hint">
            Drag the element on the canvas to update its position.
          </p>
        </div>
      ) : (
        <p className="empty-state">
          Select an element to inspect it.
        </p>
      )}
    </aside>
  );
}
