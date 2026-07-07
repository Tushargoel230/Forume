// Supported LLM providers (all OpenAI-compatible chat/completions endpoints).
// This list doubles as the server-side allowlist for client-supplied configs.
export type ProviderType = "groq" | "gemini" | "cerebras" | "openrouter" | "together" | "ollama";

export interface LLMProvider {
  id: ProviderType;
  name: string;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  description: string;
  freeLimit: string;
  keyUrl: string;
  models: { value: string; label: string }[];
}

export interface LLMConfig {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export const LLM_PROVIDERS: Record<ProviderType, LLMProvider> = {
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresApiKey: true,
    description: "Fastest inference available. Excellent free tier.",
    freeLimit: "~1,000 requests/day free",
    keyUrl: "https://console.groq.com/keys",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (best quality)" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest, higher limits)" },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    requiresApiKey: true,
    description: "Google's models via their OpenAI-compatible endpoint.",
    freeLimit: "Generous free tier (rate-limited per minute)",
    keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (higher limits)" },
    ],
  },
  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    requiresApiKey: true,
    description: "Extremely fast Llama inference on wafer-scale hardware.",
    freeLimit: "30 requests/min free",
    keyUrl: "https://cloud.cerebras.ai",
    models: [{ value: "llama-3.3-70b", label: "Llama 3.3 70B" }],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    requiresApiKey: true,
    description: "One key, many models — including free community models.",
    freeLimit: "Free models: ~50 requests/day",
    keyUrl: "https://openrouter.ai/keys",
    models: [
      { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { value: "deepseek/deepseek-chat:free", label: "DeepSeek Chat (free)" },
    ],
  },
  together: {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    requiresApiKey: true,
    description: "Solid open-model hosting with a free Llama endpoint.",
    freeLimit: "Free Llama 3.3 70B endpoint (rate-limited)",
    keyUrl: "https://api.together.xyz/settings/api-keys",
    models: [
      { value: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", label: "Llama 3.3 70B (free)" },
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen3.5",
    requiresApiKey: false,
    description: "Run models on your own machine. Free and private.",
    freeLimit: "Unlimited (your hardware)",
    keyUrl: "https://ollama.com",
    models: [
      { value: "qwen3.5", label: "Qwen 3.5" },
      { value: "llama3.2", label: "Llama 3.2" },
      { value: "gemma4", label: "Gemma 4" },
    ],
  },
};

const STORAGE_KEY = "forume-llm-config";

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const cfg = JSON.parse(stored) as LLMConfig;
    return LLM_PROVIDERS[cfg.provider] ? cfg : null;
  } catch {
    return null;
  }
}

export function setLLMConfig(config: LLMConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearLLMConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
