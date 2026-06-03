import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DealHunter – Real Estate Investment Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const stats = [
    { label: "Properties Found", value: "1,284", color: "#3b82f6" },
    { label: "Active Leads", value: "37", color: "#22c55e" },
    { label: "Avg. Equity", value: "$128K", color: "#f97316" },
    { label: "Est. Deal Value", value: "$2.4M", color: "#a855f7" },
  ];

  const properties = [
    { address: "1247 Maple Street", city: "Phoenix, AZ 85001", value: "$385,000", equity: "$142,000" },
    { address: "891 Desert Rose Blvd", city: "Scottsdale, AZ 85251", value: "$720,000", equity: "$380,000" },
  ];

  const navItems = ["Dashboard", "Properties", "My Lists", "Comps", "Marketing", "Analytics"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f1f5f9",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 210,
            background: "#0f172a",
            display: "flex",
            flexDirection: "column",
            padding: "32px 16px",
            gap: 4,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, background: "white", borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex" }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: 20 }}>Deal</span>
              <span style={{ color: "#3b82f6", fontWeight: 800, fontSize: 20 }}>Hunter</span>
            </div>
          </div>

          {navItems.map((item, i) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                background: i === 0 ? "#2563eb" : "transparent",
                color: i === 0 ? "white" : "#64748b",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, background: i === 0 ? "rgba(255,255,255,0.3)" : "#1e293b" }} />
              {item}
            </div>
          ))}

          <div style={{ marginTop: "auto", padding: "12px", background: "#1e293b", borderRadius: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#475569", fontSize: 10 }}>Logged in as</span>
            <span style={{ color: "white", fontSize: 12, fontWeight: 500 }}>caleb@wursten.co</span>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 36px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#0f172a", fontSize: 18, fontWeight: 700 }}>Dashboard</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Your real estate investment overview</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#cbd5e1" }} />
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>C</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: 14 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: "white",
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#cbd5e1" }} />
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Enter address, city, ZIP, or owner name...</span>
              </div>
              <div style={{ background: "#2563eb", borderRadius: 8, padding: "10px 18px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.5)" }} />
                <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>Search</span>
              </div>
            </div>

            {/* Property cards */}
            <div style={{ display: "flex", gap: 14 }}>
              {properties.map((p) => (
                <div
                  key={p.address}
                  style={{
                    flex: 1,
                    background: "white",
                    borderRadius: 12,
                    padding: "16px 20px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>{p.address}</span>
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>{p.city}</span>
                    </div>
                    <div style={{ background: "#dcfce7", color: "#16a34a", fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>
                      high equity
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#94a3b8", fontSize: 10 }}>Est. Value</span>
                      <span style={{ color: "#0f172a", fontSize: 14, fontWeight: 700 }}>{p.value}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#94a3b8", fontSize: 10 }}>Equity</span>
                      <span style={{ color: "#16a34a", fontSize: 14, fontWeight: 700 }}>{p.equity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
