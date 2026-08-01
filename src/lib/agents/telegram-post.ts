import { renderPostCard, renderStoryCard } from "@/lib/brand/card";
import { notifyTelegram, sendPhotoToFounder, telegramConfigured } from "./notify";
import type { Agent } from "./types";

/** Daily Instagram-asset delivery. Takes the OLDEST approved content_queue item
    and DMs the founder, ready to post manually:
      1. a text message with the full caption + hashtags (copy-paste ready),
      2. the POST image (4:5, 1080×1350),
      3. the STORY image (9:16, 1080×1920).
    Then flips the item to "posted". Approve a batch in /admin and this drips one
    set out per day. Nothing publishes automatically — the founder posts to IG.

    (Telegram's Bot API can't post IG-style Stories itself, which is why we hand
    the founder a ready-made story image to post by hand.) */
export const telegramPost: Agent = async (ctx) => {
  if (!telegramConfigured()) {
    return {
      summary: "Telegram not configured (set NOTIFY_TELEGRAM_TOKEN + NOTIFY_TELEGRAM_CHAT_ID) — skipped.",
      needsHuman: false,
    };
  }

  const { data: rows, error } = await ctx.supabase
    .from("content_queue")
    .select("id, hook, caption, hashtags")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`Failed to read content_queue: ${error.message}`);

  const item = rows?.[0] as QueueItem | undefined;
  if (!item) {
    return {
      summary: "No approved posts in the queue — nothing to send today. Approve some in /admin.",
      needsHuman: true,
    };
  }

  const hook = (item.hook || item.caption || "Forume").trim();
  const post = renderPostCard(hook);
  const story = renderStoryCard(hook);

  await notifyTelegram(`📅 Today's Forume drop — post + story below. Caption to copy:\n\n${captionText(item)}`);
  const okPost = await sendPhotoToFounder(post, "📸 POST · 4:5 · feed");
  const okStory = await sendPhotoToFounder(story, "📱 STORY · 9:16");
  if (!okPost || !okStory) {
    // Leave status untouched so tomorrow retries.
    throw new Error("Telegram rejected an image (check NOTIFY_TELEGRAM_TOKEN / chat id).");
  }

  const { error: upErr } = await ctx.supabase
    .from("content_queue")
    .update({ status: "posted", posted_at: new Date().toISOString() })
    .eq("id", item.id);
  if (upErr) throw new Error(`Sent, but failed to mark item ${item.id} as posted: ${upErr.message}`);

  const { count } = await ctx.supabase
    .from("content_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  return {
    summary: `Sent today's post + story (item #${item.id}) to Telegram. ${count ?? 0} approved set(s) left in the queue.`,
    data: { sentId: item.id, remaining: count ?? 0 },
    needsHuman: (count ?? 0) === 0, // nudge the founder when the queue runs dry
  };
};

type QueueItem = {
  id: number;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
};

/** Caption body + hashtags on their own line, ready to paste into Instagram. */
function captionText(item: QueueItem): string {
  const body = (item.caption?.trim() || item.hook?.trim() || "").slice(0, 1800);
  const tags = (item.hashtags ?? [])
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(" ");
  return tags ? `${body}\n\n${tags}` : body;
}
