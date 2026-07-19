import { useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { Send, Check, CheckCheck, MoreVertical, Phone, Video, Smile, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Message, User } from '../types';

interface ActiveChatProps {
  currentUser: User;
  contact: User;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  isContactTyping: boolean;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
}

export default function ActiveChat({
  currentUser,
  contact,
  messages,
  onSendMessage,
  onSendTyping,
  isContactTyping,
  isRightSidebarOpen,
  onToggleRightSidebar,
}: ActiveChatProps) {
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom whenever messages or typing state changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isContactTyping]);

  // Handle input change and typing indicators
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!typing) {
      setTyping(true);
      onSendTyping(true);
    }

    // Debounce: reset typing indicator after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      onSendTyping(false);
    }, 2000);
  };

  // Submit message
  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');

    // Clear typing timeout immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
    onSendTyping(false);
  };

  // Clean up typing state on unmount or contact switch
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typing) {
        onSendTyping(false);
      }
    };
  }, [contact.id]);

  // Format message times
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="active-chat-container" className="flex-1 bg-[#0A0A0B] flex flex-col h-full relative">
      {/* Active Conversation Header */}
      <div className="h-16 border-b border-zinc-800/50 bg-[#0E0E10]/30 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative">
            <img
              src={contact.avatar}
              alt={contact.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border border-zinc-700/60 object-cover"
            />
            <span
              className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 ring-1 ${
                contact.online
                  ? 'bg-emerald-500 border-zinc-950 ring-emerald-400/30'
                  : 'bg-zinc-500 border-zinc-950 ring-zinc-800'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{contact.name}</h3>
            <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
              {isContactTyping ? (
                <span className="text-blue-500 animate-pulse font-semibold">typing...</span>
              ) : contact.online ? (
                <span className="text-emerald-400 font-medium">Online now</span>
              ) : (
                <span className="text-zinc-500">Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 rounded-lg transition-all cursor-not-allowed" title="Voice Call (Sandbox Mode)" disabled>
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 rounded-lg transition-all cursor-not-allowed" title="Video Call (Sandbox Mode)" disabled>
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleRightSidebar}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isRightSidebarOpen
                ? 'text-blue-500 bg-blue-500/10 border border-blue-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
            }`}
            title={isRightSidebarOpen ? "Hide Profile Info" : "Show Profile Info"}
          >
            {isRightSidebarOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
          <button className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 rounded-lg transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl border border-blue-500/10 flex items-center justify-center text-blue-500 mb-4 animate-bounce">
              <Send className="w-5 h-5 rotate-45 translate-x-0.5 -translate-y-0.5" />
            </div>
            <h4 className="text-sm font-bold text-zinc-300">Start a new conversation</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
              Send a real-time instant message to {contact.name}. Your connection is live and verified.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`flex gap-3 max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar matching elegant dark template */}
                <img
                  src={isMe ? currentUser.avatar : contact.avatar}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-900 shrink-0 self-end"
                />

                {/* Message Body & Delivery Info */}
                <div className="flex flex-col gap-1">
                  <div
                    className={`px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800/50'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Time + Status receipt */}
                  <div className={`flex items-center gap-1.5 px-1 text-[10px] text-zinc-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && (
                      <span className="shrink-0">
                        {msg.status === 'sent' && (
                          <Check className="w-3.5 h-3.5 text-zinc-600" title="Sent to server" />
                        )}
                        {msg.status === 'delivered' && (
                          <CheckCheck className="w-3.5 h-3.5 text-zinc-500" title="Delivered to contact" />
                        )}
                        {msg.status === 'read' && (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-500" title="Read by contact" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isContactTyping && (
          <div className="flex gap-3 max-w-[70%] mr-auto">
            <img
              src={contact.avatar}
              alt={contact.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-900 shrink-0 self-end"
            />
            <div className="flex flex-col gap-1">
              <div className="bg-zinc-900 border border-zinc-800/50 px-4 py-3 rounded-lg flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchoring target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Composer Bar matching exactly the Elegant Dark spec */}
      <div className="p-6">
        <div className="bg-[#161618] border border-zinc-800 rounded-xl p-4">
          <form onSubmit={handleSend} className="flex items-center space-x-4">
            <button
              type="button"
              className="text-zinc-500 hover:text-zinc-300"
              title="Insert Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              id="chat-message-input"
              type="text"
              placeholder={`Message ${contact.name}`}
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 bg-transparent border-none text-sm text-zinc-200 focus:outline-none placeholder-zinc-500"
            />
            <div className="flex items-center space-x-3 text-zinc-500">
              <div className="h-6 w-[1px] bg-zinc-800"></div>
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
