import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = { title: "Imprint" };

export default function Imprint() {
  return (
    <LegalShell title="Imprint / Impressum.">
      <p>Information according to § 5 DDG (Germany):</p>
      <p>
        <b>Tushar Goel</b>
        <br />
        Dortmund, Germany
        <br />
        Email: <b>tushargoel230@gmail.com</b>
      </p>
      <p>
        Responsible for content according to § 18 Abs. 2 MStV: Tushar Goel,
        address as above.
      </p>
      <p className="text-sm">
        Note: a full street address is legally required for commercial
        offerings in Germany — this will be completed before paid plans
        launch. Forume is currently a free early-access project.
      </p>
    </LegalShell>
  );
}
