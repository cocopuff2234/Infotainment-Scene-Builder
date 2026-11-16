import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { IMAGE_ACCEPT, prepareImage } from "../utils/imageUpload";
import type { UploadedImage } from "../utils/imageUpload";
import "./ImageUpload.css";

type ImageUploadProps = {
  onUpload: (image: UploadedImage) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
};

export function ImageUpload({ onUpload, disabled = false, label = "Upload image", compact = false }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadCallback = useRef(onUpload);
  useLayoutEffect(() => { uploadCallback.current = onUpload; }, [onUpload]);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const helperId = useId();
  const errorId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Invalidate the captured request even if StrictMode mounts this instance again.
      requestRef.current += 1;
    };
  }, []);

  async function upload(file: File) {
    if (disabled || loading || !mountedRef.current) return;
    const request = ++requestRef.current;
    const isCurrent = () => mountedRef.current && requestRef.current === request;
    setLoading(true);
    setError("");
    try {
      const image = await prepareImage(file);
      if (!isCurrent()) return;
      await uploadCallback.current(image);
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : "The image could not be uploaded. Please try again.");
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  return (
    <div className={`image-upload${compact ? " image-upload--compact" : ""}`} aria-busy={loading}>
      <input
        ref={inputRef}
        className="image-upload-input"
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled || loading}
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        className="image-upload-button"
        disabled={disabled || loading}
        aria-describedby={`${helperId}${error ? ` ${errorId}` : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <span aria-hidden="true">↑</span>{loading ? "Processing image…" : label}
      </button>
      {loading && <button type="button" className="image-upload-cancel" onClick={() => { requestRef.current += 1; setLoading(false); setError(""); }}>Cancel upload</button>}
      <p className="image-upload-helper" id={helperId}>PNG, JPEG or WebP · max 10 MB (10 MiB). Optimized locally and embedded in your project and exports.</p>
      <span className="sr-only" role="status">{loading ? "Processing image. Please wait." : ""}</span>
      {error && <p className="image-upload-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}
