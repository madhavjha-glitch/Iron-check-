import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, 
  MessageSquare, 
  Plus, 
  Send, 
  User, 
  Key, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  Loader2, 
  Mail, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  ShieldAlert,
  Server
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  signup, 
  login, 
  getCurrentUser, 
  getConversations, 
  createConversation, 
  getMessages, 
  sendMessage, 
  clearAuth, 
  getToken 
} from "../services/jwtAuth";
import { JWTUser, JWTConversation, JWTMessage } from "../types";

export default function SecureChatAuth() {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Auth States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Conversations States
  const [conversations, setConversations] = useState<JWTConversation[]>([]);
  const [activeConv, setActiveConv] = useState<JWTConversation | null>(null);
  const [messages, setMessages] = useState<JWTMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [convLoading, setConvLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // Logs for visual security telemetry
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user session on boot
  useEffect(() => {
    const activeUser = getCurrentUser();
    const activeToken = getToken();
    if (activeUser && activeToken) {
      setUser(activeUser);
      setToken(activeToken);
      addSecurityLog(`🔐 Session restored. Welcome back, ${activeUser.name}.`);
    } else {
      addSecurityLog("🛡️ Secure sandbox initialized. No active token present.");
    }
  }, []);

  // Fetch conversations when authenticated
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv._id);
    } else {
      setMessages([]);
    }
  }, [activeConv]);

  // Scroll to bottom of message panel
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendLoading]);

  const addSecurityLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSecurityLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 4)]);
  };

  const fetchConversations = async () => {
    setConvLoading(true);
    addSecurityLog("GET /api/conversations -> Fetching user-filtered records...");
    const result = await getConversations();
    setConvLoading(false);

    if (result.success && result.conversations) {
      setConversations(result.conversations);
      addSecurityLog(`✅ Retrieved ${result.conversations.length} isolated conversations for userId: ${user?.id}`);
      if (result.conversations.length > 0 && !activeConv) {
        setActiveConv(result.conversations[0]);
      }
    } else {
      addSecurityLog(`❌ Failed to retrieve conversations: ${result.error}`);
    }
  };

  const fetchMessages = async (convId: string) => {
    setMsgLoading(true);
    addSecurityLog(`GET /api/conversations/${convId}/messages -> Authenticating access...`);
    const result = await getMessages(convId);
    setMsgLoading(false);

    if (result.success && result.messages) {
      setMessages(result.messages);
      addSecurityLog(`✅ Verified access. Fetched ${result.messages.length} messages safely.`);
    } else {
      addSecurityLog(`❌ Access Denied: ${result.error}`);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (!email || !password) {
      setAuthError("Please fill out all fields.");
      setAuthLoading(false);
      return;
    }

    if (isLogin) {
      addSecurityLog(`POST /api/auth/login -> Verifying hash credentials for ${email}`);
      const result = await login(email, password);
      setAuthLoading(false);
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setToken(result.token);
        addSecurityLog(`🔑 JWT Issued. 24h expiration set. Token: ${result.token.substring(0, 16)}...`);
      } else {
        setAuthError(result.error || "Login failed");
        addSecurityLog(`❌ Auth failed: ${result.error}`);
      }
    } else {
      if (!name) {
        setAuthError("Please provide your name.");
        setAuthLoading(false);
        return;
      }
      addSecurityLog(`POST /api/auth/signup -> Hashing password & establishing schema for ${email}`);
      const result = await signup(email, password, name);
      setAuthLoading(false);
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setToken(result.token);
        addSecurityLog(`🎉 Account created! Token: ${result.token.substring(0, 16)}...`);
      } else {
        setAuthError(result.error || "Signup failed");
        addSecurityLog(`❌ Registration failed: ${result.error}`);
      }
    }
  };

  const handleCreateNewChat = async () => {
    addSecurityLog("POST /api/conversations -> Generating secure document thread...");
    const defaultTitle = `Workout Plan - #${conversations.length + 1}`;
    const result = await createConversation(defaultTitle);
    if (result.success && result.conversation) {
      setConversations((prev) => [result.conversation!, ...prev]);
      setActiveConv(result.conversation);
      addSecurityLog(`✅ Thread generated: "${result.conversation.title}"`);
    } else {
      addSecurityLog(`❌ Creation rejected: ${result.error}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSendLoading(true);

    // Append client-side optimistically
    const tempUserMsg: JWTMessage = {
      _id: `temp-${Date.now()}`,
      conversationId: activeConv._id,
      userId: user?.id || "",
      role: "user",
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    addSecurityLog(`POST /api/conversations/${activeConv._id}/messages -> Handshaking...`);
    const result = await sendMessage(activeConv._id, text);
    setSendLoading(false);

    if (result.success && result.userMessage && result.assistantMessage) {
      setMessages((prev) => 
        prev.filter(m => !m._id.startsWith("temp-")).concat([result.userMessage!, result.assistantMessage!])
      );
      addSecurityLog("✨ Response secured. Assistant replies saved to MongoDB Atlas.");
    } else {
      addSecurityLog(`❌ Failed to post message: ${result.error}`);
      // Remove optimistic message on fail
      setMessages((prev) => prev.filter(m => !m._id.startsWith("temp-")));
    }
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
    setActiveConv(null);
    setConversations([]);
    setMessages([]);
    addSecurityLog("🚪 Access revoked. JWT cleared from storage.");
  };

  return (
    <div className="w-full flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" id="secure-chat-auth-system">
      
      {/* Header Panel */}
      <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Secure Guard Chat <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono font-medium px-1.5 py-0.5 rounded border border-emerald-500/20">JWT Active</span>
            </h3>
            <p className="text-[10px] text-slate-400">Authenticated MongoDB & Node.js Token Isolation</p>
          </div>
        </div>

        {user && (
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded border border-rose-500/10"
            title="Log Out Revoke"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[480px]">
        
        {/* Scenario 1: User Is NOT logged in (Auth Form) */}
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950">
            <div className="w-full max-w-sm bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-3">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">
                  {isLogin ? "Sign In to Guard Chat" : "Create Guard Account"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isLogin 
                    ? "Enter email and password to fetch secure token." 
                    : "Register to initialize your personal data thread."}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3 rounded bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Coach Arjun"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-9 py-2 text-xs focus:outline-none focus:border-amber-500 text-white transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. arjun@zymnix.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-9 py-2 text-xs focus:outline-none focus:border-amber-500 text-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-9 py-2 text-xs focus:outline-none focus:border-amber-500 text-white transition-colors pr-9"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 font-bold py-2 px-4 rounded text-xs tracking-wider transition-colors uppercase flex items-center justify-center space-x-1.5"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>{isLogin ? "Sign In" : "Register Account"}</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-800/60 text-center">
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setAuthError("");
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          
          /* Scenario 2: User is Authenticated (Conversation List + Chat view) */
          <>
            {/* Left Sidebar: Conversations list */}
            <div className="w-full md:w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">My Conversations</span>
                <button 
                  onClick={handleCreateNewChat}
                  className="p-1 text-amber-500 hover:bg-amber-500/10 rounded border border-amber-500/20 transition-colors"
                  title="Create New Thread"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[160px] md:max-h-full">
                {convLoading && conversations.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    <span className="text-xs font-mono">Loading...</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-6 px-3">
                    <p className="text-xs text-slate-500">No active conversations found.</p>
                    <button 
                      onClick={handleCreateNewChat}
                      className="mt-2 text-xs text-amber-400 underline font-mono"
                    >
                      Create First Thread
                    </button>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isActive = activeConv?._id === conv._id;
                    return (
                      <button
                        key={conv._id}
                        onClick={() => setActiveConv(conv)}
                        className={`w-full text-left p-2 rounded text-xs flex items-center space-x-2 transition-colors ${
                          isActive 
                            ? "bg-amber-500/15 border border-amber-500/20 text-amber-400 font-medium" 
                            : "hover:bg-slate-800 border border-transparent text-slate-300"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{conv.title}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Verified Token Telemetry Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[10px] font-mono space-y-1.5">
                <div className="flex items-center text-amber-400 space-x-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="font-bold">TOKEN PROFILE</span>
                </div>
                <div className="text-slate-400 leading-tight">
                  <p className="truncate"><span className="text-slate-500">UID:</span> {user.id}</p>
                  <p className="truncate"><span className="text-slate-500">Name:</span> {user.name}</p>
                  <p className="truncate"><span className="text-slate-500">Email:</span> {user.email}</p>
                </div>
              </div>
            </div>

            {/* Right Chat Panel */}
            <div className="flex-1 flex flex-col bg-slate-950">
              {activeConv ? (
                <>
                  {/* Active Chat Header */}
                  <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white tracking-wide truncate">
                      {activeConv.title}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                      SECURE DB ACCESS OK
                    </span>
                  </div>

                  {/* Message Threads */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[250px] md:max-h-none">
                    {msgLoading && messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                        <span className="text-xs font-mono">Authenticating Token and loading messages...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 px-4 text-slate-500">
                        <Sparkles className="w-8 h-8 text-amber-500/20 mx-auto mb-2" />
                        <p className="text-xs">No messages in this secure thread yet.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Start a conversation with Coach Zymnix. Your data will be isolated from all other users.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isUser = msg.role === "user";
                        return (
                          <div 
                            key={msg._id} 
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                              isUser 
                                ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none" 
                                : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                            }`}>
                              {!isUser && (
                                <p className="text-[8px] font-bold tracking-wider text-amber-500/80 mb-0.5 uppercase font-mono">
                                  COACH ZYMNIX (AI)
                                </p>
                              )}
                              <p className="whitespace-pre-line">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {sendLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900 border border-slate-800 rounded-lg rounded-tl-none px-3 py-2 text-xs flex items-center space-x-2 text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                          <span className="font-mono text-[10px]">Coach Zymnix thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/40 flex items-center space-x-2">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type secure query for Coach Zymnix..."
                      disabled={sendLoading}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sendLoading}
                      className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-800 mb-2" />
                  <p className="text-xs">No Active Conversation Selected</p>
                  <p className="text-[10px] text-slate-600 mt-1">Select an isolated thread from the left or create a new one.</p>
                  <button 
                    onClick={handleCreateNewChat}
                    className="mt-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs px-3 py-1.5 rounded border border-amber-500/20 transition-colors"
                  >
                    Start A Secure Chat Session
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Real-time Guard Logs Telemetry */}
      <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between text-[10px] font-mono text-slate-400 select-none">
        <div className="flex items-center space-x-2 shrink-0 mb-1 md:mb-0">
          <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-500">Live Secure Handshake Feed:</span>
        </div>
        <div className="flex-1 md:ml-3 truncate font-mono text-slate-300">
          {securityLogs.length > 0 ? (
            <span className="animate-pulse">{securityLogs[0]}</span>
          ) : (
            <span className="text-slate-600">Shield online. No packets intercepted yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
