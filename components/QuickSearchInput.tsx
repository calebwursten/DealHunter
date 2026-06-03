"use client";
import { MapPin } from "lucide-react";

export default function QuickSearchInput() {
  return (
    <div className="flex-1 relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#888888" }} />
      <input
        type="text"
        placeholder="Search Pittsburgh address, ZIP, or neighborhood..."
        className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{ border: "1px solid #e5e5e5" }}
        onFocus={(e) => (e.target.style.borderColor = "#000000")}
        onBlur={(e)  => (e.target.style.borderColor = "#e5e5e5")}
      />
    </div>
  );
}
