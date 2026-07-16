import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 18% 18%, rgba(239, 68, 68, 0.32), transparent 32%), linear-gradient(135deg, #050505 0%, #18181b 48%, #7f1d1d 100%)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "42px",
            border: "2px solid rgba(255,255,255,0.14)",
            borderRadius: "34px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "58px",
            width: "1010px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "280px",
              height: "280px",
              borderRadius: "38px",
              background: "rgba(255,255,255,0.96)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
            }}
          >
            <img
              src={`${origin}/logo.png`}
              width="220"
              height="220"
              alt="Polokwane Chess Club logo"
              style={{ objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "30px",
                fontWeight: 800,
                color: "#fca5a5",
                letterSpacing: "7px",
                textTransform: "uppercase",
                marginBottom: "22px",
              }}
            >
              Established 1958
            </div>
            <div
              style={{
                fontSize: "76px",
                lineHeight: 0.95,
                fontWeight: 900,
                maxWidth: "650px",
              }}
            >
              Polokwane Chess Club
            </div>
            <div
              style={{
                fontSize: "30px",
                lineHeight: 1.3,
                color: "#e5e7eb",
                marginTop: "28px",
                maxWidth: "620px",
              }}
            >
              Tournament entries, player profiles, club history and chess
              development across Limpopo.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
