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
    // Estado de colapso da sidebar com persistência
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    // Persistir estado no localStorage
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar
                user={user}
                onLogout={onLogout}
                onEditProfile={onEditProfile}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
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
