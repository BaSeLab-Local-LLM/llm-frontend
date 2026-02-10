/** @jsxImportSource @emotion/react */
import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Plus, Sparkles, LogOut, MessageSquare, Trash2, Settings } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { streamChat, listConversations, createConversation, getMessages, saveMessage, deleteConversation, type Conversation, type Message } from './lib/api';

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

  .delete-btn {
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  &:hover .delete-btn {
    opacity: 1;
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: #666;
  padding: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background-color: #fce4e4;
    color: #d93025;
  }
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

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('llm_username') || '');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      listConversations(apiKey).then(setConversations).catch(console.error);
    }
  }, [apiKey]);

  // 모델 고정
  const model = 'Local LLM';

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      return;
    }

    const newMessage: Message = { role: 'user', content };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    let assistantMessage = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let convId = currentConvId;
    if (!convId) {
      try {
        const title = content.length > 20 ? content.slice(0, 20) + '...' : content;
        const newConv = await createConversation(apiKey, title, model);
        setConversations(prev => [newConv, ...prev]);
        setCurrentConvId(newConv.id);
        convId = newConv.id;
      } catch (e) {
        console.error('Failed to create conversation', e);
        return;
      }
    }

    // Save User Message
    saveMessage(apiKey, convId, 'user', content).catch(console.error);

    await streamChat(
      updatedMessages,
      model,
      apiKey,
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
          saveMessage(apiKey, convId, 'assistant', assistantMessage).catch(console.error);
        }
      },
      (error) => {
        console.error(error);
        setIsLoading(false);
        // 인증 오류 시 로그아웃 처리
        if (error.message.includes('401') || error.message.includes('403')) {
          performLogout();
        }
        setMessages(prev => [
          ...prev,
          { role: 'system', content: `Error: ${error.message}` }
        ]);
      }
    );
  };

  const handleLogin = (newKey: string, newUsername: string) => {
    setApiKey(newKey);
    setUsername(newUsername);
    localStorage.setItem('llm_api_key', newKey);
    localStorage.setItem('llm_username', newUsername);
  };

  const performLogout = () => {
    setApiKey('');
    setUsername('');
    localStorage.removeItem('llm_api_key');
    localStorage.removeItem('llm_username');
    setMessages([]);
    setConversations([]);
    setCurrentConvId(null);
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      performLogout();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConvId(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 대화 선택 방지
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;
    try {
      await deleteConversation(apiKey, id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSelectConversation = async (id: string) => {
    setCurrentConvId(id);
    try {
      const msgs = await getMessages(apiKey, id);
      // Transform MessageData to Message
      const formatted: Message[] = msgs.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));
      setMessages(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  // 로그인하지 않은 상태면 로그인 모달만 표시
  if (!apiKey) {
    return (
      <LoginModal
        isOpen={true}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <Layout>
      {/* Gemini Style Sidebar */}
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
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {conv.title || '새 대화'}
              </span>
              <DeleteButton
                className="delete-btn"
                onClick={(e) => handleDeleteConversation(e, conv.id)}
                title="대화 삭제"
              >
                <Trash2 size={14} />
              </DeleteButton>
            </ConversationItem>
          ))}
        </div>

        <SidebarFooter>
          <UserRow>
            <UserName>{username || '사용자'}</UserName>
            <FooterIconBtn onClick={() => setIsSettingsOpen(true)} title="설정">
              <Settings size={18} />
            </FooterIconBtn>
            <FooterIconBtn onClick={handleLogout} title="로그아웃">
              <LogOut size={18} />
            </FooterIconBtn>
          </UserRow>
        </SidebarFooter>
      </Sidebar>

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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        username={username}
      />
    </Layout>
  );
}

export default App;