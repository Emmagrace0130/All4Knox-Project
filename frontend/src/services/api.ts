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
  onCitations?: (citations: Citation[], contentVersion: string) => void;
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
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/assistant/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
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
