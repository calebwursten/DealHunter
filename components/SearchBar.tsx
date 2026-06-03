"use client";

import { Search, MapPin } from "lucide-react";
import { useState } from "react";

export default function SearchBar({ placeholder = "Search by address, ZIP, owner name..." }: { placeholder?: string }) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1 relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Search size={16} />
        Search
      </button>
    </div>
  );
}
