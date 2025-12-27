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
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center max-w-sm w-full transition-all hover:bg-black/70 group">
            <div className="bg-white/10 p-4 rounded-full mb-4 ring-1 ring-white/20 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <ClipboardList size={40} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-1 drop-shadow-lg">Diário de Bordo</h1>
            <div className="h-0.5 w-12 bg-[#940910] mb-3 rounded-full shadow-md"></div>
            <p className="text-slate-300 font-medium text-sm tracking-wide">REGISTRO DE OCORRÊNCIAS</p>
          </div>
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
