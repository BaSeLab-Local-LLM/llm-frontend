/** @jsxImportSource @emotion/react */
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { X, Save, Key, Cpu } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string, model: string) => void;
    initialApiKey: string;
    initialModel: string;
}


const PopoverOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
`;

const PopoverCard = styled.div`
  position: absolute;
  bottom: 80px; 
  left: 12px;
  width: 320px;
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border: 1px solid #e0e0e0;
  animation: popIn 0.2s ease-out;

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 30px;
    width: 16px;
    height: 16px;
    background: #ffffff;
    transform: rotate(45deg);
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }
`;

const TitleLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h3 { font-size: 16px; font-weight: 600; color: #1f1f1f; margin: 0; }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #5f6368;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  &:hover { background: #f1f3f4; }
`;

const MiniInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  margin-top: 6px;

  &:focus {
    border: 2px solid #1a73e8;
    padding: 9px 11px;
    background: #fff;
  }
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #444746;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 10px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover { background: #1557b0; }
`;

export function SettingsModal({ isOpen, onClose, onSave, initialApiKey, initialModel }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [model, setModel] = useState(initialModel);

    useEffect(() => {
        setApiKey(initialApiKey);
        setModel(initialModel);
    }, [initialApiKey, initialModel, isOpen]);

    if (!isOpen) return null;

    return (
        <PopoverOverlay onClick={onClose}>
            <PopoverCard onClick={(e) => e.stopPropagation()}>
                <TitleLine>
                    <h3>LLM 실습 환경 설정</h3>
                    <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
                </TitleLine>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <Label><Key size={14} /> API Key</Label>
                        <MiniInput
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                        />
                    </div>

                    <div>
                        <Label><Cpu size={14} /> Model</Label>
                        <MiniInput
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="model-name"
                        />
                    </div>
                </div>

                <ActionButton onClick={() => {
                    onSave(apiKey, model);
                    onClose();
                }}>
                    <Save size={16} /> 저장 및 적용
                </ActionButton>
            </PopoverCard>
        </PopoverOverlay>
    );
}