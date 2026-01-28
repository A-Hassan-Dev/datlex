
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { DEFAULT_NAV_ITEMS } from '../constants';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isDbConnected?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, currentUser, onLogout, isOpen, onClose, isDbConnected = true }) => {
  const [navItems, setNavItems] = useState(() => {
    try {
      const savedOrder = localStorage.getItem('wf_sidebar_order');
      if (savedOrder) {
        const ids = JSON.parse(savedOrder) as string[];
        const ordered = [...DEFAULT_NAV_ITEMS].sort((a, b) => {
          let indexA = ids.indexOf(a.id);
          let indexB = ids.indexOf(b.id);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
        });
        return ordered;
      }
    } catch (e) { console.error(e); }
    return DEFAULT_NAV_ITEMS;
  });

  const [logoUrl, setLogoUrl] = useState(() => {
    const custom = localStorage.getItem('wf_logo_url');
    return custom || "https://logo.clearbit.com/daltexcorp.com";
  });

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const visibleNavItems = navItems.filter(item => {
    if (currentUser?.role === 'admin') {
      return item.roles.includes('admin');
    }

    if (!currentUser?.allowedMenus || currentUser.allowedMenus.length === 0) {
      return false;
    }

    return currentUser.allowedMenus.includes(item.id);
  });

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    onClose();
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, position: number) => {
    dragItem.current = position;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(e.currentTarget, 20, 20);

    const target = e.currentTarget;
    setTimeout(() => {
      target.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setIsDragging(false);

    if (dragItem.current === null || dragOverItem.current === null) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const draggedObj = visibleNavItems[dragItem.current];
    const targetObj = visibleNavItems[dragOverItem.current];

    if (draggedObj.id === targetObj.id) return;

    const allItemsCopy = [...navItems];
    const fromIndex = allItemsCopy.findIndex(i => i.id === draggedObj.id);
    const toIndex = allItemsCopy.findIndex(i => i.id === targetObj.id);

    allItemsCopy.splice(fromIndex, 1);
    allItemsCopy.splice(toIndex, 0, draggedObj);

    setNavItems(allItemsCopy);
    localStorage.setItem('wf_sidebar_order', JSON.stringify(allItemsCopy.map(i => i.id)));

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const userInitials = (currentUser?.username || 'U').substring(0, 2).toUpperCase();
  const displayRole = (currentUser?.role || 'user').replace('_', ' ');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-60 bg-[#00695c] text-white min-h-screen flex flex-col shadow-2xl font-cairo
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        style={{ fontFamily: '"Cairo", "Sakkal Majalla", sans-serif' }}
      >
        {/* Header Section */}
        <div className="pt-6 pb-4 flex flex-col items-center text-center px-4 border-b border-yellow-400/30">
          <div className="bg-white p-2 rounded-xl shadow-lg mb-3 w-20 h-20 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="Daltex Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = "https://ui-avatars.com/api/?name=Daltex&background=0D8ABC&color=fff&size=128&font-size=0.4";
              }}
            />
          </div>
          <h1 className="text-xl font-bold text-[#FFD700] tracking-wide mb-0 drop-shadow-sm uppercase">DALTEX</h1>
          <p className="text-[10px] text-gray-200">Maintenance System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full mt-2 overflow-y-auto">
          {visibleNavItems.map((item, index) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  border-b border-yellow-400/30 transition-all duration-200 group
                  ${isActive
                    ? 'bg-[#00C853] text-white shadow-md font-bold'
                    : 'text-white hover:bg-[#004d40] hover:pl-5'}
                  ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
                `}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="text-sm tracking-wide text-left flex-1 font-semibold">{item.label}</span>

                  {/* Visual counts matching screenshot style */}
                  {item.id === 'agri-work-order' && <span className="text-[#FFD700] font-bold text-sm drop-shadow-sm">1274</span>}
                  {item.id === 'issue-form' && <span className="text-[#FFD700] font-bold text-sm drop-shadow-sm">228</span>}
                  {item.id === 'history' && <span className="text-[#FFD700] font-bold text-sm drop-shadow-sm">815</span>}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Account Section - Yellow Bar */}
        <div className="bg-[#FFD700] text-[#00695c] py-2 px-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 border-[#00695c] bg-white text-[#00695c]`}>
              {userInitials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate leading-tight">{currentUser?.name || 'Guest'}</p>
              <p className="text-[10px] font-semibold capitalize leading-tight opacity-90">{displayRole}</p>
            </div>
            <div className={`w-3 h-3 rounded-full shadow-inner ${isDbConnected ? 'bg-[#00C853] animate-pulse' : 'bg-red-500'}`} title={isDbConnected ? 'Connected to Database' : 'Database Offline'}></div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-1 border border-[#00695c] rounded text-xs text-[#00695c] hover:bg-[#00695c] hover:text-white font-bold transition uppercase tracking-wider"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
