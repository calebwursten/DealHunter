"use client";

import { Search, MapPin } from "lucide-react";
import { useState } from "react";

export default function SearchBar({ placeholder = "Search by address, ZIP, owner name..." }: { placeholder?: string }) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1 relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9e948c" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ border: "1px solid #e8e2db", background: "#fff" }}
          onFocus={(e) => (e.target.style.borderColor = "#492b23")}
          onBlur={(e) => (e.target.style.borderColor = "#e8e2db")}
        />
      </div>
      <button
        className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
        style={{ background: "#492b23" }}
      >
        <Search size={16} />
        Search
      </button>
    </div>
  );
}
