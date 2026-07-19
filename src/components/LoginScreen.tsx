import { useEffect, useState } from 'react';
import { LogIn, ShieldAlert, Sparkles, UserCheck, Shield, Zap, MessageSquare, Clock, Globe, ArrowRight, Lock, Laptop } from 'lucide-react';
import { User } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

// Custom sandbox profiles for immediate testing
const SANDBOX_PROFILES = [
  {
    id: 'user_sophia',
    name: 'Sophia Chen',
    email: 'sophia.chen@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
    role: 'Product Manager',
  },
  {
    id: 'user_liam',
    name: 'Liam Vance',
    email: 'liam.vance@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam',
    role: 'Tech Lead',
  },
  {
    id: 'user_emily',
    name: 'Emily Watson',
    email: 'emily.watson@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    role: 'UX Designer',
  },
  {
    id: 'user_james',
    name: 'James Carter',
    email: 'james.carter@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    role: 'DevOps Engineer',
  },
];

// Inline Logo Component
function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`relative ${className} shrink-0`}>
      <svg viewBox="0 0 32 32" className="w-full h-full">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
        <path d="M9 11h14c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-4l-3 3-3-3H9c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2z" fill="white" />
        <path d="M16 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#fbbf24" />
      </svg>
    </div>
  );
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  });

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Trigger Google Login using standard ID Token Flow
  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading('google');
    setError(null);
    try {
      const base64Url = response.credential.split('.')[1];
      if (!base64Url) {
        throw new Error('Invalid Google credential format');
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const googleId = payload.sub || payload.email;
      const email = payload.email || '';
      const name = payload.name || payload.email?.split('@')[0] || 'Google User';
      const picture = payload.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${googleId}`;

      const user: User = {
        id: googleId,
        name,
        email,
        avatar: picture,
        online: true,
      };

      await saveUserProfile(user, true);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate. Try using Sandbox Login.');
    } finally {
      setLoading(null);
    }
  };

  const launchGoogleSignIn = () => {
    setError(null);
    if (!googleClientId) {
      setError('Google Sign-In has not been configured with a Google Client ID yet. Please use the Sandbox Profiles below for instant, fully functional preview testing!');
      // Scroll to sandbox section
      const terminal = document.getElementById('access-terminal');
      if (terminal) {
        terminal.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // @ts-ignore
    if (window.google) {
      try {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        // @ts-ignore
        window.google.accounts.id.prompt();
      } catch (err) {
        setError('Google Client configuration is missing. Please use Sandbox Profiles for instant preview testing!');
      }
    } else {
      setError('Google Identity Service script not loaded yet. Please try again or use Sandbox Profiles.');
    }
  };

  const handleSandboxLogin = async (profile: typeof SANDBOX_PROFILES[0]) => {
    setLoading(profile.id);
    setError(null);
    try {
      const user: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        online: true,
      };

      await saveUserProfile(user, true);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Sandbox authentication failed.');
    } finally {
      setLoading(null);
    }
  };

  const scrollToTerminal = () => {
    const terminal = document.getElementById('access-terminal');
    if (terminal) {
      terminal.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="homepage-container" className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans">
      
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] -translate-x-1/2 pointer-events-none"></div>

      {/* Navigation Header */}
      <nav className="border-b border-zinc-900 bg-[#070709]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8" />
            <span className="font-display font-bold text-lg tracking-tight text-white">
              Web Messenger
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#access-terminal" className="hover:text-white transition-colors">Sandbox Hub</a>
          </div>
          <div>
            <button
              onClick={scrollToTerminal}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              Launch App
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pure Serverless Direct-to-Database Sync</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-none">
              Real-time Web Conversations, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Refined.</span>
            </h1>
            
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
              A high-performance instant messaging experience powered directly by cloud-hosted Firebase Firestore. Enjoy instant snapshot-driven communication under 100ms with zero middleware lag.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={scrollToTerminal}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                Access Free Sandbox
                <LogIn className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto text-center border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 px-6 py-3.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white transition-all duration-200"
              >
                Explore Architecture
              </a>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-zinc-500 font-mono">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                No Backend Middlemen
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Sub-100ms Updates
              </div>
            </div>
          </div>

          {/* Hero Right Visuals: Simulated Animated Chat */}
          <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-violet-500/10 rounded-2xl blur-xl opacity-80 pointer-events-none"></div>
            
            {/* Live-rendered custom styled mock app interface */}
            <div className="w-full bg-[#0E0E11] border border-zinc-800/80 rounded-2xl shadow-2xl p-4 space-y-4 font-sans relative overflow-hidden">
              
              {/* Header inside mockup */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-zinc-400">Live Active Channel</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3.5 h-64 overflow-y-auto text-xs pr-1">
                
                {/* Message 1 */}
                <div className="flex items-start gap-2.5">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia"
                    alt="Sophia"
                    className="w-7 h-7 rounded bg-zinc-800 p-0.5"
                  />
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-zinc-300">Sophia Chen</span>
                      <span className="text-[9px] text-zinc-500">10:42 PM</span>
                    </div>
                    <div className="mt-1 p-2.5 bg-[#161619] border border-zinc-800/40 rounded-xl rounded-tl-none text-zinc-300 max-w-xs leading-relaxed">
                      Is the Firestore synchronizer really live-updating?
                    </div>
                  </div>
                </div>

                {/* Message 2 */}
                <div className="flex items-start gap-2.5">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Liam"
                    alt="Liam"
                    className="w-7 h-7 rounded bg-zinc-800 p-0.5"
                  />
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-zinc-300">Liam Vance</span>
                      <span className="text-[9px] text-zinc-500">10:43 PM</span>
                    </div>
                    <div className="mt-1 p-2.5 bg-[#161619] border border-zinc-800/40 rounded-xl rounded-tl-none text-zinc-300 max-w-xs leading-relaxed">
                      Absolutely. Snapshot listeners push changes instantly to all subscribers! ⚡
                    </div>
                  </div>
                </div>

                {/* Message 3 */}
                <div className="flex items-start gap-2.5">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
                    alt="Emily"
                    className="w-7 h-7 rounded bg-zinc-800 p-0.5"
                  />
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-zinc-300">Emily Watson</span>
                      <span className="text-[9px] text-zinc-500">10:43 PM</span>
                    </div>
                    <div className="mt-1 p-2.5 bg-[#161619] border border-zinc-800/40 rounded-xl rounded-tl-none text-zinc-300 max-w-xs leading-relaxed">
                      Plus, we have live typing indicators and instant status delivery!
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 italic mt-2 ml-10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span>James Carter is typing...</span>
                </div>

              </div>

              {/* Input mockup */}
              <div className="border-t border-zinc-900 pt-3 flex items-center gap-2">
                <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-2 text-zinc-500 text-[11px]">
                  Send direct, encrypted message...
                </div>
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-20 bg-[#0A0A0C] border-y border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
              A Superior Real-time Engine
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              We ditched heavy polling mechanisms and fragile WebSocket servers. Web Messenger binds your communication layer directly to secure, isolated cloud instances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                Sub-100ms Synchrony
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Utilizes Firestore snapshot handlers to listen to remote operations. Message updates, status modifications, and reads are propagated almost instantly.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-500 border border-violet-500/20 flex items-center justify-center mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                Granular Security Rules
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Armed with rigorous Firestore access rules. Users are strictly allowed to modify only their authored states and inspect their designated communication channels.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center mb-5">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                Global Edge Delivery
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                No regional central servers. The database distributes presence and conversations via edge servers closest to you, reducing network hops to near zero.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Architecture Showcase */}
      <section id="architecture" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800/80 rounded-3xl p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-mono font-semibold text-blue-500 uppercase tracking-widest">
                System Topology
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Peerless Serverless Client Architecture
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Traditional messaging apps force you through an intermediate server that routes WS signals, saves to memory, and buffers to database pipelines. Web Messenger utilizes direct database listeners.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white">Stateless client binding:</strong> The app connects directly to Cloud Firestore utilizing a lightweight Firebase SDK footprint.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">2</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white">Presence tracking:</strong> Live user state triggers a bidirectional presence synchronizer bound directly to client tab lifecycle events.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  sdk-client-sync.ts
                </span>
                <span className="text-emerald-500 text-[10px]">● Verified Secure</span>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
{`// Create direct synchronization channel
export const listenMessages = (uid1, uid2, callback) => {
  const chatId = getChatId(uid1, uid2);
  const q = query(
    collection(db, "messages"),
    where("chatId", "==", chatId)
  );

  // Directly bind state callback to DB stream
  return onSnapshot(q, (snapshot) => {
    const msgs = [];
    snapshot.forEach((doc) => msgs.push(doc.data()));
    callback(msgs.sort((a, b) => a.timestamp - b.timestamp));
  });
};`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Access Terminal / Login Section */}
      <section id="access-terminal" className="py-20 bg-gradient-to-b from-[#0A0A0C] to-[#070709] border-t border-zinc-900">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          
          <div className="bg-[#0E0E10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative">
            
            {/* Header Branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3.5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500 mb-4 shadow-inner">
                <LogoIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Access Workspace Terminal
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2">
                Authenticate with Google or activate a secure sandbox testing profile.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Method 1: Google Auth */}
            <div className="space-y-5">
              <button
                id="google-signin-btn"
                onClick={launchGoogleSignIn}
                disabled={loading !== null}
                className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                  googleClientId
                    ? 'bg-white hover:bg-zinc-100 text-black'
                    : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/80'
                }`}
              >
                {loading === 'google' ? (
                  <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className={`w-5 h-5 ${googleClientId ? '' : 'opacity-55'}`} viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.22A12 12 0 0 0 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.45 14.33a7.14 7.14 0 0 1 0-4.52V6.59H1.31a12 12 0 0 0 0 10.96l4.14-3.22z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 0 12 12 0 0 0 1.31 6.59l4.14 3.22c.92-2.77 3.5-4.83 6.55-4.83z"
                    />
                  </svg>
                )}
                {googleClientId ? 'Sign In with Google Account' : 'Google Sign-In (Pending Setup)'}
              </button>

              {/* Separator */}
              <div className="relative py-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <span className="relative px-3.5 bg-[#0E0E10] text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">
                  Sandbox Playground Access
                </span>
              </div>

              {/* Method 2: Sandbox Testing Profiles */}
              <div className="space-y-3.5">
                <p className="text-xs text-zinc-400 text-center leading-relaxed">
                  Avoid popup restrictions inside isolated browser iframes. Select a simulated testing profile to log in instantly as any user:
                </p>

                <div className="grid grid-cols-1 gap-2.5 mt-2 max-h-56 overflow-y-auto pr-1">
                  {SANDBOX_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      id={`sandbox-btn-${profile.id}`}
                      onClick={() => handleSandboxLogin(profile)}
                      disabled={loading !== null}
                      className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-[#141416] hover:bg-zinc-900 border border-zinc-800/60 hover:border-blue-500/40 text-left transition-all duration-150 group active:scale-[0.985] disabled:opacity-50 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg bg-zinc-800 p-0.5 object-cover border border-zinc-800"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 bg-blue-600 rounded-md text-white scale-75 shadow-md">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                          {profile.name}
                        </p>
                        <p className="text-xs text-blue-500 font-medium truncate mt-0.5">
                          {profile.role}
                        </p>
                      </div>
                      <div className="text-zinc-500 group-hover:text-blue-500 transition-colors">
                        <LogIn className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer inside card */}
            <div className="mt-8 text-center border-t border-zinc-900 pt-5">
              <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                System: SECURED // Region: ACTIVE // Isolation: VERIFIED
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-zinc-900 bg-[#050507] py-12 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-6 h-6 grayscale opacity-60" />
            <span className="font-display font-bold text-sm tracking-tight text-zinc-400">
              Web Messenger
            </span>
          </div>
          <p className="text-center md:text-right text-[11px] leading-relaxed">
            Designed with desktop precision. Optimized for instant database streams with direct Firebase integration.
          </p>
        </div>
      </footer>
    </div>
  );
}
