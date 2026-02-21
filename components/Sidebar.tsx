
import React from 'react';
import { History, LayoutDashboard, FileText, Settings, HelpCircle, Star, LogOut } from 'lucide-react';

interface SidebarProps {
  onSettingsClick: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick, onLogout }) => {
  const items = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'لوحة التحكم', active: true },
    { icon: <FileText className="w-5 h-5" />, label: 'مستنداتي' },
    { icon: <History className="w-5 h-5" />, label: 'السجل' },
    { icon: <Star className="w-5 h-5" />, label: 'المفضلة' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-200">
      <div className="p-6">
        <div className="flex items-center gap-3 text-blue-700 mb-8">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold">ع</div>
          <span className="font-bold text-lg tracking-tight">قلم ذكي</span>
        </div>

        <nav className="space-y-1">
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
