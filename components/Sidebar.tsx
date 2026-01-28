import React, { useState, useEffect } from 'react';
import { Users, Calendar, LayoutDashboard, Settings, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavItem } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

// Logo mặc định nếu người dùng chưa tải ảnh lên
const DEFAULT_LOGO = "https://jola.vn/Article/Jt1PBJGuF/cho-Husky-1.jpg";

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, toggleSidebar }) => {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);

  // Load logo từ localStorage khi component mount (giữ lại để hiển thị logo hiện tại nếu đã lưu từ trước)
  useEffect(() => {
    const savedLogo = localStorage.getItem('spa_logo');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} /> },
    { id: 'operations', label: 'Lịch & Vận hành', icon: <Calendar size={20} /> },
    { id: 'services', label: 'Dịch vụ', icon: <Sparkles size={20} /> },
    { id: 'employees', label: 'Nhân viên', icon: <Users size={20} /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings size={20} /> },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white h-screen shadow-lg flex flex-col fixed left-0 top-0 z-10 transition-all duration-300 border-r border-gray-100`}>
      {/* Header with Branding */}
      <div className={`h-32 flex items-center border-b border-gray-100 relative transition-all duration-300 shrink-0 overflow-hidden ${isCollapsed ? 'justify-center p-0' : 'px-4 justify-start'}`}>
          
          {/* Decorative Background */}
          <div className="absolute inset-0 z-0">
             <img 
                 src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1000&auto=format&fit=crop" 
                 alt="Background" 
                 className="w-full h-full object-cover opacity-10" 
             />
             <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/60 to-white/30 backdrop-blur-[1px]"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-center gap-3 w-full">
              {/* Logo Area */}
              <div 
                  className={`relative flex-shrink-0 transition-all duration-500 ${isCollapsed ? 'w-10 h-10 mx-auto' : 'w-14 h-14'}`}
              >
                  <img 
                      src={logoUrl} 
                      alt="Lotus Spa Logo" 
                      className="w-full h-full rounded-full object-cover border-2 border-white shadow-md ring-1 ring-spa-100"
                  />
              </div>

              {/* Branding Text */}
              <div className={`flex flex-col justify-center transition-all duration-500 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <h1 className="font-spa text-xl font-bold text-spa-800 leading-none tracking-tight whitespace-nowrap">LOTUS SPA</h1>
                  <p className="text-[10px] text-gray-600 font-spa italic mt-1 whitespace-nowrap">Nâng niu cơ thể - vỗ về tâm hồn</p>
              </div>
          </div>

          {/* Toggle Button */}
          <button
              onClick={(e) => {
                  e.stopPropagation(); 
                  toggleSidebar();
              }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1.5 shadow-md text-gray-500 hover:text-spa-600 hover:border-spa-300 transition-all z-20"
          >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
      </div>

      <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 relative group ${
              activeTab === item.id
                ? 'bg-spa-50 text-spa-700 font-medium shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <div className="relative flex-shrink-0">
                {item.icon}
            </div>
            
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}

            {/* Hover Tooltip for Collapsed Mode */}
            {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                </div>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer`}>
          <img 
            src="https://picsum.photos/100/100" 
            alt="Admin" 
            className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm"
          />
          {!isCollapsed && (
            <div className="text-sm overflow-hidden">
                <p className="font-bold text-gray-700 truncate">Admin User</p>
                <p className="text-xs text-gray-400 truncate">CCPA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};