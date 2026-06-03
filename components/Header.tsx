import { Bell, HelpCircle } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <div
      className="pl-14 pr-4 py-3.5 md:px-8 md:py-4 flex items-center justify-between"
      style={{ background: "#fff", borderBottom: "1px solid #e8e2db" }}
    >
      <div>
        <h1 className="text-lg md:text-xl font-semibold" style={{ color: "#2d2825" }}>{title}</h1>
        {subtitle && <p className="text-xs md:text-sm mt-0.5 hidden sm:block" style={{ color: "#9e948c" }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <button className="p-2 rounded-full hidden sm:block" style={{ color: "#9e948c" }}>
          <HelpCircle size={20} />
        </button>
        <button className="p-2 rounded-full relative" style={{ color: "#9e948c" }}>
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#492b23" }} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: "#492b23" }}
        >
          W
        </div>
      </div>
    </div>
  );
}
