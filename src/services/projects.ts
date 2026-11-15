import type { Project } from "../types/scene";
import { parseProject } from "../utils/projectDocument";
import { requireSupabase } from "./supabase";

export interface ProjectSummary {
  id: string;
  ownerId: string;
  name: string;
  revision: number;
  updatedAt: string;
}

export interface CloudProject extends ProjectSummary {
  document: Project;
}

export class ProjectConflictError extends Error {
  constructor() {
    super("This project changed, was deleted, or is no longer accessible. Reload before trying again.");
    this.name = "ProjectConflictError";
  }
}

const SUMMARY_COLUMNS = "id,owner_id,name,revision,updated_at";
const PROJECT_COLUMNS = `${SUMMARY_COLUMNS},document`;
const PAGE_SIZE = 100;

function failure(operation: string, error: { message: string }): Error {
  return new Error(`Could not ${operation}: ${error.message}`, { cause: error });
}

async function authenticatedClient(expectedOwnerId?: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw failure("verify your sign-in", error);
  if (!data.user) throw new Error("Sign in to access cloud projects.");
  if (expectedOwnerId && data.user.id !== expectedOwnerId) throw new Error("Your account changed during this request. Please try again.");
  return { client, ownerId: data.user.id };
}

function summaryFromRow(input: unknown): ProjectSummary {
  if (typeof input !== "object" || input === null) {
    throw new Error("The cloud returned an invalid project summary.");
  }
  const row = input as Record<string, unknown>;
  if (
    typeof row.id !== "string" || !row.id ||
    typeof row.owner_id !== "string" || !row.owner_id ||
    typeof row.name !== "string" ||
    typeof row.revision !== "number" || !Number.isSafeInteger(row.revision) || row.revision < 1 ||
    typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))
  ) {
    throw new Error("The cloud returned an invalid project summary. Check the projects database schema.");
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

function projectFromRow(input: unknown): CloudProject {
  const summary = summaryFromRow(input);
  const row = input as Record<string, unknown>;
  let document: Project;
  try {
    document = parseProject(row.document);
  } catch (error) {
    throw new Error("The cloud project document is invalid or unsupported.", { cause: error });
  }
  if (document.name !== summary.name) {
    throw new Error("The cloud project name does not match its document. Check the projects database schema.");
  }
  return { ...summary, document };
}

function validateWrite(id: string, expectedRevision: number): void {
  if (!id.trim()) throw new Error("A project ID is required.");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision > 2147483647) {
    throw new Error("A valid positive project revision is required.");
  }
}

/** Fetches all summaries in metadata-only pages, newest first (not a snapshot during concurrent writes). */
export async function listProjects(expectedOwnerId?: string): Promise<ProjectSummary[]> {
  const { client, ownerId } = await authenticatedClient(expectedOwnerId);
  const summaries: ProjectSummary[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client.from("projects")
      .select(SUMMARY_COLUMNS)
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw failure("list cloud projects", error);
    if (!data) throw new Error("The cloud returned no project list.");
    summaries.push(...data.map(summaryFromRow));
    if (data.length < PAGE_SIZE) return summaries;
  }
}

export async function getProject(id: string, expectedOwnerId?: string): Promise<CloudProject> {
  if (!id.trim()) throw new Error("A project ID is required.");
  const { client, ownerId } = await authenticatedClient(expectedOwnerId);
  const { data, error } = await client.from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw failure("open cloud project", error);
  if (!data) throw new Error("This project was deleted or is no longer accessible. Refresh the project list.");
  return projectFromRow(data);
}

export async function createProject(document: Project, expectedOwnerId?: string): Promise<CloudProject> {
  const validated = parseProject(document);
  const { client, ownerId } = await authenticatedClient(expectedOwnerId);
  const { data, error } = await client.from("projects")
    .insert({ owner_id: ownerId, name: validated.name, document: validated })
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw failure("create cloud project", error);
  return projectFromRow(data);
}

export async function saveProject(
  id: string,
  expectedRevision: number,
  document: Project,
  expectedOwnerId?: string,
): Promise<CloudProject> {
  validateWrite(id, expectedRevision);
  const validated = parseProject(document);
  const { client, ownerId } = await authenticatedClient(expectedOwnerId);
  const { data, error } = await client.from("projects")
    .update({ name: validated.name, document: validated })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .eq("revision", expectedRevision)
    .select(PROJECT_COLUMNS)
    .maybeSingle();
  if (error) throw failure("save cloud project", error);
  if (!data) throw new ProjectConflictError();
  return projectFromRow(data);
}

export async function deleteProject(id: string, expectedRevision: number, expectedOwnerId?: string): Promise<void> {
  validateWrite(id, expectedRevision);
  const { client, ownerId } = await authenticatedClient(expectedOwnerId);
  const { data, error } = await client.from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId)
    .eq("revision", expectedRevision)
    .select("id")
    .maybeSingle();
  if (error) throw failure("delete cloud project", error);
  if (!data) throw new ProjectConflictError();
}
