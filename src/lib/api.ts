export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// ─── Auth Error ──────────────────────────────────────────────────────────────

/**
 * 인증/권한 오류 전용 Error 클래스
 * 백엔드의 HTTP 상태 코드와 detail 메시지를 함께 전달합니다.
 */
export class AuthError extends Error {
    status: number;
    detail: string;

    constructor(status: number, detail: string) {
        super(detail);
        this.name = 'AuthError';
        this.status = status;
        this.detail = detail;
    }
}

/** 응답에서 detail 메시지를 추출하고 401/403이면 AuthError를 throw */
async function throwIfAuthError(response: Response): Promise<void> {
    if (response.status === 401 || response.status === 403) {
        let detail = '인증에 실패했습니다.';
        try {
            const body = await response.json();
            if (body.detail) detail = body.detail;
        } catch {
            // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new AuthError(response.status, detail);
    }
}

// ─── Auth Token helpers ──────────────────────────────────────────────────────

/**
 * localStorage에는 JWT 토큰만 저장합니다.
 * role, username 등 민감한 값은 저장하지 않고 항상 서버에서 가져옵니다.
 * → 공격 표면 최소화: 변조 가능한 값이 JWT 1개뿐
 */
const STORAGE_KEY_JWT = 'llm_jwt_token';

export function getStoredJwt(): string {
    return localStorage.getItem(STORAGE_KEY_JWT) || '';
}

export function setStoredJwt(jwt: string): void {
    localStorage.setItem(STORAGE_KEY_JWT, jwt);
}

export function clearStoredAuth(): void {
    localStorage.removeItem(STORAGE_KEY_JWT);
    // 이전 버전 호환: 더 이상 사용하지 않는 키도 정리
    localStorage.removeItem('llm_api_key');
    localStorage.removeItem('llm_role');
    localStorage.removeItem('llm_username');
    localStorage.removeItem('llm_model');
}

// ─── JWT Pre-flight 검증 ─────────────────────────────────────────────────────

/**
 * LLM 프롬프트 전송 전 JWT 토큰 사전 검증.
 * 변조/만료된 토큰이면 AuthError를 throw합니다.
 */
export const verifyToken = async (jwt: string): Promise<void> => {
    const response = await fetch('/api/v1/auth/verify', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${jwt}`,
        },
        credentials: 'same-origin',  // fingerprint 쿠키 자동 전송
    });
    await throwIfAuthError(response);
    if (!response.ok) {
        throw new Error(`Token verification failed: ${response.status}`);
    }
};

// ─── API Fetch Helper ────────────────────────────────────────────────────────

/** JWT 인증이 포함된 fetch wrapper (fingerprint 쿠키 자동 전송) */
async function apiFetch(url: string, jwt: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'same-origin',  // fingerprint 쿠키 자동 전송
    });
    await throwIfAuthError(response);
    return response;
}

// ─── User Info ───────────────────────────────────────────────────────────────

export interface UserInfo {
    username: string;
    role: string;
    is_active: boolean;
}

export const getUserInfo = async (jwt: string): Promise<UserInfo> => {
    const res = await apiFetch('/api/v1/auth/me', jwt);
    if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
    return res.json();
};

// ─── Stream Chat (Backend Proxy) ─────────────────────────────────────────────

export const streamChat = async (
    messages: Message[],
    model: string,
    jwt: string,
    onChunk: (chunk: string) => void,
    onFinish: () => void,
    onError: (error: Error) => void
) => {
    try {
        const response = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            },
            credentials: 'same-origin',  // fingerprint 쿠키 자동 전송
            body: JSON.stringify({
                model,
                messages,
                stream: true
            })
        });

        if (response.status === 401 || response.status === 403) {
            let detail = '인증에 실패했습니다.';
            try {
                const body = await response.json();
                if (body.detail) detail = body.detail;
            } catch { /* ignore */ }
            throw new AuthError(response.status, detail);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        if (!response.body) throw new Error('ReadableStream not supported');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) onChunk(content);
                } catch (e) {
                    console.error('Error parsing JSON chunk', e);
                }
            }
        }

        onFinish();
    } catch (err) {
        onError(err instanceof Error ? err : new Error('Unknown error'));
    }
};

// ─── Conversations ───────────────────────────────────────────────────────────

const API_BASE = '/api/v1/chat';

export interface Conversation {
    id: string;
    title: string;
    model_name: string;
    created_at: string;
    updated_at: string;
}

export interface MessageData {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    created_at: string;
}

export const listConversations = async (jwt: string): Promise<Conversation[]> => {
    const res = await apiFetch(`${API_BASE}/conversations`, jwt);
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
    return res.json();
};

export const createConversation = async (jwt: string, title: string, model: string): Promise<Conversation> => {
    const res = await apiFetch(`${API_BASE}/conversations`, jwt, {
        method: 'POST',
        body: JSON.stringify({ title, model }),
    });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
    return res.json();
};

export const renameConversation = async (jwt: string, conversationId: string, title: string): Promise<Conversation> => {
    const res = await apiFetch(`${API_BASE}/conversations/${conversationId}`, jwt, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`Failed to rename conversation: ${res.status}`);
    return res.json();
};

export const deleteConversation = async (jwt: string, conversationId: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/conversations/${conversationId}`, jwt, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
};

export const getMessages = async (jwt: string, conversationId: string): Promise<MessageData[]> => {
    const res = await apiFetch(`${API_BASE}/conversations/${conversationId}/messages`, jwt);
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
    return res.json();
};

export const saveMessage = async (jwt: string, conversationId: string, role: string, content: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/messages`, jwt, {
        method: 'POST',
        body: JSON.stringify({
            conv_id: conversationId,
            role,
            content,
        }),
    });
    if (!res.ok) throw new Error(`Failed to save message: ${res.status}`);
};

// ─── Password Change ─────────────────────────────────────────────────────────

export const changePassword = async (
    jwt: string,
    currentPassword: string,
    newPassword: string
): Promise<{ message: string; access_token?: string }> => {
    const res = await apiFetch('/api/v1/users/me/change-password', jwt, {
        method: 'POST',
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
        }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || '비밀번호 변경에 실패했습니다.');
    }
    return res.json();
};

// ─── Admin API ───────────────────────────────────────────────────────────────

export interface AdminUser {
    id: string;
    username: string;
    role: string;
    is_active: boolean;
    daily_token_limit: number | null;
    token_version: number;
    created_at: string;
}

export const adminListUsers = async (jwt: string): Promise<AdminUser[]> => {
    const res = await apiFetch('/api/v1/users/admin/list', jwt);
    if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
    return res.json();
};

export const adminForceLogout = async (jwt: string, userId: string): Promise<{ message: string }> => {
    const res = await apiFetch(`/api/v1/users/admin/${userId}/force-logout`, jwt, {
        method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to force logout: ${res.status}`);
    return res.json();
};

export const adminToggleActive = async (jwt: string, userId: string): Promise<{ message: string; is_active: boolean }> => {
    const res = await apiFetch(`/api/v1/users/admin/${userId}/toggle-active`, jwt, {
        method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to toggle user: ${res.status}`);
    return res.json();
};
