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
    isMobileMenuOpen?: boolean; // New prop
    onCloseMobileMenu?: () => void; // New prop
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onEditProfile, isCollapsed, onToggleCollapse, isMobileMenuOpen = false, onCloseMobileMenu }) => {
    return (
        <>
            {/* Mobile Overlay (Backdrop) */}
            {isMobileMenuOpen && (
                <div
                    onClick={onCloseMobileMenu}
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                />
            )}

            <aside className={`
                ${isCollapsed ? 'md:w-20' : 'md:w-64'} 
                w-64
                bg-[#1F2326] border-r border-[#ffffff]/5 
                flex flex-col 
                h-full 
                shadow-2xl transition-all duration-300 ease-in-out
                fixed md:relative z-50
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Mobile Close Button */}
                <button
                    onClick={onCloseMobileMenu}
                    className="absolute top-4 right-4 text-white md:hidden hover:bg-white/10 p-1 rounded-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                {/* Desktop Toggle Button */}
                <button
                    onClick={onToggleCollapse}
                    className="absolute -right-3 top-6 bg-[#940910] text-white p-1.5 rounded-full shadow-lg hover:bg-[#7a060c] transition-colors z-20 hidden md:flex"
                    title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                <SidebarHeader isCollapsed={isCollapsed} />
                <SidebarNav userRole={user.role} isCollapsed={isCollapsed} />
                <SidebarFooter user={user} onLogout={onLogout} onEditProfile={onEditProfile} isCollapsed={isCollapsed} />
            </aside>
        </>
    );
};
