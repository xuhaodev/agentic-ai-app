'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotebookPen } from 'lucide-react';

interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, toggleSidebar }) => {
  const pathname = usePathname();
  
  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 md:hidden ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />
      
      <div 
        className={`fixed top-0 left-0 h-full z-30 transition-width duration-300 bg-white border-r border-gray-200 shadow-sm ${
          isExpanded ? 'w-64' : 'w-16'
        } overflow-y-auto`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          {isExpanded ? (
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Agentic AI
            </h1>
          ) : (
            <div className="w-full flex justify-center">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                AI
              </span>
            </div>
          )}
          
          <button
            className="p-1 rounded text-gray-600 hover:bg-gray-100 focus:outline-none"
            onClick={toggleSidebar}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        <nav className="px-2 py-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className={`flex items-center rounded-lg py-2 px-4 ${
                  pathname === '/' || pathname === '/instruct-agent'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${!isExpanded && 'justify-center px-2'}`}
              >
                <NotebookPen className={`w-5 h-5 ${isExpanded ? 'mr-3' : ''}`} />
                {isExpanded && <span>Instruct Agent</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;