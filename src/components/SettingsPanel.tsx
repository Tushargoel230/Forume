"use client";

import { useState } from "react";
import {
  LLM_PROVIDERS, type LLMConfig, type ProviderType,
  getLLMConfig, setLLMConfig,
} from "@/lib/llm-providers";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<LLMConfig>(() =>
    (typeof window !== "undefined" && getLLMConfig()) || {
      provider: "groq", apiKey: "", model: LLM_PROVIDERS.groq.defaultModel,
    },
  );
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  const provider = LLM_PROVIDERS[config.provider];

  function switchProvider(id: ProviderType) {
    setConfig({ provider: id, apiKey: "", model: LLM_PROVIDERS[id].defaultModel });
    setMessage("");
  }

  function save() {
    setLLMConfig(config);
    setMessage("✓ Saved. New applications will use this engine.");
  }

  async function test() {
    setTesting(true);
    setMessage("Testing connection…");
    try {
      const res = await fetch("/api/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setMessage(res.ok ? `✓ Connected — responded in ${data.time}ms.` : `✗ ${data.error}`);
    } catch (e) {
      setMessage(`✗ ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setTesting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-rule-dark bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink";

  return (
    <div className="max-w-2xl">
      <p className="mb-8 leading-relaxed text-stone">
        Forume ships with a built-in engine. Connect your own for higher limits
        or to run fully local — your key is stored only in this browser.
      </p>

      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="mb-5 border-b border-rule pb-2 text-xs font-bold uppercase tracking-[0.22em] text-crimson">
          Engine
        </h2>

        <div className="mb-5 grid gap-2 sm:grid-cols-3">
          {Object.values(LLM_PROVIDERS).map((p) => (
            <button
              key={p.id}
              onClick={() => switchProvider(p.id)}
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                config.provider === p.id
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-dark hover:border-ink"
              }`}
            >
              <span className="block font-semibold">{p.name}</span>
              <span className={`block text-xs ${config.provider === p.id ? "text-paper/70" : "text-stone"}`}>
                {p.freeLimit}
              </span>
            </button>
          ))}
        </div>

        <p className="mb-5 text-sm text-stone">{provider.description}</p>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Model</span>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className={inputCls}
          >
            {provider.models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        {provider.requiresApiKey && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">API key</span>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={`Paste your ${provider.name} key`}
              className={inputCls}
            />
            <span className="mt-1.5 block text-xs text-stone">
              Free key at{" "}
              <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="text-crimson underline">
                {provider.keyUrl.replace("https://", "")}
              </a>
            </span>
          </label>
        )}

        {config.provider === "ollama" && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">Ollama URL</span>
            <input
              value={config.baseUrl || provider.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className={inputCls}
            />
            <span className="mt-1.5 block text-xs text-stone">
              Works when you run the site locally next to Ollama.
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={save}
            className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-crimson"
          >
            Save engine
          </button>
          <button
            onClick={test}
            disabled={testing || (provider.requiresApiKey && !config.apiKey)}
            className="rounded-md border border-ink px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-stone hover:text-ink">
            Done
          </button>
        </div>

        {message && (
          <p
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              message.startsWith("✓")
                ? "border-rule bg-linen text-ink"
                : "border-amber bg-amber/10 text-ink"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
