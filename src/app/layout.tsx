import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://forume-jaxx24.vercel.app"),
  title: {
    default: "Forume — your experience, made undeniable",
    template: "%s · Forume",
  },
  description:
    "Forume tailors your real experience into a resume and cover letter for each job — ATS-checked, beautifully typeset, and honest to the letter.",
  openGraph: {
    title: "Forume — your experience, made undeniable",
    description:
      "Tailored resumes and cover letters from your real experience. ATS-checked, typeset, honest.",
    url: "/",
    siteName: "Forume",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forume — your experience, made undeniable",
    description:
      "Tailored resumes and cover letters from your real experience. ATS-checked, typeset, honest.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
