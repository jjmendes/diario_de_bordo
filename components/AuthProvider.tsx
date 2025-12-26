import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string, email?: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setUser({
                    id: data.id,
                    name: data.name,
                    nickname: data.nickname,
                    email: email,
                    role: data.role,
                    avatar: data.avatar_url,
                    allowedClusters: data.allowed_clusters,
                    allowedBranches: data.allowed_branches
                });
            } else {
                // Fallback for new users without profile yet
                setUser({
                    id: userId,
                    name: email?.split('@')[0] || 'User',
                    email: email,
                    role: 'CONTROLADOR' as any,
                    allowedClusters: [],
                    allowedBranches: []
                });
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            alert(`Erro ao carregar perfil: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) {
            alert(`Erro no Login: ${error.message}`);
            throw error;
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
