
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Editor, EditorRef } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { geminiService } from './services/geminiService';
import { PanelLeft, Sparkles, Loader2, Save, FileDown, Check } from 'lucide-react';

// 使用 UMD 路径引入，增加构建兼容性
// @ts-ignore
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

const STORAGE_KEY = 'novascribe_docs';

const App: React.FC = () => {
  const [docs, setDocs] = useState<any[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [{ 
      id: '1', 
      title: '快速入门', 
      content: '# 欢迎使用 NovaScribe\n\n这是一个类似于 Typora 的**所见即所得** Markdown 编辑器。\n\n- **点击**任意段落进行编辑\n- **回车**创建新段落\n- **AI 润色**一键美化内容\n\n试试在下方输入一些内容吧！', 
      lastModified: Date.now() 
    }];
  });
  
  const [activeId, setActiveId] = useState(docs[0]?.id || '1');
  const [activeFileHandle, setActiveFileHandle] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [projectHandle, setProjectHandle] = useState<any>(null);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  const editorRef = useRef<EditorRef>(null);

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) || docs[0], [docs, activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, [docs]);

  // 全局键盘监听：全选与复制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      // Ctrl + A 全选逻辑
      if (isMod && e.key === 'a') {
        // 如果不在输入框内，或者已经全选了输入框内容，则执行全局全选
        const activeElement = document.activeElement;
        const isInput = activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement;
        
        if (!isInput || (isInput && (activeElement as any).selectionEnd - (activeElement as any).selectionStart === (activeElement as any).value.length)) {
          e.preventDefault();
          setIsAllSelected(true);
        }
      }

      // Ctrl + C 复制逻辑
      if (isMod && e.key === 'c' && isAllSelected) {
        e.preventDefault();
        navigator.clipboard.writeText(activeDoc.content);
        setIsAllSelected(false);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
      }

      // Esc 取消全选
      if (e.key === 'Escape') {
        setIsAllSelected(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc.content, isAllSelected]);

  const updateActiveContent = (newContent: string) => {
    setDocs(prev => prev.map(d => d.id === activeId ? { ...d, content: newContent, lastModified: Date.now() } : d));
    
    if (activeFileHandle) {
      (async () => {
        try {
          const writable = await activeFileHandle.createWritable();
          await writable.write(newContent);
          await writable.close();
        } catch (e) {
          console.error("自动保存到工作区失败:", e);
        }
      })();
    }
  };

  const handleAiPolish = async () => {
    if (!activeDoc.content.trim()) return;
    setIsAiLoading(true);
    try {
      const polished = await geminiService.polishMarkdown(activeDoc.content);
      updateActiveContent(polished);
    } catch (err) {
      alert("AI 润色暂时不可用，请检查 GitHub Secrets 中的 API_KEY 配置");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAs = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${activeDoc.title || '未命名'}.md`,
        types: [{
          description: 'Markdown 文件',
          accept: { 'text/markdown': ['.md'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(activeDoc.content);
      await writable.close();
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("另存为失败:", err);
    }
  };

  const handleExportPdf = async () => {
    const element = document.querySelector('.markdown-body-container');
    if (!element) return;

    setIsExporting(true);
    const opt = {
      margin: 0.5,
      filename: `${activeDoc.title || '文档'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF 导出失败:", err);
      alert("PDF 导出失败，请检查文档内容。");
    } finally {
      setIsExporting(false);
    }
  };

  const createNewDoc = () => {
    const newDoc = { id: Date.now().toString(), title: '未命名文档', content: '', lastModified: Date.now() };
    setDocs([newDoc, ...docs]);
    setActiveId(newDoc.id);
    setActiveFileHandle(null);
    setIsAllSelected(false);
  };

  const handleFileSelect = async (fileHandle: any) => {
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      
      const existing = docs.find(d => d.id === fileHandle.name);
      if (existing) {
        setActiveId(existing.id);
      } else {
        const newDoc = {
          id: fileHandle.name,
          title: fileHandle.name,
          content: text,
          lastModified: Date.now()
        };
        setDocs([newDoc, ...docs]);
        setActiveId(newDoc.id);
      }
      setActiveFileHandle(fileHandle);
      setIsAllSelected(false);
    } catch (e) {
      console.error("读取文件失败:", e);
    }
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    setIsAllSelected(false); // 点击任何地方取消全选状态
    if (!target.closest('.markdown-block') && !target.closest('aside') && !target.closest('header') && !target.closest('.toolbar-container')) {
      editorRef.current?.focusLast();
    }
  };

  if (!activeDoc) return <div className="p-10 text-slate-400">正在恢复文档...</div>;

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen}
        documents={docs}
        activeId={activeId}
        activeContent={activeDoc.content}
        projectHandle={projectHandle}
        onSelect={(id: string) => {
          setActiveId(id);
          setActiveFileHandle(null);
          setIsAllSelected(false);
        }}
        onFileSelect={handleFileSelect}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onCreate={createNewDoc}
        onOpenWorkspace={async () => {
          try {
            const handle = await (window as any).showDirectoryPicker();
            setProjectHandle(handle);
          } catch (e) {}
        }}
        onCloseWorkspace={() => {
          setProjectHandle(null);
          setActiveFileHandle(null);
        }}
        onDelete={(id: string) => {
          if (docs.length > 1) {
            const filtered = docs.filter(d => d.id !== id);
            setDocs(filtered);
            if (activeId === id) setActiveId(filtered[0].id);
          }
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#fdfdfd] relative group">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <PanelLeft size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <input 
                value={activeDoc.title}
                onChange={(e) => setDocs(prev => prev.map(d => d.id === activeId ? { ...d, title: e.target.value } : d))}
                className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 w-48 focus:ring-2 focus:ring-indigo-500/20 rounded px-1 transition-all"
              />
              <span className="text-[10px] text-slate-400 px-1">
                {activeFileHandle ? `工作区: ${activeFileHandle.name}` : '本地草稿'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveAs}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-50 transition-all active:scale-95"
            >
              <Save size={14} />
              导出 .md
            </button>
            <button 
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              导出 PDF
            </button>
            <button 
              onClick={handleAiPolish}
              disabled={isAiLoading}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI 润色
            </button>
          </div>
        </header>

        <div 
          className="flex-1 overflow-y-auto custom-scrollbar bg-[#fdfdfd] cursor-text pb-32"
          onClick={handleGlobalClick}
        >
          <div className="max-w-3xl mx-auto py-16 px-8 md:px-0 markdown-body-container min-h-full">
            <Editor 
              ref={editorRef}
              content={activeDoc.content} 
              onChange={updateActiveContent}
              projectHandle={projectHandle}
              isAllSelected={isAllSelected}
            />
          </div>
        </div>

        {/* 复制成功提示 */}
        {showCopyFeedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300 z-50">
            <Check size={14} className="text-emerald-400" />
            已复制全文到剪贴板
          </div>
        )}

        {/* 全选提示 */}
        {isAllSelected && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-pulse z-50">
            已选中全文，按 Ctrl + C 复制
          </div>
        )}

        <div className="toolbar-container absolute bottom-8 left-1/2 -translate-x-1/2">
          <Toolbar 
            onAction={(action) => editorRef.current?.applyAction(action)}
            onImageUpload={(file) => editorRef.current?.handlePasteImage(file)}
          />
        </div>

        <footer className="h-8 px-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 bg-white">
          <div className="flex items-center gap-4">
            <span>字数: {activeDoc.content.length}</span>
            <span>行数: {activeDoc.content.split('\n').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${activeFileHandle ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
            状态: {activeFileHandle ? '工作区同步中' : '自动保存至本地'}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
