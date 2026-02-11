/** @jsxImportSource @emotion/react */
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { X, Eye, EyeOff, User, Lock, Check } from 'lucide-react';
import { getUserInfo, changePassword, setStoredJwt, type UserInfo } from '../lib/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    jwt: string;
    username: string;
    onJwtUpdate?: (newJwt: string) => void;
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
  width: 400px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 24px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e8eaed;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f1f1f;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: #5f6368;
  transition: background 0.15s;
  &:hover { background: #f1f3f4; }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const UserIdBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8f9fa;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  font-size: 15px;
  color: #3c4043;
  font-weight: 500;
`;

const UserIdIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #e8f0fe;
  border-radius: 50%;
  color: #1a73e8;
  flex-shrink: 0;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #e8eaed;
  margin: 0;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InputLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #3c4043;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const IconWrap = styled.div`
  position: absolute;
  left: 12px;
  color: #5f6368;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 11px 40px 11px 40px;
  border: 1px solid #dadce0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.12);
  }

  &::placeholder { color: #9aa0a6; }
`;

const ToggleVisibilityBtn = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: #5f6368;
  transition: background 0.15s;
  &:hover { background: #f1f3f4; }
`;

const CharCount = styled.span<{ isOver: boolean }>`
  font-size: 11px;
  color: ${props => props.isOver ? '#d93025' : '#9aa0a6'};
  text-align: right;
`;

const SubmitBtn = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: 12px;
  background: ${props => props.disabled ? '#dadce0' : '#1a73e8'};
  color: ${props => props.disabled ? '#9aa0a6' : '#ffffff'};
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;

  &:hover:not(:disabled) { background: #1557b0; }
`;

const StatusMessage = styled.div<{ isError: boolean }>`
  font-size: 13px;
  text-align: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${props => props.isError ? '#fce8e6' : '#e6f4ea'};
  color: ${props => props.isError ? '#d93025' : '#137333'};
`;

const MatchHint = styled.div<{ matches: boolean }>`
  font-size: 11px;
  color: ${props => props.matches ? '#137333' : '#d93025'};
  margin-top: 2px;
`;

export function SettingsModal({ isOpen, onClose, jwt, username, onJwtUpdate }: SettingsModalProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

    useEffect(() => {
        if (isOpen && jwt) {
            getUserInfo(jwt).then(setUserInfo).catch(console.error);
            // reset form
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setShowCurrentPw(false);
            setShowNewPw(false);
            setShowConfirmPw(false);
            setStatusMsg(null);
        }
    }, [isOpen, jwt]);

    if (!isOpen) return null;

    const passwordsMatch = newPw.length > 0 && newPw === confirmPw;
    const isNewPwOverLimit = newPw.length > 12;
    const canSubmit = currentPw.length > 0 && newPw.length > 0 && newPw.length <= 12 && passwordsMatch && !isLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsLoading(true);
        setStatusMsg(null);
        try {
            const result = await changePassword(jwt, currentPw, newPw);
            setStatusMsg({ text: '비밀번호가 성공적으로 변경되었습니다.', isError: false });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');

            // 새 JWT 토큰으로 갱신 (token_version 증가 반영)
            if (result.access_token) {
                setStoredJwt(result.access_token);
                onJwtUpdate?.(result.access_token);
            }
        } catch (err) {
            setStatusMsg({
                text: err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.',
                isError: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Overlay>
            <ModalCard onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>설정</ModalTitle>
                    <CloseBtn onClick={onClose}>
                        <X size={20} />
                    </CloseBtn>
                </ModalHeader>

                <ModalBody>
                    {/* User ID Section */}
                    <Section>
                        <SectionLabel>계정 정보</SectionLabel>
                        <UserIdBox>
                            <UserIdIcon>
                                <User size={18} />
                            </UserIdIcon>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1f' }}>
                                    {userInfo?.username || username}
                                </span>
                                <span style={{ fontSize: 12, color: '#9aa0a6' }}>
                                    {userInfo?.role === 'admin' ? '관리자' : '학생'} · 변경 불가
                                </span>
                            </div>
                        </UserIdBox>
                    </Section>

                    <Divider />

                    {/* Password Change Section */}
                    <Section>
                        <SectionLabel>비밀번호 변경</SectionLabel>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <InputGroup>
                                <InputLabel>현재 비밀번호</InputLabel>
                                <InputWrapper>
                                    <IconWrap><Lock size={16} /></IconWrap>
                                    <Input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        placeholder="현재 비밀번호 입력"
                                        value={currentPw}
                                        onChange={e => setCurrentPw(e.target.value)}
                                        maxLength={12}
                                    />
                                    <ToggleVisibilityBtn type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </ToggleVisibilityBtn>
                                </InputWrapper>
                            </InputGroup>

                            <InputGroup>
                                <InputLabel>새 비밀번호</InputLabel>
                                <InputWrapper>
                                    <IconWrap><Lock size={16} /></IconWrap>
                                    <Input
                                        type={showNewPw ? 'text' : 'password'}
                                        placeholder="새 비밀번호 (최대 12자)"
                                        value={newPw}
                                        maxLength={12}
                                        onChange={e => setNewPw(e.target.value)}
                                    />
                                    <ToggleVisibilityBtn type="button" onClick={() => setShowNewPw(!showNewPw)}>
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </ToggleVisibilityBtn>
                                </InputWrapper>
                                <CharCount isOver={isNewPwOverLimit}>{newPw.length}/12</CharCount>
                            </InputGroup>

                            <InputGroup>
                                <InputLabel>새 비밀번호 확인</InputLabel>
                                <InputWrapper>
                                    <IconWrap><Lock size={16} /></IconWrap>
                                    <Input
                                        type={showConfirmPw ? 'text' : 'password'}
                                        placeholder="새 비밀번호 다시 입력"
                                        value={confirmPw}
                                        maxLength={12}
                                        onChange={e => setConfirmPw(e.target.value)}
                                    />
                                    <ToggleVisibilityBtn type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </ToggleVisibilityBtn>
                                </InputWrapper>
                                {confirmPw.length > 0 && (
                                    <MatchHint matches={passwordsMatch}>
                                        {passwordsMatch ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                                    </MatchHint>
                                )}
                            </InputGroup>

                            {statusMsg && (
                                <StatusMessage isError={statusMsg.isError}>
                                    {statusMsg.text}
                                </StatusMessage>
                            )}

                            <SubmitBtn type="submit" disabled={!canSubmit}>
                                {isLoading ? '변경 중...' : (
                                    <>
                                        <Check size={18} /> 비밀번호 변경
                                    </>
                                )}
                            </SubmitBtn>
                        </form>
                    </Section>
                </ModalBody>
            </ModalCard>
        </Overlay>
    );
}
