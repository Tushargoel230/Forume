/** Telegram Bot API helpers — all target the founder's private chat
    (NOTIFY_TELEGRAM_CHAT_ID via the NOTIFY_TELEGRAM_TOKEN bot). No-op (logged)
    when unconfigured, so agents run fine in dev without a bot set up. */

function creds(): { token: string; chatId: string } | null {
  const token = process.env.NOTIFY_TELEGRAM_TOKEN;
  const chatId = process.env.NOTIFY_TELEGRAM_CHAT_ID;
  return token && chatId ? { token, chatId } : null;
}

/** True when a Telegram bot + destination chat are configured. */
export function telegramConfigured(): boolean {
  return creds() !== null;
}

/** Posts a text message to the founder's Telegram (agent alerts / captions). */
export async function notifyTelegram(message: string): Promise<void> {
  const c = creds();
  if (!c) {
    console.warn("Telegram notify skipped (not configured):", message);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: c.chatId, text: message, disable_web_page_preview: true }),
  });
  if (!res.ok) console.warn("Telegram sendMessage failed:", res.status, (await res.text()).slice(0, 300));
}

/** Uploads a PNG to the founder's Telegram as a photo (multipart — no hosting
    needed). Returns false (and logs) when unconfigured or the API rejects it. */
export async function sendPhotoToFounder(png: Buffer, caption?: string): Promise<boolean> {
  const c = creds();
  if (!c) {
    console.warn("Telegram photo skipped (not configured).");
    return false;
  }
  const form = new FormData();
  form.append("chat_id", c.chatId);
  if (caption) form.append("caption", caption.slice(0, 1024));
  form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "forume.png");
  const res = await fetch(`https://api.telegram.org/bot${c.token}/sendPhoto`, { method: "POST", body: form });
  if (!res.ok) console.warn("Telegram sendPhoto failed:", res.status, (await res.text()).slice(0, 300));
  return res.ok;
}
