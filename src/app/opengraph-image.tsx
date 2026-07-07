import { ImageResponse } from "next/og";

export const alt = "Forume — your experience, made undeniable";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#101113",
          color: "#ece9e2",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 42,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              border: "5px solid #c5283d",
              borderRadius: 12,
              transform: "rotate(-6deg)",
              color: "#c5283d",
              fontSize: 40,
              fontStyle: "italic",
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", fontSize: 34, letterSpacing: 8, fontWeight: 700 }}>
            <span>FOR</span>
            <span style={{ color: "#c5283d" }}>UME</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          <span>Your experience,</span>
          <span style={{ fontStyle: "italic", color: "#e6c86e" }}>
            made undeniable.
          </span>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "#a7a49b",
            fontFamily: "sans-serif",
          }}
        >
          Tailored resumes and cover letters — ATS-checked, typeset, honest.
        </div>
      </div>
    ),
    size,
  );
}
