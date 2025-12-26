import React from 'react';
import { LayoutDashboard, PlusCircle, FileText, Settings } from 'lucide-react';
import { UserRole } from '../../types';
import { NavItem } from './NavItem';

interface SidebarNavProps {
    userRole: UserRole;
    isCollapsed: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ userRole, isCollapsed }) => {
    return (
        <nav className="flex-1 p-4 space-y-2">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
            <NavItem to="/new" icon={PlusCircle} label="Novo Registro" isCollapsed={isCollapsed} />
            <NavItem to="/list" icon={FileText} label="Ocorrências" isCollapsed={isCollapsed} />

            {userRole === UserRole.ADMIN && (
                <NavItem to="/admin" icon={Settings} label="Administração" isCollapsed={isCollapsed} />
            )}
        </nav>
    );
};
