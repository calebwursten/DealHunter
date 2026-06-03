import { MapPin } from "lucide-react";
import { Property } from "@/lib/types";
import clsx from "clsx";

const equityColors = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-gray-900 font-semibold">
            <MapPin size={14} className="text-blue-500" />
            {property.address}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {property.city}, {property.state} {property.zip}
          </p>
        </div>
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-full", equityColors[property.equityLevel])}>
          {property.equityLevel} equity
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-xs text-gray-400">Est. Value</p>
          <p className="text-sm font-semibold text-gray-800">{property.estimatedValue}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Equity</p>
          <p className="text-sm font-semibold text-green-600">{property.equity}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Owner</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{property.ownerName}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {property.propertyType} · {property.beds}bd/{property.baths}ba
        </span>
        <span className="text-xs text-gray-400">{property.sqft.toLocaleString()} sqft</span>
      </div>

      {property.tags.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {property.tags.map((tag) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
