import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy, in plain language.">
      <p>
        Forume exists to write honest applications — that starts with being
        honest about your data.
      </p>

      <h2>Demo mode (no account)</h2>
      <p>
        Everything you type or upload in the demo is stored <b>only in your
        browser</b> (localStorage). We have no copy. Clearing your browser data
        deletes it.
      </p>

      <h2>With an account</h2>
      <p>
        Your profile, documents, and generated applications are stored in our
        database (Supabase, hosted in the <b>EU — Ireland</b>), protected so
        that only your account can read them. Sign-in uses your email or Google
        account; we never see a password.
      </p>

      <h2>Generation</h2>
      <p>
        When you generate an application, the job description and your documents
        are sent to our AI provider — currently <b>Google (Gemini API)</b>,
        servers in the <b>United States</b> — to write the draft. During free
        early access Forume runs on Google&apos;s free API tier, and on that tier
        Google may use the submitted content to improve its models, per{" "}
        <b>Google&apos;s API terms</b>. Before Forume opens to general use we will
        move to Google&apos;s paid tier, which contractually prohibits training on
        your content. If you are not comfortable with this transfer, don&apos;t
        use the generation feature — you can still edit and export manually.
      </p>

      <h2>Who processes your data</h2>
      <p>These services handle data on our behalf:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Supabase</b> — database &amp; sign-in (EU, Ireland)</li>
        <li><b>Google (Gemini API)</b> — AI generation (United States)</li>
        <li><b>Vercel</b> — hosting &amp; cookie-free analytics (United States)</li>
        <li><b>Resend</b> — sign-in email delivery (United States)</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <p>
        No advertising, no selling data, no tracking beyond anonymous page
        analytics (Vercel Analytics, cookie-free).
      </p>

      <h2>Your rights &amp; contact</h2>
      <p>
        You can delete documents and applications in the app at any time, and
        request full account deletion by email:{" "}
        <b>tushargoel230@gmail.com</b>. Under the GDPR you also have rights to
        access, correct, and export your data — same address.
      </p>

      <p className="text-xs text-stone">Last updated: 18 August 2026.</p>
    </LegalShell>
  );
}
