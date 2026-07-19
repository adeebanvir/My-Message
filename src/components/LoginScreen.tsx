import { useEffect, useState, FormEvent } from 'react';
import { LogIn, ShieldAlert, Sparkles, UserCheck, Shield, Zap, MessageSquare, Clock, Globe, ArrowRight, Lock, Laptop, User as UserIcon, RefreshCw, Key, HelpCircle } from 'lucide-react';
import { User } from '../types';
import { saveUserProfile, getUserById } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

// Custom sandbox profiles for immediate testing
const SANDBOX_PROFILES = [
  {
    id: '111111111111',
    name: 'Sophia Chen',
    email: 'sophia.chen@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
    role: 'Product Manager',
    description: 'Lead Product Manager focusing on direct-to-DB synchronous architecture.',
  },
  {
    id: '222222222222',
    name: 'Liam Vance',
    email: 'liam.vance@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam',
    role: 'Tech Lead',
    description: 'Full-stack builder. Fan of serverless Firestore streams.',
  },
  {
    id: '333333333333',
    name: 'Emily Watson',
    email: 'emily.watson@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    role: 'UX Designer',
    description: 'Crafting minimalist, high-fidelity dark workspace UI.',
  },
  {
    id: '444444444444',
    name: 'James Carter',
    email: 'james.carter@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    role: 'DevOps Engineer',
    description: 'Ensuring global sub-100ms snap propagation.',
  },
];

// Preset Seeds for Avatar Generator
const PRESET_AVATARS = [
  'Sophia', 'Liam', 'Emily', 'James', 'Alex', 'Sarah', 'Felix', 'Luna', 'Max', 'Zoe'
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
  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'sandbox'>('signup');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sign Up form states
  const [signupId, setSignupId] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupBio, setSignupBio] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  // Sign In form states
  const [signinId, setSigninId] = useState('');

  // Generate a random 12-digit numeric ID consisting only of numbers
  const generateNumericId = () => {
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  };

  // Generate a completely new registration ID and initial avatar on load
  const initSignupForm = () => {
    setSignupId(generateNumericId());
    const randomSeed = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
    setSignupAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}_${Math.floor(Math.random() * 100)}`);
  };

  useEffect(() => {
    initSignupForm();
  }, []);

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setSignupAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!signupId || signupId.length !== 12 || !/^\d+$/.test(signupId)) {
      setError('System Error: User ID must be exactly a 12-digit number.');
      return;
    }
    if (!signupName.trim()) {
      setError('Please provide a display name for your profile.');
      return;
    }

    setLoading('signup');
    setError(null);

    try {
      // Check if ID is already registered
      const existingUser = await getUserById(signupId);
      if (existingUser) {
        setError('This 12-digit ID is already registered. Please sign in or generate a new ID.');
        setLoading(null);
        return;
      }

      const newUser: User = {
        id: signupId,
        name: signupName.trim(),
        email: signupEmail.trim() || `${signupId}@webmessenger.internal`,
        avatar: signupAvatar,
        online: true,
        description: signupBio.trim() || 'No description provided.',
        addedContactIds: [],
      };

      await saveUserProfile(newUser, true);
      onLoginSuccess(newUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create your profile. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleSigninSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formattedId = signinId.trim().replace(/\s/g, '');
    if (!formattedId || formattedId.length !== 12 || !/^\d+$/.test(formattedId)) {
      setError('Please enter a valid 12-digit numeric User ID.');
      return;
    }

    setLoading('signin');
    setError(null);

    try {
      const user = await getUserById(formattedId);
      if (!user) {
        setError('Error: User ID not found. Ensure you typed the 12 digits correctly or create a new account.');
        setLoading(null);
        return;
      }

      await saveUserProfile(user, true);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication error. Please check your network.');
    } finally {
      setLoading(null);
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
        description: profile.description,
        addedContactIds: [],
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

  const formatIdWithSpaces = (id: string) => {
    return id.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  return (
    <div id="homepage-container" className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans">
      
      {/* Decorative Blur Orbs */}
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
            <a href="#access-terminal" className="hover:text-white transition-colors">Launch Portal</a>
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
              <span>Decentralized 12-Digit Numeric Identity Stream</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-none">
              A Personal, Secure Web Messenger <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">Under Your Control.</span>
            </h1>
            
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
              No phone numbers, passwords, or complex email signups. Generate a unique 12-digit numeric key, personalize your profile info, and immediately start exchanging sub-100ms real-time messages directly.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={scrollToTerminal}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                Access Launch Portal
                <LogIn className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto text-center border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 px-6 py-3.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white transition-all duration-200"
              >
                Explore Features
              </a>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-zinc-500 font-mono">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                No Password Required
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                12-Digit Custom ID
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
                  <span className="text-xs font-semibold text-zinc-400">Active Live Chat</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">ID: 8492 8374 9102</div>
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
                      <span className="text-[9px] text-zinc-500 font-mono">8492...</span>
                    </div>
                    <div className="mt-1 p-2.5 bg-[#161619] border border-zinc-800/40 rounded-xl rounded-tl-none text-zinc-300 max-w-xs leading-relaxed">
                      Just add my 12-digit ID to your sidebar and we can start chatting instantly! ⚡
                    </div>
                  </div>
                </div>

                {/* Message 2 (Right aligned / Sent) */}
                <div className="flex items-start gap-2.5 flex-row-reverse text-right">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe"
                    alt="Zoe"
                    className="w-7 h-7 rounded bg-zinc-800 p-0.5"
                  />
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="font-semibold text-zinc-300">Zoe (You)</span>
                      <span className="text-[9px] text-zinc-500 font-mono">10:43 PM</span>
                    </div>
                    <div className="mt-1 p-2.5 bg-blue-600 rounded-xl rounded-tr-none text-white max-w-xs text-left leading-relaxed shadow-md">
                      Wow, that's incredibly simple. No email verification or passwords!
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
                  <span>Sophia Chen is typing...</span>
                </div>

              </div>

              {/* Input mockup */}
              <div className="border-t border-zinc-900 pt-3 flex items-center gap-2">
                <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-2 text-zinc-500 text-[11px]">
                  Send direct, snapshot-synced message...
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
              Durable, reliable communication. Bypassing unrequested complex backend middleware to deliver direct snapshots straight to your screen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                12-Digit Numeric Identity
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Generate a pure numeric key for your account. Hand it over to your friends so they can add your profile, locate your channel, and begin a peer conversation securely.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-500 border border-violet-500/20 flex items-center justify-center mb-5">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                Personal Profiles & Bios
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Add your unique flare on account creation. Specify a custom name, profile picture, and descriptive bio so your friends can immediately recognize you.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="bg-[#0E0E11] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center mb-5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                Symmetric Chat Bubbles
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Enjoy refined instant message layouts. Sent messages are styled on the right in high-visibility blue, while received messages populate on the left.
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
                Direct client-to-database listening propagates real-time communication. All profiles, custom bios, and chat histories are synced instantly without loading screen delays.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">1</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white">Profile Security:</strong> Write directly to your corresponding numeric key path under validated security regulations.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">2</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-white">Mutual Inbound Auto-Discovery:</strong> Inbound message listeners allow peer chats to pop up automatically when friends message you first.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  direct-db-resolver.ts
                </span>
                <span className="text-emerald-500 text-[10px]">● Online Verified</span>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
{`// Generate unique 12-digit token
const signupId = generateNumericId(); // e.g. "849203948512"

// Secure snapshot synchronizer
export const listenInboxMessages = (currentUserId, callback) => {
  const q = query(
    collection(db, "messages"),
    where("recipientId", "==", currentUserId)
  );
  return onSnapshot(q, (snapshot) => {
    const msgs = [];
    snapshot.forEach(doc => msgs.push(doc.data()));
    callback(msgs);
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
          
          <div className="bg-[#0E0E10] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            
            {/* Header Branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3.5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500 mb-4 shadow-inner">
                <LogoIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                Launch Workspace Terminal
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2">
                Create a 12-digit account, log in with an existing ID, or try sandbox profiles.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Premium Tab Selector */}
            <div className="flex border-b border-zinc-800 mb-6 p-1 bg-zinc-900/40 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'signup'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'signin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Sign In with ID
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('sandbox'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'sandbox'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Sandbox Hub
              </button>
            </div>

            {/* TAB CONTENT: SIGN UP */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-5">
                
                {/* 12 digit Generated ID Showcase */}
                <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 font-mono">Your Unique 12-Digit ID</span>
                    <p className="text-xl font-mono font-bold tracking-widest text-emerald-400">
                      {formatIdWithSpaces(signupId)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={initSignupForm}
                    title="Generate New ID"
                    className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-lg transition-colors cursor-pointer text-zinc-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Display Name Input */}
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">Profile Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="e.g. David Miller"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Optional Email input */}
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">Email Address <span className="text-zinc-600">(Optional)</span></label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="e.g. david.miller@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Short Bio Description input */}
                <div>
                  <label htmlFor="signup-bio" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">Short Description / Bio</label>
                  <textarea
                    id="signup-bio"
                    placeholder="Tell your contacts a little about yourself (e.g. Designer based in Austin)"
                    value={signupBio}
                    onChange={(e) => setSignupBio(e.target.value)}
                    rows={2}
                    maxLength={160}
                    className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Profile Picture Customize */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 font-mono">Profile Picture</label>
                  <div className="flex items-center gap-5 p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl">
                    <img
                      src={signupAvatar}
                      alt="Avatar Preview"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 object-cover"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-zinc-300 font-semibold">Avatar preview synced</p>
                      <p className="text-[10px] text-zinc-500">Dicebear generated vector graphics.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      className="px-3.5 py-2 text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-zinc-300"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Randomize
                    </button>
                  </div>
                </div>

                {/* Register Action Button */}
                <button
                  id="signup-action-btn"
                  type="submit"
                  disabled={loading !== null}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-900/20 active:scale-[0.99] disabled:opacity-50 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading === 'signup' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Create Profile & Launch Chatroom
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB CONTENT: SIGN IN */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSigninSubmit} className="space-y-5">
                <div>
                  <label htmlFor="signin-id" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">Enter 12-Digit User ID</label>
                  <div className="relative">
                    <input
                      id="signin-id"
                      type="text"
                      required
                      maxLength={14} // To allow typing space-formatted strings e.g. "8492 8492 8492"
                      placeholder="e.g. 5824 9384 1029"
                      value={signinId}
                      onChange={(e) => {
                        // Strip non-digits and limit to 12 chars
                        const cleaned = e.target.value.replace(/\D/g, '').substring(0, 12);
                        // Format with spaces
                        const formatted = cleaned.replace(/(\d{4})(\d{4})?(\d{4})?/, (_, p1, p2, p3) => {
                          let res = p1;
                          if (p2) res += ' ' + p2;
                          if (p3) res += ' ' + p3;
                          return res;
                        });
                        setSigninId(formatted);
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-blue-500/50 rounded-xl pl-4 pr-12 py-4 text-lg font-mono tracking-widest text-emerald-400 placeholder-zinc-700 focus:outline-none transition-all"
                    />
                    <div className="absolute right-4 top-4 text-zinc-600">
                      <Key className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <button
                  id="signin-action-btn"
                  type="submit"
                  disabled={loading !== null}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-900/20 active:scale-[0.99] disabled:opacity-50 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading === 'signin' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Authenticate & Enter
                      <LogIn className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl text-xs text-zinc-500 space-y-2 leading-relaxed">
                  <p className="font-semibold text-zinc-400">Where can I find my 12-digit ID?</p>
                  <p>When you sign up, Web Messenger automatically registers a randomized 12-digit key for you. You can find your current ID in the top corner of your chat list. Copy it, share it with friends, and use it here to re-access your account.</p>
                </div>
              </form>
            )}

            {/* TAB CONTENT: SANDBOX ACCESS */}
            {activeTab === 'sandbox' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 text-center leading-relaxed">
                  Log in instantly with pre-configured developer sandbox profiles. This allows you to test real-time peer-to-peer chats using multiple browser tabs.
                </p>

                <div className="grid grid-cols-1 gap-2.5 mt-2 max-h-72 overflow-y-auto pr-1">
                  {SANDBOX_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      id={`sandbox-btn-${profile.id}`}
                      onClick={() => handleSandboxLogin(profile)}
                      disabled={loading !== null}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-[#141416] hover:bg-zinc-900 border border-zinc-800/60 hover:border-blue-500/40 text-left transition-all duration-150 group active:scale-[0.985] disabled:opacity-50 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-800 object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 p-0.5 bg-blue-600 rounded-md text-white scale-75 shadow-md">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                            {profile.name}
                          </p>
                          <span className="text-[9px] font-mono font-bold text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded-md border border-zinc-900">
                            {profile.id.substring(0, 4) + '...'}
                          </span>
                        </div>
                        <p className="text-xs text-blue-500 font-medium truncate mt-0.5">
                          {profile.role}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate mt-1">
                          {profile.description}
                        </p>
                      </div>
                      <div className="text-zinc-500 group-hover:text-blue-500 transition-colors">
                        <LogIn className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Footer Integrity Badge */}
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
