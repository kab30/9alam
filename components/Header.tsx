
import React from 'react';
import { Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">إملاء عربي <span className="text-blue-600">برو</span></h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden md:inline text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full uppercase tracking-wider">
          مدعوم بالذكاء الاصطناعي
        </span>
      </div>
    </header>
  );
};

export default Header;
