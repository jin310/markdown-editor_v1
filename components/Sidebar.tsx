
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  ChevronLeft,
  Clock,
  FolderOpen,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  List,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  documents: Document[];
  activeId: string;
  activeContent: string;
  projectHandle: FileSystemDirectoryHandle | null;
  onOpenWorkspace: () => void;
  onCloseWorkspace: () => void;
  onSelect: (id: string) => void;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  onRenameFile: (handle: FileSystemFileHandle, newName: string) => Promise<void>;
  onRenameDraft: (id: string, newTitle: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  documents, 
  activeId, 
  activeContent,
  projectHandle,
  onOpenWorkspace,
  onCloseWorkspace,
  onSelect, 
  onFileSelect,
  onRenameFile,
  onRenameDraft,
  onCreate, 
  onDelete, 
  onToggle 
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [viewMode, setViewMode] = useState<'files' | 'outline'>('files');
  const holdTimerRef = useRef<number | null>(null);

  const startHoldTimer = (id: string, initialTitle: string) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setHoldingId(id);
    holdTimerRef.current = window.setTimeout(() => {
      setRenamingId(id);
      setTempTitle(initialTitle);
      setHoldingId(null);
      holdTimerRef.current = null;
    }, 600);
  };

  const clearHoldTimer = () => {
    setHoldingId(null);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (tempTitle.trim()) onRenameDraft(id, tempTitle.trim());
    setRenamingId(null);
  };

  const outline = useMemo(() => {
    const lines = activeContent.split('\n');
    return lines
      .filter(line => line.trim().startsWith('#'))
      .map((line, idx) => {
        const levelMatch = line.trim().match(/^#+/);
        const level = levelMatch ? levelMatch[0].length : 1;
        const text = line.trim().replace(/^#+\s/, '');
        return { id: idx, level, text };
      });
  }, [activeContent]);

  return (
    <aside className={`${isOpen ? 'w-72' : 'w-0 opacity-0'} h-full bg-[#f8f9fa] border-r border-gray-200 transition-all duration-300 flex flex-col overflow-hidden relative z-40 shadow-inner`}>
      <div className="p-4 flex items-center justify-between bg-white/50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-md">
            M
          </div>
          <span className="font-bold text-gray-800 tracking-tight">NovaScribe</span>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="px-4 py-3 flex gap-1">
        <button 
          onClick={() => setViewMode('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'files' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Folder size={14} /> 文件
        </button>
        <button 
          onClick={() => setViewMode('outline')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'outline' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <List size={14} /> 大纲
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-4 pb-4 select-none">
        {viewMode === 'files' ? (
          <>
            <div className="px-2 flex flex-col gap-2 mb-4">
              <button onClick={onCreate} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-xs font-bold">
                <Plus size={14} /> 新建草稿
              </button>
              {!projectHandle ? (
                <button onClick={onOpenWorkspace} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all text-xs font-semibold text-gray-700">
                  <FolderOpen size={14} /> 打开工作区
                </button>
              ) : (
                <button onClick={onCloseWorkspace} className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl transition-all text-xs font-semibold">
                  <X size={14} /> 关闭工作区
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {projectHandle && (
                <div>
                  <div className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-2"><FolderOpen size={10} /> {projectHandle.name}</span>
                  </div>
                  <div className="bg-white/40 rounded-xl py-1 overflow-hidden border border-gray-100">
                    <FileTree handle={projectHandle} onFileSelect={onFileSelect} activeId={activeId} />
                  </div>
                </div>
              )}
              
              <div>
                <div className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={10} /> 最近草稿
                </div>
                {documents.length > 0 ? documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => activeId !== doc.id && onSelect(doc.id)}
                    onMouseDown={() => startHoldTimer(doc.id, doc.title)}
                    onMouseUp={clearHoldTimer}
                    onMouseLeave={clearHoldTimer}
                    className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all mb-1 ${activeId === doc.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={15} className={activeId === doc.id ? 'text-indigo-100' : 'text-gray-400'} />
                      {renamingId === doc.id ? (
                        <input 
                          autoFocus 
                          className="w-full bg-transparent outline-none text-xs font-medium border-b border-indigo-300" 
                          value={tempTitle} 
                          onChange={e => setTempTitle(e.target.value)} 
                          onBlur={() => handleRenameSubmit(doc.id)} 
                          onKeyDown={e => e.key === 'Enter' && handleRenameSubmit(doc.id)} 
                          onClick={e => e.stopPropagation()} 
                        />
                      ) : (
                        <span className="text-xs font-medium truncate">{doc.title || '无标题'}</span>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="px-4 py-6 text-center text-[10px] text-gray-300 italic">暂无本地草稿</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-2 px-3 space-y-1">
            {outline.length > 0 ? outline.map((item, i) => (
              <div 
                key={i} 
                className="group text-xs text-gray-500 hover:text-indigo-600 cursor-pointer py-2 truncate border-l-2 border-transparent hover:border-indigo-300 transition-all flex items-center"
                style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                onClick={() => {
                  const elements = document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4');
                  // Rough matching based on text content since index might vary if blocks change
                  const matched = Array.from(elements).find(el => el.textContent?.includes(item.text));
                  if (matched) {
                    matched.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    // Fallback to indexed scroll
                    elements[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                <span className={item.level === 1 ? 'font-bold' : ''}>{item.text}</span>
              </div>
            )) : (
              <div className="text-[10px] text-gray-300 italic text-center py-10">暂无大纲内容</div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
        <span>V1.2.5 Stable</span>
        <div className="flex items-center gap-1">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
           LOCAL ONLY
        </div>
      </div>
    </aside>
  );
};

interface FileTreeProps {
  handle: FileSystemDirectoryHandle;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  activeId: string;
  depth?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ handle, onFileSelect, activeId, depth = 0 }) => {
  const [entries, setEntries] = useState<FileSystemHandle[]>([]);
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  useEffect(() => {
    const load = async () => {
      try {
        const res: FileSystemHandle[] = [];
        // @ts-ignore
        for await (const entry of handle.values()) {
          if (!entry.name.startsWith('.')) {
            res.push(entry);
          }
        }
        // Directories first, then alphabetically
        res.sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === 'directory' ? -1 : 1;
        });
        setEntries(res);
      } catch (err) {
        console.error("Error loading directory entries:", err);
      }
    };
    if (isExpanded) {
        load();
    }
  }, [handle, isExpanded]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="flex flex-col select-none">
      {depth > 0 && (
        <div 
          onClick={toggleExpand} 
          className={`flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50/50 cursor-pointer text-gray-600 transition-colors group rounded-lg mx-1 my-0.5`} 
          style={{ paddingLeft: `${depth * 10 + 8}px` }}
        >
          <div className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
            <ChevronRight size={12} className="text-gray-400 group-hover:text-indigo-400" />
          </div>
          <Folder size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium truncate">{handle.name}</span>
        </div>
      )}
      {(isExpanded || depth === 0) && entries.map(e => (
        e.kind === 'directory' ? (
          <FileTree 
            key={e.name} 
            handle={e as FileSystemDirectoryHandle} 
            onFileSelect={onFileSelect} 
            activeId={activeId} 
            depth={depth + 1} 
          />
        ) : (
          <div 
            key={e.name} 
            onClick={() => activeId !== e.name && onFileSelect(e as FileSystemFileHandle)} 
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all group rounded-lg mx-1 my-0.5 ${activeId === e.name ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-indigo-50/50 text-gray-500'}`} 
            style={{ paddingLeft: `${(depth + 1) * 10 + 12}px` }}
          >
            <FileText size={14} className={activeId === e.name ? 'text-indigo-100' : 'text-gray-400 group-hover:text-indigo-400'} />
            <span className="text-xs truncate font-medium">{e.name}</span>
          </div>
        )
      ))}
    </div>
  );
};
