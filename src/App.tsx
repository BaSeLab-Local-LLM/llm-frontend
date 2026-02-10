/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import styled from '@emotion/styled';
import { Plus, Sparkles, LogOut } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { LoginModal } from './components/LoginModal';
import { streamChat, type Message } from './lib/api';

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

const LogoutBtn = styled.button`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: #444746;
  font-size: 14px;
  &:hover { background-color: #e9eef6; }
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
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('llm_username') || '');

  // 모델 고정
  const model = 'local-llm';

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      setIsLoginOpen(true);
      return;
    }

    const newMessage: Message = { role: 'user', content };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    let assistantMessage = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
      () => setIsLoading(false),
      (error) => {
        console.error(error);
        setIsLoading(false);
        // 인증 오류 시 로그아웃 처리
        if (error.message.includes('401') || error.message.includes('403')) {
          handleLogout();
          setIsLoginOpen(true);
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
    setIsLoginOpen(false);
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      setApiKey('');
      setUsername('');
      localStorage.removeItem('llm_api_key');
      localStorage.removeItem('llm_username');
      setMessages([]);
      setIsLoginOpen(true);
    }
  };

  const handleClearChat = () => {
    if (confirm('대화 기록을 삭제할까요?')) {
      setMessages([]);
    }
  };

  return (
    <Layout>
      {/* Gemini Style Sidebar */}
      <Sidebar>
        <LogoSection>
          <Sparkles size={24} fill="#1a73e8" />
          <span>BaSE Lab</span>
        </LogoSection>

        <NewChatBtn onClick={handleClearChat}>
          <Plus size={20} />
          New chat
        </NewChatBtn>

        <div style={{ flex: 1 }}>
          {/* 채팅 히스토리 */}
        </div>

        {apiKey ? (
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={20} />
            {username || '로그아웃'}
          </LogoutBtn>
        ) : (
          <LogoutBtn onClick={() => setIsLoginOpen(true)}>
            <LogOut size={20} />
            로그인 필요
          </LogoutBtn>
        )}
      </Sidebar>

      <MainContent>
        <Header>
          <div style={{ fontWeight: 600, color: '#444746' }}>{model}</div>
          <div className="md:hidden">
            <button onClick={() => setIsLoginOpen(true)} style={{ background: 'none', border: 'none' }}>
              <LogOut size={20} color="#444746" />
            </button>
          </div>
        </Header>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </main>
      </MainContent>

      <LoginModal
        isOpen={isLoginOpen || !apiKey}
        onLogin={handleLogin}
      />
    </Layout>
  );
}

export default App;