import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: "-1px",
          }}
        >
          R
        </span>
      </div>
    ),
    { ...size }
  );
}
