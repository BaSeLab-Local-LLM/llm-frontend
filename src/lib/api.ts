export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface User {
    username: string;
    apiKey: string;
}

export const streamChat = async (
    messages: Message[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string) => void,
    onFinish: () => void,
    onError: (error: Error) => void
) => {
    try {
        const response = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true
            })
        });

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
// ... existing code ...

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

export const listConversations = async (apiKey: string): Promise<Conversation[]> => {
    const res = await fetch(`${API_BASE}/conversations`, {
        headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
    return res.json();
};

export const createConversation = async (apiKey: string, title: string, model: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, model })
    });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
    return res.json();
};

export const deleteConversation = async (apiKey: string, conversationId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
};

export const getMessages = async (apiKey: string, conversationId: string): Promise<MessageData[]> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
    return res.json();
}

export const saveMessage = async (apiKey: string, conversationId: string, role: string, content: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            conv_id: conversationId,
            role,
            content
        })
    });
    if (!res.ok) throw new Error(`Failed to save message: ${res.status}`);
};

// ─── User API ─────────────────────────────────────────────────────────────────

const USER_API_BASE = '/api/v1/users';

export interface UserInfo {
    id: string;
    username: string;
    role: string;
    is_active: boolean;
    daily_token_limit: number | null;
    created_at: string;
}

export const getUserInfo = async (apiKey: string): Promise<UserInfo> => {
    const res = await fetch(`${USER_API_BASE}/me`, {
        headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
    return res.json();
};

export const changePassword = async (
    apiKey: string,
    currentPassword: string,
    newPassword: string
): Promise<{ message: string }> => {
    const res = await fetch(`${USER_API_BASE}/me/change-password`, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `비밀번호 변경에 실패했습니다.`);
    }
    return res.json();
};
