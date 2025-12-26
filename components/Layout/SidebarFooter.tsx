import React from 'react';
import { LogOut } from 'lucide-react';
import { User } from '../../types';

interface SidebarFooterProps {
    user: User;
    onLogout: () => void;
    onEditProfile: () => void;
    isCollapsed: boolean;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ user, onLogout, onEditProfile, isCollapsed }) => {
    return (
        <div className={`p-4 border-t border-[#ffffff]/5 bg-[#181b1e] ${isCollapsed ? 'px-2' : ''}`}>
            {isCollapsed ? (
                // Modo Compacto - Apenas Avatar e Botão
                <div className="flex flex-col items-center gap-3">
                    <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                        alt="User"
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover cursor-pointer hover:ring-2 hover:ring-red-400 transition-all"
                        onClick={onEditProfile}
                        title={user.nickname || user.name}
                    />
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center p-2 text-sm font-medium text-slate-400 hover:bg-[#940910] hover:text-white rounded-lg transition-colors"
                        title="Sair do Sistema"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            ) : (
                // Modo Expandido - Completo
                <>
                    <div
                        className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-[#ffffff]/5 p-2 rounded-lg transition-colors group"
                        onClick={onEditProfile}
                        title="Editar Perfil"
                    >
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            alt="User"
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                        />
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                                {user.nickname || user.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate font-medium">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-slate-400 hover:bg-[#940910] hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/5"
                    >
                        <LogOut size={16} /> Sair do Sistema
                    </button>
                </>
            )}
        </div>
    );
};
