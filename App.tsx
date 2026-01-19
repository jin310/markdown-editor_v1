
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Editor, EditorRef } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { geminiService } from './services/geminiService';
import { PanelLeft, Sparkles, Loader2, Save, FileDown } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const STORAGE_KEY = 'novascribe_docs';

const App: React.FC = () => {
  const [docs, setDocs] = useState<any[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [{ id: '1', title: '快速入门', content: '# 欢迎使用 NovaScribe\n\n这是一个类似于 Typora 的**所见即所得** Markdown 编辑器。\n\n- **点击**任意段落进行编辑\n- **回车**创建新段落\n- **AI 润色**一键美化内容', lastModified: Date.now() }];
  });
  
  const [activeId, setActiveId] = useState(docs[0].id);
  const [activeFileHandle, setActiveFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const editorRef = useRef<EditorRef>(null);

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) || docs[0], [docs, activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, [docs]);

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
    setIsAiLoading(true);
    try {
      const polished = await geminiService.polishMarkdown(activeDoc.content);
      updateActiveContent(polished);
    } catch (err) {
      alert("AI 润色暂时不可用，请检查网络或 API Key");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAs = async () => {
    try {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
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
      if (err.name !== 'AbortError') {
        console.error("另存为失败:", err);
        alert("保存失败，请重试");
      }
    }
  };

  const handleExportPdf = async () => {
    const element = document.querySelector('.markdown-body-container');
    if (!element) return;

    setIsExporting(true);
    const opt = {
      margin: 1,
      filename: `${activeDoc.title || '文档'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF 导出失败:", err);
      alert("PDF 导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  const createNewDoc = () => {
    const newDoc = { id: Date.now().toString(), title: '未命名文档', content: '', lastModified: Date.now() };
    setDocs([newDoc, ...docs]);
    setActiveId(newDoc.id);
    setActiveFileHandle(null);
  };

  const handleFileSelect = async (fileHandle: FileSystemFileHandle) => {
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
    } catch (e) {
      console.error("读取文件失败:", e);
      alert("无法读取该文件");
    }
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.markdown-block') === null && target.closest('aside') === null && target.closest('header') === null && target.closest('.toolbar-container') === null) {
      editorRef.current?.focusLast();
    }
  };

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
                className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 w-48 focus:ring-2 focus:ring-indigo-500/20 rounded px-1"
              />
              <span className="text-[10px] text-slate-400 px-1">
                {activeFileHandle ? `工作区文件: ${activeFileHandle.name}` : '本地云草稿'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveAs}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-50 transition-all active:scale-95"
              title="另存为本地文件"
            >
              <Save size={14} />
              另存为...
            </button>
            <button 
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              title="导出为 PDF"
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
              AI 智能润色
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
            />
          </div>
        </div>

        <div className="toolbar-container absolute bottom-8 left-1/2 -translate-x-1/2">
          <Toolbar 
            onAction={(action) => editorRef.current?.applyAction(action)}
            onImageUpload={(file) => editorRef.current?.handlePasteImage(file)}
          />
        </div>

        <footer className="h-8 px-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 bg-white">
          <div className="flex items-center gap-4">
            <span>字符数: {activeDoc.content.length}</span>
            <span>预计阅读: {Math.ceil(activeDoc.content.length / 400)} 分钟</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            状态: {activeFileHandle ? '工作区模式' : '就绪'}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
