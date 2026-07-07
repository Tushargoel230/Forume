"use client";

import { useState, useEffect } from "react";
import { LLM_PROVIDERS, type LLMConfig, getLLMConfig, setLLMConfig, getDefaultApiKey } from "@/lib/llm-providers";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<LLMConfig>(() => {
    if (typeof window === "undefined") {
      return { provider: "groq", apiKey: "", model: "llama-3.1-70b-versatile" };
    }
    return getLLMConfig() || { provider: "groq", apiKey: "", model: "llama-3.1-70b-versatile" };
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage("");

    try {
      setLLMConfig(config);
      setMessage("✓ Configuration saved!");
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      setMessage(`✗ Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!config) return;
    setTesting(true);
    setMessage("Testing connection…");

    try {
      const response = await fetch("/api/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(`✗ Error: ${data.error}`);
      } else {
        setMessage(`✓ Connection successful! Response time: ${data.time}ms`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (e) {
      setMessage(`✗ Error: ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setTesting(false);
    }
  }

  if (!config) {
    return (
      <div className="rounded-sm border border-rule bg-paper p-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-5">
          AI Model Settings
        </h2>
        <p className="text-stone text-sm">Loading configuration…</p>
      </div>
    );
  }

  const provider = LLM_PROVIDERS[config.provider];

  return (
    <div className="rounded-sm border border-rule bg-paper p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-pine border-b border-rule pb-2 mb-5">
        AI Model Settings
      </h2>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">AI Provider</label>
          <select
            value={config.provider}
            onChange={(e) =>
              setConfig({ ...config, provider: e.target.value as any })
            }
            className="w-full rounded-md border border-rule-dark bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pine text-sm"
          >
            {Object.entries(LLM_PROVIDERS).map(([key, prov]) => (
              <option key={key} value={key}>
                {prov.name} — {prov.freeLimit}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone mt-1">{provider.description}</p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="w-full rounded-md border border-rule-dark bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pine text-sm"
          >
            {provider.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Key (if required) */}
        {provider.requiresApiKey && (
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) =>
                setConfig({ ...config, apiKey: e.target.value })
              }
              placeholder={`Enter your ${provider.name} API key`}
              className="w-full rounded-md border border-rule-dark bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pine text-sm"
            />
            {getDefaultApiKey(config.provider) === config.apiKey && config.apiKey && (
              <p className="text-xs text-amber-700 mt-1">
                ✓ Using default API key from environment
              </p>
            )}
            {!config.apiKey && (
              <p className="text-xs text-stone mt-1">
                Get your free API key at{" "}
                {config.provider === "groq" && "https://console.groq.com"}
                {config.provider === "together" && "https://api.together.xyz"}
                {config.provider === "huggingface" &&
                  "https://huggingface.co/settings/tokens"}
                {config.provider === "replicate" && "https://replicate.com/account"}
              </p>
            )}
          </div>
        )}

        {/* Base URL (if Ollama) */}
        {config.provider === "ollama" && (
          <div>
            <label className="block text-sm font-medium mb-2">Ollama URL</label>
            <input
              type="text"
              value={config.baseUrl || provider.baseUrl}
              onChange={(e) =>
                setConfig({ ...config, baseUrl: e.target.value })
              }
              placeholder="http://localhost:11434/v1"
              className="w-full rounded-md border border-rule-dark bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pine text-sm"
            />
            <p className="text-xs text-stone mt-1">
              Make sure Ollama is running locally: run `ollama serve` in your
              terminal
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleTest}
            disabled={testing || !config.apiKey && provider.requiresApiKey}
            className="flex-1 rounded-md border border-amber bg-white px-4 py-2 text-sm font-medium text-amber hover:bg-amber/5 transition-colors disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper hover:bg-pine-deep transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Configuration"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-rule-dark px-4 py-2 text-sm font-medium text-stone hover:text-ink transition-colors"
          >
            Done
          </button>
        </div>

        {message && (
          <p
            className={`mt-3 rounded-md px-4 py-3 text-sm ${
              message.startsWith("✓")
                ? "border border-pine bg-pine/10 text-pine"
                : "border border-amber bg-amber/10 text-amber"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
