import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "../types/scene";
import { signOut } from "../services/auth";
import {
  createProject, deleteProject, getProject, listProjects, ProjectConflictError, saveProject,
  type ProjectSummary,
} from "../services/projects";
import { supabaseConfigured, supabaseConfigurationError } from "../services/supabase";
import { useAuth } from "../services/useAuth";
import { BackLink } from "./BackLink";
import "./ProjectMenu.css";

type Props = { document: Project; onOpen: (document: Project) => void; onNew: () => void };
type Link = { ownerId: string; id: string; revision: number; savedDocument: Project };
type Identity = { ownerId: string | null; generation: number };
type Listing = { ownerId: string; generation: number; projects: ProjectSummary[]; loading: boolean; error: string | null };

const serialize = (document: Project) => JSON.stringify(document);
const snapshot = (document: Project): Project => JSON.parse(serialize(document)) as Project;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function ProjectMenu({ document, onOpen, onNew }: Props) {
  const { session, loading: authLoading, error: authError } = useAuth();
  const ownerId = !authLoading && !authError ? session?.userId ?? null : null;
  const [authIdentity, setAuthIdentity] = useState<Identity>({ ownerId, generation: 0 });
  const identity = useRef(authIdentity);
  const currentDocument = useRef(document);
  const mounted = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const operation = useRef(false);
  const listRequest = useRef(0);
  const [busy, setBusy] = useState<string | null>(null);
  // Deliberately not persisted: local recovery is always an unlinked draft.
  const [link, setLink] = useState<Link | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const activeLink = link?.ownerId === ownerId ? link : null;
  const dirty = !activeLink || serialize(activeLink.savedDocument) !== serialize(document);
  const cloudReady = supabaseConfigured && !!ownerId;

  // Reset owner-scoped state before rendering another account's UI.
  if (authIdentity.ownerId !== ownerId) {
    setAuthIdentity({ ownerId, generation: authIdentity.generation + 1 });
    setLink(null);
    setListing(null);
    setError(null);
    setMessage(null);
    setConflict(false);
  }

  useLayoutEffect(() => {
    identity.current = authIdentity;
    currentDocument.current = document;
  }, [authIdentity, document]);

  const isCurrent = useCallback((started: Identity) => mounted.current &&
    started.ownerId === identity.current.ownerId && started.generation === identity.current.generation, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; listRequest.current += 1; };
  }, []);


  const refreshList = useCallback(async () => {
    const started = { ...identity.current };
    if (!supabaseConfigured || !started.ownerId) return;
    const request = ++listRequest.current;
    setListing({ ownerId: started.ownerId, generation: started.generation, projects: [], loading: true, error: null });
    try {
      const projects = await listProjects(started.ownerId);
      if (!isCurrent(started) || request !== listRequest.current) return;
      setListing({ ownerId: started.ownerId, generation: started.generation,
        projects: projects.filter((project) => project.ownerId === started.ownerId), loading: false, error: null });
    } catch (cause) {
      if (!isCurrent(started) || request !== listRequest.current) return;
      setListing({ ownerId: started.ownerId, generation: started.generation, projects: [], loading: false, error: errorMessage(cause) });
    }
  }, [isCurrent]);

  useEffect(() => {
    if (isOpen && cloudReady) void refreshList();
  }, [isOpen, cloudReady, ownerId, refreshList]);

  function showManager() {
    if (!dialog.current?.open) dialog.current?.showModal();
    setIsOpen(true);
  }

  // One guard covers opens, writes, deletes, and logout, including rapid clicks before React renders.
  async function runOperation(label: string, action: (started: Identity) => Promise<void>) {
    if (operation.current || !supabaseConfigured || !identity.current.ownerId) return;
    const started = { ...identity.current };
    operation.current = true;
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      await action(started);
    } catch (cause) {
      if (isCurrent(started)) {
        if (cause instanceof ProjectConflictError) {
          setConflict(true);
          setError("The cloud version changed, was deleted, or is no longer accessible. Nothing was overwritten. Save a copy to keep your design, or refresh the list and open the cloud version.");
        } else {
          setError(errorMessage(cause));
        }
      }
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  function save(copy: boolean) {
    if (!cloudReady) { showManager(); return; }
    showManager();
    void runOperation(copy ? "Saving copy…" : "Saving…", async (started) => {
      const savedDocument = snapshot(currentDocument.current);
      const target = !copy && activeLink?.ownerId === started.ownerId ? activeLink : null;
      const result = target
        ? await saveProject(target.id, target.revision, savedDocument, started.ownerId ?? undefined)
        : await createProject(savedDocument, started.ownerId ?? undefined);
      if (!isCurrent(started)) return;
      if (result.ownerId !== started.ownerId) throw new Error("The account changed while saving. Your local design is unchanged. Refresh the project list.");
      setLink({ ownerId: result.ownerId, id: result.id, revision: result.revision, savedDocument });
      setConflict(false);
      setMessage("Saved to cloud. Any edits made during the save remain unsaved.");
      await refreshList();
    });
  }

  function openProject(project: ProjectSummary) {
    if (operation.current || project.ownerId !== identity.current.ownerId) return;
    const before = serialize(currentDocument.current);
    if (!window.confirm(`Open “${project.name}” and replace the current design? Save first if you want to keep your current work.`)) return;
    void runOperation("Opening…", async (started) => {
      const result = await getProject(project.id, started.ownerId ?? undefined);
      if (!isCurrent(started)) return;
      if (result.ownerId !== started.ownerId) throw new Error("This project does not belong to the current account.");
      const latest = serialize(currentDocument.current);
      if (latest !== before && latest !== serialize(result.document) &&
        !window.confirm("Your design changed while this project was loading. Replace those latest edits with the cloud project?")) return;
      if (!isCurrent(started)) return;
      const savedDocument = snapshot(result.document);
      onOpen(result.document);
      setLink({ ownerId: result.ownerId, id: result.id, revision: result.revision, savedDocument });
      setConflict(false);
      setMessage("Opened cloud project.");
      dialog.current?.close();
    });
  }

  function removeProject(project: ProjectSummary) {
    if (operation.current || project.ownerId !== identity.current.ownerId ||
      !window.confirm(`Permanently delete “${project.name}” from the cloud? The current local design will not be removed.`)) return;
    void runOperation("Deleting…", async (started) => {
      await deleteProject(project.id, project.revision, started.ownerId ?? undefined);
      if (!isCurrent(started)) return;
      setLink((current) => current?.ownerId === started.ownerId && current.id === project.id ? null : current);
      setMessage("Cloud project deleted. Your current design is still available locally.");
      await refreshList();
    });
  }

  function newProject() {
    if (operation.current || !window.confirm("Start a new design and replace the current design? Save first if you want to keep your current work.")) return;
    onNew();
    setLink(null);
    setConflict(false);
    setError(null);
    setMessage("New local draft. Its first cloud save will create a new project.");
  }

  const visibleListing = listing?.ownerId === ownerId && listing.generation === authIdentity.generation ? listing : null;
  const projects = visibleListing?.projects ?? [];
  const selected = projects.filter((project) => project.id === activeLink?.id);
  const others = projects.filter((project) => project.id !== activeLink?.id);

  function projectRows(rows: ProjectSummary[]) {
    return <ul className="project-menu-list">{rows.map((project) => (
      <li key={project.id}>
        <div className="project-menu-record">
          <strong>{project.id === activeLink?.id ? document.name : project.name}</strong>
          <small>Updated {new Date(project.updatedAt).toLocaleString()} · Revision {project.revision}</small>
        </div>
        <div className="project-menu-actions">
          <button type="button" disabled={!!busy} onClick={() => openProject(project)} aria-label={`Open ${project.name}`}>Open</button>
          <button type="button" className="project-menu-danger" disabled={!!busy} onClick={() => removeProject(project)} aria-label={`Delete ${project.name}`}>Delete</button>
        </div>
      </li>
    ))}</ul>;
  }

  return <>
    <div className="project-menu-toolbar" role="group" aria-label="Project and account">
      <button type="button" className="project-menu-save" disabled={!!busy || authLoading} onClick={() => save(false)}>Save cloud</button>
      <button type="button" onClick={showManager} aria-haspopup="dialog">Open</button>
      <button type="button" disabled={!!busy} onClick={newProject}>New</button>
      {session ? <button type="button" onClick={showManager} aria-haspopup="dialog" className="project-menu-account">{session.name}</button>
        : <a href="/login">Sign in</a>}
      <button type="button" className="project-menu-status" onClick={showManager} aria-haspopup="dialog">
        {authLoading ? "Checking account…" : !supabaseConfigured ? "Local guest · cloud not configured" : activeLink ? dirty ? "Unsaved changes" : "Saved to cloud" : "Local draft"}
      </button>
    </div>
    <dialog ref={dialog} className="project-menu-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onClose={() => setIsOpen(false)}>
      <header className="project-menu-heading">
        <div><h2 id={titleId}>Projects & account</h2><p id={descriptionId}>Save explicitly to cloud, or keep working locally. No cloud autosave.</p></div>
        <BackLink autoFocus onClick={() => dialog.current?.close()}>Back to editor</BackLink>
      </header>
      <section className="project-menu-section" aria-label="Current design" aria-busy={!!busy}>
        <h3>Current design</h3>
        <p className="project-menu-current"><strong>{document.name}</strong><span>{activeLink ? dirty ? "Unsaved changes" : "Saved to cloud" : "Unlinked local draft"}</span></p>
        <div className="project-menu-actions">
          <button type="button" className="project-menu-save" disabled={!cloudReady || !!busy} onClick={() => save(false)}>Save current</button>
          <button type="button" disabled={!cloudReady || !!busy} onClick={() => save(true)}>Save copy</button>
          <button type="button" disabled={!!busy} onClick={newProject}>New design</button>
        </div>
        <p className="project-menu-note">{activeLink ? "Saving updates the linked cloud project, including its name." : "The first save creates a new cloud project. Reloaded local recovery drafts are never linked to an older cloud revision."}</p>
      </section>
      <div aria-live="polite" role="status" className="project-menu-feedback">{busy || message}</div>
      {error && <div role="alert" className="project-menu-error"><p>{error}</p>{conflict && <div className="project-menu-actions">
        <button type="button" disabled={!cloudReady || !!busy} onClick={() => save(true)}>Save copy</button>
        <button type="button" disabled={!cloudReady || !!busy || visibleListing?.loading} onClick={() => void refreshList()}>Refresh list</button>
      </div>}</div>}
      <section className="project-menu-section" aria-label="Account">
        <h3>Account</h3>
        {authLoading ? <p>Checking your account…</p> : session ? <>
          <p>{session.name}{session.email && <> · {session.email}</>}</p>
          <button type="button" disabled={!!busy || !cloudReady} onClick={() => {
            void runOperation("Signing out…", async () => { await signOut(); });
          }}>Sign out</button>
          <p className="project-menu-note">Signing out keeps the current design locally and removes its cloud linkage.</p>
        </> : <><p>Guest mode: the local editor stays usable without an account. Sign in to save and open cloud projects.</p>
          <div className="project-menu-actions"><a href="/login">Sign in</a><a href="/login?mode=signup">Create account</a></div></>}
        {authError && <p role="alert" className="project-menu-error">{authError}</p>}
        {!supabaseConfigured && <div className="project-menu-configuration">
          <strong>Cloud is not configured</strong>
          <p>{supabaseConfigurationError}</p>
          <p>Keep editing as a local guest. To enable cloud accounts and projects, configure <code>.env.local</code> with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (or <code>VITE_SUPABASE_ANON_KEY</code>), then restart the development server. Use only a public browser key, never a service-role or secret key.</p>
        </div>}
      </section>
      {cloudReady && <section className="project-menu-section" aria-labelledby={`${titleId}-owned`} aria-busy={visibleListing?.loading ?? true}>
        <div className="project-menu-heading"><h3 id={`${titleId}-owned`}>Your cloud projects</h3>
          <button type="button" disabled={!!busy || visibleListing?.loading} onClick={() => void refreshList()}>Refresh list</button></div>
        {!visibleListing || visibleListing.loading ? <p role="status">Loading projects…</p> : visibleListing.error ?
          <div role="alert"><p className="project-menu-error">{visibleListing.error}</p><button type="button" disabled={!!busy} onClick={() => void refreshList()}>Retry</button></div> :
          projects.length === 0 ? <p>No cloud projects yet. Save your current design to create one.</p> : <>
            {selected.length > 0 && <><h4>Linked to this design</h4>{projectRows(selected)}</>}
            {others.length > 0 && <><h4>{selected.length ? "Other projects" : "Owned by you"}</h4>{projectRows(others)}</>}
          </>}
      </section>}
    </dialog>
  </>;
}
