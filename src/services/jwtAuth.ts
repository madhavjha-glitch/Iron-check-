import { JWTUser, JWTConversation, JWTMessage } from "../types";

const TOKEN_KEY = "gym_jwt_token";
const USER_KEY = "gym_jwt_user";

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setUser(user: JWTUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): JWTUser | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as JWTUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

// 1. Signup Function
export async function signup(
  email: string,
  pass: string,
  name: string
): Promise<{ success: boolean; token?: string; user?: JWTUser; error?: string }> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, error: data.error || "Signup failed" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred during signup." };
  }
}

// 2. Login Function
export async function login(
  email: string,
  pass: string
): Promise<{ success: boolean; token?: string; user?: JWTUser; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      return { success: true, token: data.token, user: data.user };
    }
    return { success: false, error: data.error || "Login failed" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred during login." };
  }
}

// 3. Fetch Conversations Function
export async function getConversations(): Promise<{ success: boolean; conversations?: JWTConversation[]; error?: string }> {
  try {
    const res = await fetch("/api/conversations", {
      method: "GET",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, conversations: data.conversations };
    }
    return { success: false, error: data.error || "Failed to fetch conversations" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred." };
  }
}

// 4. Create Conversation Function
export async function createConversation(title?: string): Promise<{ success: boolean; conversation?: JWTConversation; error?: string }> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, conversation: data.conversation };
    }
    return { success: false, error: data.error || "Failed to create conversation" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred." };
  }
}

// 5. Fetch Messages Function
export async function getMessages(conversationId: string): Promise<{ success: boolean; messages?: JWTMessage[]; error?: string }> {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, messages: data.messages };
    }
    return { success: false, error: data.error || "Failed to fetch messages" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred." };
  }
}

// 6. Send Message Function
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ success: boolean; userMessage?: JWTMessage; assistantMessage?: JWTMessage; error?: string }> {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      return { success: true, userMessage: data.userMessage, assistantMessage: data.assistantMessage };
    }
    return { success: false, error: data.error || "Failed to send message" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error occurred." };
  }
}
