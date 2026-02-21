
import React, { useRef, useEffect } from 'react';

interface EditorProps {
  text: string;
  draft: string;
  fontSize: number;
  onChange: (val: string) => void;
}

const Editor: React.FC<EditorProps> = ({ text, draft, fontSize, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // التمرير التلقائي لأسفل لمواكبة النص الجديد
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text, draft]);

  const handleManualChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative flex-1 flex flex-col p-10 md:p-16 lg:p-20 bg-[#fdfdfd]">
      <textarea
        ref={textareaRef}
        value={text + (draft ? (text ? '\n' : '') + draft : '')}
        onChange={handleManualChange}
        dir="rtl"
        style={{ fontSize: `${fontSize}px`, fontFamily: "'Cairo', sans-serif" }}
        placeholder="تحدث الآن.. سيتم كتابة كل ما تقوله هنا وسينتقل النص تلقائياً لسطر جديد عند توقفك.."
        className="flex-1 w-full bg-transparent resize-none focus:outline-none font-bold text-gray-800 leading-[1.6] placeholder:text-gray-200 placeholder:font-normal placeholder:text-3xl transition-all duration-300"
      />
      
      {/* مؤشر حالة الكتابة الذكي */}
      {draft && (
        <div className="absolute top-8 left-10 flex items-center gap-3 bg-blue-600 text-white text-xs px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
          <div className="flex gap-1">
            <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
            <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></span>
            <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></span>
          </div>
          جاري المعالجة...
        </div>
      )}

      {/* العلامة التجارية الخفية */}
      <div className="absolute bottom-8 left-12 flex items-center gap-2 opacity-20 pointer-events-none">
        <div className="w-10 h-1 bg-blue-600 rounded-full"></div>
        <span className="text-gray-900 text-xs font-black tracking-tighter uppercase">ARABIC DICTATE PRO BOLD</span>
      </div>
    </div>
  );
};

export default Editor;
