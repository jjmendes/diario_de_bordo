import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    user: User;
    onLogout: () => void;
    onEditProfile: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onEditProfile }) => {
    // Estado de colapso da sidebar com persistência (Desktop)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    // Estado do menu mobile
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Persistir estado no localStorage
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    return (
        <div className="flex h-screen bg-slate-50 flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden bg-[#940910] text-white p-4 flex items-center justify-between shadow-md z-30">
                <span className="font-bold text-lg">Diário de Bordo</span>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-1 hover:bg-white/10 rounded"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </header>

            <Sidebar
                user={user}
                onLogout={onLogout}
                onEditProfile={onEditProfile}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                isMobileMenuOpen={isMobileMenuOpen}
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
