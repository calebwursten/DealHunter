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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          <StatsCard label="Properties Indexed" value="140K+" change="Allegheny County" positive icon={Search} color="blue" />
          <StatsCard label="Active Leads" value="37" change="+5 this week" positive icon={Users} color="green" />
          <StatsCard label="Avg. Assessed Value" value="$198K" change="Pittsburgh metro" positive icon={TrendingUp} color="orange" />
          <StatsCard label="Est. Deal Value" value="$2.4M" change="across active leads" icon={DollarSign} color="purple" />
        </div>

        {/* Quick search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">Quick Property Search</h2>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="flex-1 relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Pittsburgh address, ZIP, or neighborhood..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Link
              href="/properties"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Search size={16} />
              Search
            </Link>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

          {/* High equity opportunities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold text-gray-900">High Equity Opportunities</h2>
                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">LIVE</span>
              </div>
              <Link href="/properties" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            {highEquityProps.length > 0 ? (
              <div className="space-y-4">
                {highEquityProps.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                <Search size={24} className="mx-auto mb-2 text-gray-300" />
                Use Property Search to find high-equity opportunities
              </div>
            )}
          </div>

          {/* Recent leads */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm md:text-base font-semibold text-gray-900">Recent Leads</h2>
              <Link href="/leads" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Equity</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          <p className="text-xs text-gray-400">{lead.listName}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-green-600">{lead.equity}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              lead.status === "Negotiating" ? "bg-orange-100 text-orange-700"
                              : lead.status === "Contacted" ? "bg-blue-100 text-blue-700"
                              : lead.status === "New" ? "bg-gray-100 text-gray-700"
                              : "bg-green-100 text-green-700"
                            }`}
                          >
                            {lead.status}
                          </span>
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
