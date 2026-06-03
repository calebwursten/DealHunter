import { Bell, HelpCircle } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 pl-14 pr-4 py-3.5 md:px-8 md:py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-0.5 hidden sm:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hidden sm:block">
          <HelpCircle size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          C
        </div>
      </div>
    </div>
  );
}
