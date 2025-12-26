import React from 'react';
import { User } from '../../types';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
    user: User;
    onLogout: () => void;
    onEditProfile: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onEditProfile, isCollapsed, onToggleCollapse }) => {
    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#1F2326] border-r border-[#ffffff]/5 flex flex-col fixed h-full md:relative z-10 hidden md:flex shadow-2xl transition-all duration-300 ease-in-out`}>
            {/* Toggle Button - Flutuante */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-6 bg-[#940910] text-white p-1.5 rounded-full shadow-lg hover:bg-[#7a060c] transition-colors z-20"
                title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <SidebarHeader isCollapsed={isCollapsed} />
            <SidebarNav userRole={user.role} isCollapsed={isCollapsed} />
            <SidebarFooter user={user} onLogout={onLogout} onEditProfile={onEditProfile} isCollapsed={isCollapsed} />
        </aside>
    );
};
