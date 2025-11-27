'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '请选择...',
  icon,
  className = ''
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  // 确保组件已挂载（用于 Portal）
  useEffect(() => {
    setMounted(true);
  }, []);

  // 计算下拉菜单位置
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 220)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 检查点击是否在容器外部（包括菜单）
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // 使用 mouseup 而不是 mousedown，确保点击事件完整触发
    if (isOpen) {
      document.addEventListener('mouseup', handleClickOutside);
      return () => document.removeEventListener('mouseup', handleClickOutside);
    }
  }, [isOpen]);

  // 处理滚动时关闭菜单
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // 下拉菜单组件
  const dropdownMenu = isOpen && !disabled && mounted && (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menuPosition.top,
        left: menuPosition.left,
        minWidth: menuPosition.width,
        zIndex: 99999,
      }}
      className="
        max-h-[320px] overflow-y-auto
        bg-white backdrop-blur-xl rounded-xl shadow-2xl shadow-slate-200/60
        border border-indigo-100 py-1
        animate-in fade-in slide-in-from-top-2 duration-200
      "
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(option.value);
          }}
          className={`
            w-full text-left px-4 py-2.5 text-sm transition-all duration-150
            flex items-center gap-2 cursor-pointer select-none
            ${option.value === value 
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold' 
              : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
            }
            ${index === 0 ? 'rounded-t-lg' : ''}
            ${index === options.length - 1 ? 'rounded-b-lg' : ''}
          `}
        >
          {option.value === value && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className={option.value === value ? '' : 'ml-6'}>{option.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-1 py-1 pr-6 text-sm font-bold text-slate-800 
          rounded-lg transition-all duration-200 
          hover:bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'bg-indigo-50/50' : 'bg-transparent'}
        `}
      >
        {icon && <span className="text-indigo-500">{icon}</span>}
        <span className="truncate">{selectedOption?.label || placeholder}</span>
      </button>

      {/* 下拉箭头 */}
      <div className={`
        pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 
        flex items-center text-indigo-400 transition-transform duration-200
        ${isOpen ? 'rotate-180' : ''}
      `}>
        <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>

      {/* 使用 Portal 将下拉菜单渲染到 body */}
      {mounted && createPortal(dropdownMenu, document.body)}
    </div>
  );
}
