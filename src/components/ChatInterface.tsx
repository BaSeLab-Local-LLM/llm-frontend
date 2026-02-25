/** @jsxImportSource @emotion/react */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Send, Square, User, Loader2, Sparkles, Copy, Check, Paperclip, X, FileText, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, AttachedFile, ContentPart } from '../lib/api';
import { uploadFile } from '../lib/api';
import {
    estimateTokens,
    estimateMessagesTokens,
    getMaxInputTokens,
    getTokenStatus,
    getTokenPercent,
    type TokenStatus,
} from '../lib/tokenEstimator';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    jwt: string | null;
    onSendMessage: (content: string, attachments?: AttachedFile[]) => void;
    onStopGeneration: () => void;
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
  display: flex;
  align-items: center;
  cursor: pointer;

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
  margin-left: 8px;
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

const StopButton = styled.button`
  background: #dc2626;
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
  &:hover { transform: scale(1.05); background: #b91c1c; }
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

const AttachButton = styled.button`
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #70757a;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover { background: rgba(0,0,0,0.05); color: #1a73e8; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const AttachmentPreviewArea = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px 4px 24px;
  max-width: 800px;
  margin: 0 auto;
  overflow-x: auto;
  flex-wrap: wrap;
`;

const AttachmentChip = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  background: #e8eef7;
  border-radius: 12px;
  font-size: 13px;
  color: #1f1f1f;
  max-width: 200px;
  min-width: 0;
`;

const AttachmentThumb = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
`;

const RemoveAttachButton = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #dc2626;
  color: white;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  &:hover { background: #b91c1c; }
`;

const DragOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(26, 115, 232, 0.08);
  border: 3px dashed #1a73e8;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
  font-size: 18px;
  color: #1a73e8;
  font-weight: 500;
`;

// ─── 토큰 사용량 바 ─────────────────────────────────────────────────────────

const TOKEN_COLORS: Record<TokenStatus, string> = {
    safe: '#34a853',
    warning: '#fbbc04',
    danger: '#ea4335',
    over: '#ea4335',
};

const TokenBarContainer = styled.div`
  max-width: 800px;
  margin: 8px auto 0;
  padding: 0 24px;
`;

const TokenBarOuter = styled.div`
  width: 100%;
  height: 4px;
  background: #e8eaed;
  border-radius: 2px;
  overflow: hidden;
`;

const TokenBarInner = styled.div<{ percent: number; status: TokenStatus }>`
  height: 100%;
  width: ${props => Math.min(props.percent, 100)}%;
  background: ${props => TOKEN_COLORS[props.status]};
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
`;

const TokenInfo = styled.div<{ status: TokenStatus }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: ${props => props.status === 'over' || props.status === 'danger' ? TOKEN_COLORS[props.status] : '#9aa0a6'};
`;

const TokenWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fce8e6;
  color: #c5221f;
  border-radius: 8px;
  font-size: 13px;
  max-width: 800px;
  margin: 8px auto 0;
`;

const MessageImageContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
`;

const MessageImage = styled.img`
  max-width: 300px;
  max-height: 300px;
  border-radius: 12px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.15s;
  &:hover { transform: scale(1.02); }
`;

const WelcomeScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #1f1f1f;
  text-align: center;
  user-select: none;
  
  h2 { font-size: 32px; font-weight: 500; margin-bottom: 12px; }
  p { color: #70757a; font-size: 16px; 
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

// ─── 허용 파일 타입 및 크기 제한 ──────────────────────────────────────────────
const ACCEPT_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain',
].join(',');

/** 파일당 최대 크기 (15MB) - 업로드 전 경고 */
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function isImageType(mime: string) {
    return mime.startsWith('image/');
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 문서 첨부 카드 컴포넌트 ──────────────────────────────────────────────

const DocumentCard = styled.div`
  background: #f0f4f9;
  border: 1px solid #d3dbe6;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 6px 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #3c4043;
  max-width: min(320px, 100%);
`;

const DocumentCardIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #dbe4f0;
  flex-shrink: 0;
`;

const DocumentCardName = styled.span`
  font-weight: 500;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
`;

/** 문서 텍스트 파트인지 판별 (예: "[문서: file.pdf]\n...") */
function parseDocumentPart(text: string): { filename: string } | null {
    const match = text.match(/^\[문서:\s*(.+?)\]\n/);
    if (!match) return null;
    return { filename: match[1] };
}

// ─── 멀티모달 메시지 content 렌더링 헬퍼 ────────────────────────────────────

function renderMultimodalContent(content: string | ContentPart[]) {
    if (typeof content === 'string') {
        return <UserText>{content}</UserText>;
    }

    // 문서 카드와 사용자 텍스트를 분리
    const textParts: React.ReactNode[] = [];
    const fileParts: React.ReactNode[] = [];
    const imageParts: React.ReactNode[] = [];

    content.forEach((part, i) => {
        if (part.type === 'text') {
            const doc = parseDocumentPart(part.text);
            if (doc) {
                // 문서 파트 → 파일명 카드만 표시 (내용 숨김)
                fileParts.push(
                    <DocumentCard key={`doc-${i}`}>
                        <DocumentCardIcon><FileText size={16} color="#5f6368" /></DocumentCardIcon>
                        <DocumentCardName>{doc.filename}</DocumentCardName>
                    </DocumentCard>
                );
            } else {
                // 일반 텍스트 파트
                textParts.push(<UserText key={`txt-${i}`}>{part.text}</UserText>);
            }
        } else if (part.type === 'image_url') {
            imageParts.push(
                <MessageImageContainer key={`img-${i}`}>
                    <MessageImage
                        src={part.image_url.url}
                        alt="첨부 이미지"
                        onClick={() => window.open(part.image_url.url, '_blank')}
                    />
                </MessageImageContainer>
            );
        }
    });

    return (
        <div>
            {/* 첨부 파일 카드 (상단) */}
            {fileParts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: textParts.length > 0 || imageParts.length > 0 ? '8px' : '0' }}>
                    {fileParts}
                </div>
            )}
            {/* 첨부 이미지 */}
            {imageParts}
            {/* 사용자 텍스트 */}
            {textParts}
        </div>
    );
}

function getTextFromContent(content: string | ContentPart[]): string {
    if (typeof content === 'string') return content;
    return content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join('\n');
}

// ─── 마크다운 렌더링 컴포넌트 ────────────────────────────────────────────────

const markdownComponents = {
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
    // 이미지: data: URI도 허용 (첨부 이미지 지원)
    img: ({ src, alt, ...props }: { src?: string; alt?: string;[key: string]: any }) => {
        const safeSrc = src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('data:'))
            ? src
            : undefined;
        if (!safeSrc) return <span>[이미지: {alt}]</span>;
        return <img src={safeSrc} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: '8px' }} {...props} />;
    },
};

export function ChatInterface({ messages, isLoading, jwt, onSendMessage, onStopGeneration }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<AttachedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);
    const isUserNearBottom = useRef(true);
    const scrollLastRun = useRef(0);

    // ─── 토큰 추정 (입력 디바운스로 타이핑 시 CPU 부하 감소) ───────────────────
    const [debouncedInput, setDebouncedInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedInput(input), 150);
        return () => clearTimeout(t);
    }, [input]);

    const existingTokens = useMemo(
        () => estimateMessagesTokens(messages),
        [messages]
    );

    const currentInputTokens = useMemo(
        () => estimateTokens(debouncedInput) + (debouncedInput ? 10 : 0), // 새 메시지의 chat template 오버헤드
        [debouncedInput]
    );

    // 첨부 파일의 추정 토큰: 문서는 업로드 후 추출된 텍스트 기준(실제 사용 토큰), 미업로드 시에만 파일 크기 추정
    const attachmentTokens = useMemo(() => {
        if (attachments.length === 0) return 0;
        return attachments.reduce((sum, att) => {
            if (att.type === 'image') return sum + 1225; // 이미지: 고정 토큰
            // 문서: 업로드 완료 시 서버가 추출한 텍스트로 실제 사용 토큰 계산
            if (att.type === 'document' && att.result?.content != null) {
                return sum + estimateTokens(att.result.content);
            }
            // 미업로드 문서: 파일 크기 기반 추정(임시)
            const size = att.file.size;
            const mime = att.file.type;
            if (mime === 'text/plain' || mime === 'text/csv') return sum + Math.ceil(size / 3);
            if (mime === 'application/pdf') return sum + Math.ceil(size / 20);
            return sum + Math.ceil(size / 12);
        }, 0);
    }, [attachments]);

    const totalEstimatedTokens = existingTokens + currentInputTokens + attachmentTokens;
    const tokenStatus = getTokenStatus(totalEstimatedTokens);
    const tokenPercent = getTokenPercent(totalEstimatedTokens);
    const isOverLimit = tokenStatus === 'over';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 사용자가 스크롤 위치를 변경할 때 하단 근처인지 감지 (100ms throttle)
    const handleScroll = useCallback(() => {
        const el = messageListRef.current;
        if (!el) return;
        const now = Date.now();
        if (now - scrollLastRun.current < 100) return;
        scrollLastRun.current = now;
        const threshold = 150;
        isUserNearBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    }, []);

    useEffect(() => {
        // 사용자가 하단 근처에 있을 때만 자동 스크롤
        if (isUserNearBottom.current) {
            scrollToBottom();
        }
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

    // ─── 파일 크기 초과 경고 ─────────────────────────────────────────────────
    const [fileRejectMessage, setFileRejectMessage] = useState<string | null>(null);

    // ─── 파일 추가 ──────────────────────────────────────────────────────────
    const addFiles = useCallback((files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const valid: AttachedFile[] = [];
        const rejected: { name: string; size: number }[] = [];

        for (const file of fileArray) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                rejected.push({ name: file.name, size: file.size });
            } else {
                const isImage = isImageType(file.type);
                const isDocument = !isImage;
                valid.push({
                    file,
                    preview: isImage ? URL.createObjectURL(file) : undefined,
                    type: isImage ? 'image' : 'document',
                    status: isDocument && jwt ? 'uploading' : 'pending',
                });
            }
        }

        setAttachments(prev => [...prev, ...valid]);

        // 문서는 첨부 시 미리 업로드 → 추출 텍스트로 실제 사용 토큰 계산
        if (jwt) {
            valid.filter(a => a.type === 'document').forEach(att => {
                uploadFile(att.file, jwt)
                    .then(result => {
                        setAttachments(prev =>
                            prev.map(a => (a.file === att.file && a.type === 'document' ? { ...a, status: 'done' as const, result } : a))
                        );
                    })
                    .catch(() => {
                        setAttachments(prev =>
                            prev.map(a => (a.file === att.file && a.type === 'document' ? { ...a, status: 'error' as const } : a))
                        );
                    });
            });
        }

        if (rejected.length > 0) {
            const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
            const names = rejected.map(r => `"${r.name}" (${formatFileSize(r.size)})`).join(', ');
            setFileRejectMessage(
                `${rejected.length}개 파일이 제한(${maxMb}MB)을 초과해 제외됨: ${names}`
            );
            setTimeout(() => setFileRejectMessage(null), 6000);
        }

        if (valid.length > 0) {
            setFileRejectMessage(null);
        }
    }, [jwt]);

    const removeAttachment = useCallback((index: number) => {
        setAttachments(prev => {
            const removed = prev[index];
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    // ─── 드래그 앤 드롭 ─────────────────────────────────────────────────────
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles]);

    // ─── 전송 ───────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasContent = input.trim() || attachments.length > 0;
        if (!hasContent || isLoading || isOverLimit) return;
        onSendMessage(input, attachments.length > 0 ? attachments : undefined);
        setInput('');
        setAttachments([]);
        // 메시지 전송 시 하단으로 스크롤 복귀
        isUserNearBottom.current = true;
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // cleanup object URLs
    useEffect(() => {
        return () => {
            attachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Container
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ position: 'relative' }}
        >
            {isDragging && (
                <DragOverlay>파일을 여기에 놓으세요</DragOverlay>
            )}

            <MessageList ref={messageListRef} onScroll={handleScroll}>
                {messages.length === 0 && (
                    <WelcomeScreen>
                        <Sparkles size={48} color="#1a73e8" style={{ marginBottom: '24px' }} />
                        <h2>BaSE Lab LLM에 무엇이든 물어보세요</h2>
                        <p>코딩, 연구, 데이터 분석까지 연구실 전용 AI가 도와드립니다.</p>
                        <p style={{ fontSize: '13px', color: '#9aa0a6', marginTop: '8px' }}>
                            이미지와 문서를 첨부하여 질문할 수도 있습니다.
                        </p>
                    </WelcomeScreen>
                )}

                {messages.map((msg, index) => (
                    <MessageRow key={index} isUser={msg.role === 'user'}>
                        <Avatar isUser={msg.role === 'user'}>
                            {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                        </Avatar>
                        <ContentBox isUser={msg.role === 'user'}>
                            {msg.role === 'user' ? (
                                renderMultimodalContent(msg.content)
                            ) : (
                                <div className="prose">
                                    <ReactMarkdown components={markdownComponents}>
                                        {getTextFromContent(msg.content)}
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
                {/* 파일 크기 초과 경고 */}
                {fileRejectMessage && (
                    <div className="max-w-[800px] mx-auto px-6 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                        {fileRejectMessage}
                    </div>
                )}
                {/* 첨부 파일 미리보기 */}
                {attachments.length > 0 && (
                    <AttachmentPreviewArea>
                        {attachments.map((att, i) => (
                            <AttachmentChip key={i}>
                                {att.type === 'image' && att.preview ? (
                                    <AttachmentThumb src={att.preview} alt={att.file.name} />
                                ) : (
                                    <FileText size={16} color="#5f6368" />
                                )}
                                <span className="min-w-0 max-w-[130px] break-words text-left">
                                    {att.file.name}
                                    {att.type === 'document' && att.status === 'uploading' && (
                                        <span style={{ fontSize: 10, color: '#70757a', marginLeft: 4 }}>처리 중</span>
                                    )}
                                    {att.type === 'document' && att.status === 'error' && (
                                        <span style={{ fontSize: 10, color: '#d93025', marginLeft: 4 }}>오류</span>
                                    )}
                                </span>
                                <RemoveAttachButton onClick={() => removeAttachment(i)} type="button">
                                    <X size={12} />
                                </RemoveAttachButton>
                            </AttachmentChip>
                        ))}
                    </AttachmentPreviewArea>
                )}

                <InputWrapper onSubmit={handleSubmit}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPT_FILE_TYPES}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files) addFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    <AttachButton
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        title="파일 첨부 (이미지, PDF, DOCX, XLSX, CSV, TXT)"
                    >
                        <Paperclip size={20} />
                    </AttachButton>
                    <StyledTextarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="여기에 질문을 입력하세요... (파일을 드래그하여 첨부 가능)"
                        disabled={isLoading}
                        rows={1}
                    />
                    {isLoading ? (
                        <StopButton type="button" onClick={onStopGeneration} title="응답 생성 중단">
                            <Square size={18} fill="currentColor" />
                        </StopButton>
                    ) : (
                        <SendButton type="submit" disabled={(!input.trim() && attachments.length === 0) || isOverLimit}>
                            <Send size={20} />
                        </SendButton>
                    )}
                </InputWrapper>

                {/* 토큰 사용량 바 */}
                {(messages.length > 0 || input.trim() || attachments.length > 0) && (
                    <TokenBarContainer>
                        <TokenBarOuter>
                            <TokenBarInner percent={tokenPercent} status={tokenStatus} />
                        </TokenBarOuter>
                        <TokenInfo status={tokenStatus}>
                            <span>
                                {totalEstimatedTokens.toLocaleString()} / {getMaxInputTokens().toLocaleString()} 토큰
                            </span>
                            <span>{tokenPercent}%</span>
                        </TokenInfo>
                        {attachments.some(a => a.type === 'document' && !a.result) && (
                            <p style={{ fontSize: '11px', color: '#70757a', marginTop: '4px', marginBottom: 0 }}>
                                문서 처리 중이면 추출된 텍스트 기준으로 토큰이 반영됩니다.
                            </p>
                        )}
                    </TokenBarContainer>
                )}

                {/* 토큰 초과 경고 */}
                {isOverLimit && (
                    <TokenWarning>
                        <AlertTriangle size={16} />
                        대화가 너무 길어 전송할 수 없습니다. 새 대화를 시작해 주세요.
                    </TokenWarning>
                )}

                <p style={{ textAlign: 'center', fontSize: '12px', color: '#70757a', marginTop: '12px' }}>
                    BaSE Lab AI는 실수할 수 있습니다. 중요한 정보는 항상 확인하세요.
                </p>
            </InputArea>
        </Container>
    );
}