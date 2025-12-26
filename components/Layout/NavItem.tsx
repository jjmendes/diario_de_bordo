import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItemProps {
    to: string;
    icon: LucideIcon;
    label: string;
    isCollapsed?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, isCollapsed = false }) => {
    return (
        <NavLink
            to={to}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-lg transition-all font-medium",
                isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                isActive
                    ? "bg-[#940910] text-white shadow-lg shadow-red-900/20"
                    : "text-slate-400 hover:bg-[#ffffff]/5 hover:text-white"
            )}
        >
            <Icon size={20} />
            {!isCollapsed && <span>{label}</span>}
        </NavLink>
    );
};
