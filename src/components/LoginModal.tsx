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
  background-color: #f0f4f9;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }

            const data = await response.json();
            onLogin(data.api_key, username);
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
