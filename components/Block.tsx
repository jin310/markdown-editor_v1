
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
  onPasteImage: (file: File) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const Block: React.FC<BlockProps> = React.memo(({ 
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
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  // 判定块类型
  const trimmedContent = content.trim();
  const isCodeBlock = useMemo(() => trimmedContent.startsWith('```'), [trimmedContent]);
  const isMathBlock = useMemo(() => trimmedContent.startsWith('$$'), [trimmedContent]);
  const imageMatch = useMemo(() => {
    const match = trimmedContent.match(/^!\[(.*?)\]\((.*?)\)$/);
    return match ? { alt: match[1], src: match[2] } : null;
  }, [trimmedContent]);

  // 解析本地图片路径
  useEffect(() => {
    let isMounted = true;
    const resolveImages = async () => {
      if (!projectHandle) return;
      const imgRegex = /!\[.*?\]\((?!http|https|data:|blob:)(.*?)\)/g;
      let match;
      const newResolved = { ...resolvedImages };
      let changed = false;

      while ((match = imgRegex.exec(content)) !== null) {
        const path = match[1];
        if (newResolved[path]) continue;
        try {
          const parts = path.split('/').filter(Boolean);
          let currentHandle: any = projectHandle;
          for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
          }
          const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1]);
          const file = await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          if (isMounted) {
            newResolved[path] = url;
            blobUrlsRef.current.push(url);
            changed = true;
          }
        } catch (e) {}
      }
      if (changed && isMounted) setResolvedImages(newResolved);
    };
    resolveImages();
    return () => { isMounted = false; };
  }, [content, projectHandle]);

  useEffect(() => {
    return () => blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

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
    const c = trimmedContent;
    if (c.startsWith('# ')) return 'text-4xl font-black text-slate-900 mb-8 leading-tight font-serif';
    if (c.startsWith('## ')) return 'text-3xl font-bold text-slate-800 mb-6 leading-snug font-serif';
    if (c.startsWith('### ')) return 'text-2xl font-bold text-slate-800 mb-4 leading-normal font-serif';
    if (c.startsWith('> ')) return 'border-l-4 border-indigo-400 pl-6 py-3 italic text-slate-600 mb-6 bg-slate-50/50 rounded-r-xl';
    if (isCodeBlock) return 'mb-8 rounded-xl overflow-hidden bg-[#1e293b]'; // 使用与 CSS 相同的背景色
    if (isMathBlock) return 'text-center my-6 bg-slate-50/30 p-4 rounded-xl';
    if (imageMatch) return 'flex justify-center mb-10 overflow-hidden';
    return 'text-[18px] text-slate-700 leading-[1.85] mb-5 min-h-[1.85em]';
  }, [trimmedContent, imageMatch, isMathBlock, isCodeBlock]);

  const renderContent = () => {
    if (imageMatch) {
      const src = resolvedImages[imageMatch.src] || imageMatch.src;
      return <img src={src} alt={imageMatch.alt} className="rounded-xl shadow-lg max-w-full max-h-[70vh] object-contain pointer-events-auto" />;
    }

    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]} 
        rehypePlugins={[rehypeKatex]}
        className="prose prose-slate max-w-none prose-p:my-0 prose-pre:m-0 prose-pre:bg-transparent"
        components={{
          img: ({ src, alt }) => {
            const resolvedSrc = resolvedImages[src || ''] || src;
            return <img src={resolvedSrc} alt={alt} className="max-h-[600px] object-contain pointer-events-auto mx-auto rounded-xl" />;
          },
          pre: ({ children }) => <pre className="m-0 bg-transparent p-6">{children}</pre>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? 
              <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[0.9em]" {...props}>{children}</code> :
              <code className={className} {...props}>{children}</code>;
          }
        }}
      >
        {content || '\u00A0'}
      </ReactMarkdown>
    );
  };

  return (
    <div 
      className={`markdown-block relative group px-8 py-2 -mx-8 rounded-2xl transition-all duration-200 min-h-[32px] ${isActive ? 'bg-indigo-50/40 shadow-sm' : 'hover:bg-slate-50/60 cursor-text'}`}
      onMouseDown={(e) => {
          if (e.button === 0) {
            e.stopPropagation();
            if (!isActive) onFocus();
          }
      }}
      onContextMenu={onContextMenu}
    >
      {isActive ? (
        <div className={`w-full relative z-10 animate-in fade-in duration-200 ${dynamicClass} ${isCodeBlock ? 'p-6' : ''}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { onChange(e.target.value); adjustHeight(); }}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const file = items[i].getAsFile();
                  if (file) { e.preventDefault(); onPasteImage(file); break; }
                }
              }
            }}
            rows={1}
            placeholder="输入内容..."
            spellCheck={false}
            className={`block w-full focus:ring-0 bg-transparent border-none outline-none resize-none overflow-hidden caret-indigo-500 selection:bg-indigo-500/30 pointer-events-auto ${isCodeBlock ? 'text-indigo-200 font-mono text-[15px]' : 'text-slate-800'}`}
          />
        </div>
      ) : (
        <div className={`markdown-body relative z-0 ${dynamicClass} ${imageMatch ? '' : 'pointer-events-none'}`}>
          {renderContent()}
        </div>
      )}
      {isActive && (
        <div className="absolute left-1 top-2 bottom-2 w-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.4)] animate-pulse z-20" />
      )}
    </div>
  );
}, (prev, next) => {
  return prev.isActive === next.isActive && prev.content === next.content && prev.projectHandle === next.projectHandle;
});
