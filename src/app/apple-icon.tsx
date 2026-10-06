import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M9.5 8.5v7.25c0 3.6 2.6 6.25 6 6.25 1.9 0 3.4-.8 4.5-2.3L24 13"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="8.5" r="2.25" fill="#6366f1" />
        </svg>
      </div>
    ),
    size,
  );
}
