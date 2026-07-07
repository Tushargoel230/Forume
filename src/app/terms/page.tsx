import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalShell title="Terms of use.">
      <p>
        Forume is in <b>early access</b> and currently free. These terms are
        short on purpose.
      </p>

      <h2>What Forume does</h2>
      <p>
        Forume drafts resumes and cover letters from the experience you
        provide, tailored to job descriptions you paste. Drafts are suggestions
        — <b>you are responsible for what you send to an employer</b>. Review
        every line before using it.
      </p>

      <h2>Honesty</h2>
      <p>
        Forume is built not to invent employers, dates, or numbers. AI models
        can still make mistakes. If a draft claims something you didn&apos;t
        do, delete it — that&apos;s the deal.
      </p>

      <h2>Fair use</h2>
      <p>
        Generation is rate-limited per day so the free service stays available
        for everyone. Don&apos;t scrape, resell, or attack the service.
      </p>

      <h2>No warranty</h2>
      <p>
        Early-access software is provided as-is, without guarantees of
        availability or fitness for a particular purpose. We may change or
        discontinue features while in early access. Liability is limited to
        the maximum extent permitted by law; mandatory statutory liability
        (e.g. for intent or gross negligence under German law) remains
        unaffected.
      </p>

      <h2>Contact</h2>
      <p>Questions: <b>tushargoel230@gmail.com</b></p>
    </LegalShell>
  );
}
