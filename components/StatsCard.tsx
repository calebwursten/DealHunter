import { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "purple";
}

const colors = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
};

export default function StatsCard({ label, value, change, positive, icon: Icon, color = "blue" }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={clsx("p-2 rounded-lg", colors[color])}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={clsx("text-xs mt-1 font-medium", positive ? "text-green-600" : "text-gray-400")}>
          {change}
        </p>
      )}
    </div>
  );
}
