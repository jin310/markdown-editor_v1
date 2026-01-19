
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface BlockProps {
  content: string;
  isActive: boolean;
  projectHandle: FileSystemDirectoryHandle | null;
  onFocus: () => void;
  onChange: (newContent: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPasteImage: (data: string | File) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const Block: React.FC<BlockProps> = ({ 
  content, 
  isActive, 
  projectHandle, 
  onFocus, 
  onChange, 
  onKeyDown, 
  onPasteImage, 
  onContextMenu 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const imageMatch = useMemo(() => {
    const match = content.match(/^!\[(.*?)\]\((.*?)\)$/);
    return match ? { alt: match[1], src: match[2] } : null;
  }, [content]);

  useEffect(() => {
    if (imageMatch?.src.startsWith('assets/') && projectHandle) {
      const resolveFile = async () => {
        try {
          const assetsDir = await projectHandle.getDirectoryHandle('assets');
          const fileHandle = await assetsDir.getFileHandle(imageMatch.src.replace('assets/', ''));
          const file = await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          setLocalUrl(url);
        } catch (e) {}
      };
      resolveFile();
    }
    return () => { if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [imageMatch, projectHandle]);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
      const val = textareaRef.current.value;
      textareaRef.current.setSelectionRange(val.length, val.length);
      adjustHeight();
    }
  }, [isActive]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const dynamicClass = useMemo(() => {
    const c = content.trim();
    if (c.startsWith('# ')) return 'text-4xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight';
    if (c.startsWith('## ')) return 'text-3xl font-bold text-gray-800 mb-4 tracking-tight leading-snug';
    if (c.startsWith('### ')) return 'text-2xl font-bold text-gray-800 mb-3 leading-normal';
    if (c.startsWith('> ')) return 'border-l-4 border-indigo-200 pl-6 py-2 italic text-gray-500 mb-4 bg-slate-50/50 rounded-r-lg';
    if (c.startsWith('```')) return 'font-mono bg-[#1e293b] text-indigo-50 p-6 rounded-2xl text-[13px] leading-relaxed mb-6 shadow-inner';
    if (imageMatch) return 'flex justify-center mb-6';
    return 'text-[17px] text-gray-700 leading-[1.8] mb-4';
  }, [content, imageMatch]);

  return (
    <div 
      className={`relative group px-4 -mx-4 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50 cursor-text'}`}
      onClick={(e) => { e.stopPropagation(); onFocus(); }}
      onContextMenu={onContextMenu}
    >
      {isActive ? (
        <div className={`w-full animate-in ${dynamicClass}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { onChange(e.target.value); adjustHeight(); }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                onChange(content.substring(0, start) + '    ' + content.substring(end));
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                  }
                }, 0);
              } else {
                onKeyDown(e);
              }
            }}
            rows={1}
            placeholder="输入文字..."
            spellCheck={false}
            className="block w-full focus:ring-0 selection:bg-indigo-100"
          />
        </div>
      ) : (
        <div className={`markdown-body ${dynamicClass}`}>
          {imageMatch ? (
            <img src={localUrl || imageMatch.src} alt={imageMatch.alt} className="max-w-full h-auto rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300" />
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]} 
              rehypePlugins={[rehypeKatex]}
              className="prose prose-slate max-w-none prose-p:my-0"
            >
              {content || '\u00A0'}
            </ReactMarkdown>
          )}
        </div>
      )}
      {isActive && (
        <div className="absolute left-[-1.5rem] top-[0.5rem] bottom-[0.5rem] w-1 bg-indigo-500 rounded-full animate-pulse" />
      )}
    </div>
  );
};
