
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Button, Modal } from './UiComponents';
import { SupabaseDB } from '../services/supabaseDb';
import { Upload, User as UserIcon, Lock } from 'lucide-react';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdateUser: (updatedUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
    const [nickname, setNickname] = useState(user.nickname || '');
    const [avatar, setAvatar] = useState(user.avatar || '');

    // Password states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                alert("As senhas não coincidem.");
                return;
            }
            if (newPassword.length < 6) {
                alert("A senha deve ter pelo menos 6 caracteres (política do Supabase).");
                return;
            }
        }

        try {
            // 1. Update Password if provided
            if (newPassword) {
                await SupabaseDB.updateCurrentUserPassword(newPassword);
            }

            // 2. Update Profile Data
            const updatedUser = {
                ...user,
                nickname: nickname,
                avatar: avatar,
            };

            await SupabaseDB.updateUser(updatedUser);

            onUpdateUser(updatedUser);

            // Clear passwords after save
            setNewPassword('');
            setConfirmPassword('');
            alert("Perfil atualizado com sucesso!");

            onClose();
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes("New password should be different from the old password")) {
                alert("A nova senha deve ser diferente da senha atual.");
            } else {
                alert("Erro ao atualizar perfil: " + (e.message || "Erro desconhecido"));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Meu Perfil">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <img
                            src={avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            alt="Profile"
                            className="w-24 h-24 rounded-full border-4 border-[#940910]/10 object-cover shadow-sm"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Upload size={24} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-[#404040]">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email || 'Sem email cadastrado'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {/* Read Only Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">ID de Login</label>
                            <input className="w-full border rounded p-2 text-sm bg-slate-100 text-slate-500" value={user.id} disabled />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 text-slate-500">Perfil</label>
                            <input className="w-full border rounded p-2 text-sm bg-slate-100 text-slate-500" value={user.role} disabled />
                        </div>
                    </div>

                    {/* Editable Nickname */}
                    <div>
                        <label className="block text-xs font-bold mb-1 text-[#940910]">Apelido / Nome de Exibição</label>
                        <input
                            className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-[#940910] outline-none"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="Como você gostaria de ser chamado?"
                        />
                    </div>

                    {/* Password Change Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                        <h4 className="text-sm font-bold text-[#404040] mb-3 flex items-center gap-2">
                            <Lock size={14} /> Alterar Senha
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1 text-[#404040]">Nova Senha</label>
                                <input
                                    type="password"
                                    className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-[#940910] outline-none"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Deixe vazio para manter"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-[#404040]">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-[#940910] outline-none"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    disabled={!newPassword}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-[#940910] hover:bg-[#7a060c] text-white">Salvar Alterações</Button>
                </div>
            </div>
        </Modal>
    );
};
