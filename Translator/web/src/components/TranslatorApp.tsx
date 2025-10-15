import { useState, useEffect, useRef } from 'react';

// Azure API 调用函数
const callTranslateAPI = async (text: string, from: string, to: string): Promise<{ translation: string; detectedLanguage?: string }> => {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      from: from === 'auto' ? undefined : from,
      to
    })
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  return await response.json();
};

const callDetectAPI = async (text: string): Promise<string> => {
  const response = await fetch('/api/detect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Language detection failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.language;
};

const callSpeakAPI = async (text: string, language: string): Promise<void> => {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, language })
  });

  if (!response.ok) {
    throw new Error(`Speech synthesis failed: ${response.statusText}`);
  }

  // 获取音频数据并播放
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(reject);
  });
};

interface TranslationHistory {
  id: string;
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  isFavorite?: boolean;
}

const LANGUAGES = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh-Hans', name: '中文（简体）' },
  { code: 'zh-Hant', name: '中文（繁体）' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
];

export default function TranslatorApp() {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [detectedLang, setDetectedLang] = useState('');
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 智能切换目标语言：如果源文本是中文就翻译成英文，反之亦然
  const smartToggleLanguage = () => {
    if (targetLang === 'zh-Hans') {
      setTargetLang('en');
    } else {
      setTargetLang('zh-Hans');
    }
  };

  // 加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem('translation-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  // 保存历史记录
  const saveToHistory = (source: string, target: string, srcLang: string, tgtLang: string) => {
    const newItem: TranslationHistory = {
      id: Date.now().toString(),
      source,
      target,
      sourceLang: srcLang,
      targetLang: tgtLang,
      timestamp: Date.now(),
    };
    const newHistory = [newItem, ...history.slice(0, 99)]; // 保留最近100条
    setHistory(newHistory);
    localStorage.setItem('translation-history', JSON.stringify(newHistory));
  };

  // 翻译功能
  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    console.log('🔄 开始翻译:', { sourceText, sourceLang, targetLang });

    setIsTranslating(true);
    setTargetText('');
    setDetectedLang('');

    try {
      let actualSourceLang = sourceLang;
      
      // 如果是自动检测，先检测语言
      if (sourceLang === 'auto') {
        console.log('🔍 检测语言中...');
        const detected = await callDetectAPI(sourceText);
        console.log('✅ 检测到语言:', detected);
        setDetectedLang(detected);
        actualSourceLang = detected;
      }

      console.log('📡 调用翻译 API:', { text: sourceText, from: actualSourceLang, to: targetLang });
      const result = await callTranslateAPI(sourceText, actualSourceLang, targetLang);
      console.log('✅ 翻译结果:', result);
      
      // 如果 API 返回了检测到的语言，使用它
      if (result.detectedLanguage) {
        setDetectedLang(result.detectedLanguage);
        actualSourceLang = result.detectedLanguage;
      }
      
      setTargetText(result.translation);
      saveToHistory(sourceText, result.translation, actualSourceLang, targetLang);
    } catch (error) {
      console.error('❌ 翻译错误:', error);
      setTargetText('翻译失败，请检查网络连接或稍后重试');
    } finally {
      setIsTranslating(false);
    }
  };

  // 交换源文本和目标文本
  const handleSwapText = () => {
    if (!targetText) return;
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  // 清空
  const handleClear = () => {
    setSourceText('');
    setTargetText('');
    setDetectedLang('');
  };

  // 复制
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加提示
  };

  // 发音
  const handleSpeak = async (text: string, lang: string) => {
    if (!text) return;
    try {
      await callSpeakAPI(text, lang);
    } catch (error) {
      console.error('Speech error:', error);
      alert('发音功能暂时不可用，请稍后重试');
    }
  };

  // 粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSourceText(text);
    } catch (error) {
      console.error('Paste error:', error);
    }
  };

  // 从历史恢复
  const restoreFromHistory = (item: TranslationHistory) => {
    setSourceText(item.source);
    setTargetText(item.target);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setShowHistory(false);
  };

  // 切换收藏
  const toggleFavorite = (id: string) => {
    const newHistory = history.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    setHistory(newHistory);
    localStorage.setItem('translation-history', JSON.stringify(newHistory));
  };

  // 删除历史
  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('translation-history', JSON.stringify(newHistory));
  };

  // 清空所有历史
  const clearAllHistory = () => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      setHistory([]);
      localStorage.removeItem('translation-history');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Azure Translator</h1>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">历史记录</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {!showHistory ? (
          <div className="space-y-4 sm:space-y-6">
            {/* 语言选择栏 - 简化版 */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="font-medium text-gray-700">自动检测</span>
                </div>

                <button
                  onClick={handleSwapText}
                  disabled={!targetText}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="交换文本"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                <button
                  onClick={smartToggleLanguage}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all"
                  title={targetLang === 'zh-Hans' ? '当前翻译到中文，点击切换到英文' : '当前翻译到英文，点击切换到中文'}
                >
                  {targetLang === 'zh-Hans' ? (
                    <>
                      <span className="font-medium">中文</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">English</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {detectedLang && (
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    检测到: {detectedLang === 'en' ? 'English' : detectedLang === 'zh-Hans' ? '简体中文' : detectedLang === 'ja' ? '日本語' : detectedLang}
                  </span>
                </div>
              )}
            </div>

            {/* 翻译区域 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 源文本 */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">源文本</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePaste}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="粘贴"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                      <button
                        onClick={handleClear}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="清空"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <textarea
                  ref={sourceTextareaRef}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="输入要翻译的文本..."
                  className="w-full h-32 sm:h-48 md:h-64 p-3 sm:p-4 resize-none focus:outline-none text-base sm:text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleTranslate();
                    }
                  }}
                />
                <div className="p-3 sm:p-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500">{sourceText.length} 字符</span>
                  <button
                    onClick={() => handleSpeak(sourceText, sourceLang === 'auto' ? detectedLang : sourceLang)}
                    disabled={!sourceText}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="朗读"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 目标文本 */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">翻译结果</span>
                    <button
                      onClick={() => handleCopy(targetText)}
                      disabled={!targetText}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="复制"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="w-full h-32 sm:h-48 md:h-64 p-3 sm:p-4 overflow-y-auto text-base sm:text-lg text-gray-800 whitespace-pre-wrap">
                  {isTranslating ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    targetText || <span className="text-gray-400">翻译结果将显示在这里...</span>
                  )}
                </div>
                <div className="p-3 sm:p-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500">{targetText.length} 字符</span>
                  <button
                    onClick={() => handleSpeak(targetText, targetLang)}
                    disabled={!targetText}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="朗读"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 翻译按钮 - 固定在底部或正常位置 */}
            <div className="flex justify-center pb-safe">
              <button
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isTranslating ? '翻译中...' : '翻译 (Ctrl+Enter)'}
              </button>
            </div>
          </div>
        ) : (
          /* 历史记录面板 */
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">翻译历史</h2>
                {history.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="清空所有历史记录"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>全部清除</span>
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无历史记录
                </div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => restoreFromHistory(item)}>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                          <span>{LANGUAGES.find(l => l.code === item.sourceLang)?.name || item.sourceLang}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span>{LANGUAGES.find(l => l.code === item.targetLang)?.name || item.targetLang}</span>
                          <span className="ml-auto">{new Date(item.timestamp).toLocaleString('zh-CN')}</span>
                        </div>
                        <p className="text-gray-900 mb-1">{item.source}</p>
                        <p className="text-gray-600">{item.target}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title={item.isFavorite ? '取消收藏' : '收藏'}
                        >
                          <svg
                            className={`w-5 h-5 ${item.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors text-red-500"
                          title="删除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-500">
        <p>Powered by Azure Translator & Speech Services</p>
      </footer>
    </div>
  );
}
