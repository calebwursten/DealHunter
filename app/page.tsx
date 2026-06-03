import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import { mockLeads } from "@/lib/mock-data";
import { Search, Users, TrendingUp, DollarSign, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { searchWPRDC, wprdcToProperty } from "@/lib/wprdc";
import PropertyCard from "@/components/PropertyCard";

export const revalidate = 3600;

async function getHighEquityProperties() {
  try {
    const { records } = await searchWPRDC("Pittsburgh residential", 40);
    return records
      .map(wprdcToProperty)
      .filter((p) => p.equityPercent >= 30 && p.sqft > 0)
      .slice(0, 4);
  } catch {
    return [];
  }
}

export default async function Dashboard() {
  const highEquityProps = await getHighEquityProperties();

  return (
    <div>
      <Header title="Dashboard" subtitle="Pittsburgh / Allegheny County market" />
      <div className="p-4 md:p-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          <StatsCard label="Properties Indexed" value="140K+" change="Allegheny County" positive icon={Search} color="brand" />
          <StatsCard label="Active Leads" value="37" change="+5 this week" positive icon={Users} color="green" />
          <StatsCard label="Avg. Assessed Value" value="$198K" change="Pittsburgh metro" positive icon={TrendingUp} color="orange" />
          <StatsCard label="Est. Deal Value" value="$2.4M" change="across active leads" icon={DollarSign} color="purple" />
        </div>

        <div className="rounded-xl p-4 md:p-6 mb-6 md:mb-8" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm md:text-base font-semibold" style={{ color: "#2d2825" }}>Quick Property Search</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f9e2dc", color: "#492b23" }}>LIVE</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="flex-1 relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9e948c" }} />
              <input
                type="text"
                placeholder="Search Pittsburgh address, ZIP, or neighborhood..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #e8e2db" }}
                onFocus={(e) => (e.target.style.borderColor = "#492b23")}
                onBlur={(e) => (e.target.style.borderColor = "#e8e2db")}
              />
            </div>
            <Link
              href="/properties"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "#492b23" }}
            >
              <Search size={16} />
              Search
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold" style={{ color: "#2d2825" }}>High Equity Opportunities</h2>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "#f9e2dc", color: "#492b23" }}>LIVE</span>
              </div>
              <Link href="/properties" className="text-sm flex items-center gap-1 hover:underline" style={{ color: "#492b23" }}>
                View all <ChevronRight size={14} />
              </Link>
            </div>
            {highEquityProps.length > 0 ? (
              <div className="space-y-4">
                {highEquityProps.map((p) => <PropertyCard key={p.id} property={p} />)}
              </div>
            ) : (
              <div className="rounded-xl p-8 text-center text-sm" style={{ background: "#fff", border: "1px solid #e8e2db", color: "#9e948c" }}>
                <Search size={24} className="mx-auto mb-2" style={{ color: "#e8e2db" }} />
                Use Property Search to find high-equity opportunities
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm md:text-base font-semibold" style={{ color: "#2d2825" }}>Recent Leads</h2>
              <Link href="/leads" className="text-sm flex items-center gap-1 hover:underline" style={{ color: "#492b23" }}>
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: "#f5f1ee", borderBottom: "1px solid #e8e2db" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: "#9e948c" }}>Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: "#9e948c" }}>Equity</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: "#9e948c" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeads.map((lead) => (
                      <tr key={lead.id} className="cursor-pointer" style={{ borderTop: "1px solid #f0ebe6" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background="#f5f1ee")}
                        onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "#2d2825" }}>{lead.name}</p>
                          <p className="text-xs" style={{ color: "#9e948c" }}>{lead.listName}</p>
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: "#16a34a" }}>{lead.equity}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            lead.status==="Negotiating"?"bg-orange-100 text-orange-700":
                            lead.status==="Contacted"?"bg-blue-100 text-blue-700":
                            lead.status==="New"?"bg-gray-100 text-gray-700":
                            "bg-green-100 text-green-700"
                          }`}>{lead.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
