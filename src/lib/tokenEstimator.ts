/**
 * 클라이언트 측 토큰 수 추정 유틸리티
 *
 * Qwen 토크나이저 특성에 맞춰 대략적인 토큰 수를 추정합니다.
 * 정확한 값이 아닌 보수적(과대 추정) 근사치이며,
 * vLLM의 400 에러를 사전에 방지하는 용도입니다.
 *
 * 서버에서 실제 max_model_len을 가져와 동적으로 설정합니다.
 */
import type { Message, ContentPart } from './api';

// ─── 동적 설정 (서버에서 로드) ───────────────────────────────────────────────

/** 기본값 (서버에서 가져오기 전까지 사용) */
const DEFAULT_MAX_MODEL_LEN = 4096;
const DEFAULT_RESERVED_OUTPUT_TOKENS = 512;

/** 모듈 상태 — fetchTokenConfig()가 호출되면 업데이트됨 */
let _maxModelLen = DEFAULT_MAX_MODEL_LEN;
let _reservedOutputTokens = DEFAULT_RESERVED_OUTPUT_TOKENS;
let _maxInputTokens = _maxModelLen - _reservedOutputTokens;
let _configLoaded = false;

/**
 * 서버에서 토큰 설정을 가져와 모듈 상태를 업데이트합니다.
 * App 마운트 시 한 번 호출하면 됩니다.
 */
export async function fetchTokenConfig(): Promise<void> {
    if (_configLoaded) return;
    try {
        const res = await fetch('/api/v1/config');
        if (res.ok) {
            const data = await res.json();
            _maxModelLen = data.max_model_len ?? DEFAULT_MAX_MODEL_LEN;
            _reservedOutputTokens = data.reserved_output_tokens ?? DEFAULT_RESERVED_OUTPUT_TOKENS;
            _maxInputTokens = data.max_input_tokens ?? (_maxModelLen - _reservedOutputTokens);
            _configLoaded = true;
        }
    } catch {
        // 네트워크 실패 시 기본값 유지
        console.warn('[tokenEstimator] Failed to fetch config, using defaults');
    }
}

/** 현재 설정된 max_model_len */
export function getMaxModelLen(): number {
    return _maxModelLen;
}

/** 현재 설정된 최대 입력 토큰 */
export function getMaxInputTokens(): number {
    return _maxInputTokens;
}

/** 설정이 로드되었는지 여부 */
export function isConfigLoaded(): boolean {
    return _configLoaded;
}

// ─── 하위 호환용 상수 (로컬 개발 / import 편의) ─────────────────────────────
// 주의: 이 값들은 기본값이며, 실제 런타임에서는 get* 함수를 사용하세요.

export const MAX_MODEL_LEN = DEFAULT_MAX_MODEL_LEN;
export const RESERVED_OUTPUT_TOKENS = DEFAULT_RESERVED_OUTPUT_TOKENS;
export const MAX_INPUT_TOKENS = DEFAULT_MAX_MODEL_LEN - DEFAULT_RESERVED_OUTPUT_TOKENS;

/**
 * 메시지 하나당 chat template 오버헤드 (토큰)
 * Qwen chatml 형식: <|im_start|>role\n ... <|im_end|>\n  ≈ 약 7~10 토큰
 */
const MESSAGE_OVERHEAD_TOKENS = 10;

/**
 * system 프롬프트 기본 토큰 수 (vLLM/LiteLLM이 자동 삽입하는 "You are a helpful assistant.")
 * system message overhead(10) + 내용(≈6) = 약 16 토큰
 */
const SYSTEM_PROMPT_TOKENS = 16;

// ─── CJK 유니코드 범위 판별 ──────────────────────────────────────────────────

function isCJK(code: number): boolean {
    return (
        (code >= 0x3000 && code <= 0x9fff) ||   // CJK Unified + 가나 + 기호
        (code >= 0xac00 && code <= 0xd7af) ||   // 한글 음절
        (code >= 0xf900 && code <= 0xfaff) ||   // CJK 호환 한자
        (code >= 0x1100 && code <= 0x11ff) ||   // 한글 자모
        (code >= 0x3130 && code <= 0x318f)      // 한글 호환 자모
    );
}

// ─── 텍스트 → 토큰 추정 ─────────────────────────────────────────────────────

/**
 * 텍스트의 토큰 수를 추정합니다.
 *
 * Qwen 토크나이저 특성:
 *  - 한국어/CJK 문자: 글자당 약 1.0~2.0 토큰 → 보수적으로 1.4
 *  - 영문/라틴: 단어당 약 1.0~1.5 토큰 → 글자당 약 0.3
 *  - 숫자/공백/특수문자: 글자당 약 0.5
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;

    let tokens = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (isCJK(code)) {
            tokens += 1.4;
        } else if (
            (code >= 0x41 && code <= 0x5a) || // A-Z
            (code >= 0x61 && code <= 0x7a)    // a-z
        ) {
            tokens += 0.3;
        } else {
            // 숫자, 공백, 특수문자
            tokens += 0.5;
        }
    }

    return Math.ceil(tokens);
}

// ─── ContentPart → 토큰 추정 ────────────────────────────────────────────────

export function estimateContentPartTokens(part: ContentPart): number {
    if (part.type === 'text') {
        return estimateTokens(part.text);
    }
    if (part.type === 'image_url') {
        // 이미지는 vLLM에서 고정 토큰으로 처리 (Qwen2.5-VL: 약 1225 토큰)
        return 1225;
    }
    return 0;
}

// ─── 메시지 배열 → 총 토큰 추정 ─────────────────────────────────────────────

/**
 * 메시지 배열 전체의 토큰 수를 추정합니다.
 * system 프롬프트 + 모든 메시지의 content + chat template 오버헤드를 포함합니다.
 */
export function estimateMessagesTokens(messages: Message[]): number {
    let total = SYSTEM_PROMPT_TOKENS; // system prompt (항상 포함)

    for (const msg of messages) {
        total += MESSAGE_OVERHEAD_TOKENS; // chatml 오버헤드

        if (typeof msg.content === 'string') {
            total += estimateTokens(msg.content);
        } else {
            // multimodal content parts
            for (const part of msg.content) {
                total += estimateContentPartTokens(part);
            }
        }
    }

    return total;
}

// ─── 헬퍼: 퍼센트 / 상태 ────────────────────────────────────────────────────

export type TokenStatus = 'safe' | 'warning' | 'danger' | 'over';

/**
 * 현재 토큰 사용량의 상태를 반환합니다.
 * 동적 설정값(getMaxInputTokens)을 사용합니다.
 */
export function getTokenStatus(estimatedTokens: number): TokenStatus {
    const limit = _maxInputTokens;
    const ratio = estimatedTokens / limit;
    if (ratio > 1) return 'over';
    if (ratio > 0.9) return 'danger';
    if (ratio > 0.7) return 'warning';
    return 'safe';
}

/**
 * 사용률 퍼센트 (0~100+)
 * 동적 설정값(getMaxInputTokens)을 사용합니다.
 */
export function getTokenPercent(estimatedTokens: number): number {
    const limit = _maxInputTokens;
    return Math.round((estimatedTokens / limit) * 100);
}
