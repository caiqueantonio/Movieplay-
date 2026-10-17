import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Apple,
  Monitor,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallAppView: React.FC = () => {
  const { playSound } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    playSound('sino');
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // In case native prompt is not active, give clear feedback
      alert(
        'Para instalar:\n\n' +
        '• No Chrome/Edge: clique nos três pontos (⋮) no topo do navegador e selecione "Instalar Gerenciapró" ou no ícone de instalar na barra de endereços.\n\n' +
        '• No iPhone/iPad (Safari): toque no botão Compartilhar (quadrado com seta) e escolha "Adicionar à Tela de Início".\n\n' +
        '• No Android (Chrome): toque em Mais (⋮) e depois em "Instalar aplicativo".'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-12 px-4 space-y-10 animate-in fade-in duration-200">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Baixar Aplicativo
        </h1>
        <p className="text-sm md:text-base text-gray-400">
          Tenha o painel sempre à mão, com acesso rápido e notificações.
        </p>
      </div>

      {/* Main Hero Card matching tela4.png */}
      <div className="bg-[#0b0d14] border border-[#1d2232] rounded-3xl p-8 md:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Big Red Download Circle matching tela4.png */}
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-red-500 to-red-700 flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.6)]">
          <Download size={42} strokeWidth={2.5} />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Instale no seu dispositivo
          </h2>
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
            Funciona como um app nativo no celular, tablet ou computador. Sem loja de apps, sem espera.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(220,38,38,0.7)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={18} strokeWidth={2.5} />
            <span>Instalar Aplicativo no Dispositivo</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
          Se o prompt não aparecer, use o menu do navegador (⋮) ➔ "Instalar app" ou "Adicionar à tela inicial".
        </p>

        {installSuccess && (
          <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold">
            <CheckCircle2 size={16} />
            <span>Aplicativo instalado com sucesso no seu dispositivo!</span>
          </div>
        )}
      </div>

      {/* 3 Device Guidance Cards matching tela4.png */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Android */}
        <div className="bg-[#0b0d14] border border-[#1a1e2c] hover:border-red-900/60 rounded-2xl p-6 text-center space-y-3 transition-all group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#140c10] border border-red-950 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Smartphone size={24} />
          </div>
          <h3 className="font-display font-bold text-base text-white">
            Android
          </h3>
          <p className="text-xs text-gray-400 font-mono-code leading-relaxed">
            Chrome ➔ ⋮ ➔ Instalar app
          </p>
        </div>

        {/* iPhone / iPad */}
        <div className="bg-[#0b0d14] border border-[#1a1e2c] hover:border-red-900/60 rounded-2xl p-6 text-center space-y-3 transition-all group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#140c10] border border-red-950 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Apple size={24} />
          </div>
          <h3 className="font-display font-bold text-base text-white">
            iPhone / iPad
          </h3>
          <p className="text-xs text-gray-400 font-mono-code leading-relaxed">
            Safari ➔ Compartilhar ➔ Adicionar à Tela Inicial
          </p>
        </div>

        {/* Windows / Mac */}
        <div className="bg-[#0b0d14] border border-[#1a1e2c] hover:border-red-900/60 rounded-2xl p-6 text-center space-y-3 transition-all group">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#140c10] border border-red-950 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Monitor size={24} />
          </div>
          <h3 className="font-display font-bold text-base text-white">
            Windows / Mac
          </h3>
          <p className="text-xs text-gray-400 font-mono-code leading-relaxed">
            Chrome/Edge ➔ Ícone de instalação na barra
          </p>
        </div>
      </div>
    </div>
  );
};
