import Header from "@/components/Header";
import { mockLeads } from "@/lib/mock-data";
import { Plus, Download, Mail, Phone, Trash2 } from "lucide-react";

const motivationColors: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-gray-100 text-gray-700",
};

const statusColors: Record<string, string> = {
  New: "bg-gray-100 text-gray-700",
  Contacted: "bg-blue-100 text-blue-700",
  Negotiating: "bg-orange-100 text-orange-700",
  Closed: "bg-green-100 text-green-700",
  Dead: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  return (
    <div>
      <Header title="My Lists" subtitle="Manage your lead lists and contacts" />
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-5 md:mb-6 gap-3 flex-wrap">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={16} />
              <span className="hidden sm:inline">New List</span>
            </button>
            <button className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Lists</option>
            <option>High Equity Phoenix</option>
            <option>Pre-Foreclosure Q2</option>
            <option>Scottsdale LLC</option>
          </select>
        </div>

        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {mockLeads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{lead.address}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex gap-4 mt-3 mb-3">
                <div>
                  <p className="text-xs text-gray-400">Value</p>
                  <p className="text-sm font-semibold text-gray-800">{lead.propertyValue}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Equity</p>
                  <p className="text-sm font-semibold text-green-600">{lead.equity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Motivation</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${motivationColors[lead.motivation]}`}>
                    {lead.motivation}
                  </span>
                </div>
              </div>
              {lead.phone && <p className="text-xs text-blue-600">{lead.phone}</p>}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 rounded-lg text-blue-600 text-xs font-medium">
                  <Mail size={13} /> Email
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 rounded-lg text-green-600 text-xs font-medium">
                  <Phone size={13} /> Call
                </button>
                <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Property Value</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Equity</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Motivation</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">List</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-400">{lead.address}</p>
                      <div className="flex gap-3 mt-1">
                        {lead.phone && <span className="text-xs text-blue-600">{lead.phone}</span>}
                        {lead.email && <span className="text-xs text-gray-400">{lead.email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-800">{lead.propertyValue}</td>
                    <td className="px-5 py-4 font-medium text-green-600">{lead.equity}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${motivationColors[lead.motivation]}`}>
                        {lead.motivation}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{lead.listName}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button className="p-1.5 hover:bg-blue-50 rounded text-blue-500"><Mail size={14} /></button>
                        <button className="p-1.5 hover:bg-green-50 rounded text-green-500"><Phone size={14} /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
