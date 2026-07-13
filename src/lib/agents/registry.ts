import { opsDigest } from "./ops-digest";
import { supportTriage } from "./support-triage";
import { growthContent } from "./growth-content";
import { legalChecklist } from "./legal-checklist";
import { costWatchdog } from "./cost-watchdog";
import type { Agent } from "./types";

export const AGENT_REGISTRY: Record<string, Agent> = {
  "ops-digest": opsDigest,
  "support-triage": supportTriage,
  "growth-content": growthContent,
  "legal-checklist": legalChecklist,
  "cost-watchdog": costWatchdog,
};
