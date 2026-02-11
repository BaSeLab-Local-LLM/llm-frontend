/** @jsxImportSource @emotion/react */
import React, { useState, useEffect, useCallback, useRef, Component, type ErrorInfo, type ReactNode } from 'react';
import styled from '@emotion/styled';
import { Plus, Sparkles, LogOut, MessageSquare, Trash2, Settings, ShieldAlert, Shield, Lock, Pencil, Check, X } from 'lucide-react';

// ─── Error Boundary (렌더링 크래시 진단용) ────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallbackLabel?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.fallbackLabel}]`, error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#dc2626', background: '#fef2f2', borderRadius: 12, margin: 20, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px' }}>렌더링 오류 ({this.props.fallbackLabel})</h3>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ChatInterface } from './components/ChatInterface';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ConfirmModal } from './components/ConfirmModal';
import {
  streamChat, listConversations, createConversation, getMessages, saveMessage, deleteConversation, renameConversation,
  verifyToken, getUserInfo, AuthError, uploadFile, extractTextContent,
  getStoredJwt, setStoredJwt, clearStoredAuth,
  type Conversation, type Message, type AttachedFile, type ContentPart
} from './lib/api';

// ─── Styled Components ───────────────────────────────────────────────────────

const Layout = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f0f4f9; 
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  color: #1f1f1f;
`;

const Sidebar = styled.nav`
  width: 280px;
  background-color: #f0f4f9;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
  @media (max-width: 768px) { display: none; }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 24px 0 0 0; 
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
  @media (max-width: 768px) { border-radius: 0; }
`;

const NewChatBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-color: #dde3ea;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 20px;
  &:hover { background-color: #d3d9e0; }
`;

const LogoSection = styled.div`
  padding: 16px 12px;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1a73e8;
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #dde3ea;
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
`;

const UserName = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1a73e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FooterIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: #5f6368;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: #e9eef6;
    color: #1f1f1f;
  }
`;

const ConversationItem = styled.div<{ isActive: boolean }>`
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f1f;
  cursor: pointer;
  background-color: ${props => props.isActive ? '#dde3ea' : 'transparent'};
  &:hover { background-color: ${props => props.isActive ? '#dde3ea' : '#e9eef6'}; }
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  .action-btns { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; display: flex; gap: 2px; }
  &:hover .action-btns { opacity: 1; }
`;

const ConvActionBtn = styled.button<{ variant?: 'danger' | 'confirm' | 'cancel' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  border: none; border-radius: 6px;
  background: transparent; cursor: pointer; padding: 0;
  transition: background 0.15s, color 0.15s;
  color: ${p => p.variant === 'danger' ? '#666' : p.variant === 'confirm' ? '#16a34a' : p.variant === 'cancel' ? '#666' : '#666'};
  &:hover {
    background-color: ${p => p.variant === 'danger' ? '#fce4e4' : p.variant === 'confirm' ? '#dcfce7' : '#f1f3f4'};
    color: ${p => p.variant === 'danger' ? '#d93025' : p.variant === 'confirm' ? '#16a34a' : '#1f1f1f'};
  }
`;

const RenameInput = styled.input`
  flex: 1;
  border: 1px solid #1a73e8;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: #1f1f1f;
  min-width: 0;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  z-index: 10;
`;

// ─── Security Warning Modal ──────────────────────────────────────────────────

const WarningOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 15, 20, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
  animation: warnFadeIn 0.2s ease-out;

  @keyframes warnFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const WarningCard = styled.div`
  width: 440px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.1);
  animation: warnScaleIn 0.3s ease-out;

  @keyframes warnScaleIn {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const WarningBanner = styled.div`
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const WarningIconCircle = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  backdrop-filter: blur(4px);
`;

const WarningTitle = styled.h2`
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
`;

const WarningBody = styled.div`
  padding: 24px 28px 28px;
  text-align: center;
`;

const WarningText = styled.p`
  color: #374151;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 8px;
`;

const WarningHint = styled.p`
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.5;
  margin: 0 0 24px;
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 12px;
`;

const WarningBtn = styled.button`
  width: 100%;
  padding: 14px 28px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
  }
  &:active { transform: scale(0.98); }
`;

// ─── App Component ───────────────────────────────────────────────────────────

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // JWT 토큰 (localStorage에는 이것만 저장)
  // 초기화 시 JWT 형식이 아닌 값(이전 API Key 등)은 즉시 제거
  const [jwt, setJwt] = useState(() => {
    const stored = getStoredJwt();
    // JWT는 반드시 3개의 dot-separated 파트로 구성 (header.payload.signature)
    if (stored && stored.split('.').length !== 3) {
      clearStoredAuth();
      return '';
    }
    return stored;
  });
  // 서버에서 검증한 역할과 사용자명 (localStorage에 저장하지 않음)
  const [verifiedRole, setVerifiedRole] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [className, setClassName] = useState<string>('');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  // 대화방 이름 변경 상태
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // 보안 경고 메시지
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Confirm 모달 상태
  type ConfirmState =
    | { type: 'logout' }
    | { type: 'deleteConversation'; id: string }
    | null;
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // ── 이전 버전 잔여 localStorage 키 정리 ──
  useEffect(() => {
    localStorage.removeItem('llm_model');
    localStorage.removeItem('llm_api_key');
    localStorage.removeItem('llm_username');
    localStorage.removeItem('llm_role');
  }, []);

  // ── JWT 유효성 검증 및 사용자 정보 로드 ──
  useEffect(() => {
    if (!jwt) return;

    getUserInfo(jwt)
      .then(info => {
        setVerifiedRole(info.role);
        setUsername(info.username);
        setDisplayName(info.display_name || '');
        setClassName(info.class_name || '');
      })
      .catch(err => {
        // 인증 실패 시 경고 없이 조용히 로그아웃 (페이지 로드 시)
        // → 로그인 화면으로 전환
        console.error('Failed to verify JWT:', err);
        performLogout();
      });
  }, [jwt]);

  // ── 대화 목록 로드 ──
  useEffect(() => {
    if (jwt && username) {
      listConversations(jwt)
        .then(setConversations)
        .catch(err => {
          if (handleAuthError(err)) return;
          console.error(err);
        });
    }
  }, [jwt, username]);

  const model = 'Local LLM';

  // ── 인증 에러 핸들러 ──
  const handleAuthError = (err: unknown): boolean => {
    if (err instanceof AuthError) {
      setAuthWarning(err.detail);
      return true;
    }
    return false;
  };

  const handleWarningDismiss = () => {
    setAuthWarning(null);
    performLogout();
  };

  // ────────────────────────────────────────────────────────────────────────────
  // JWT 변조 감지 (모든 사용자 액션에서 호출)
  //   React 상태의 JWT와 localStorage의 JWT를 비교합니다.
  //   DevTools 등으로 localStorage를 직접 변조한 경우를 즉시 감지합니다.
  //   변조 감지 시 경고 모달을 표시하고 false를 반환합니다.
  // ────────────────────────────────────────────────────────────────────────────
  const checkJwtIntegrity = useCallback((): boolean => {
    const storedJwt = getStoredJwt();
    if (!storedJwt || storedJwt !== jwt) {
      setAuthWarning('인증 토큰이 변조되었습니다. 보안을 위해 다시 로그인해주세요.');
      return false;
    }
    return true;
  }, [jwt]);

  // ── 메시지 전송 (2단계 검증 + 멀티모달 지원) ──
  const handleSendMessage = async (content: string, attachments?: AttachedFile[]) => {
    if (!jwt) return;

    // 1단계: localStorage 변조 감지
    if (!checkJwtIntegrity()) return;

    // 2단계: 서버 사전 검증 (Pre-flight)
    //   토큰 서명, token_version(강제 로그아웃), 계정 상태를 서버에서 검증합니다.
    //   유효하지 않으면 LLM에 프롬프트가 전달되지 않습니다.
    try {
      await verifyToken(jwt);
    } catch (err) {
      if (handleAuthError(err)) {
        return;
      }
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'system', content: '서버와 통신할 수 없습니다. 네트워크를 확인해주세요.' }
      ]);
      return;
    }

    // ────────────────────────────────────────────────────────
    // JWT 검증 통과 → 파일 업로드 + 메시지 구성
    // ────────────────────────────────────────────────────────
    setIsLoading(true);

    // 첨부파일이 있으면 서버에 업로드하고 멀티모달 content 구성
    let messageContent: string | ContentPart[] = content;
    if (attachments && attachments.length > 0) {
      try {
        const contentParts: ContentPart[] = [];

        // 파일 업로드 (병렬)
        const uploadResults = await Promise.all(
          attachments.map(att => uploadFile(att.file, jwt))
        );

        // 이미지 → image_url content part
        // 문서 → text content part (파일명 포함)
        for (const result of uploadResults) {
          if (result.type === 'image') {
            contentParts.push({
              type: 'image_url',
              image_url: { url: result.content },
            });
          } else {
            contentParts.push({
              type: 'text',
              text: `[문서: ${result.filename}]\n${result.content}`,
            });
          }
        }

        // 사용자 텍스트를 맨 앞에 추가
        if (content.trim()) {
          contentParts.unshift({ type: 'text', text: content });
        }

        messageContent = contentParts;
      } catch (err) {
        console.error('File upload failed:', err);
        setIsLoading(false);
        if (handleAuthError(err)) return;
        setMessages(prev => [
          ...prev,
          { role: 'system', content: `파일 업로드 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}` }
        ]);
        return;
      }
    }

    const newMessage: Message = { role: 'user', content: messageContent };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    let assistantMessage = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let convId = currentConvId;
    if (!convId) {
      try {
        const titleSource = typeof messageContent === 'string' ? messageContent : content || '파일 첨부 대화';
        const title = titleSource.length > 20 ? titleSource.slice(0, 20) + '...' : titleSource;
        const newConv = await createConversation(jwt, title, model);
        setConversations(prev => [newConv, ...prev]);
        setCurrentConvId(newConv.id);
        convId = newConv.id;
      } catch (e) {
        console.error('Failed to create conversation', e);
        if (handleAuthError(e)) return;
        setIsLoading(false);
        return;
      }
    }

    // DB에는 텍스트만 저장 (이미지 base64 제외)
    const textForDb = extractTextContent(messageContent);
    saveMessage(jwt, convId, 'user', textForDb).catch(console.error);

    await streamChat(
      updatedMessages,
      model,
      jwt,
      (chunk) => {
        assistantMessage += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantMessage
          };
          return newMessages;
        });
      },
      () => {
        setIsLoading(false);
        if (convId) {
          saveMessage(jwt, convId, 'assistant', assistantMessage).catch(console.error);
        }
      },
      (error) => {
        console.error(error);
        setIsLoading(false);
        if (handleAuthError(error)) {
          setMessages(prev => prev.filter(m => m.content !== ''));
          return;
        }
        setMessages(prev => [
          ...prev,
          { role: 'system', content: '응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
        ]);
      }
    );
  };

  // ── 로그인 ──
  const handleLogin = (newJwt: string, newUsername: string, newRole: string) => {
    setJwt(newJwt);
    setStoredJwt(newJwt);
    setUsername(newUsername);
    setVerifiedRole(newRole);
  };

  // ── 로그아웃 ──
  const performLogout = () => {
    setJwt('');
    setUsername('');
    setDisplayName('');
    setClassName('');
    setVerifiedRole('');
    clearStoredAuth();
    setMessages([]);
    setConversations([]);
    setCurrentConvId(null);
  };

  const handleLogout = () => {
    if (!checkJwtIntegrity()) return;
    setConfirmState({ type: 'logout' });
  };

  const handleNewChat = () => {
    if (!checkJwtIntegrity()) return;
    setMessages([]);
    setCurrentConvId(null);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!checkJwtIntegrity()) return;
    setConfirmState({ type: 'deleteConversation', id });
  };

  const executeConfirmAction = useCallback(async () => {
    if (!confirmState) return;
    const action = confirmState;
    setConfirmState(null);

    if (action.type === 'logout') {
      performLogout();
    } else if (action.type === 'deleteConversation') {
      try {
        await deleteConversation(jwt, action.id);
        setConversations(prev => prev.filter(c => c.id !== action.id));
        if (currentConvId === action.id) {
          setCurrentConvId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to delete conversation', err);
      }
    }
  }, [confirmState, jwt, currentConvId]);

  // ── 대화방 이름 변경 ──
  const startRename = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    if (!checkJwtIntegrity()) return;
    setRenamingId(conv.id);
    setRenameValue(conv.title || '');
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await renameConversation(jwt, renamingId, renameValue.trim());
      setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, title: updated.title } : c));
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const handleSelectConversation = async (id: string) => {
    if (renamingId) return; // 이름 변경 중에는 선택 방지
    if (!checkJwtIntegrity()) return;
    setCurrentConvId(id);
    try {
      const msgs = await getMessages(jwt, id);
      const formatted: Message[] = msgs.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));
      setMessages(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  // ── 로그인하지 않은 상태 ──
  if (!jwt) {
    return (
      <LoginModal
        isOpen={true}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <Layout>
      {/* ── Security Warning Modal ── */}
      {authWarning && (
        <WarningOverlay>
          <WarningCard>
            <WarningBanner>
              <WarningIconCircle>
                <ShieldAlert size={32} color="#ffffff" />
              </WarningIconCircle>
              <WarningTitle>보안 경고</WarningTitle>
            </WarningBanner>
            <WarningBody>
              <WarningText>{authWarning}</WarningText>
              <WarningHint>보안을 위해 현재 세션이 무효화되었습니다. 다시 로그인하여 정상적으로 이용해주세요.</WarningHint>
              <WarningBtn onClick={handleWarningDismiss}>
                <Lock size={16} />
                확인 후 다시 로그인
              </WarningBtn>
            </WarningBody>
          </WarningCard>
        </WarningOverlay>
      )}

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        isOpen={confirmState !== null}
        variant={confirmState?.type === 'logout' ? 'logout' : 'danger'}
        icon={confirmState?.type === 'logout' ? LogOut : Trash2}
        title={confirmState?.type === 'logout' ? '로그아웃' : '대화 삭제'}
        message={
          confirmState?.type === 'logout'
            ? '로그아웃 하시겠습니까?'
            : '이 대화를 삭제하시겠습니까?'
        }
        subMessage={
          confirmState?.type === 'logout'
            ? '로그아웃 시 현재 세션이 종료됩니다.'
            : '삭제된 대화는 복구할 수 없습니다.'
        }
        confirmText={confirmState?.type === 'logout' ? '로그아웃' : '삭제'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmState(null)}
      />

      {/* ── Sidebar ── */}
      <Sidebar>
        <LogoSection>
          <Sparkles size={24} fill="#1a73e8" />
          <span>BaSE Lab</span>
        </LogoSection>

        <NewChatBtn onClick={handleNewChat}>
          <Plus size={20} />
          New chat
        </NewChatBtn>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(conv => (
            <ConversationItem
              key={conv.id}
              isActive={currentConvId === conv.id}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <MessageSquare size={16} color="#666" style={{ flexShrink: 0 }} />
              {renamingId === conv.id ? (
                <>
                  <RenameInput
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={submitRename}
                    onClick={e => e.stopPropagation()}
                    maxLength={100}
                  />
                  <ConvActionBtn variant="confirm" onClick={e => { e.stopPropagation(); submitRename(); }} title="확인">
                    <Check size={14} />
                  </ConvActionBtn>
                  <ConvActionBtn variant="cancel" onClick={e => { e.stopPropagation(); cancelRename(); }} title="취소">
                    <X size={14} />
                  </ConvActionBtn>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.title || '새 대화'}
                  </span>
                  <div className="action-btns">
                    <ConvActionBtn onClick={e => startRename(e, conv)} title="이름 변경">
                      <Pencil size={13} />
                    </ConvActionBtn>
                    <ConvActionBtn variant="danger" onClick={e => handleDeleteConversation(e, conv.id)} title="대화 삭제">
                      <Trash2 size={13} />
                    </ConvActionBtn>
                  </div>
                </>
              )}
            </ConversationItem>
          ))}
        </div>

        <SidebarFooter>
          <UserRow>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <UserName>
                {username || '사용자'}
                {displayName ? ` (${displayName})` : ''}
              </UserName>
              {className && (
                <span style={{ fontSize: 11, color: '#9aa0a6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {className}
                </span>
              )}
            </div>
            {verifiedRole === 'admin' && (
              <FooterIconBtn onClick={() => { if (checkJwtIntegrity()) setIsAdminOpen(true); }} title="관리자 대시보드">
                <Shield size={18} />
              </FooterIconBtn>
            )}
            <FooterIconBtn onClick={() => { if (checkJwtIntegrity()) setIsSettingsOpen(true); }} title="설정">
              <Settings size={18} />
            </FooterIconBtn>
            <FooterIconBtn onClick={handleLogout} title="로그아웃">
              <LogOut size={18} />
            </FooterIconBtn>
          </UserRow>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main Content ── */}
      <MainContent>
        <Header>
          <div style={{ fontWeight: 600, color: '#444746' }}>{model}</div>
        </Header>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </main>
      </MainContent>

      {/* ── Modals ── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        jwt={jwt}
        username={username}
        onLogout={performLogout}
      />

      <ErrorBoundary fallbackLabel="AdminDashboard">
        <AdminDashboard
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          jwt={jwt}
        />
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
