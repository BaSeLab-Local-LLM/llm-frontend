/** @jsxImportSource @emotion/react */
import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { AlertTriangle, LogOut, Trash2, UserX, UserCheck, ShieldAlert, type LucideIcon } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'logout';

interface ConfirmModalProps {
    isOpen: boolean;
    variant?: ConfirmVariant;
    icon?: LucideIcon;
    title: string;
    message: string;
    subMessage?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// ─── Variant Config ──────────────────────────────────────────────────────────

const variantConfig: Record<ConfirmVariant, {
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    btnBg: string;
    btnHover: string;
}> = {
    danger: {
        icon: AlertTriangle,
        iconBg: '#fef2f2',
        iconColor: '#dc2626',
        btnBg: '#dc2626',
        btnHover: '#b91c1c',
    },
    warning: {
        icon: ShieldAlert,
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        btnBg: '#d97706',
        btnHover: '#b45309',
    },
    info: {
        icon: AlertTriangle,
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        btnBg: '#2563eb',
        btnHover: '#1d4ed8',
    },
    logout: {
        icon: LogOut,
        iconBg: '#fef2f2',
        iconColor: '#dc2626',
        btnBg: '#dc2626',
        btnHover: '#b91c1c',
    },
};

// ─── Styled Components ───────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Card = styled.div`
  width: 400px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: scaleIn 0.2s ease-out;

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const Body = styled.div`
  padding: 28px 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const IconCircle = styled.div<{ bg: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.bg};
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #5f6368;
`;

const SubMessage = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9aa0a6;
  background: #f8f9fa;
  padding: 8px 14px;
  border-radius: 10px;
`;

const Footer = styled.div`
  display: flex;
  gap: 10px;
  padding: 0 28px 24px;
  justify-content: center;
`;

const CancelBtn = styled.button`
  flex: 1;
  max-width: 160px;
  padding: 12px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #fff;
  color: #5f6368;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f8f9fa;
    border-color: #dadce0;
  }
  &:active { transform: scale(0.98); }
`;

const ConfirmBtn = styled.button<{ bg: string; hoverBg: string }>`
  flex: 1;
  max-width: 160px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: ${p => p.bg};
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: ${p => p.hoverBg}; }
  &:active { transform: scale(0.98); }
`;

// ─── Component ───────────────────────────────────────────────────────────────

export function ConfirmModal({
    isOpen,
    variant = 'danger',
    icon,
    title,
    message,
    subMessage,
    confirmText = '확인',
    cancelText = '취소',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    // ESC 키로 취소
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onCancel]);

    // 열릴 때 확인 버튼에 포커스
    useEffect(() => {
        if (isOpen) confirmRef.current?.focus();
    }, [isOpen]);

    if (!isOpen) return null;

    const config = variantConfig[variant];
    const IconComponent = icon || config.icon;

    return (
        <Overlay onClick={onCancel}>
            <Card onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Body>
                    <IconCircle bg={config.iconBg}>
                        <IconComponent size={28} color={config.iconColor} />
                    </IconCircle>
                    <Title>{title}</Title>
                    <Message>{message}</Message>
                    {subMessage && <SubMessage>{subMessage}</SubMessage>}
                </Body>
                <Footer>
                    <CancelBtn onClick={onCancel}>
                        {cancelText}
                    </CancelBtn>
                    <ConfirmBtn
                        ref={confirmRef}
                        bg={config.btnBg}
                        hoverBg={config.btnHover}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </ConfirmBtn>
                </Footer>
            </Card>
        </Overlay>
    );
}

// ─── Preset Exports ──────────────────────────────────────────────────────────

export const ConfirmIcons = {
    LogOut,
    Trash2,
    UserX,
    UserCheck,
    ShieldAlert,
    AlertTriangle,
};
