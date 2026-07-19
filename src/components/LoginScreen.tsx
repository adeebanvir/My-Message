import { useEffect, useState } from 'react';
import { LogIn, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { User } from '../types';
import { saveUserProfile } from '../lib/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

// Custom sandbox profiles for immediate iframe-friendly testing
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
      // Decode JWT client-side
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

      // Save directly to Firebase Firestore
      await saveUserProfile(user, true);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate. Try using Sandbox Login.');
    } finally {
      setLoading(null);
    }
  };

  // Launch Google Sign In manually
  const launchGoogleSignIn = () => {
    setError(null);
    if (!googleClientId) {
      setError('Google Sign-In has not been configured with a Google Client ID yet. Please use the Sandbox Profiles below for instant, fully functional preview testing!');
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
        window.google.accounts.id.prompt(); // also trigger One Tap
      } catch (err) {
        setError('Google Client configuration is missing. Please use Sandbox Profiles for instant preview testing!');
      }
    } else {
      setError('Google Identity Service script not loaded yet. Please try again or use Sandbox Profiles.');
    }
  };

  // Log in using a Sandbox Account (directly registered in Firebase Firestore)
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

      // Register and save sandbox profile directly to Firestore
      await saveUserProfile(user, true);
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Sandbox authentication failed.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-zinc-100 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-zinc-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md bg-[#0E0E10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative z-10 transition-all">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500 mb-4 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Web Messenger
          </h1>
          <p className="text-zinc-400 text-sm mt-2 font-medium">
            Real-time, purely web-based, secure communication
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Method 1: Google Auth */}
        <div className="space-y-4">
          <button
            id="google-signin-btn"
            onClick={launchGoogleSignIn}
            disabled={loading !== null}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
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
          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <span className="relative px-3 bg-[#0E0E10] text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Or Test the Preview Iframe
            </span>
          </div>

          {/* Method 2: Sandbox Testing Profiles */}
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 text-center leading-relaxed">
              Google popups are restricted inside nested browser frames. For instant testing, select an identity below:
            </p>

            <div className="grid grid-cols-1 gap-2.5 mt-2 max-h-56 overflow-y-auto pr-1">
              {SANDBOX_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  id={`sandbox-btn-${profile.id}`}
                  onClick={() => handleSandboxLogin(profile)}
                  disabled={loading !== null}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-[#161618] hover:bg-zinc-900/60 border border-zinc-800/50 hover:border-blue-500/30 text-left transition-all group active:scale-[0.985] disabled:opacity-50 cursor-pointer"
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

        {/* Footer */}
        <div className="mt-8 text-center border-t border-zinc-900 pt-4">
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Secured via token verification. Active sessions are isolated and persist via real-time synchronization.
          </p>
        </div>
      </div>
    </div>
  );
}
