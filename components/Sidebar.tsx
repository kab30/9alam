
import React from 'react';
import { History, LayoutDashboard, FileText, Settings, HelpCircle, Star, LogOut } from 'lucide-react';

import { supabase, Document } from '../utils/supabase';

interface SidebarProps {
  onSettingsClick: () => void;
  onLogout: () => void;
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick, onLogout, documents, onSelectDocument }) => {
  const items = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'لوحة التحكم', active: true },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-gray-200">
      <div className="p-6 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 text-blue-700 mb-8">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold">ع</div>
          <span className="font-bold text-lg tracking-tight">قلم ذكي</span>
        </div>

        <nav className="space-y-1 mb-8">
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                item.active ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">المستندات الأخيرة</h3>
          <div className="space-y-1">
            {documents.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 italic">لا توجد مستندات محفوظة</p>
            ) : (
              documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-right group"
                >
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  <span className="truncate flex-1">{doc.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 space-y-1 border-t border-gray-100">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          الإعدادات ومفاتيح API
        </button>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          المساعدة
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-4"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
