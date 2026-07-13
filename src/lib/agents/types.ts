import type { SupabaseClient } from "@supabase/supabase-js";
import type { LlmConfig } from "@/lib/llm";

/** Context every agent runs with: a service-role Supabase client, the
    product's LLM config (null if unconfigured), and a way to page the founder. */
export type AgentContext = {
  supabase: SupabaseClient;
  llm: LlmConfig | null;
  notify: (message: string) => Promise<void>;
  /** Founder-supplied input for manually-triggered agents (e.g. legal-checklist's
      change description). Scheduled agents ignore this. */
  input?: unknown;
};

export type AgentResult = {
  summary: string;
  data?: unknown;
  needsHuman: boolean;
};

export type Agent = (ctx: AgentContext) => Promise<AgentResult>;
