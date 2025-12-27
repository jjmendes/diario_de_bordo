import React, { useState, useEffect } from 'react';
import { Button, Card, Input } from './UiComponents';
import { Lock, User, ClipboardList, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { SupabaseDB } from '../services/supabaseDb';

interface LoginProps {
  onLogin?: (user: any) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgUrl, setBgUrl] = useState<string>('/bg-login.png'); // Default local

  const { signIn } = useAuth();

  useEffect(() => {
    // Try to load custom background
    const loadCustomBg = async () => {
      const remoteUrl = SupabaseDB.getSystemAssetUrl('bg_login.png') + `?t=${new Date().getTime()}`;
      const img = new Image();
      img.src = remoteUrl;
      img.onload = () => setBgUrl(remoteUrl);
      // If error, we keep the default local /bg-login.png
    };
    loadCustomBg();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-100 p-4 bg-cover bg-center relative transition-all duration-1000"
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div> {/* Darker overlay for readability */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-[#940910]/10 p-3 rounded-full mb-3 backdrop-blur-sm bg-white/10 border border-white/20">
            <ClipboardList size={32} className="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">Diário de Bordo</h1>
          <p className="text-slate-100 font-medium drop-shadow-sm">Registro de Ocorrências</p>
        </div>

        <Card className="border-t-4 border-[#940910] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              icon={User}
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-[#940910] focus:outline-none transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              required
            />

            {error && (
              <div className="bg-red-50 text-[#940910] text-sm p-3 rounded border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-[#940910] hover:bg-[#7a060c] text-white">
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
