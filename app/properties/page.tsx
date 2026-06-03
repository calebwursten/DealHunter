import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import { mockProperties } from "@/lib/mock-data";
import { Filter, SlidersHorizontal } from "lucide-react";

export default function PropertiesPage() {
  return (
    <div>
      <Header title="Property Search" subtitle="Search millions of property records" />
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <SearchBar />
          <div className="flex gap-3 mt-4 flex-wrap">
            {["Property Type", "Equity %", "Owner Type", "Bedrooms", "Year Built", "Last Sale"].map((filter) => (
              <button
                key={filter}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Filter size={12} />
                {filter}
              </button>
            ))}
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 bg-blue-50 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-100 ml-auto">
              <SlidersHorizontal size={12} />
              Advanced Filters
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{mockProperties.length}</span> properties found
          </p>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Sort: Highest Equity</option>
            <option>Sort: Lowest Price</option>
            <option>Sort: Newest</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {mockProperties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
