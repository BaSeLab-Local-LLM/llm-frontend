/** @jsxImportSource @emotion/react */
import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Send, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../lib/api';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (content: string) => void;
}


const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const MessageRow = styled.div<{ isUser: boolean }>`
  display: flex;
  flex-direction: ${props => props.isUser ? 'row-reverse' : 'row'};
  gap: 16px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto; 
  padding: 0 20px;
`;

const Avatar = styled.div<{ isUser: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.isUser ? '#1a73e8' : '#f0f4f9'};
  color: ${props => props.isUser ? 'white' : '#1a73e8'};
  flex-shrink: 0;
  box-shadow: ${props => props.isUser ? '0 2px 4px rgba(26,115,232,0.3)' : 'none'};
`;

const ContentBox = styled.div<{ isUser: boolean }>`
  max-width: 85%;
  background: ${props => props.isUser ? '#f0f4f9' : 'transparent'};
  color: #1f1f1f;
  padding: ${props => props.isUser ? '12px 20px' : '0'};
  border-radius: 20px;
  font-size: 16px;
  line-height: 1.6;
  
  /* 마크다운 스타일링 */
  .prose {
    color: inherit;
    font-size: 16px;
    p { margin: 8px 0; }
    code { background: #f1f3f4; padding: 2px 4px; border-radius: 4px; }
    pre { background: #1e1f20; color: #fff; padding: 16px; border-radius: 12px; overflow-x: auto; }
  }
`;

const InputArea = styled.div`
  padding: 20px 24px 32px;
  background: linear-gradient(to top, #ffffff 80%, rgba(255,255,255,0));
`;

const InputWrapper = styled.form`
  max-width: 800px;
  margin: 0 auto;
  background: #f0f4f9;
  border-radius: 32px;
  display: flex;
  align-items: center;
  padding: 8px 12px 8px 24px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:focus-within {
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    outline: 1px solid #dde3ea;
  }
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 16px;
  color: #1f1f1f;
  outline: none;
  &::placeholder { color: #70757a; }
`;

const SendButton = styled.button`
  background: #1a73e8;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  &:disabled { background: #e9eef6; color: #8e918f; cursor: not-allowed; }
  &:hover:not(:disabled) { transform: scale(1.05); background: #1557b0; }
`;

const WelcomeScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #1f1f1f;
  text-align: center;
  
  h2 { font-size: 32px; font-weight: 500; margin-bottom: 12px; }
  p { color: #70757a; font-size: 16px; }
`;

export function ChatInterface({ messages, isLoading, onSendMessage }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <Container>
            <MessageList>
                {messages.length === 0 && (
                    <WelcomeScreen>
                        <Sparkles size={48} color="#1a73e8" style={{ marginBottom: '24px' }} />
                        <h2>BaSE Lab LLM에 무엇이든 물어보세요</h2>
                        <p>코딩, 연구, 데이터 분석까지 연구실 전용 AI가 도와드립니다.</p>
                    </WelcomeScreen>
                )}

                {messages.map((msg, index) => (
                    <MessageRow key={index} isUser={msg.role === 'user'}>
                        <Avatar isUser={msg.role === 'user'}>
                            {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                        </Avatar>
                        <ContentBox isUser={msg.role === 'user'}>
                            <div className="prose">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </ContentBox>
                    </MessageRow>
                ))}

                {isLoading && (
                    <MessageRow isUser={false}>
                        <Avatar isUser={false}><Loader2 className="animate-spin" size={20} /></Avatar>
                        <div style={{ color: '#8e918f', fontSize: '14px', alignSelf: 'center' }}>답변을 생성하는 중...</div>
                    </MessageRow>
                )}
                <div ref={messagesEndRef} />
            </MessageList>

            <InputArea>
                <InputWrapper onSubmit={handleSubmit}>
                    <StyledInput
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="여기에 질문을 입력하세요..."
                        disabled={isLoading}
                    />
                    <SendButton type="submit" disabled={!input.trim() || isLoading}>
                        <Send size={20} />
                    </SendButton>
                </InputWrapper>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#70757a', marginTop: '12px' }}>
                    BaSE Lab AI는 실수할 수 있습니다. 중요한 정보는 항상 확인하세요.
                </p>
            </InputArea>
        </Container>
    );
}