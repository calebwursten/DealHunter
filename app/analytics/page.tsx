import Header from "@/components/Header";
import { TrendingUp, TrendingDown } from "lucide-react";

const markets = [
  { city: "Phoenix, AZ", avgPrice: "$385,000", change: "+4.2%", positive: true, inventory: "Low", dom: 18 },
  { city: "Scottsdale, AZ", avgPrice: "$720,000", change: "+2.8%", positive: true, inventory: "Very Low", dom: 12 },
  { city: "Tempe, AZ", avgPrice: "$342,000", change: "+5.1%", positive: true, inventory: "Low", dom: 14 },
  { city: "Mesa, AZ", avgPrice: "$310,000", change: "-0.4%", positive: false, inventory: "Moderate", dom: 28 },
  { city: "Chandler, AZ", avgPrice: "$415,000", change: "+3.3%", positive: true, inventory: "Low", dom: 16 },
];

const barHeights = [62, 71, 68, 75, 73, 80, 85, 82, 90, 88, 94, 98];
const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];

export default function AnalyticsPage() {
  return (
    <div>
      <Header title="Market Analytics" subtitle="Track market trends and investment opportunities" />
      <div className="p-4 md:p-8">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-6 md:mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 col-span-2 md:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm md:text-base">Market Performance (12 months)</h2>
            <div className="h-36 md:h-48 flex items-end gap-1 md:gap-2">
              {barHeights.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${h}%` }} />
                  <span className="text-xs text-gray-400 hidden sm:block">{months[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 md:space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Market Score</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">8.4</p>
              <p className="text-xs text-gray-500 mt-1">Seller&apos;s market</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Appreciation YoY</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">+6.2%</p>
              <p className="text-xs text-gray-500 mt-1">Above national avg</p>
            </div>
          </div>
        </div>

        {/* Mobile market cards */}
        <div className="space-y-3 md:hidden">
          {markets.map((m) => (
            <div key={m.city} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">{m.city}</p>
                <span className={`flex items-center gap-1 font-semibold text-sm ${m.positive ? "text-green-600" : "text-red-500"}`}>
                  {m.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {m.change}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Avg Price</p>
                  <p className="text-sm font-semibold text-gray-800">{m.avgPrice}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Inventory</p>
                  <p className="text-sm font-semibold text-gray-800">{m.inventory}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Avg DOM</p>
                  <p className="text-sm font-semibold text-gray-800">{m.dom}d</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Market Overview by City</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Market</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">YoY Change</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Inventory</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Avg DOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {markets.map((m) => (
                  <tr key={m.city} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{m.city}</td>
                    <td className="px-5 py-3 text-gray-700">{m.avgPrice}</td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1 font-medium ${m.positive ? "text-green-600" : "text-red-500"}`}>
                        {m.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {m.change}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{m.inventory}</td>
                    <td className="px-5 py-3 text-gray-600">{m.dom} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
