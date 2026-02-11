/** @jsxImportSource @emotion/react */
import { useState, useEffect, useMemo, useCallback } from 'react';
import styled from '@emotion/styled';
import { X, Shield, LogOut, UserX, UserCheck, RefreshCw, Search, Users, UserCog, AlertCircle, User } from 'lucide-react';
import { adminListUsers, adminForceLogout, adminToggleActive, AuthError, type AdminUser } from '../lib/api';
import { ConfirmModal } from './ConfirmModal';

interface AdminDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    jwt: string;
}

// ─── Styled Components ───────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(6px);
  animation: overlayIn 0.2s ease-out;

  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Panel = styled.div`
  width: 1100px;
  max-width: calc(100vw - 40px);
  height: 92vh;
  max-height: 920px;
  background: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 36px 24px;
  border-bottom: 1px solid #e8eaed;
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
  flex-shrink: 0;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f1f1f;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TitleBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #1a73e8;
  background: #e8f0fe;
  padding: 4px 10px;
  border-radius: 8px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const IconBtn = styled.button<{ variant?: 'close' }>`
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  border: ${p => p.variant === 'close' ? 'none' : '1px solid #dadce0'};
  border-radius: ${p => p.variant === 'close' ? '50%' : '12px'};
  background: ${p => p.variant === 'close' ? 'transparent' : '#fff'};
  cursor: pointer; color: #5f6368;
  transition: all 0.15s;
  &:hover { background: ${p => p.variant === 'close' ? '#f1f3f4' : '#f8f9fa'}; color: #1f1f1f; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ── Toolbar ──

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 36px;
  border-bottom: 1px solid #f1f3f4;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 420px;
`;

const SearchIconWrap = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #9aa0a6;
  display: flex;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1.5px solid #e8eaed;
  border-radius: 14px;
  font-size: 14px;
  outline: none;
  background: #f8f9fa;
  transition: all 0.2s;
  color: #1f1f1f;

  &::placeholder { color: #9aa0a6; }
  &:focus {
    background: #fff;
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
  }
`;

const StatChip = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.color === 'blue' ? '#e8f0fe' : p.color === 'red' ? '#fce8e6' : p.color === 'green' ? '#e6f4ea' : '#f8f9fa'};
  color: ${p => p.color === 'blue' ? '#1a73e8' : p.color === 'red' ? '#d93025' : p.color === 'green' ? '#137333' : '#5f6368'};
  white-space: nowrap;
`;

// ── Table ──

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #bdc1c6; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
`;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fafbfc;
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 20px;
  color: #5f6368;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e8eaed;

  &:first-of-type { padding-left: 36px; width: 35%; }
  &:nth-of-type(2) { width: 15%; }
  &:nth-of-type(3) { width: 15%; }
  &:last-of-type { padding-right: 36px; text-align: right; width: 35%; }
`;

const Tr = styled.tr`
  transition: background 0.1s;
  &:hover { background: #f8f9fa; }
  &:last-of-type td { border-bottom: none; }
`;

const Td = styled.td`
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;

  &:first-of-type { padding-left: 36px; }
  &:last-of-type { padding-right: 36px; }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const UserIconWrap = styled.div<{ isAdmin: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.isAdmin ? '#e8f0fe' : '#f3f4f6'};
  color: ${p => p.isAdmin ? '#1a73e8' : '#9aa0a6'};
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const UserNameText = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UserSubText = styled.span`
  font-size: 12px;
  color: #9aa0a6;
`;

const StatusBadge = styled.span<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.active ? '#e6f4ea' : '#fce8e6'};
  color: ${p => p.active ? '#137333' : '#d93025'};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const RoleBadge = styled.span<{ isAdmin: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.isAdmin ? '#e8f0fe' : '#f3f4f6'};
  color: ${p => p.isAdmin ? '#1a73e8' : '#5f6368'};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionBtn = styled.button<{ variant?: 'danger' | 'warning' | 'success' }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  border: 1.5px solid transparent;
  border-radius: 12px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  background: ${p =>
    p.variant === 'danger' ? '#fff5f5' :
    p.variant === 'success' ? '#f0fdf4' :
    '#fffbeb'};
  color: ${p =>
    p.variant === 'danger' ? '#dc2626' :
    p.variant === 'success' ? '#16a34a' :
    '#d97706'};
  border-color: ${p =>
    p.variant === 'danger' ? '#fecaca' :
    p.variant === 'success' ? '#bbf7d0' :
    '#fde68a'};

  &:hover {
    background: ${p =>
      p.variant === 'danger' ? '#fef2f2' :
      p.variant === 'success' ? '#ecfdf5' :
      '#fefce8'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

// ── States ──

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  text-align: center;
  color: #9aa0a6;
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  margin: 20px 36px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
`;

const AccessDenied = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  text-align: center;
  color: #5f6368;
  flex: 1;
  h3 { font-size: 20px; color: #d93025; margin: 20px 0 10px; }
  p { font-size: 15px; }
`;

const PanelFooter = styled.div`
  padding: 16px 36px;
  border-top: 1px solid #f1f3f4;
  background: #fafbfc;
  font-size: 13px;
  color: #9aa0a6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

// ─── Component ───────────────────────────────────────────────────────────────

type ConfirmAction =
    | { type: 'forceLogout'; userId: string; username: string }
    | { type: 'toggleActive'; userId: string; username: string; isActive: boolean }
    | null;

export function AdminDashboard({ isOpen, onClose, jwt }: AdminDashboardProps) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminListUsers(jwt);
            setUsers(data);
            setAccessDenied(false);
        } catch (err) {
            if (err instanceof AuthError && err.status === 403) {
                setAccessDenied(true);
            } else {
                setError(err instanceof Error ? err.message : '사용자 목록을 불러올 수 없습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && jwt) {
            fetchUsers();
            setSearchQuery('');
        }
    }, [isOpen, jwt]);

    // 검색 필터링
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase().trim();
        return users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    // 통계
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.is_active).length;
        const inactive = total - active;
        const admins = users.filter(u => u.role === 'admin').length;
        return { total, active, inactive, admins };
    }, [users]);

    if (!isOpen) return null;

    const handleForceLogout = (userId: string, username: string) => {
        setConfirmAction({ type: 'forceLogout', userId, username });
    };

    const handleToggleActive = (userId: string, username: string, isActive: boolean) => {
        setConfirmAction({ type: 'toggleActive', userId, username, isActive });
    };

    const executeConfirmAction = useCallback(async () => {
        if (!confirmAction) return;
        const action = confirmAction;
        setConfirmAction(null);

        try {
            if (action.type === 'forceLogout') {
                await adminForceLogout(jwt, action.userId);
            } else if (action.type === 'toggleActive') {
                await adminToggleActive(jwt, action.userId);
            }
            await fetchUsers();
        } catch (err) {
            const label = action.type === 'forceLogout'
                ? '강제 로그아웃'
                : action.type === 'toggleActive' && action.isActive ? '비활성화' : '활성화';
            setError(err instanceof Error ? err.message : `${label}에 실패했습니다.`);
        }
    }, [confirmAction, jwt]);

    return (
        <Overlay onClick={onClose}>
            <Panel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                {/* ── Header ── */}
                <PanelHeader>
                    <PanelTitle>
                        <Shield size={24} color="#1a73e8" />
                        관리자 대시보드
                        <TitleBadge>Admin</TitleBadge>
                    </PanelTitle>
                    <HeaderActions>
                        <IconBtn onClick={fetchUsers} disabled={loading} title="새로고침">
                            <RefreshCw size={18} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
                        </IconBtn>
                        <IconBtn variant="close" onClick={onClose} title="닫기">
                            <X size={22} />
                        </IconBtn>
                    </HeaderActions>
                </PanelHeader>

                {accessDenied ? (
                    <AccessDenied>
                        <Shield size={56} color="#d93025" />
                        <h3>접근 거부</h3>
                        <p>관리자 권한이 필요합니다.</p>
                    </AccessDenied>
                ) : (
                    <>
                        {/* ── Toolbar: Search + Stats ── */}
                        <Toolbar>
                            <SearchWrapper>
                                <SearchIconWrap><Search size={18} /></SearchIconWrap>
                                <SearchInput
                                    type="text"
                                    placeholder="사용자 검색 (이름, 역할)..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </SearchWrapper>
                            <StatChip color="blue">
                                <Users size={15} />
                                전체 {stats.total}명
                            </StatChip>
                            <StatChip color="green">
                                <UserCheck size={15} />
                                활성 {stats.active}명
                            </StatChip>
                            {stats.inactive > 0 && (
                                <StatChip color="red">
                                    <UserX size={15} />
                                    비활성 {stats.inactive}명
                                </StatChip>
                            )}
                        </Toolbar>

                        {/* ── Error ── */}
                        {error && (
                            <ErrorBanner>
                                <AlertCircle size={18} />
                                {error}
                            </ErrorBanner>
                        )}

                        {/* ── Table ── */}
                        <PanelBody>
                            {loading ? (
                                <EmptyState>
                                    <RefreshCw size={36} color="#dadce0" style={{ animation: 'spin 1s linear infinite' }} />
                                    <p style={{ marginTop: 20, fontSize: 15 }}>사용자 목록을 불러오는 중...</p>
                                </EmptyState>
                            ) : filteredUsers.length === 0 ? (
                                <EmptyState>
                                    <Search size={48} color="#dadce0" />
                                    <p style={{ marginTop: 20, fontSize: 16, fontWeight: 500, color: '#5f6368' }}>
                                        {searchQuery ? `'${searchQuery}'에 대한 검색 결과가 없습니다` : '사용자가 없습니다'}
                                    </p>
                                    {searchQuery && (
                                        <p style={{ fontSize: 14, color: '#9aa0a6', marginTop: 6 }}>
                                            다른 검색어를 입력해 보세요
                                        </p>
                                    )}
                                </EmptyState>
                            ) : (
                                <Table>
                                    <Thead>
                                        <tr>
                                            <Th>사용자</Th>
                                            <Th>역할</Th>
                                            <Th>상태</Th>
                                            <Th style={{ textAlign: 'right' }}>관리</Th>
                                        </tr>
                                    </Thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <Tr key={user.id}>
                                                <Td>
                                                    <UserCell>
                                                        <UserIconWrap isAdmin={user.role === 'admin'}>
                                                            {user.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                                        </UserIconWrap>
                                                        <UserInfo>
                                                            <UserNameText>{user.username}</UserNameText>
                                                            <UserSubText>
                                                                가입일: {new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </UserSubText>
                                                        </UserInfo>
                                                    </UserCell>
                                                </Td>
                                                <Td>
                                                    <RoleBadge isAdmin={user.role === 'admin'}>
                                                        {user.role === 'admin' ? '관리자' : '학생'}
                                                    </RoleBadge>
                                                </Td>
                                                <Td>
                                                    <StatusBadge active={user.is_active}>
                                                        {user.is_active ? '활성' : '비활성'}
                                                    </StatusBadge>
                                                </Td>
                                                <Td style={{ textAlign: 'right' }}>
                                                    {user.role !== 'admin' && (
                                                        <ActionGroup>
                                                            <ActionBtn
                                                                variant="warning"
                                                                onClick={() => handleForceLogout(user.id, user.username)}
                                                                title="이 사용자의 모든 세션을 강제 종료합니다"
                                                            >
                                                                <LogOut size={14} /> 강제 로그아웃
                                                            </ActionBtn>
                                                            <ActionBtn
                                                                variant={user.is_active ? 'danger' : 'success'}
                                                                onClick={() => handleToggleActive(user.id, user.username, user.is_active)}
                                                                title={user.is_active ? '이 사용자의 로그인을 차단합니다' : '이 사용자의 로그인을 허용합니다'}
                                                            >
                                                                {user.is_active ? (
                                                                    <><UserX size={14} /> 비활성화</>
                                                                ) : (
                                                                    <><UserCheck size={14} /> 활성화</>
                                                                )}
                                                            </ActionBtn>
                                                        </ActionGroup>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </PanelBody>

                        {/* ── Footer ── */}
                        <PanelFooter>
                            <span>
                                {searchQuery
                                    ? `검색 결과: ${filteredUsers.length}명 / 전체 ${users.length}명`
                                    : `전체 ${users.length}명의 사용자`
                                }
                            </span>
                            <span>
                                <UserCog size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                                관리자 {stats.admins}명 · 학생 {stats.total - stats.admins}명
                            </span>
                        </PanelFooter>
                    </>
                )}
            </Panel>

            {/* Global keyframe for spinner */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* ── Confirm Modal ── */}
            <ConfirmModal
                isOpen={confirmAction !== null}
                variant={
                    confirmAction?.type === 'forceLogout' ? 'warning'
                    : confirmAction?.type === 'toggleActive' && confirmAction.isActive ? 'danger'
                    : 'info'
                }
                icon={
                    confirmAction?.type === 'forceLogout' ? LogOut
                    : confirmAction?.type === 'toggleActive' && confirmAction.isActive ? UserX
                    : UserCheck
                }
                title={
                    confirmAction?.type === 'forceLogout'
                        ? '강제 로그아웃'
                        : confirmAction?.type === 'toggleActive' && confirmAction.isActive
                            ? '사용자 비활성화'
                            : '사용자 활성화'
                }
                message={
                    confirmAction?.type === 'forceLogout'
                        ? `'${confirmAction.username}' 사용자를 강제 로그아웃 하시겠습니까?`
                        : confirmAction?.type === 'toggleActive' && confirmAction.isActive
                            ? `'${confirmAction.username}' 사용자를 비활성화 하시겠습니까?`
                            : `'${confirmAction?.username}' 사용자를 활성화 하시겠습니까?`
                }
                subMessage={
                    confirmAction?.type === 'forceLogout'
                        ? '모든 기기에서 즉시 로그아웃됩니다.'
                        : confirmAction?.type === 'toggleActive' && confirmAction.isActive
                            ? '비활성화된 사용자는 로그인할 수 없습니다.'
                            : undefined
                }
                confirmText={
                    confirmAction?.type === 'forceLogout'
                        ? '강제 로그아웃'
                        : confirmAction?.type === 'toggleActive' && confirmAction.isActive
                            ? '비활성화'
                            : '활성화'
                }
                onConfirm={executeConfirmAction}
                onCancel={() => setConfirmAction(null)}
            />
        </Overlay>
    );
}
