/** @jsxImportSource @emotion/react */
import { useState, useEffect, useMemo, useCallback } from 'react';
import styled from '@emotion/styled';
import { X, Shield, LogOut, UserX, UserCheck, RefreshCw, Search, Users, UserCog, AlertCircle, User, Pencil, Clock, Calendar } from 'lucide-react';
import {
    adminListUsers, adminForceLogout, adminToggleActive, adminUpdateUser,
    adminGetSchedules, adminUpdateSchedule, adminGetSystemSettings, adminUpdateSystemSetting,
    AuthError, type AdminUser, type ScheduleItem, type SystemSettingItem,
} from '../lib/api';
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

// ── Tabs ──

const TabBar = styled.div`
  display: flex;
  gap: 0;
  padding: 0 36px;
  border-bottom: 2px solid #e8eaed;
  background: #fafbfc;
  flex-shrink: 0;
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: none;
  cursor: pointer;
  color: ${p => p.active ? '#1a73e8' : '#5f6368'};
  border-bottom: 2.5px solid ${p => p.active ? '#1a73e8' : 'transparent'};
  margin-bottom: -2px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: ${p => p.active ? '#1a73e8' : '#1f1f1f'};
    background: ${p => p.active ? 'transparent' : '#f1f3f4'};
  }
`;

// ── Toolbar ──

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 36px;
  border-bottom: 1px solid #f1f3f4;
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow: hidden;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1 1 200px;
  min-width: 140px;
  max-width: 320px;
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
  box-sizing: border-box;
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
  flex-shrink: 0;
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
  padding: 14px 16px;
  color: #5f6368;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e8eaed;

  &:first-of-type { padding-left: 36px; width: 18%; }
  &:nth-of-type(2) { width: 14%; }
  &:nth-of-type(3) { width: 14%; }
  &:nth-of-type(4) { width: 10%; }
  &:nth-of-type(5) { width: 10%; }
  &:last-of-type { padding-right: 36px; text-align: right; width: 34%; }
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

const EditableCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
`;

const CellInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border: 1.5px solid #1a73e8;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: #1f1f1f;

  &:focus {
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.15);
  }
`;

const CellText = styled.span`
  font-size: 13px;
  color: #3c4043;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CellPlaceholder = styled.span`
  font-size: 13px;
  color: #bdc1c6;
  font-style: italic;
`;

const CellEditBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border: none; border-radius: 6px;
  background: transparent; cursor: pointer; padding: 0;
  color: #9aa0a6;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s;
  
  &:hover { background: #e8f0fe; color: #1a73e8; }
`;

const EditableTd = styled(Td)`
  &:hover ${CellEditBtn} { opacity: 1; }
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

// ── Schedule UI ──

const ScheduleContainer = styled.div`
  padding: 28px 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ScheduleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #f8f9fa;
  border-radius: 16px;
  border: 1px solid #e8eaed;
`;

const ScheduleToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ToggleLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ToggleLabelMain = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
`;

const ToggleLabelSub = styled.span`
  font-size: 13px;
  color: #9aa0a6;
`;

const ToggleSwitch = styled.button<{ checked: boolean }>`
  width: 52px;
  height: 28px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  background: ${p => p.checked ? '#1a73e8' : '#dadce0'};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${p => p.checked ? '27px' : '3px'};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: left 0.2s;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ScheduleGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ScheduleRow = styled.div<{ disabled?: boolean }>`
  display: grid;
  grid-template-columns: 80px 1fr 1fr 60px;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-radius: 14px;
  border: 1.5px solid #e8eaed;
  background: ${p => p.disabled ? '#f8f9fa' : '#fff'};
  opacity: ${p => p.disabled ? 0.6 : 1};
  transition: all 0.15s;

  &:hover {
    border-color: ${p => p.disabled ? '#e8eaed' : '#1a73e8'};
    box-shadow: ${p => p.disabled ? 'none' : '0 2px 8px rgba(26,115,232,0.08)'};
  }
`;

const DayLabel = styled.span<{ today?: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${p => p.today ? '#1a73e8' : '#1f1f1f'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TodayDot = styled.span`
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #1a73e8;
`;

const TimeInput = styled.input`
  padding: 10px 14px;
  border: 1.5px solid #e8eaed;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #1f1f1f;
  background: #fff;
  outline: none;
  transition: all 0.15s;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26,115,232,0.12);
  }

  &:disabled {
    background: #f3f4f6;
    color: #9aa0a6;
    cursor: not-allowed;
  }
`;

const DayToggle = styled.button<{ active: boolean }>`
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1.5px solid ${p => p.active ? '#34a853' : '#dadce0'};
  background: ${p => p.active ? '#e6f4ea' : '#f8f9fa'};
  color: ${p => p.active ? '#137333' : '#9aa0a6'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.15s;

  &:hover {
    border-color: ${p => p.active ? '#137333' : '#5f6368'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Mode24Badge = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  background: #e6f4ea;
  border: 1px solid #ceead6;
  border-radius: 14px;
  color: #137333;
  font-size: 14px;
  font-weight: 600;
`;

const ScheduleNote = styled.div`
  font-size: 13px;
  color: #9aa0a6;
  padding: 0 4px;
  line-height: 1.5;
`;

// ─── Constants ───────────────────────────────────────────────────────────

const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// ─── Component ───────────────────────────────────────────────────────────

type AdminTab = 'users' | 'schedule';

type ConfirmAction =
    | { type: 'forceLogout'; userId: string; username: string }
    | { type: 'toggleActive'; userId: string; username: string; isActive: boolean }
    | null;

type EditState = {
    userId: string;
    field: 'username' | 'display_name' | 'class_name';
    value: string;
} | null;

export function AdminDashboard({ isOpen, onClose, jwt }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [editState, setEditState] = useState<EditState>(null);

    // Schedule state
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [systemSettings, setSystemSettings] = useState<SystemSettingItem[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleUpdating, setScheduleUpdating] = useState<number | null>(null);

    const scheduleEnabled = useMemo(() => {
        const setting = systemSettings.find(s => s.key === 'schedule_enabled');
        return setting?.value === 'true';
    }, [systemSettings]);

    const todayDow = useMemo(() => new Date().getDay(), []);

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

    const fetchSchedules = useCallback(async () => {
        setScheduleLoading(true);
        setError('');
        try {
            const [sched, settings] = await Promise.all([
                adminGetSchedules(jwt),
                adminGetSystemSettings(jwt),
            ]);
            setSchedules(sched);
            setSystemSettings(settings);
        } catch (err) {
            if (err instanceof AuthError && err.status === 403) {
                setAccessDenied(true);
            } else {
                setError(err instanceof Error ? err.message : '스케줄을 불러올 수 없습니다.');
            }
        } finally {
            setScheduleLoading(false);
        }
    }, [jwt]);

    useEffect(() => {
        if (isOpen && jwt) {
            fetchUsers();
            fetchSchedules();
            setSearchQuery('');
        }
    }, [isOpen, jwt]);

    // ── Schedule handlers ──

    const handleToggleScheduleEnabled = useCallback(async () => {
        const newValue = scheduleEnabled ? 'false' : 'true';
        try {
            const updated = await adminUpdateSystemSetting(jwt, 'schedule_enabled', newValue);
            setSystemSettings(prev => prev.map(s => s.key === 'schedule_enabled' ? updated : s));
        } catch (err) {
            setError(err instanceof Error ? err.message : '설정 변경에 실패했습니다.');
        }
    }, [jwt, scheduleEnabled]);

    const handleScheduleTimeChange = useCallback(async (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
        setScheduleUpdating(dayOfWeek);
        try {
            const updated = await adminUpdateSchedule(jwt, dayOfWeek, { [field]: value });
            setSchedules(prev => prev.map(s => s.day_of_week === dayOfWeek ? updated : s));
        } catch (err) {
            setError(err instanceof Error ? err.message : '스케줄 수정에 실패했습니다.');
        } finally {
            setScheduleUpdating(null);
        }
    }, [jwt]);

    const handleScheduleDayToggle = useCallback(async (dayOfWeek: number, currentActive: boolean) => {
        setScheduleUpdating(dayOfWeek);
        try {
            const updated = await adminUpdateSchedule(jwt, dayOfWeek, { is_active: !currentActive });
            setSchedules(prev => prev.map(s => s.day_of_week === dayOfWeek ? updated : s));
        } catch (err) {
            setError(err instanceof Error ? err.message : '스케줄 수정에 실패했습니다.');
        } finally {
            setScheduleUpdating(null);
        }
    }, [jwt]);

    // ── User handlers ──

    // 정렬: admin 먼저, 나머지는 숫자(username) 오름차순
    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => {
            // admin 우선
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            // 숫자 username은 숫자로 비교, 아니면 문자열 비교
            const numA = Number(a.username);
            const numB = Number(b.username);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.username.localeCompare(b.username, 'ko');
        });
    }, [users]);

    // 검색 필터링 (username, display_name, class_name으로 검색)
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return sortedUsers;
        const q = searchQuery.toLowerCase().trim();
        return sortedUsers.filter(u =>
            u.username.toLowerCase().includes(q) ||
            (u.display_name && u.display_name.toLowerCase().includes(q)) ||
            (u.class_name && u.class_name.toLowerCase().includes(q))
        );
    }, [sortedUsers, searchQuery]);

    // 통계
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.is_active).length;
        const inactive = total - active;
        const admins = users.filter(u => u.role === 'admin').length;
        const locked = users.filter(u => !u.is_active && u.failed_login_attempts >= 10).length;
        return { total, active, inactive, admins, locked };
    }, [users]);

    const startEdit = useCallback((userId: string, field: 'username' | 'display_name' | 'class_name', currentValue: string | null) => {
        setEditState({ userId, field, value: currentValue || '' });
    }, []);

    const submitEdit = useCallback(async () => {
        if (!editState) return;
        const { userId, field, value } = editState;
        setEditState(null);
        try {
            const updated = await adminUpdateUser(jwt, userId, { [field]: value });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
        } catch (err) {
            setError(err instanceof Error ? err.message : '수정에 실패했습니다.');
        }
    }, [editState, jwt]);

    const cancelEdit = useCallback(() => {
        setEditState(null);
    }, []);

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); submitEdit(); }
        else if (e.key === 'Escape') cancelEdit();
    }, [submitEdit, cancelEdit]);

    const handleForceLogout = useCallback((userId: string, username: string) => {
        setConfirmAction({ type: 'forceLogout', userId, username });
    }, []);

    const handleToggleActive = useCallback((userId: string, username: string, isActive: boolean) => {
        setConfirmAction({ type: 'toggleActive', userId, username, isActive });
    }, []);

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

    const handleRefresh = useCallback(() => {
        if (activeTab === 'users') {
            fetchUsers();
        } else {
            fetchSchedules();
        }
    }, [activeTab, fetchSchedules]);

    if (!isOpen) return null;

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
                        <IconBtn onClick={handleRefresh} disabled={loading || scheduleLoading} title="새로고침">
                            <RefreshCw size={18} style={(loading || scheduleLoading) ? { animation: 'spin 1s linear infinite' } : undefined} />
                        </IconBtn>
                        <IconBtn variant="close" onClick={onClose} title="닫기">
                            <X size={22} />
                        </IconBtn>
                    </HeaderActions>
                </PanelHeader>

                {/* ── Tabs ── */}
                <TabBar>
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                        <Users size={16} />
                        사용자 관리
                    </TabButton>
                    <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')}>
                        <Calendar size={16} />
                        운영 스케줄
                    </TabButton>
                </TabBar>

                {accessDenied ? (
                    <AccessDenied>
                        <Shield size={56} color="#d93025" />
                        <h3>접근 거부</h3>
                        <p>관리자 권한이 필요합니다.</p>
                    </AccessDenied>
                ) : activeTab === 'users' ? (
                    <>
                        {/* ── Toolbar: Search + Stats ── */}
                        <Toolbar>
                            <SearchWrapper>
                                <SearchIconWrap><Search size={18} /></SearchIconWrap>
                                <SearchInput
                                    type="text"
                                    placeholder="ID, 이름, 수업 검색..."
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
                                            <Th>이름</Th>
                                            <Th>수업</Th>
                                            <Th>역할</Th>
                                            <Th>상태</Th>
                                            <Th style={{ textAlign: 'right' }}>관리</Th>
                                        </tr>
                                    </Thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <Tr key={user.id}>
                                                <EditableTd>
                                                    <UserCell>
                                                        <UserIconWrap isAdmin={user.role === 'admin'}>
                                                            {user.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                                        </UserIconWrap>
                                                        <UserInfo>
                                                            {editState?.userId === user.id && editState.field === 'username' ? (
                                                                <CellInput
                                                                    autoFocus
                                                                    value={editState.value}
                                                                    onChange={e => setEditState({ ...editState, value: e.target.value })}
                                                                    onKeyDown={handleEditKeyDown}
                                                                    onBlur={submitEdit}
                                                                    maxLength={32}
                                                                    placeholder="아이디 입력"
                                                                    style={{ fontSize: 15, fontWeight: 600 }}
                                                                />
                                                            ) : (
                                                                <EditableCell>
                                                                    <UserNameText>{user.username}</UserNameText>
                                                                    {user.role !== 'admin' && (
                                                                        <CellEditBtn onClick={() => startEdit(user.id, 'username', user.username)} title="아이디 수정">
                                                                            <Pencil size={12} />
                                                                        </CellEditBtn>
                                                                    )}
                                                                </EditableCell>
                                                            )}
                                                            <UserSubText>
                                                                {new Date(user.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                            </UserSubText>
                                                        </UserInfo>
                                                    </UserCell>
                                                </EditableTd>
                                                <EditableTd>
                                                    {editState?.userId === user.id && editState.field === 'display_name' ? (
                                                        <EditableCell>
                                                            <CellInput
                                                                autoFocus
                                                                value={editState.value}
                                                                onChange={e => setEditState({ ...editState, value: e.target.value })}
                                                                onKeyDown={handleEditKeyDown}
                                                                onBlur={submitEdit}
                                                                maxLength={64}
                                                                placeholder="이름 입력"
                                                            />
                                                        </EditableCell>
                                                    ) : (
                                                        <EditableCell>
                                                            {user.display_name
                                                                ? <CellText>{user.display_name}</CellText>
                                                                : <CellPlaceholder>미설정</CellPlaceholder>
                                                            }
                                                            <CellEditBtn onClick={() => startEdit(user.id, 'display_name', user.display_name)} title="이름 수정">
                                                                <Pencil size={12} />
                                                            </CellEditBtn>
                                                        </EditableCell>
                                                    )}
                                                </EditableTd>
                                                <EditableTd>
                                                    {editState?.userId === user.id && editState.field === 'class_name' ? (
                                                        <EditableCell>
                                                            <CellInput
                                                                autoFocus
                                                                value={editState.value}
                                                                onChange={e => setEditState({ ...editState, value: e.target.value })}
                                                                onKeyDown={handleEditKeyDown}
                                                                onBlur={submitEdit}
                                                                maxLength={64}
                                                                placeholder="수업 입력"
                                                            />
                                                        </EditableCell>
                                                    ) : (
                                                        <EditableCell>
                                                            {user.class_name
                                                                ? <CellText>{user.class_name}</CellText>
                                                                : <CellPlaceholder>미설정</CellPlaceholder>
                                                            }
                                                            <CellEditBtn onClick={() => startEdit(user.id, 'class_name', user.class_name)} title="수업 수정">
                                                                <Pencil size={12} />
                                                            </CellEditBtn>
                                                        </EditableCell>
                                                    )}
                                                </EditableTd>
                                                <Td>
                                                    <RoleBadge isAdmin={user.role === 'admin'}>
                                                        {user.role === 'admin' ? '관리자' : '학생'}
                                                    </RoleBadge>
                                                </Td>
                                                <Td>
                                                    <StatusBadge active={user.is_active}>
                                                        {user.is_active
                                                            ? '활성'
                                                            : user.failed_login_attempts >= 10
                                                                ? '잠김'
                                                                : '비활성'
                                                        }
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
                ) : (
                    /* ══════════════ Schedule Tab ══════════════ */
                    <>
                        {/* ── Error ── */}
                        {error && (
                            <ErrorBanner>
                                <AlertCircle size={18} />
                                {error}
                            </ErrorBanner>
                        )}

                        <PanelBody>
                            {scheduleLoading ? (
                                <EmptyState>
                                    <RefreshCw size={36} color="#dadce0" style={{ animation: 'spin 1s linear infinite' }} />
                                    <p style={{ marginTop: 20, fontSize: 15 }}>스케줄을 불러오는 중...</p>
                                </EmptyState>
                            ) : (
                                <ScheduleContainer>
                                    {/* ── Toggle: schedule_enabled ── */}
                                    <ScheduleHeader>
                                        <ScheduleToggle>
                                            <Clock size={22} color="#1a73e8" />
                                            <ToggleLabel>
                                                <ToggleLabelMain>운영 스케줄 모드</ToggleLabelMain>
                                                <ToggleLabelSub>
                                                    {scheduleEnabled
                                                        ? '요일별 운영 시간에 따라 LLM 서비스가 제한됩니다.'
                                                        : '스케줄이 비활성화되어 24시간 운영 중입니다.'}
                                                </ToggleLabelSub>
                                            </ToggleLabel>
                                        </ScheduleToggle>
                                        <ToggleSwitch
                                            checked={scheduleEnabled}
                                            onClick={handleToggleScheduleEnabled}
                                            title={scheduleEnabled ? '스케줄 비활성화 (24시간 운영)' : '스케줄 활성화'}
                                        />
                                    </ScheduleHeader>

                                    {!scheduleEnabled && (
                                        <Mode24Badge>
                                            <Clock size={18} />
                                            24시간 운영 모드 — 스케줄에 관계없이 LLM 서비스가 항상 이용 가능합니다.
                                        </Mode24Badge>
                                    )}

                                    {/* ── 7-day grid ── */}
                                    <ScheduleGrid>
                                        {schedules.map(sched => {
                                            const isToday = sched.day_of_week === todayDow;
                                            const isUpdating = scheduleUpdating === sched.day_of_week;
                                            const isDisabledRow = !scheduleEnabled || !sched.is_active;

                                            return (
                                                <ScheduleRow key={sched.day_of_week} disabled={!scheduleEnabled}>
                                                    <DayLabel today={isToday}>
                                                        {isToday && <TodayDot />}
                                                        {DAY_NAMES[sched.day_of_week]}
                                                    </DayLabel>
                                                    <TimeInput
                                                        type="time"
                                                        value={sched.start_time}
                                                        disabled={isDisabledRow || isUpdating}
                                                        onChange={e => handleScheduleTimeChange(sched.day_of_week, 'start_time', e.target.value)}
                                                    />
                                                    <TimeInput
                                                        type="time"
                                                        value={sched.end_time}
                                                        disabled={isDisabledRow || isUpdating}
                                                        onChange={e => handleScheduleTimeChange(sched.day_of_week, 'end_time', e.target.value)}
                                                    />
                                                    <DayToggle
                                                        active={sched.is_active}
                                                        disabled={!scheduleEnabled || isUpdating}
                                                        onClick={() => handleScheduleDayToggle(sched.day_of_week, sched.is_active)}
                                                        title={sched.is_active ? '이 요일 비활성화' : '이 요일 활성화'}
                                                    >
                                                        {sched.is_active ? 'ON' : 'OFF'}
                                                    </DayToggle>
                                                </ScheduleRow>
                                            );
                                        })}
                                    </ScheduleGrid>

                                    <ScheduleNote>
                                        * 스케줄 모드가 활성화되면, 각 요일의 설정된 시간 내에서만 LLM 서비스를 이용할 수 있습니다.<br />
                                        * 요일별 ON/OFF 토글로 특정 요일의 운영을 중단할 수 있습니다.<br />
                                        * 시간 변경은 즉시 적용됩니다.
                                    </ScheduleNote>
                                </ScheduleContainer>
                            )}
                        </PanelBody>

                        <PanelFooter>
                            <span>
                                운영 모드: {scheduleEnabled ? '스케줄 기반' : '24시간 운영'}
                            </span>
                            <span>
                                <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                                활성 요일 {schedules.filter(s => s.is_active).length}일 / 7일
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
                            : '활성화하면 로그인 실패 횟수가 초기화되고 다시 로그인할 수 있습니다.'
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
