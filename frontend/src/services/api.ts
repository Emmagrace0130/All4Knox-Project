/**
 * FastAPI client.
 *
 * In production the SPA and the API share an origin — nginx proxies `/api` to
 * the backend container — so the default base URL is relative and no CORS
 * preflight happens on a clinical request. `VITE_API_BASE_URL` overrides it for
 * `npm run dev` against a containerised API.
 */
import type {
  ClinicalGuidance,
  InductionOutcome,
  InductionPathway,
  PrescribingInput,
  PrescribingPathway,
  ReferralOrganization,
  UDSAnalyteKey,
  UDSPanel,
  UDSRule,
} from '../types/clinical';

export const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Requests fail fast: a clinician must not sit behind a hung fetch. */
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  // Declared explicitly rather than as a constructor parameter property:
  // tsconfig sets `erasableSyntaxOnly`, which forbids that syntax.
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      // The session cookie identifies visitors and signed-in users alike, so
      // it must ride along even cross-origin during `npm run dev`.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!response.ok) {
      throw new ApiError(
        `${init.method ?? 'GET'} ${path} failed (${response.status})`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`${path} timed out after ${timeoutMs}ms`);
    }
    throw new ApiError(
      error instanceof Error ? error.message : `${path} failed`,
    );
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(path: string, body: unknown, timeoutMs?: number) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, timeoutMs);

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export interface HealthResponse {
  status: string;
  appEnv: string;
  contentVersion: string;
  bundles: Record<string, number>;
  assistantEnabled: boolean;
}

export const getHealth = () => request<HealthResponse>('/health', {}, 4000);

/* ------------------------------------------------------------------ */
/* Clinical tools — response shapes mirror src/types/clinical.ts        */
/* ------------------------------------------------------------------ */

interface Versioned {
  contentVersion: string;
  sourceDocument: string;
}

export interface UDSResponse extends Versioned {
  panel: UDSPanel;
  primary: UDSRule | null;
  additional: UDSRule[];
  unaddressed: UDSAnalyteKey[];
}

export const interpretUDS = (panel: UDSPanel) =>
  post<UDSResponse>('/uds/interpret', panel);

export interface PrescribingResponse extends Versioned {
  input: PrescribingInput;
  pathway: PrescribingPathway | null;
  complete: boolean;
  needsBesmart: boolean;
}

export const evaluatePrescribing = (input: PrescribingInput) =>
  post<PrescribingResponse>('/prescribing/evaluate', input);

export interface InductionResponse extends Versioned {
  input: { situation: string | null; answers: Record<string, string> };
  pathway: InductionPathway | null;
  outcome: InductionOutcome | null;
  pendingFollowUps: InductionPathway['followUps'];
  complete: boolean;
}

export const evaluateInduction = (
  situation: string | null,
  answers: Record<string, string>,
) => post<InductionResponse>('/induction/evaluate', { situation, answers });

export interface DosingResponse extends Versioned {
  input: { cravings: boolean | null };
  overview: Record<string, unknown>;
  limits: Record<string, unknown>;
  guidance: ClinicalGuidance | null;
}

export const reviewDosing = (cravings: boolean | null) =>
  post<DosingResponse>('/dosing/review', { cravings });

export interface ReferralMatch {
  organization: ReferralOrganization;
  uncertain: boolean;
  unverifiedAgainst: string[];
}

export interface ReferralsResponse extends Versioned {
  matches: ReferralMatch[];
  organizations: ReferralOrganization[];
  total: number;
  matched: number;
  notExhaustiveNotice: string;
}

export const getReferrals = (params: {
  region?: string | null;
  coverage?: string | null;
  needs?: string[];
}) => {
  const search = new URLSearchParams();
  if (params.region) search.set('region', params.region);
  if (params.coverage) search.set('coverage', params.coverage);
  for (const need of params.needs ?? []) search.append('need', need);
  const query = search.toString();
  return request<ReferralsResponse>(`/referrals${query ? `?${query}` : ''}`);
};

/* ------------------------------------------------------------------ */
/* Assistant                                                           */
/* ------------------------------------------------------------------ */

export interface Citation {
  id: string;
  index: number;
  title: string;
  module: string;
  route: string;
  sourceDocument: string;
  sourceLocation: string | null;
  slide: number | null;
  contentVersion: string;
  entryStatus: string;
  reviewState: string;
  score: number;
  // Present on answers since the reference collections were added. Older
  // stored conversations lack them, so every consumer must treat them as
  // optional and fall back to "toolkit".
  collection?: 'toolkit' | 'tn_guidelines' | 'tenncare_besmart';
  authority?: string;
  issuer?: string | null;
  published?: string | null;
  pages?: string | null;
  method?: 'extracted' | 'transcribed' | null;
  currencyNote?: string | null;
}

export interface AssistantStatus {
  enabled: boolean;
  model?: string;
  embeddingModel?: string;
  topK?: number;
  minScore?: number;
  index?: { ready: boolean; chunks: number; dimensions: number };
  ollama?: { reachable: boolean; modelAvailable?: boolean; error?: string };
  lastError?: string | null;
  reason?: string;
}

export const getAssistantStatus = () =>
  request<AssistantStatus>('/assistant/status', {}, 10000);

export interface AssistantAnswer {
  answer: string;
  grounded: boolean;
  refused: boolean;
  citations: Citation[];
  question: string;
  contentVersion: string;
  sourceDocument: string;
  decisionSupportLabel: string;
  decisionSupportNote: string;
}

/** Non-streaming ask. The model can be slow, so the timeout is generous. */
export const askAssistant = (question: string) =>
  post<AssistantAnswer>('/assistant/ask', { question }, 180000);

export interface StreamHandlers {
  onCitations?: (
    citations: Citation[],
    contentVersion: string,
    conversationId: string | null,
  ) => void;
  onToken?: (text: string) => void;
  onRefusal?: (answer: AssistantAnswer) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

/**
 * Streams an answer over SSE so the demo shows tokens arriving rather than a
 * spinner. Returns an abort function.
 *
 * Parsed by hand rather than with EventSource because EventSource cannot issue
 * a POST, and the question belongs in a body rather than a URL.
 */
export function askAssistantStream(
  question: string,
  handlers: StreamHandlers,
  conversationId?: string | null,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/assistant/ask/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        handlers.onError?.(`assistant unavailable (${response.status})`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            else if (line.startsWith('data: ')) data += line.slice(6);
          }
          if (!data) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(data);
          } catch {
            continue;
          }

          if (event === 'citations') {
            handlers.onCitations?.(
              payload.citations as Citation[],
              payload.contentVersion as string,
              (payload.conversationId as string) ?? null,
            );
          } else if (event === 'token') {
            handlers.onToken?.(payload.text as string);
          } else if (event === 'refusal') {
            handlers.onRefusal?.(payload as unknown as AssistantAnswer);
          } else if (event === 'error') {
            handlers.onError?.(payload.message as string);
          } else if (event === 'done') {
            handlers.onDone?.();
          }
        }
      }
      handlers.onDone?.();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      handlers.onError?.(
        error instanceof Error ? error.message : 'assistant request failed',
      );
    }
  })();

  return () => controller.abort();
}


/* ------------------------------------------------------------------ */
/* Sessions, accounts and roles                                        */
/* ------------------------------------------------------------------ */

export type Role = 'visitor' | 'basic' | 'clinician' | 'admin';

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export interface Identity {
  sessionId: string;
  role: Role;
  user: AccountUser | null;
  isAuthenticated: boolean;
}

/** Always succeeds — an anonymous caller is a visitor, not an error. */
export const getIdentity = () => request<Identity>('/auth/me', {}, 6000);

export const login = (email: string, password: string) =>
  post<{ user: AccountUser; role: Role; isAuthenticated: boolean }>(
    '/auth/login',
    { email, password },
  );

export const logout = () => post<{ ok: boolean }>('/auth/logout', {});

/** Wipe this session's conversations without signing out. */
export const resetSession = () =>
  post<{ ok: boolean; cleared: boolean }>('/auth/reset-session', {});

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  refused: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The session's active conversation plus its transcript — used on mount. */
export const getCurrentConversation = () =>
  request<{ conversationId: string; messages: ConversationMessage[]; role: Role }>(
    '/assistant/conversations/current',
  );

export const listConversations = () =>
  request<{ conversations: ConversationSummary[]; role: Role }>(
    '/assistant/conversations',
  );

export const newConversation = () =>
  post<{ conversationId: string; messages: ConversationMessage[] }>(
    '/assistant/conversations',
    {},
  );

export const deleteConversation = (id: string) =>
  request<{ ok: boolean }>(`/assistant/conversations/${id}`, { method: 'DELETE' });

/* ------------------------------------------------------------------ */
/* Generation settings and system prompts                              */
/* ------------------------------------------------------------------ */

export interface GenerationSettings {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  repeat_penalty?: number;
  model?: string;
}

export interface Bound {
  min: number;
  max: number;
  default: number;
}

export const getGenerationSettings = () =>
  request<{
    settings: GenerationSettings;
    defaults: GenerationSettings;
    bounds: Record<string, Bound>;
    editable: boolean;
  }>('/settings/generation');

export const saveGenerationSettings = (settings: GenerationSettings) =>
  request<{ settings: GenerationSettings }>('/settings/generation', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

export const resetGenerationSettings = () =>
  request<{ settings: GenerationSettings }>('/settings/generation', {
    method: 'DELETE',
  });

export const saveSystemGenerationSettings = (settings: GenerationSettings) =>
  request<{ settings: GenerationSettings }>('/admin/settings/generation', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

export interface SystemPrompt {
  id: string;
  name: string;
  body: string;
  authorId: string | null;
  status: 'draft' | 'published' | 'default';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listPrompts = () =>
  request<{ prompts: SystemPrompt[]; canEdit: boolean }>('/prompts');

export const createPrompt = (name: string, body: string, notes?: string) =>
  post<{ prompt: SystemPrompt }>('/admin/prompts', { name, body, notes });

export const updatePrompt = (
  id: string,
  patch: { name?: string; body?: string; notes?: string },
) =>
  request<{ prompt: SystemPrompt }>(`/admin/prompts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

export const setPromptStatus = (id: string, status: SystemPrompt['status']) =>
  request<{ prompt: SystemPrompt }>(`/admin/prompts/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const deletePrompt = (id: string) =>
  request<{ ok: boolean }>(`/admin/prompts/${id}`, { method: 'DELETE' });

/* ------------------------------------------------------------------ */
/* Admin: users                                                        */
/* ------------------------------------------------------------------ */

export const listUsers = () =>
  request<{ users: AccountUser[] }>('/admin/users');

export const createUser = (
  email: string,
  displayName: string,
  password: string,
  role: Role,
) => post<{ user: AccountUser }>('/admin/users', { email, displayName, password, role });

export const setUserRole = (id: string, role: Role) =>
  request<{ user: AccountUser }>(`/admin/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

export const setUserPassword = (id: string, password: string) =>
  request<{ ok: boolean }>(`/admin/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });


/* ------------------------------------------------------------------ */
/* Clinical review                                                     */
/* ------------------------------------------------------------------ */

export type ReviewState =
  | 'unreviewed'
  | 'reviewed'
  | 'stale'
  | 'rejected'
  | 'needs_info';

export type ReviewDecision =
  | 'approved'
  | 'approved_with_changes'
  | 'rejected'
  | 'needs_info';

export interface ReviewRecord {
  id: string;
  blockId: string;
  contentHash: string;
  contentVersion: string;
  reviewerId: string | null;
  reviewerName: string;
  credential: string | null;
  licenseState: string | null;
  /** 'clinical' is authoritative; 'qa' is internal validation only. */
  authority: 'clinical' | 'qa';
  decision: ReviewDecision;
  comments: string | null;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  createdAt: string;
}

export interface ReviewBlock {
  id: string;
  title: string;
  module: string;
  route: string;
  entryStatus: string;
  contentVersion: string;
  source: { document: string; location?: string; slide?: number };
  state: ReviewState;
  latestClinical: ReviewRecord | null;
  latestQa: ReviewRecord | null;
  clinicalCount: number;
  qaCount: number;
  contentChangedSinceReview: boolean;
}

export interface ReviewQueue {
  blocks: ReviewBlock[];
  counts: Record<string, number>;
  total: number;
  reviewedCount: number;
  contentVersion: string;
  decisions: ReviewDecision[];
  role: Role;
  canReview: boolean;
  authority: 'clinical' | 'qa' | null;
}

export interface ReviewBlockDetail extends ReviewBlock {
  text: string;
  contentHash: string;
  history: ReviewRecord[];
  canReview: boolean;
  authority: 'clinical' | 'qa' | null;
  decisions: ReviewDecision[];
}

export const getReviewQueue = () => request<ReviewQueue>('/review/queue');

export const getReviewBlock = (id: string) =>
  request<ReviewBlockDetail>(`/review/blocks/${id}`);

export const submitReview = (
  id: string,
  body: {
    decision: ReviewDecision;
    comments?: string;
    effectiveDate?: string;
    nextReviewDate?: string;
  },
) => post<{ review: ReviewRecord; block: ReviewBlockDetail }>(`/review/blocks/${id}`, body);

export interface ReviewerProfile {
  credential: string | null;
  licenseState: string | null;
  npi: string | null;
}

export const getReviewerProfile = () =>
  request<{ profile: ReviewerProfile; authority: string | null }>('/review/profile');

export const saveReviewerProfile = (profile: ReviewerProfile) =>
  request<{ profile: ReviewerProfile }>('/review/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });

/* ------------------------------------------------------------------ */
/* Site feedback — the question set is served by the API               */
/* ------------------------------------------------------------------ */

export interface FeedbackQuestions {
  ratings: { id: string; question: string; low: string; high: string }[];
  choices: {
    id: string;
    question: string;
    options: { value: string; label: string }[];
  }[];
  texts: { id: string; question: string }[];
  maxText: number;
}

export interface FeedbackSubmission {
  ratings: Record<string, number>;
  answers: Record<string, string>;
  page: string;
  contactEmail?: string;
  viewport?: string;
}

export const getFeedbackQuestions = () =>
  request<FeedbackQuestions>('/feedback/questions');

export const submitFeedback = (body: FeedbackSubmission) =>
  post<{ id: string; createdAt: string }>('/feedback', body);
