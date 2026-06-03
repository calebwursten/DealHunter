import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
  color?: "brand" | "green" | "orange" | "purple";
}

const iconStyles: Record<string, { bg: string; color: string }> = {
  brand:  { bg: "#f9e2dc", color: "#492b23" },
  green:  { bg: "#dcfce7", color: "#16a34a" },
  orange: { bg: "#ffedd5", color: "#ea580c" },
  purple: { bg: "#f3e8ff", color: "#9333ea" },
};

export default function StatsCard({ label, value, change, positive, icon: Icon, color = "brand" }: StatsCardProps) {
  const { bg, color: iconColor } = iconStyles[color];
  return (
    <div className="rounded-xl p-5 shadow-sm" style={{ background: "#fff", border: "1px solid #e8e2db" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: "#9e948c" }}>{label}</span>
        <div className="p-2 rounded-lg" style={{ background: bg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: "#2d2825" }}>{value}</p>
      {change && (
        <p className="text-xs mt-1 font-medium" style={{ color: positive ? "#16a34a" : "#9e948c" }}>
          {change}
        </p>
      )}
    </div>
  );
}
