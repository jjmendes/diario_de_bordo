import React from 'react';
import { ClipboardList } from 'lucide-react';

interface SidebarHeaderProps {
    isCollapsed: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isCollapsed }) => {
    return (
        <div className={`p-6 border-b border-[#ffffff]/5 ${isCollapsed ? 'px-4' : ''}`}>
            {isCollapsed ? (
                // Modo Compacto - Apenas Ícone
                <div className="flex justify-center">
                    <div className="bg-white p-2 rounded-lg shadow-md">
                        <ClipboardList size={26} strokeWidth={2.5} className="text-[#940910]" />
                    </div>
                </div>
            ) : (
                // Modo Expandido - Completo
                <>
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white p-2 rounded-lg shadow-md">
                            <ClipboardList size={26} strokeWidth={2.5} className="text-[#940910]" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight leading-tight text-white">
                            Diário<br />de Bordo
                        </h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 pl-1 opacity-80 font-medium tracking-wide">
                        Registro de Ocorrências
                    </p>
                </>
            )}
        </div>
    );
};
