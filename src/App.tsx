/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import styled from '@emotion/styled';
import { Settings, Plus, Sparkles } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
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

const SettingsBtn = styled.button`
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('llm_model') || 'local-llm');

  const handleSendMessage = async (content: string) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
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
        setMessages(prev => [
          ...prev,
          { role: 'system', content: `Error: ${error.message}` }
        ]);
      }
    );
  };

  const handleSaveSettings = (newKey: string, newModel: string) => {
    setApiKey(newKey);
    setModel(newModel);
    localStorage.setItem('llm_api_key', newKey);
    localStorage.setItem('llm_model', newModel);
  };

  const handleClearChat = () => {
    if (confirm('대화 기록을 삭제할까요?')) {
      setMessages([]);
    }
  };

  return (
    <Layout>
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

        <SettingsBtn onClick={() => setIsSettingsOpen(true)}>
          <Settings size={20} />
          Settings
        </SettingsBtn>
      </Sidebar>

      <MainContent>
        <Header>
          <div style={{ fontWeight: 600, color: '#444746' }}>{model}</div>
          <div className="md:hidden">
             <button onClick={() => setIsSettingsOpen(true)} style={{background: 'none', border: 'none'}}>
               <Settings size={20} color="#444746" />
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialApiKey={apiKey}
        initialModel={model}
      />
    </Layout>
  );
}

export default App;