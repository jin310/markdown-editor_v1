
import React, { useRef } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  Image as ImageIcon, 
  Code,
  Heading1,
  Heading2,
  Table,
  Sigma
} from 'lucide-react';

interface ToolbarProps {
  onImageUpload: (file: File) => void;
  onAction: (type: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onImageUpload, onAction }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { icon: Heading1, label: 'H1', action: 'h1' },
    { icon: Heading2, label: 'H2', action: 'h2' },
    { icon: Bold, label: 'Bold', action: 'bold' },
    { icon: Italic, label: 'Italic', action: 'italic' },
    { icon: List, label: 'Bullet', action: 'list' },
    { icon: Code, label: 'Code', action: 'code' },
    { icon: Sigma, label: 'Math', action: 'math' },
    { icon: ImageIcon, label: 'Image', action: 'image' },
    { icon: Table, label: 'Table', action: 'table' },
  ];

  const handleToolClick = (action: string) => {
    if (action === 'image') {
      fileInputRef.current?.click();
    } else {
      onAction(action);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      // Reset input so the same file can be uploaded again if deleted
      e.target.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange}
      />
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl z-50">
        {tools.map((tool, i) => (
          <button 
            key={i}
            onClick={() => handleToolClick(tool.action)}
            className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-all active:scale-90 group relative"
            title={tool.label}
          >
            <tool.icon size={18} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};
