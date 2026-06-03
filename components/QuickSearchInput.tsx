"use client";
import { MapPin } from "lucide-react";

export default function QuickSearchInput() {
  return (
    <div className="flex-1 relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9e948c" }} />
      <input
        type="text"
        placeholder="Search Pittsburgh address, ZIP, or neighborhood..."
        className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{ border: "1px solid #e8e2db" }}
        onFocus={(e) => (e.target.style.borderColor = "#492b23")}
        onBlur={(e)  => (e.target.style.borderColor = "#e8e2db")}
      />
    </div>
  );
}
