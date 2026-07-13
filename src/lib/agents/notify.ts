/** Posts a message to the founder's Telegram via the Bot API.
    No-op (logged) when unconfigured, so agents can run in dev without a bot set up. */
export async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.NOTIFY_TELEGRAM_TOKEN;
  const chatId = process.env.NOTIFY_TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("Telegram notify skipped (not configured):", message);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!res.ok) {
    console.warn("Telegram notify failed:", res.status, (await res.text()).slice(0, 300));
  }
}
