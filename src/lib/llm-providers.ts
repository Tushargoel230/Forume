// Supported LLM providers with their configurations
export type ProviderType = "groq" | "together" | "huggingface" | "ollama" | "replicate";

export interface LLMProvider {
  id: ProviderType;
  name: string;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  description: string;
  freeLimit: string;
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
    defaultModel: "mixtral-8x7b-32768",
    requiresApiKey: true,
    description: "Fastest open-source LLM inference. Lightning-fast responses.",
    freeLimit: "30 requests/min (2,880/day)",
    models: [
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7b (Best balance)" },
      { value: "llama2-70b-4096", label: "Llama 2 70b" },
      { value: "llama-3-70b-8192", label: "Llama 3 70b" },
    ],
  },
  together: {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.1",
    requiresApiKey: true,
    description: "Multiple model options, good performance, affordable.",
    freeLimit: "1 million tokens/month",
    models: [
      { value: "mistralai/Mistral-7B-Instruct-v0.1", label: "Mistral 7B" },
      { value: "meta-llama/Llama-2-70b-chat-hf", label: "Llama 2 70b" },
      { value: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO", label: "Nous Hermes 2 Mixtral" },
    ],
  },
  huggingface: {
    id: "huggingface",
    name: "Hugging Face",
    baseUrl: "https://api-inference.huggingface.co/v1",
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.1",
    requiresApiKey: true,
    description: "Popular hub for open-source models.",
    freeLimit: "Limited free tier (32k context)",
    models: [
      { value: "mistralai/Mistral-7B-Instruct-v0.1", label: "Mistral 7B" },
      { value: "meta-llama/Llama-2-70b-chat-hf", label: "Llama 2 70b" },
      { value: "tiiuae/falcon-7b-instruct", label: "Falcon 7B" },
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "mistral",
    requiresApiKey: false,
    description: "Run models locally on your machine. Completely free, no API calls.",
    freeLimit: "Unlimited (limited by your hardware)",
    models: [
      { value: "mistral", label: "Mistral" },
      { value: "llama2", label: "Llama 2" },
      { value: "neural-chat", label: "Neural Chat" },
      { value: "qwen3.5", label: "Qwen 3.5" },
    ],
  },
  replicate: {
    id: "replicate",
    name: "Replicate",
    baseUrl: "https://api.replicate.com/v1",
    defaultModel: "mistralai/mistral-7b-instruct-v0.2",
    requiresApiKey: true,
    description: "Easy-to-use API for hundreds of models.",
    freeLimit: "$5 free credit (enough for ~1000 requests)",
    models: [
      { value: "mistralai/mistral-7b-instruct-v0.2", label: "Mistral 7B Instruct" },
      { value: "meta/llama-2-70b-chat", label: "Llama 2 70b Chat" },
      { value: "ninsight/llama-2-13b-chat", label: "Llama 2 13b Chat" },
    ],
  },
};

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") {
    // Server-side fallback to env vars
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL;
    if (!baseUrl || !model) return null;
    return {
      provider: "groq",
      apiKey: process.env.LLM_API_KEY ?? "",
      model,
      baseUrl,
    };
  }

  const stored = localStorage.getItem("forume-llm-config");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LLMConfig;
  } catch {
    return null;
  }
}

export function setLLMConfig(config: LLMConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("forume-llm-config", JSON.stringify(config));
}

export function clearLLMConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("forume-llm-config");
}
