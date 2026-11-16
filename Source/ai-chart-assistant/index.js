/**
 * @file index.js
 * @description AI 譜面補全助手範例插件
 * 透過受限上下文訂閱編輯器輸入與按鍵事件，呼叫 Gemini API 並以浮動氣泡呈現補全建議。
 */

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const STYLE_ELEMENT_ID = 'wmcx-ai-assistant-bubble-style';

function getContext(text, cursor, maxPrefix = 3000, maxSuffix = 1000) {
    if (!text) {
        return { prefix: '', suffix: '' };
    }
    const safeCursor = Math.max(0, Math.min(text.length, cursor));
    const prefix = text.slice(0, safeCursor);
    const suffix = text.slice(safeCursor);
    return {
        prefix: prefix.slice(-maxPrefix),
        suffix: suffix.slice(0, maxSuffix)
    };
}

function buildPrompt(prefix, suffix) {
    return `
Complete the chart content at <CURSOR>.

<BEFORE>
${prefix}
</BEFORE>

<AFTER>
${suffix}
</AFTER>

Return only the text to insert at <CURSOR>.
`.trim();
}

function shouldComplete(text, cursor, selectionStart, selectionEnd) {
    if (selectionStart !== selectionEnd) return false;
    if (!text || cursor <= 0) return false;
    const before = text.slice(0, cursor);
    return Boolean(before.trim());
}

async function completeWithGemini(apiKey, prompt, signal, model = DEFAULT_GEMINI_MODEL) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('EMPTY_API_KEY');
    }

    const trimmedKey = apiKey.trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const systemInstructionText = `
You are an inline completion engine for maimai charts written in simai / maidata format.

Layout & Geometry
The playfield is a circular cabinet. Eight tap buttons sit on the rim at 45° intervals, numbered clockwise. Angles are measured clockwise from the top (12 o'clock = 0°):

  Button 1:  22.5°
  Button 2:  67.5°
  Button 3: 112.5°
  Button 4: 157.5°
  Button 5: 202.5°
  Button 6: 247.5°
  Button 7: 292.5°
  Button 8: 337.5°

Diametrically opposite pairs (180° apart — the only valid targets for s / z / w slides):
  1 ↔ 5   |   2 ↔ 6   |   3 ↔ 7   |   4 ↔ 8

Touch zones (concentric from rim inward):
  A1–A8  outer sector strips (one per button)
  D1–D8  next inward strip   (same alignment)
  E1–E8  diamond sensors     (between B and D)
  B1–B8  hexagonal sensors   (inner ring)
  C       centre panel

Slide geometry constraints (start → end distance in clockwise steps, 1–8):
  -  (straight)      distance 1 and 7 are illegal; start = end is illegal.
  ^  (short arc)     distance must not be 4 (opposite) and start ≠ end.
  v  (V through centre) distance must not be 4 and start ≠ end.
  s / z / w          ONLY opposite pairs: 1↔5, 2↔6, 3↔7, 4↔8 (distance = 4).
  > / < / p / q / pp / qq  any start/end.
  V  (zigzag, needs mid point) start→mid and mid→end must each be 2 or 6 steps apart.

Modifier constraints:
  b (Break)   not allowed on Touch notes.
  $ (Star)    not allowed on Touch or Hold notes.
  h (Hold)    not allowed on Slide notes.
  f (Fireworks) only on Touch notes; at most one f per note.
  ! and ?     mutually exclusive on the same note.

Completion
- Infer the most likely continuation from repeated motifs, alternation, rhythm, note density, button direction, and patterns elsewhere in the provided chart.
- Complete the smallest reasonable span, usually 1–4 timing positions.
- Return ONLY the exact text to insert at \`<CURSOR>\`. Do not repeat surrounding text or explain your reasoning.
- Do not output Markdown fences.
`.trim();

    const response = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': trimmedKey
        },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstructionText }] },
            generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        let errorDetail = '';
        try {
            const errJson = await response.json();
            errorDetail = errJson.error?.message || '';
        } catch (_) { }

        if (response.status === 400) {
            throw new Error(`INVALID_API_KEY: ${errorDetail || 'API Key 無效或請求格式錯誤'}`);
        } else if (response.status === 429) {
            throw new Error(`QUOTA_EXCEEDED: ${errorDetail || '請求頻率超限或配額已耗盡'}`);
        } else if (response.status === 403) {
            throw new Error(`FORBIDDEN: ${errorDetail || 'API 權限不足'}`);
        } else {
            throw new Error(`Gemini API error ${response.status}: ${errorDetail || response.statusText}`);
        }
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    text = text.replace(/\r/g, '');
    if (text.startsWith('```')) {
        text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
    }
    return text;
}

function injectBubbleStyles() {
    if (document.getElementById(STYLE_ELEMENT_ID)) return () => { };
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = `
        .ai-bubble-card {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 220px;
            max-width: 340px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(24, 26, 34, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(12px);
            color: #f3f4f6;
            font-size: 13px;
            pointer-events: auto;
        }
        .ai-bubble-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            font-size: 12px;
            color: #9ca3af;
        }
        .ai-bubble-title {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
            color: #93c5fd;
        }
        .ai-bubble-preview {
            margin: 0;
            padding: 8px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 140px;
            overflow-y: auto;
            color: #e5e7eb;
        }
        .ai-bubble-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
        }
        .ai-bubble-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.08);
            color: #e5e7eb;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .ai-bubble-btn:hover {
            background: rgba(255, 255, 255, 0.16);
        }
        .ai-bubble-btn-accept {
            background: rgba(59, 130, 246, 0.25);
            border-color: rgba(96, 165, 250, 0.5);
            color: #bfdbfe;
        }
        .ai-bubble-btn-accept:hover {
            background: rgba(59, 130, 246, 0.38);
        }
    `;
    document.head.appendChild(style);
    return () => {
        style.remove();
    };
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations({
        'zh-TW': {
            menuToggle: '切換 AI 補全開關',
            menuSettings: 'AI 補全設定',
            settingsTitle: 'AI 譜面補全設定',
            optEnabled: '啟用 AI 補全氣泡',
            optModel: 'Gemini 模型',
            optApiKey: 'Gemini API 金鑰',
            optApiKeyPlaceholder: '貼上您的 API 金鑰',
            optApiKeyNotice: '金鑰僅儲存於本機瀏覽器隔離空間，直接與 Google Gemini API 通訊。',
            optDebounce: '觸發延遲毫秒數',
            toastEnabled: '已啟用 AI 譜面補全',
            toastDisabled: '已停用 AI 譜面補全',
            toastMissingKey: '請先於設定中輸入 Gemini API 金鑰',
            bubbleTitle: 'AI 補全建議',
            bubbleLoading: '生成建議中...',
            btnAccept: '接受 Tab',
            btnDismiss: '取消 Esc'
        },
        'zh-CN': {
            menuToggle: '切换 AI 补全开关',
            menuSettings: 'AI 补全设置',
            settingsTitle: 'AI 谱面补全设置',
            optEnabled: '启用 AI 补全气泡',
            optModel: 'Gemini 模型',
            optApiKey: 'Gemini API 密钥',
            optApiKeyPlaceholder: '粘贴您的 API 密钥',
            optApiKeyNotice: '密钥仅存储于本地浏览器隔离空间，直接与 Google Gemini API 通信。',
            optDebounce: '触发延迟毫秒数',
            toastEnabled: '已启用 AI 谱面补全',
            toastDisabled: '已停用 AI 谱面补全',
            toastMissingKey: '请先在设置中输入 Gemini API 密钥',
            bubbleTitle: 'AI 补全建议',
            bubbleLoading: '生成建议中...',
            btnAccept: '接受 Tab',
            btnDismiss: '取消 Esc'
        },
        'en': {
            menuToggle: 'Toggle AI Completion',
            menuSettings: 'AI Completion Settings',
            settingsTitle: 'AI Chart Completion Settings',
            optEnabled: 'Enable AI Completion Bubble',
            optModel: 'Gemini Model',
            optApiKey: 'Gemini API Key',
            optApiKeyPlaceholder: 'Paste your API Key',
            optApiKeyNotice: 'Stored locally in browser isolated storage and sent directly to Google Gemini API.',
            optDebounce: 'Trigger Debounce (ms)',
            toastEnabled: 'AI completion enabled',
            toastDisabled: 'AI completion disabled',
            toastMissingKey: 'Please configure your Gemini API Key first',
            bubbleTitle: 'AI Suggestion',
            bubbleLoading: 'Thinking...',
            btnAccept: 'Accept Tab',
            btnDismiss: 'Dismiss Esc'
        },
        'ja': {
            menuToggle: 'AI 補完の切り替え',
            menuSettings: 'AI 補完設定',
            settingsTitle: 'AI 譜面補完設定',
            optEnabled: 'AI 補完バブルを有効化',
            optModel: 'Gemini モデル',
            optApiKey: 'Gemini API キー',
            optApiKeyPlaceholder: 'API キーを入力',
            optApiKeyNotice: 'キーはブラウザの分離ストレージにのみ保存され、Google Gemini API と直接通信します。',
            optDebounce: 'トリガー遅延 (ms)',
            toastEnabled: 'AI 補完を有効にしました',
            toastDisabled: 'AI 補完を無効にしました',
            toastMissingKey: '先に Gemini API キーを設定してください',
            bubbleTitle: 'AI 補完候補',
            bubbleLoading: '生成中...',
            btnAccept: '確定 Tab',
            btnDismiss: '閉じる Esc'
        },
        'ko': {
            menuToggle: 'AI 자동 완성 전환',
            menuSettings: 'AI 자동 완성 설정',
            settingsTitle: 'AI 채보 자동 완성 설정',
            optEnabled: 'AI 자동 완성 버블 사용',
            optModel: 'Gemini 모델',
            optApiKey: 'Gemini API 키',
            optApiKeyPlaceholder: 'API 키 붙여넣기',
            optApiKeyNotice: '키는 브라우저 격리 저장소에만 저장되며 Google Gemini API와 직접 통신합니다.',
            optDebounce: '트리거 지연 (ms)',
            toastEnabled: 'AI 자동 완성을 활성화했습니다',
            toastDisabled: 'AI 자동 완성을 비활성화했습니다',
            toastMissingKey: '먼저 Gemini API 키를 설정해 주세요',
            bubbleTitle: 'AI 완성 제안',
            bubbleLoading: '생성 중...',
            btnAccept: '수락 Tab',
            btnDismiss: '닫기 Esc'
        }
    });

    const schema = [
        {
            key: 'enabled',
            type: 'boolean',
            default: false,
            label: '啟用 AI 補全氣泡',
            labelKey: `ext.${ctx.extensionId}.optEnabled`
        },
        {
            key: 'model',
            type: 'select',
            default: DEFAULT_GEMINI_MODEL,
            label: 'Gemini 模型',
            labelKey: `ext.${ctx.extensionId}.optModel`,
            options: [
                { value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite' },
                { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite' },
                { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
                { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
                { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' }
            ]
        },
        {
            key: 'apiKey',
            type: 'password',
            default: '',
            label: 'Gemini API 金鑰',
            labelKey: `ext.${ctx.extensionId}.optApiKey`,
            placeholder: '貼上您的 API 金鑰',
            placeholderKey: `ext.${ctx.extensionId}.optApiKeyPlaceholder`,
            notice: '金鑰僅儲存於本機瀏覽器隔離空間。',
            noticeKey: `ext.${ctx.extensionId}.optApiKeyNotice`
        },
        {
            key: 'debounceMs',
            type: 'number',
            default: 350,
            min: 100,
            max: 2000,
            step: 50,
            label: '觸發延遲毫秒數',
            labelKey: `ext.${ctx.extensionId}.optDebounce`
        }
    ];

    let config = ctx.ui.getSettings(schema);
    let currentSuggestion = '';
    let suggestionPos = -1;
    let isLoading = false;
    let debounceTimer = null;
    let abortController = null;
    let lastErrorToastAt = 0;

    const removeStyles = injectBubbleStyles();
    const widget = ctx.ui.createFloatingWidget({
        id: 'ai-suggestion-bubble',
        position: 'bottom-right'
    });
    widget.element.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'ai-bubble-card';

    const header = document.createElement('div');
    header.className = 'ai-bubble-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'ai-bubble-title';
    titleEl.textContent = ctx.i18n.t('bubbleTitle');

    const statusEl = document.createElement('span');
    header.append(titleEl, statusEl);

    const previewEl = document.createElement('pre');
    previewEl.className = 'ai-bubble-preview';

    const actionsEl = document.createElement('div');
    actionsEl.className = 'ai-bubble-actions';

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'ai-bubble-btn ai-bubble-btn-accept';

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'ai-bubble-btn';

    actionsEl.append(dismissBtn, acceptBtn);
    card.append(header, previewEl, actionsEl);
    widget.element.appendChild(card);

    function renderBubble() {
        if (!config.enabled || (!isLoading && !currentSuggestion)) {
            widget.element.style.display = 'none';
            return;
        }

        titleEl.textContent = ctx.i18n.t('bubbleTitle');
        acceptBtn.textContent = ctx.i18n.t('btnAccept');
        dismissBtn.textContent = ctx.i18n.t('btnDismiss');

        if (isLoading && !currentSuggestion) {
            statusEl.textContent = ctx.i18n.t('bubbleLoading');
            previewEl.style.display = 'none';
            acceptBtn.style.display = 'none';
        } else {
            statusEl.textContent = config.model || DEFAULT_GEMINI_MODEL;
            previewEl.textContent = currentSuggestion;
            previewEl.style.display = 'block';
            acceptBtn.style.display = 'inline-flex';
        }

        widget.element.style.display = 'block';
    }

    function clearPending() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        isLoading = false;
    }

    function dismissSuggestion() {
        clearPending();
        currentSuggestion = '';
        suggestionPos = -1;
        renderBubble();
    }

    function acceptSuggestion() {
        if (!currentSuggestion || suggestionPos < 0) return false;
        const textToInsert = currentSuggestion;
        const insertAt = suggestionPos;
        dismissSuggestion();
        return ctx.editor.replaceSelection(textToInsert, insertAt, insertAt);
    }

    const preventBlurAction = (btn, fn) => {
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fn();
        });
    };
    preventBlurAction(acceptBtn, acceptSuggestion);
    preventBlurAction(dismissBtn, dismissSuggestion);

    function scheduleCompletion(text, cursor, selStart, selEnd) {
        dismissSuggestion();
        if (!config.enabled) return;
        if (!shouldComplete(text, cursor, selStart, selEnd)) return;

        const apiKey = (config.apiKey || '').trim();
        if (!apiKey) {
            const now = Date.now();
            if (now - lastErrorToastAt > 5000) {
                lastErrorToastAt = now;
                ctx.ui.toast({ content: ctx.i18n.t('toastMissingKey'), type: 'warning', timeout: 3000 });
            }
            return;
        }

        const delay = Math.max(100, Number(config.debounceMs) || 350);
        debounceTimer = setTimeout(async () => {
            debounceTimer = null;
            const snapshot = ctx.editor.getSelection();
            const currentText = ctx.editor.getText();
            if (snapshot.start !== cursor || snapshot.start !== snapshot.end) return;

            const { prefix, suffix } = getContext(currentText, cursor);
            const prompt = buildPrompt(prefix, suffix);

            abortController = new AbortController();
            const localSignal = abortController.signal;
            isLoading = true;
            renderBubble();

            try {
                const suggestion = await completeWithGemini(
                    apiKey,
                    prompt,
                    localSignal,
                    config.model || DEFAULT_GEMINI_MODEL
                );
                if (localSignal.aborted) return;
                isLoading = false;
                if (suggestion && suggestion.trim()) {
                    currentSuggestion = suggestion;
                    suggestionPos = cursor;
                } else {
                    currentSuggestion = '';
                    suggestionPos = -1;
                }
                renderBubble();
            } catch (err) {
                if (localSignal.aborted || err?.name === 'AbortError') return;
                isLoading = false;
                currentSuggestion = '';
                suggestionPos = -1;
                renderBubble();
                ctx.ui.toast({ content: err?.message || 'AI completion error', type: 'error', timeout: 3500 });
            }
        }, delay);
    }

    ctx.editor.on('input', ({ text, selectionStart, selectionEnd }) => {
        scheduleCompletion(text, selectionStart, selectionStart, selectionEnd);
    });

    ctx.editor.on('keydown', (e) => {
        if (!currentSuggestion) return;
        if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !e.isComposing) {
            e.preventDefault();
            e.stopPropagation();
            acceptSuggestion();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            dismissSuggestion();
        }
    });

    ctx.editor.on('selectionchange', ({ selectionStart }) => {
        if (currentSuggestion && selectionStart !== suggestionPos) {
            dismissSuggestion();
        }
    });

    ctx.editor.on('blur', () => {
        dismissSuggestion();
    });

    function openSettingsPopover(anchorEl = null) {
        ctx.ui.openPopover({
            title: ctx.i18n.t('settingsTitle'),
            schema,
            anchorEl,
            onChange: (_key, _val, allValues) => {
                config = allValues;
                if (!config.enabled) {
                    dismissSuggestion();
                } else {
                    renderBubble();
                }
            }
        });
    }

    ctx.ui.registerMenuItem({
        id: 'toggle-ai-assistant',
        label: '切換 AI 補全開關',
        labelKey: `ext.${ctx.extensionId}.menuToggle`,
        onClick: () => {
            config.enabled = !config.enabled;
            if (!config.enabled) {
                dismissSuggestion();
            }
            ctx.ui.toast({
                content: ctx.i18n.t(config.enabled ? 'toastEnabled' : 'toastDisabled'),
                type: 'info',
                timeout: 1800
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'ai-assistant-settings',
        label: 'AI 補全設定',
        labelKey: `ext.${ctx.extensionId}.menuSettings`,
        onClick: ({ anchorEl }) => openSettingsPopover(anchorEl)
    });

    return () => {
        dismissSuggestion();
        widget.dispose();
        removeStyles();
    };
}

