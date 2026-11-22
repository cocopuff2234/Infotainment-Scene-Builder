import { useId, useRef } from "react";
import type { RuntimeCompatibilityReport } from "../utils/runtimeCompatibility";

type Props = { report: RuntimeCompatibilityReport };

export function RuntimeCompatibilityButton({ report }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        className={`runtime-status-button ${report.compatible ? "is-ready" : "has-errors"}`}
        onClick={() => dialog.current?.showModal()}
        title="Check Raspberry Pi runtime compatibility"
      >
        {report.compatible ? "✓ Pi ready" : "! Pi issues"}
      </button>
      <dialog ref={dialog} className="runtime-status-dialog" aria-labelledby={titleId}>
        <div className="runtime-status-heading">
          <div>
            <p className="eyebrow">Head-unit compatibility</p>
            <h2 id={titleId}>{report.compatible ? "Ready for the Pi runtime" : "Fix before export"}</h2>
          </div>
          <button type="button" className="editor-icon-button" onClick={() => dialog.current?.close()} aria-label="Close compatibility report">×</button>
        </div>
        <p className="runtime-status-summary">{report.sceneCount} scene{report.sceneCount === 1 ? "" : "s"} · {report.elementCount} components · PySide6/QML contract v1</p>
        {report.errors.length > 0 && <section><h3>Errors</h3><ul>{report.errors.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {report.warnings.length > 0 && <section><h3>Notes</h3><ul>{report.warnings.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {report.requiredFiles.length > 0 && <section><h3>Referenced local files</h3><ul className="runtime-path-list">{report.requiredFiles.map((item) => <li key={item}><code>{item}</code>{report.missingFiles.includes(item) ? " · not attached" : " · attached"}</li>)}</ul></section>}
        {!report.errors.length && !report.warnings.length && <p className="runtime-clean-message">No compatibility issues found.</p>}
        <div className="runtime-dialog-actions"><button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>Close</button></div>
      </dialog>
    </>
  );
}
