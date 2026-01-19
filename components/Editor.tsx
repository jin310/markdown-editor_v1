
import React, { useState, forwardRef } from 'react';
import { Block } from './Block';
import { ContextMenu } from './ContextMenu';

interface EditorProps {
  content: string;
  projectHandle: FileSystemDirectoryHandle | null;
  onChange: (content: string) => void;
}

export const Editor = forwardRef<any, EditorProps>(({ content, projectHandle, onChange }, ref) => {
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [menuConfig, setMenuConfig] = useState<{ x: number, y: number, index: number } | null>(null);

  const blocks = content.split('\n\n');

  const updateBlock = (index: number, newBlockContent: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = newBlockContent;
    onChange(newBlocks.join('\n\n'));
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const lastIndex = blocks.length - 1;
      if (blocks[lastIndex].trim() !== '') {
        onChange(content + '\n\n');
        setActiveBlockIndex(blocks.length);
      } else {
        setActiveBlockIndex(lastIndex);
      }
    }
  };

  const handleContextMenuAction = (action: string, index: number) => {
    const newBlocks = [...blocks];
    const current = blocks[index].replace(/^#+\s|^>\s|^-\s|^\d+\.\s/, '');

    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(blocks[index]);
        break;
      case 'delete':
        if (blocks.length > 1) {
          newBlocks.splice(index, 1);
          onChange(newBlocks.join('\n\n'));
        } else {
          updateBlock(0, '');
        }
        break;
      case 'insertAbove':
        newBlocks.splice(index, 0, '');
        onChange(newBlocks.join('\n\n'));
        setActiveBlockIndex(index);
        break;
      case 'insertBelow':
        newBlocks.splice(index + 1, 0, '');
        onChange(newBlocks.join('\n\n'));
        setActiveBlockIndex(index + 1);
        break;
      case 'h1': updateBlock(index, '# ' + current); break;
      case 'h2': updateBlock(index, '## ' + current); break;
      case 'h3': updateBlock(index, '### ' + current); break;
      case 'quote': updateBlock(index, '> ' + current); break;
      case 'bullet': updateBlock(index, '- ' + current); break;
      case 'number': updateBlock(index, '1. ' + current); break;
      case 'code': updateBlock(index, '```\n' + current + '\n```'); break;
      case 'math': updateBlock(index, '$$\n' + current + '\n$$'); break;
      case 'table':
        updateBlock(index, '| Column 1 | Column 2 |\n| --- | --- |\n| Content | Content |');
        break;
    }
  };

  return (
    <div 
      className="w-full flex-1 flex flex-col px-8 md:px-0 py-16 cursor-text" 
      onClick={handleGlobalClick}
    >
      <div className="flex flex-col w-full space-y-1">
        {blocks.map((blockContent, idx) => (
          <Block 
            key={`block-${idx}`}
            content={blockContent}
            projectHandle={projectHandle}
            isActive={activeBlockIndex === idx}
            onFocus={() => setActiveBlockIndex(idx)}
            onChange={(newVal) => updateBlock(idx, newVal)}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const newBlocks = [...blocks];
                newBlocks.splice(idx + 1, 0, '');
                onChange(newBlocks.join('\n\n'));
                setActiveBlockIndex(idx + 1);
              } else if (e.key === 'Backspace' && blocks[idx] === '' && blocks.length > 1) {
                e.preventDefault();
                const newBlocks = [...blocks];
                newBlocks.splice(idx, 1);
                onChange(newBlocks.join('\n\n'));
                setActiveBlockIndex(idx > 0 ? idx - 1 : 0);
              }
            }}
            onPasteImage={(data) => {}}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuConfig({ x: e.clientX, y: e.clientY, index: idx });
            }}
          />
        ))}
      </div>
      <div className="flex-grow min-h-[50vh]" onClick={handleGlobalClick} />
      
      {menuConfig && (
        <ContextMenu 
          x={menuConfig.x} 
          y={menuConfig.y} 
          onClose={() => setMenuConfig(null)}
          onAction={(action) => handleContextMenuAction(action, menuConfig.index)}
        />
      )}
    </div>
  );
});
