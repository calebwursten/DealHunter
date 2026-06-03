import Header from "@/components/Header";
import { Mail, Phone, FileText, Users, ArrowRight } from "lucide-react";
import { ElementType } from "react";

interface Tool {
  icon: ElementType;
  title: string;
  description: string;
  action: string;
  color: string;
  stats: string;
}

const tools: Tool[] = [
  {
    icon: Mail,
    title: "Direct Mail",
    description: "Send postcards and letters to motivated sellers in your lists.",
    action: "Create Campaign",
    color: "blue",
    stats: "3 active campaigns",
  },
  {
    icon: Phone,
    title: "Skip Tracing",
    description: "Find phone numbers and email addresses for property owners.",
    action: "Run Skip Trace",
    color: "green",
    stats: "142 contacts found",
  },
  {
    icon: FileText,
    title: "SMS / Cold Texting",
    description: "Send bulk SMS to leads in your lists with personalized messages.",
    action: "Start SMS Blast",
    color: "orange",
    stats: "18% response rate",
  },
  {
    icon: Users,
    title: "Cold Calling",
    description: "Auto-dial your lead lists with call scripts and disposition tracking.",
    action: "Launch Dialer",
    color: "purple",
    stats: "56 calls this week",
  },
];

const iconBg: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
};

const borderColor: Record<string, string> = {
  blue: "border-blue-100",
  green: "border-green-100",
  orange: "border-orange-100",
  purple: "border-purple-100",
};

const btnColor: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-green-600 hover:bg-green-700",
  orange: "bg-orange-500 hover:bg-orange-600",
  purple: "bg-purple-600 hover:bg-purple-700",
};

export default function MarketingPage() {
  return (
    <div>
      <Header title="Marketing" subtitle="Reach motivated sellers through multiple channels" />
      <div className="p-8">
        <div className="grid grid-cols-2 gap-6">
          {tools.map((tool) => (
            <div key={tool.title} className={`bg-white rounded-xl border-2 ${borderColor[tool.color]} p-6`}>
              <div className={`inline-flex p-3 rounded-xl mb-4 ${iconBg[tool.color]}`}>
                <tool.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{tool.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{tool.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{tool.stats}</span>
                <button className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${btnColor[tool.color]}`}>
                  {tool.action}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
