import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { mockComps } from "@/lib/mock-data";

export default function CompsPage() {
  return (
    <div>
      <Header title="Comp Analysis" subtitle="Analyze comparable sales to determine property value" />
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm text-gray-500 mb-3">Enter a subject property to pull comparable sales</p>
          <SearchBar placeholder="Enter subject property address..." />
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase mb-1">Avg Sale Price</p>
            <p className="text-2xl font-bold text-gray-900">$376,167</p>
            <p className="text-xs text-green-600 mt-1">+3.2% vs last quarter</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase mb-1">Avg Price/sqft</p>
            <p className="text-2xl font-bold text-gray-900">$207</p>
            <p className="text-xs text-green-600 mt-1">+1.8% vs last quarter</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase mb-1">Comps Found</p>
            <p className="text-2xl font-bold text-gray-900">{mockComps.length}</p>
            <p className="text-xs text-gray-400 mt-1">within 0.5 mi radius</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Comparable Sales</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">$/sqft</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Beds/Ba</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sqft</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockComps.map((comp) => (
                <tr key={comp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{comp.address}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">{comp.salePrice}</td>
                  <td className="px-5 py-3 text-gray-600">{comp.pricePerSqft}</td>
                  <td className="px-5 py-3 text-gray-600">{comp.beds}/{comp.baths}</td>
                  <td className="px-5 py-3 text-gray-600">{comp.sqft.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-600">{comp.saleDate}</td>
                  <td className="px-5 py-3 text-blue-600">{comp.distance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
