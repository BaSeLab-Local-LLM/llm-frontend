/** @jsxImportSource @emotion/react */
import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Send, User, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  min-width: 0;
  background: ${props => props.isUser ? '#f0f4f9' : 'transparent'};
  color: #1f1f1f;
  padding: ${props => props.isUser ? '12px 20px' : '0'};
  border-radius: 20px;
  font-size: 16px;
  line-height: 1.6;
  overflow-wrap: break-word;
  word-break: break-word;
  
  /* 마크다운 스타일링 */
  .prose {
    color: inherit;
    font-size: 16px;
    overflow-wrap: break-word;
    word-break: break-word;
    p { margin: 8px 0; }
    
    /* 인라인 코드 */
    code {
      background: #f1f3f4;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Fira Code', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
      color: #d63384;
    }
    
    /* 코드 블록 wrapper */
    pre {
      background: transparent !important;
      padding: 0 !important;
      margin: 12px 0;
      border-radius: 12px;
      overflow: hidden;
      word-break: normal;
    }
    /* 코드 블록 내부의 code는 인라인 코드 스타일 제거 */
    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: inherit;
      color: inherit;
    }
    
    /* 리스트 */
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    
    /* 테이블 */
    table { border-collapse: collapse; margin: 12px 0; width: 100%; }
    th, td { border: 1px solid #dadce0; padding: 8px 12px; text-align: left; }
    th { background: #f8f9fa; font-weight: 600; }
    
    /* 인용문 */
    blockquote {
      border-left: 4px solid #1a73e8;
      margin: 12px 0;
      padding: 8px 16px;
      color: #5f6368;
      background: #f8f9fa;
      border-radius: 0 8px 8px 0;
    }
    
    /* 수평선 */
    hr { border: none; border-top: 1px solid #e8eaed; margin: 16px 0; }
    
    /* 강조 */
    strong { font-weight: 600; }
    em { font-style: italic; }
  }
`;

const UserText = styled.div`
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
`;

const InputArea = styled.div`
  padding: 20px 24px 32px;
  background: linear-gradient(to top, #ffffff 80%, rgba(255,255,255,0));
`;

const InputWrapper = styled.form`
  max-width: 800px;
  margin: 0 auto;
  background: #f0f4f9;
  border-radius: 24px;
  display: flex;
  align-items: flex-end;
  padding: 8px 12px 8px 24px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:focus-within {
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    outline: 1px solid #dde3ea;
  }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 16px;
  color: #1f1f1f;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  &::placeholder { color: #70757a; }

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 2px; }
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

const CodeBlockWrapper = styled.div`
  border-radius: 12px;
  overflow: hidden;
  margin: 12px 0;
  border: 1px solid #2d2d2d;
`;

const CodeBlockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
`;

const CodeLanguage = styled.span`
  font-size: 12px;
  color: #9aa0a6;
  font-family: 'Fira Code', monospace;
  text-transform: lowercase;
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9aa0a6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover { background: rgba(255,255,255,0.1); color: #fff; }
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

// 코드 블록 복사 버튼 컴포넌트
function CopyCodeButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <CopyButton onClick={handleCopy}>
            {copied ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 복사</>}
        </CopyButton>
    );
}

export function ChatInterface({ messages, isLoading, onSendMessage }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // textarea 높이 자동 조절
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
        // 전송 후 높이 초기화
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter만 누르면 전송, Shift+Enter는 줄바꿈
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
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
                            {msg.role === 'user' ? (
                                <UserText>{msg.content}</UserText>
                            ) : (
                                <div className="prose">
                                    <ReactMarkdown
                                        components={{
                                            // 코드 블록: 구문 강조 + 복사 버튼
                                            code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode;[key: string]: any }) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                const codeString = String(children).replace(/\n$/, '');
                                                
                                                // 코드 블록 (```으로 감싼 경우)
                                                if (match) {
                                                    return (
                                                        <CodeBlockWrapper>
                                                            <CodeBlockHeader>
                                                                <CodeLanguage>{match[1]}</CodeLanguage>
                                                                <CopyCodeButton code={codeString} />
                                                            </CodeBlockHeader>
                                                            <SyntaxHighlighter
                                                                style={oneDark}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{
                                                                    margin: 0,
                                                                    borderRadius: 0,
                                                                    padding: '16px',
                                                                    fontSize: '14px',
                                                                    lineHeight: '1.6',
                                                                }}
                                                            >
                                                                {codeString}
                                                            </SyntaxHighlighter>
                                                        </CodeBlockWrapper>
                                                    );
                                                }
                                                
                                                // 언어 지정 없는 코드 블록도 처리
                                                if (codeString.includes('\n')) {
                                                    return (
                                                        <CodeBlockWrapper>
                                                            <CodeBlockHeader>
                                                                <CodeLanguage>code</CodeLanguage>
                                                                <CopyCodeButton code={codeString} />
                                                            </CodeBlockHeader>
                                                            <SyntaxHighlighter
                                                                style={oneDark}
                                                                language="text"
                                                                PreTag="div"
                                                                customStyle={{
                                                                    margin: 0,
                                                                    borderRadius: 0,
                                                                    padding: '16px',
                                                                    fontSize: '14px',
                                                                    lineHeight: '1.6',
                                                                }}
                                                            >
                                                                {codeString}
                                                            </SyntaxHighlighter>
                                                        </CodeBlockWrapper>
                                                    );
                                                }
                                                
                                                // 인라인 코드
                                                return <code className={className} {...props}>{children}</code>;
                                            },
                                            // 링크: javascript: 프로토콜 차단, 외부 링크는 새 탭에서 열기
                                            a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode;[key: string]: any }) => {
                                                const safeHref = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/') || href.startsWith('#'))
                                                    ? href
                                                    : undefined;
                                                if (!safeHref) return <span>{children}</span>;
                                                return <a href={safeHref} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                                            },
                                            // 이미지: 외부 이미지 로드 제한
                                            img: ({ src, alt, ...props }: { src?: string; alt?: string;[key: string]: any }) => {
                                                const safeSrc = src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'))
                                                    ? src
                                                    : undefined;
                                                if (!safeSrc) return <span>[이미지: {alt}]</span>;
                                                return <img src={safeSrc} alt={alt || ''} style={{ maxWidth: '100%' }} {...props} />;
                                            },
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            )}
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
                    <StyledTextarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="여기에 질문을 입력하세요..."
                        disabled={isLoading}
                        rows={1}
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