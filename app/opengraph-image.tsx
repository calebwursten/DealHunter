import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Wursten Deals – Real Estate Investment Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const stats = [
    { label: "Properties Indexed", value: "140K+", color: "#492b23" },
    { label: "Active Leads",       value: "37",    color: "#16a34a" },
    { label: "Avg. Assessed Value",value: "$198K",  color: "#ea580c" },
    { label: "Est. Deal Value",    value: "$2.4M",  color: "#9333ea" },
  ];

  const properties = [
    { address: "1247 Maple Street",    city: "Pittsburgh, PA 15217", value: "$252,200", equity: "$109,700" },
    { address: "891 Shady Ave",        city: "Squirrel Hill, PA 15232", value: "$485,000", equity: "$210,000" },
  ];

  const navItems = ["Dashboard","Properties","My Lists","Comps","Marketing","Analytics"];

  return new ImageResponse(
    (
      <div style={{ width:"100%",height:"100%",display:"flex",background:"#f5f1ee",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        {/* Sidebar */}
        <div style={{ width:210,background:"#2d2825",display:"flex",flexDirection:"column",padding:"32px 16px",gap:4 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:28 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:"#492b23",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color:"white",fontWeight:800,fontSize:16 }}>W</span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",lineHeight:1.1 }}>
              <span style={{ color:"white",fontWeight:700,fontSize:17 }}>Wursten</span>
              <span style={{ color:"#9e948c",fontWeight:300,fontSize:13 }}>Deals</span>
            </div>
          </div>
          {navItems.map((item,i) => (
            <div key={item} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,background:i===0?"#492b23":"transparent",color:i===0?"white":"#9e948c",fontSize:13,fontWeight:500 }}>
              <div style={{ width:16,height:16,borderRadius:4,background:i===0?"rgba(255,255,255,0.25)":"#3d3530" }} />
              {item}
            </div>
          ))}
          <div style={{ marginTop:"auto",padding:"12px",background:"#3d3530",borderRadius:8,display:"flex",flexDirection:"column",gap:2 }}>
            <span style={{ color:"#5d544c",fontSize:10 }}>Logged in as</span>
            <span style={{ color:"white",fontSize:12,fontWeight:500 }}>caleb@wursten.co</span>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
          <div style={{ background:"white",borderBottom:"1px solid #e8e2db",padding:"16px 36px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
              <span style={{ color:"#2d2825",fontSize:18,fontWeight:700 }}>Dashboard</span>
              <span style={{ color:"#9e948c",fontSize:12 }}>Pittsburgh / Allegheny County market</span>
            </div>
            <div style={{ width:36,height:36,borderRadius:18,background:"#492b23",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color:"white",fontSize:15,fontWeight:700 }}>W</span>
            </div>
          </div>

          <div style={{ padding:"28px 36px",display:"flex",flexDirection:"column",gap:20 }}>
            <div style={{ display:"flex",gap:14 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ flex:1,background:"white",borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:6,border:"1px solid #e8e2db" }}>
                  <span style={{ color:"#9e948c",fontSize:11,fontWeight:500 }}>{s.label}</span>
                  <span style={{ color:s.color,fontSize:22,fontWeight:800 }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex",gap:14 }}>
              {properties.map((p) => (
                <div key={p.address} style={{ flex:1,background:"white",borderRadius:12,padding:"16px 20px",border:"1px solid #e8e2db",display:"flex",flexDirection:"column",gap:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                      <span style={{ color:"#2d2825",fontSize:13,fontWeight:600 }}>{p.address}</span>
                      <span style={{ color:"#9e948c",fontSize:11 }}>{p.city}</span>
                    </div>
                    <div style={{ background:"#dcfce7",color:"#16a34a",fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:99 }}>high equity</div>
                  </div>
                  <div style={{ display:"flex",gap:24,paddingTop:8,borderTop:"1px solid #f0ebe6" }}>
                    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                      <span style={{ color:"#9e948c",fontSize:10 }}>Est. Value</span>
                      <span style={{ color:"#2d2825",fontSize:14,fontWeight:700 }}>{p.value}</span>
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                      <span style={{ color:"#9e948c",fontSize:10 }}>Equity</span>
                      <span style={{ color:"#16a34a",fontSize:14,fontWeight:700 }}>{p.equity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:"auto" }}>
              <div style={{ width:8,height:8,borderRadius:4,background:"#492b23" }} />
              <span style={{ color:"#9e948c",fontSize:12 }}>wursten.co · Real estate investment data · Pittsburgh, PA</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width:1200, height:630 }
  );
}
