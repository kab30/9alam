
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ConnectionStatus } from './types';
import { createBlob } from './utils/audio-utils';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Header from './components/Header';
import { Mic, MicOff, Trash2, Copy, AlertCircle, Type, X, Key, ExternalLink, CheckCircle2, Settings, Lock, LogIn, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(sessionStorage.getItem('is_auth') === 'true');
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [fullText, setFullText] = useState<string>('');
  const [currentDraft, setCurrentDraft] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(36);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(localStorage.getItem('custom_gemini_api_key') || '');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const currentDraftRef = useRef<string>('');

  useEffect(() => {
    if (!isAuthenticated) return;
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, [isAuthenticated]);

  const handleLogin = (pass: string) => {
    if (pass === '041994') {
      setIsAuthenticated(true);
      sessionStorage.setItem('is_auth', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('is_auth');
    stopTranscription();
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleSaveCustomKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('custom_gemini_api_key', key);
  };

  const stopTranscription = useCallback(() => {
    setStatus(prev => {
      if (prev === ConnectionStatus.DISCONNECTED) return prev;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => console.error('Error closing AudioContext:', err));
        audioContextRef.current = null;
      }

      if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
          try {
            session.close();
          } catch (e) {}
        });
        sessionRef.current = null;
      }

      return ConnectionStatus.DISCONNECTED;
    });
  }, []);

  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    // 1. استلام النص المباشر أثناء الكلام
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      currentDraftRef.current += text;
      setCurrentDraft(currentDraftRef.current);
    }

    // 2. معالجة انتهاء الكلام (Turn Complete) وحفظ النص بشكل دائم
    if (message.serverContent?.turnComplete) {
      const finalizedText = currentDraftRef.current.trim();
      
      if (finalizedText) {
        setFullText(prev => {
          // إذا كان هناك نص سابق، أضف سطراً جديداً (يعود إلى السطر)
          const prefix = prev.trim() ? prev.trim() + '\n' : '';
          return prefix + finalizedText;
        });
      }
      
      // مسح المسودة لبدء جملة جديدة
      currentDraftRef.current = '';
      setCurrentDraft('');
    }
  }, []);

  const startTranscription = useCallback(async () => {
    try {
      // التحقق من وجود مفتاح API
      const hasPlatformKey = window.aistudio ? await window.aistudio.hasSelectedApiKey() : false;
      const effectiveApiKey = customApiKey || process.env.API_KEY || '';

      if (!hasPlatformKey && !effectiveApiKey) {
        setError('يرجى إعداد مفتاح API من الإعدادات أولاً للبدء.');
        setIsSettingsOpen(true);
        return;
      }

      setStatus(ConnectionStatus.CONNECTING);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                if (session && typeof session.sendRealtimeInput === 'function') {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: handleMessage,
          onerror: (e) => {
            console.error('Gemini Error:', e);
            setError('حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.');
            stopTranscription();
          },
          onclose: () => {
            stopTranscription();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: `أنت نظام إملاء احترافي مخصص للغة العربية.
          القواعد الصارمة:
          1. ابقَ صامتاً تماماً.
          2. عند انتهاء الجملة، تأكد من وضع علامات الترقيم المناسبة.
          3. لا تحذف أي كلمة قالها المستخدم.
          4. اكتب كل ما يقال بدقة عالية.`,
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError('تعذر الوصول إلى الميكروفون. تأكد من منح الإذن للمتصفح.');
      setStatus(ConnectionStatus.DISCONNECTED);
    }
  }, [handleMessage, stopTranscription]);

  const toggleMic = () => {
    if (status === ConnectionStatus.CONNECTED) {
      stopTranscription();
    } else if (status === ConnectionStatus.DISCONNECTED) {
      startTranscription();
    }
  };

  const clearText = () => {
    if (window.confirm('هل أنت متأكد من مسح كافة النصوص؟')) {
      setFullText('');
      setCurrentDraft('');
      currentDraftRef.current = '';
    }
  };

  const copyToClipboard = () => {
    const textToCopy = fullText + (currentDraft ? (fullText ? '\n' : '') + currentDraft : '');
    navigator.clipboard.writeText(textToCopy);
    alert('تم نسخ النص إلى الحافظة');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      <Sidebar 
        onSettingsClick={() => setIsSettingsOpen(true)} 
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-full relative">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* تم تكبير الحاوية إلى max-w-screen-2xl لجعل الصندوق أكبر بكثير */}
          <div className="max-w-screen-2xl mx-auto h-full flex flex-col space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            
            {/* واجهة الكتابة المحسنة */}
            <div className="flex-1 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-500">
              <Editor 
                text={fullText} 
                draft={currentDraft} 
                fontSize={fontSize}
                onChange={(val) => setFullText(val)} 
              />
            </div>

            {/* أدوات التحكم العائمة في الأسفل */}
            <div className="sticky bottom-0 pb-10 pt-4 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent flex flex-col items-center">
              <div className="bg-white/80 backdrop-blur-xl px-10 py-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 flex items-center gap-12 transition-all">
                
                {/* التحكم في حجم الخط */}
                <div className="hidden md:flex items-center gap-4 border-l pl-8 border-gray-200">
                  <Type className="w-5 h-5 text-blue-500" />
                  <input 
                    type="range" 
                    min="20" 
                    max="80" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-32 h-1.5 bg-blue-50 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-bold text-blue-600 min-w-[2rem]">{fontSize}</span>
                </div>

                <button 
                  onClick={clearText}
                  className="text-gray-400 hover:text-red-500 transition-all p-3 rounded-full hover:bg-red-50 hover:scale-110 active:scale-90"
                  title="مسح النص بالكامل"
                >
                  <Trash2 className="w-7 h-7" />
                </button>

                <button
                  onClick={toggleMic}
                  disabled={status === ConnectionStatus.CONNECTING}
                  className={`relative p-8 rounded-full transition-all duration-500 transform active:scale-95 shadow-2xl ${
                    status === ConnectionStatus.CONNECTED 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-200 ring-8 ring-red-50' 
                      : status === ConnectionStatus.CONNECTING
                        ? 'bg-yellow-500 shadow-yellow-200 opacity-80 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 ring-8 ring-blue-50'
                  } text-white`}
                >
                  {status === ConnectionStatus.CONNECTED ? (
                    <MicOff className="w-9 h-9" />
                  ) : (
                    <Mic className="w-9 h-9" />
                  )}
                  {status === ConnectionStatus.CONNECTED && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30"></span>
                  )}
                </button>

                <button 
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-blue-600 transition-all p-3 rounded-full hover:bg-blue-50 hover:scale-110 active:scale-90"
                  title="نسخ النص النهائي"
                >
                  <Copy className="w-7 h-7" />
                </button>
              </div>

              <div className="mt-6 text-sm font-bold tracking-wide">
                {status === ConnectionStatus.CONNECTED ? (
                  <span className="text-red-600 flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    نظام الإملاء نشط.. تحدث الآن
                  </span>
                ) : status === ConnectionStatus.CONNECTING ? (
                  <span className="text-yellow-600 animate-pulse">جاري تجهيز المحرك الذكي...</span>
                ) : (
                  <span className="text-gray-400">انقر على الميكروفون للبدء</span>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        hasApiKey={hasApiKey}
        onSelectKey={handleSelectKey}
        customKey={customApiKey}
        onSaveCustomKey={handleSaveCustomKey}
      />
    </div>
  );
};

// مكون الإعدادات
const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
  onSelectKey: () => void;
  customKey: string;
  onSaveCustomKey: (key: string) => void;
}> = ({ isOpen, onClose, hasApiKey, onSelectKey, customKey, onSaveCustomKey }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">إعدادات النظام</h2>
              <p className="text-sm text-gray-500">إدارة مفاتيح الذكاء الاصطناعي والاتصال</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* قسم مفتاح المنصة */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
              <Key className="w-5 h-5" />
              <h3>مفتاح API الخاص بالمنصة</h3>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasApiKey ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <span className="font-semibold text-gray-700">
                    {hasApiKey ? 'مفتاح المنصة متصل وجاهز' : 'لم يتم اختيار مفتاح من المنصة'}
                  </span>
                </div>
                <button
                  onClick={onSelectKey}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                  {hasApiKey ? 'تغيير المفتاح' : 'اختيار مفتاح'}
                </button>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                هذا الخيار يستخدم نظام إدارة المفاتيح المدمج في AI Studio. تأكد من تفعيل الفوترة في مشروع Google Cloud الخاص بك.
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 mr-1"
                >
                  دليل الفوترة <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </section>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-gray-400 font-bold">أو استخدم مفتاحاً مخصصاً</span></div>
          </div>

          {/* قسم المفتاح المخصص */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 font-bold text-lg">
              <Key className="w-5 h-5" />
              <h3>مفتاح API يدوي</h3>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={customKey}
                onChange={(e) => onSaveCustomKey(e.target.value)}
                placeholder="أدخل مفتاح Gemini API هنا..."
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono"
              />
              <p className="text-xs text-gray-400 px-2">
                سيتم حفظ هذا المفتاح محلياً في متصفحك فقط.
              </p>
            </div>
          </section>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl active:scale-95"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;

// مكون شاشة الدخول
const LoginScreen: React.FC<{ onLogin: (pass: string) => boolean }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(password)) {
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-gray-100 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex p-5 bg-blue-50 rounded-3xl text-blue-600 shadow-inner">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">قلم ذكي برو</h1>
          <p className="text-gray-500 font-medium">يرجى إدخال رمز الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز الدخول"
                className={`w-full pr-12 pl-6 py-4 bg-gray-50 border ${error ? 'border-red-300 ring-4 ring-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'} rounded-2xl outline-none transition-all text-center text-2xl tracking-[0.5em] font-bold`}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm font-bold text-center animate-bounce">
                رمز الدخول غير صحيح، حاول مرة أخرى
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <LogIn className="w-6 h-6" />
            دخول للنظام
          </button>
        </form>

        <div className="pt-6 text-center">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            نظام إملاء ذكي آمن ومحمي
          </p>
        </div>
      </div>
    </div>
  );
};
