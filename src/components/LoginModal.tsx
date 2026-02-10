/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import styled from '@emotion/styled';
import { User, Lock, LogIn } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onLogin: (apiKey: string, username: string) => void;
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const ModalCard = styled.div`
  width: 360px;
  background: #ffffff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a73e8;
  text-align: center;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 12px;
  color: #5f6368;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #dadce0;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
  }
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 14px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;

  &:hover { background: #1557b0; }
  &:disabled { background: #dadce0; cursor: not-allowed; }
`;

const ErrorMsg = styled.div`
  color: #d93025;
  font-size: 14px;
  text-align: center;
  background: #fce8e6;
  padding: 8px;
  border-radius: 8px;
`;

export function LoginModal({ isOpen, onLogin }: LoginModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // TODO: 백엔드 API 연동 필요 (POST /login)
        // 현재는 임시 Mock 로직:
        // admin / admin -> sk-admin-mock-key
        // user / user -> sk-user-mock-key

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Network delay simulation

            if (username === 'admin' && password === 'admin') {
                onLogin('sk-admin-mock-key-for-development', username);
            } else if (username && password) {
                // 개발 편의를 위해 아무거나 입력해도 키 생성 (나중에 삭제)
                onLogin(`sk-mock-key-for-${username}`, username);
            } else {
                throw new Error('아이디와 비밀번호를 입력해주세요.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Overlay>
            <ModalCard>
                <Title>BaSE Lab LLM</Title>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <InputGroup>
                            <InputWrapper>
                                <IconWrapper><User size={18} /></IconWrapper>
                                <Input
                                    type="text"
                                    placeholder="아이디"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </InputWrapper>
                        </InputGroup>

                        <InputGroup>
                            <InputWrapper>
                                <IconWrapper><Lock size={18} /></IconWrapper>
                                <Input
                                    type="password"
                                    placeholder="비밀번호"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </InputWrapper>
                        </InputGroup>
                    </div>

                    {error && <ErrorMsg>{error}</ErrorMsg>}

                    <LoginButton type="submit" disabled={isLoading || !username || !password}>
                        {isLoading ? '로그인 중...' : (
                            <>
                                <LogIn size={20} /> 로그인
                            </>
                        )}
                    </LoginButton>
                </form>
            </ModalCard>
        </Overlay>
    );
}
