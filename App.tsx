
import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Toolbar } from './components/Toolbar';
import { Document, Stats } from './types';
import { geminiService } from './services/geminiService';
import { PanelLeft, Info, FileText, Save, Sparkles, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'novascribe_docs';

const INITIAL_DOC: Document = {
  id: 'welcome',
  title: '欢迎使用 NovaScribe',
  content: `# 开始你的创作之旅 ✍️\n\nNovaScribe 是一款受 Typora 启发的极简 Markdown 编辑器。\n\n## 核心特性\n- **所见即所得**：点击任意段落即可编辑，离开即渲染。\n- **AI 赋能**：点击下方 ✨ 按钮，让 Gemini 帮你润色文字。\n- **本地优先**：支持连接本地文件夹，保护隐私。\n\n## 快捷操作\n- \`Enter\`: 创建新段落\n- \`Ctrl + S\`: 保存到本地\n- \`Tab\`: 插入缩进`,
  lastModified: Date.now(),
};

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [INITIAL_DOC];
  });

  const [activeDocId, setActiveDocId] = useState<string>(documents[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [activeFileHandle, setActiveFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const activeDoc = useMemo(() => {
    return documents.find(d => d.id === activeDocId) || documents[0];
  }, [documents, activeDocId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const updateContent = (newContent: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === activeDocId ? { ...doc, content: newContent, lastModified: Date.now() } : doc
    ));
  };

  const handleAiPolish = async () => {
    if (!activeDoc.content.trim()) return;
    setIsAiProcessing(true);
    try {
      const polished = await geminiService.polishMarkdown(activeDoc.content);
      updateContent(polished);
    } catch (error) {
      console.error("AI Polish failed", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSave = async () => {
    if (activeFileHandle) {
      try {
        const writable = await activeFileHandle.createWritable();
        await writable.write(activeDoc.content);
        await writable.close();
      } catch (e) {
        console.error("Save failed", e);
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFileHandle, activeDoc]);

  const stats = useMemo((): Stats => {
    const text = activeDoc.content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    return {
      words,
      chars: text.length,
      readingTime: Math.ceil(words / 200)
    };
  }, [activeDoc.content]);

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen}
        documents={documents}
        activeId={activeDocId}
        activeContent={activeDoc.content}
        projectHandle={projectHandle}
        onSelect={setActiveDocId}
        onCreate={() => {
          const newDoc = { id: Date.now().toString(), title: '未命名文档', content: '', lastModified: Date.now() };
          setDocuments([newDoc, ...documents]);
          setActiveDocId(newDoc.id);
        }}
        onDelete={(id) => {
          if (documents.length > 1) {
            const nextDocs = documents.filter(d => d.id !== id);
            setDocuments(nextDocs);
            if (activeDocId === id) setActiveDocId(nextDocs[0].id);
          }
        }}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenWorkspace={async () => {
          try {
            const handle = await (window as any).showDirectoryPicker();
            setProjectHandle(handle);
          } catch (e) {}
        }}
        onCloseWorkspace={() => setProjectHandle(null)}
        onFileSelect={async (handle) => {
          const file = await handle.getFile();
          const content = await file.text();
          const newDoc = { id: handle.name, title: handle.name, content, lastModified: Date.now() };
          setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
          setActiveDocId(newDoc.id);
          setActiveFileHandle(handle);
        }}
        onRenameDraft={(id, title) => setDocuments(prev => prev.map(d => d.id === id ? { ...d, title } : d))}
        onRenameFile={async () => {}}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-100 shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <PanelLeft size={18} />
              </button>
            )}
            <input 
              value={activeDoc.title}
              onChange={(e) => setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, title: e.target.value } : d))}
              className="text-sm font-semibold bg-transparent border-none outline-none text-slate-600 focus:text-slate-900 w-64 transition-colors"
              placeholder="文档标题..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAiPolish}
              disabled={isAiProcessing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isAiProcessing ? 'bg-indigo-50 text-indigo-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
            >
              {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI 润色
            </button>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Info size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fdfdfd]">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col">
            <Editor 
              content={activeDoc.content}
              projectHandle={projectHandle}
              onChange={updateContent}
            />
          </div>
        </div>

        <Toolbar 
          onAction={(syntax) => updateContent(activeDoc.content + '\n\n' + syntax)}
          onImageUpload={() => {}} 
        />

        <footer className="h-9 px-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 bg-white uppercase tracking-wider">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 opacity-60"><FileText size={12}/> {stats.words} WORDS / {stats.chars} CHARS</span>
            <span className="opacity-60">{stats.readingTime} MIN READ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            Local Mode
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
