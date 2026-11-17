const SETTINGS_SCHEMA = [
    { key: 'visible', type: 'boolean', default: true, labelKey: 'ext.com.wmcx.timeline-jog-dial.optVisible' },
    { key: 'mobileOnly', type: 'boolean', default: false, labelKey: 'ext.com.wmcx.timeline-jog-dial.optMobileOnly' },
    { key: 'secPerTurn', type: 'number', default: 4, min: 0.5, max: 30, step: 0.5, labelKey: 'ext.com.wmcx.timeline-jog-dial.optSecPerTurn' },
    { key: 'verticalPos', type: 'number', default: 55, min: 20, max: 85, step: 1, labelKey: 'ext.com.wmcx.timeline-jog-dial.optVerticalPos' },
    { key: 'dialSize', type: 'number', default: 220, min: 160, max: 320, step: 8, labelKey: 'ext.com.wmcx.timeline-jog-dial.optDialSize' }
];

const DEFAULT_DIAL_SIZE = 220;
const MIN_DIAL_SIZE = 160;
const MAX_DIAL_SIZE = 320;
const KEYBOARD_STEP_SEC = 0.05;
const KEYBOARD_FAST_STEP_SEC = 0.25;
const SVG_NS = 'http://www.w3.org/2000/svg';

const LOCALES = {
    'zh-TW': {
        menuToggle: '顯示 / 隱藏旋鈕',
        menuSettings: '旋鈕設定',
        settingsTitle: '時間軸微調旋鈕設定',
        optVisible: '顯示右側旋鈕',
        optMobileOnly: '僅在手機或窄螢幕顯示',
        optSecPerTurn: '每轉一圈秒數',
        optVerticalPos: '垂直位置百分比',
        optDialSize: '旋鈕直徑大小',
        toastShown: '已顯示時間軸微調旋鈕',
        toastHidden: '已隱藏時間軸微調旋鈕',
        ariaDial: '時間軸微調飛梭旋鈕',
        btnCollapse: '收合微調旋鈕',
        btnExpand: '展開微調旋鈕'
    },
    'zh-CN': {
        menuToggle: '显示 / 隐藏旋钮',
        menuSettings: '旋钮设置',
        settingsTitle: '时间轴微调旋钮设置',
        optVisible: '显示右侧旋钮',
        optMobileOnly: '仅在手机或窄屏幕显示',
        optSecPerTurn: '每转一圈秒数',
        optVerticalPos: '垂直位置百分比',
        optDialSize: '旋钮直径大小',
        toastShown: '已显示时间轴微调旋钮',
        toastHidden: '已隐藏时间轴微调旋钮',
        ariaDial: '时间轴微调飞梭旋钮',
        btnCollapse: '收合微调旋钮',
        btnExpand: '展开微调旋钮'
    },
    en: {
        menuToggle: 'Show / Hide Jog Dial',
        menuSettings: 'Dial Settings',
        settingsTitle: 'Timeline Jog Dial Settings',
        optVisible: 'Show right-side dial',
        optMobileOnly: 'Mobile / narrow screen only',
        optSecPerTurn: 'Seconds per full turn',
        optVerticalPos: 'Vertical position (%)',
        optDialSize: 'Dial diameter (px)',
        toastShown: 'Timeline jog dial shown',
        toastHidden: 'Timeline jog dial hidden',
        ariaDial: 'Timeline Jog Wheel',
        btnCollapse: 'Collapse Jog Wheel',
        btnExpand: 'Expand Jog Wheel'
    },
    ja: {
        menuToggle: 'ジョグダイヤル表示切替',
        menuSettings: 'ダイヤル設定',
        settingsTitle: 'タイムラインジョグ設定',
        optVisible: '右側にダイヤルを表示',
        optMobileOnly: 'モバイル・狭画面のみ表示',
        optSecPerTurn: '1回転あたりの秒数',
        optVerticalPos: '垂直位置 (%)',
        optDialSize: 'ダイヤル直径 (px)',
        toastShown: 'ジョグダイヤルを表示しました',
        toastHidden: 'ジョグダイヤルを非表示にしました',
        ariaDial: 'タイムラインジョグホイール',
        btnCollapse: 'ジョグホイールを折りたたむ',
        btnExpand: 'ジョグホイールを展開'
    },
    ko: {
        menuToggle: '조그 다이얼 표시 전환',
        menuSettings: '다이얼 설정',
        settingsTitle: '타임라인 조그 설정',
        optVisible: '오른쪽 다이얼 표시',
        optMobileOnly: '모바일/좁은 화면에서만 표시',
        optSecPerTurn: '1회전당 초 단위',
        optVerticalPos: '세로 위치 (%)',
        optDialSize: '다이얼 크기 (px)',
        toastShown: '조그 다이얼을 표시했습니다',
        toastHidden: '조그 다이얼을 숨겼습니다',
        ariaDial: '타임라인 조그 휠',
        btnCollapse: '조그 휠 접기',
        btnExpand: '조그 휠 펼치기'
    }
};

function formatTime(sec) {
    const safe = Math.max(0, Number(sec) || 0);
    const m = Math.floor(safe / 60);
    const s = (safe % 60).toFixed(2).padStart(5, '0');
    return `${String(m).padStart(2, '0')}:${s}`;
}

function resolveDialSize(rawSize) {
    const parsed = Number(rawSize);
    if (!Number.isFinite(parsed) || parsed < MIN_DIAL_SIZE) {
        return DEFAULT_DIAL_SIZE;
    }
    return Math.min(MAX_DIAL_SIZE, Math.max(MIN_DIAL_SIZE, parsed));
}

function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, String(value));
    }
    return el;
}

function createTicksSvg() {
    const svg = createSvgElement('svg', {
        class: 'jog-ticks-svg',
        viewBox: '0 0 200 200',
        'aria-hidden': 'true',
        focusable: 'false'
    });

    // 90 格放射刻度，每 5 格配置 1 條白色主刻度與 4 條灰色次刻度
    for (let i = 0; i < 90; i++) {
        const rad = (i * 4 * Math.PI) / 180;
        const isMajor = i % 5 === 0;
        const rOuter = 94.5;
        const rInner = isMajor ? 81.5 : 86;
        const line = createSvgElement('line', {
            x1: (100 + rInner * Math.cos(rad)).toFixed(2),
            y1: (100 + rInner * Math.sin(rad)).toFixed(2),
            x2: (100 + rOuter * Math.cos(rad)).toFixed(2),
            y2: (100 + rOuter * Math.sin(rad)).toFixed(2),
            stroke: isMajor ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.36)',
            'stroke-width': isMajor ? '2' : '1.25',
            'stroke-linecap': 'butt'
        });
        svg.appendChild(line);
    }
    return svg;
}

function createPointerSvg() {
    const svg = createSvgElement('svg', {
        class: 'jog-pointer-svg',
        viewBox: '0 0 200 200',
        'aria-hidden': 'true',
        focusable: 'false'
    });
    svg.appendChild(createSvgElement('polygon', {
        points: '11,97.4 29,100 11,102.6',
        fill: '#49e'
    }));
    return svg;
}

function createCloseIconSvg() {
    const svg = createSvgElement('svg', {
        viewBox: '0 0 24 24',
        'aria-hidden': 'true',
        focusable: 'false'
    });
    svg.appendChild(createSvgElement('path', {
        d: 'M7.5 7.5l9 9M16.5 7.5l-9 9',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.9',
        'stroke-linecap': 'round'
    }));
    return svg;
}

function createExpandIconSvg() {
    const svg = createSvgElement('svg', {
        viewBox: '0 0 24 24',
        'aria-hidden': 'true',
        focusable: 'false'
    });
    svg.appendChild(createSvgElement('path', {
        d: 'M14.5 6.5L9 12l5.5 5.5',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2.1',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    }));
    return svg;
}

function createPlayheadIconSvg() {
    const svg = createSvgElement('svg', {
        class: 'jog-playhead-icon',
        viewBox: '0 0 16 16',
        'aria-hidden': 'true',
        focusable: 'false'
    });
    svg.appendChild(createSvgElement('path', {
        d: 'M4 2.5h8v6.6L8 13.4 4 9.1V2.5z',
        fill: 'none',
        stroke: '#49e',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round'
    }));
    svg.appendChild(createSvgElement('line', {
        x1: '8',
        y1: '4.6',
        x2: '8',
        y2: '9.2',
        stroke: '#49e',
        'stroke-width': '1.4',
        'stroke-linecap': 'round'
    }));
    return svg;
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(LOCALES);

    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let runtimeVisible = settings.visible !== false;
    let isCollapsed = false;

    const widget = ctx.ui.createFloatingWidget({
        id: 'jog-dial',
        position: 'right'
    });
    const host = widget.element;
    host.style.position = 'fixed';
    host.style.left = 'auto';
    host.style.right = '0px';
    host.style.bottom = 'auto';
    host.style.transform = 'translateY(-50%)';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            -webkit-user-select: none;
            user-select: none;
            pointer-events: none;
        }
        .jog-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            pointer-events: none;
        }
        .jog-clip {
            position: relative;
            width: calc(var(--dial-size, 220px) / 2 + 16px);
            height: calc(var(--dial-size, 220px) + 32px);
            padding: 16px 0 16px 16px;
            box-sizing: border-box;
            overflow: hidden;
            pointer-events: none;
        }
        .jog-dial {
            position: absolute;
            left: 16px;
            top: 16px;
            width: var(--dial-size, 220px);
            height: var(--dial-size, 220px);
            border-radius: 50%;
            box-sizing: border-box;
            background: radial-gradient(circle at 50% 50%, #2d2f34 0%, #25262b 72%, #1d1e22 100%);
            border: 1.5px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.58), inset 0 1px 1px rgba(255, 255, 255, 0.08);
            touch-action: none;
            cursor: grab;
            pointer-events: auto;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .jog-dial:hover {
            border-color: rgba(255, 255, 255, 0.24);
        }
        .jog-dial.is-dragging {
            cursor: grabbing;
            border-color: rgba(68, 153, 238, 0.65);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65), 0 0 14px rgba(68, 153, 238, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.12);
        }
        .jog-dial:focus-visible {
            outline: 2px solid #49e;
            outline-offset: 2px;
        }
        .jog-ticks-svg,
        .jog-pointer-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        .jog-pointer-svg {
            z-index: 2;
        }
        .jog-close-btn {
            position: absolute;
            right: calc(var(--dial-size, 220px) * 0.17);
            top: 50%;
            transform: translate(50%, -50%);
            width: clamp(32px, calc(var(--dial-size, 220px) * 0.175), 52px);
            height: clamp(32px, calc(var(--dial-size, 220px) * 0.175), 52px);
            padding: 0;
            border-radius: 50%;
            border: 1.5px solid #49e;
            background: rgba(16, 18, 22, 0.45);
            color: #49e;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            z-index: 3;
            transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .jog-close-btn svg {
            width: 56%;
            height: 56%;
        }
        .jog-close-btn:hover {
            background: rgba(68, 153, 238, 0.16);
            box-shadow: 0 0 10px rgba(68, 153, 238, 0.25);
        }
        .jog-close-btn:focus-visible {
            outline: 2px solid #49e;
            outline-offset: 2px;
        }
        .jog-expand-tab {
            display: none;
            align-items: center;
            justify-content: center;
            width: 30px;
            min-height: 56px;
            padding: 0 2px 0 4px;
            border-radius: 999px 0 0 999px;
            border: 1.5px solid #49e;
            border-right: none;
            background: rgba(24, 26, 31, 0.94);
            color: #49e;
            box-shadow: -4px 6px 18px rgba(0, 0, 0, 0.5);
            cursor: pointer;
            pointer-events: auto;
            transition: background-color 0.15s ease, width 0.15s ease;
        }
        .jog-expand-tab svg {
            width: 18px;
            height: 18px;
        }
        .jog-expand-tab:hover {
            width: 34px;
            background: rgba(34, 42, 56, 0.96);
        }
        .jog-expand-tab:focus-visible {
            outline: 2px solid #49e;
            outline-offset: 2px;
        }
        .jog-wrap.is-collapsed .jog-clip,
        .jog-wrap.is-collapsed .jog-readout {
            display: none;
        }
        .jog-wrap.is-collapsed .jog-expand-tab {
            display: inline-flex;
        }
        .jog-readout {
            position: absolute;
            right: calc(100% - 4px);
            top: 50%;
            transform: translateY(-50%);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px 5px 9px;
            border-radius: 999px;
            background: rgba(12, 13, 16, 0.94);
            border: 1px solid rgba(68, 153, 238, 0.35);
            color: #49e;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.52);
        }
        .jog-readout.is-visible {
            opacity: 1;
        }
        .jog-playhead-icon {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }
        @media (prefers-reduced-motion: reduce) {
            .jog-dial,
            .jog-close-btn,
            .jog-expand-tab,
            .jog-readout {
                transition: none;
            }
        }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'jog-wrap';

    const readout = document.createElement('div');
    readout.className = 'jog-readout';
    readout.setAttribute('aria-hidden', 'true');
    const playheadIcon = createPlayheadIconSvg();
    const readoutText = document.createElement('span');
    readoutText.className = 'jog-readout-text';
    readout.append(playheadIcon, readoutText);

    const clip = document.createElement('div');
    clip.className = 'jog-clip';

    const dial = document.createElement('div');
    dial.className = 'jog-dial';
    dial.setAttribute('role', 'slider');
    dial.setAttribute('tabindex', '0');
    dial.setAttribute('aria-valuemin', '0');
    dial.setAttribute('aria-label', ctx.i18n.t('ariaDial'));

    const ticksSvg = createTicksSvg();
    const pointerSvg = createPointerSvg();
    dial.append(ticksSvg, pointerSvg);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'jog-close-btn';
    closeBtn.setAttribute('aria-label', ctx.i18n.t('btnCollapse'));
    closeBtn.appendChild(createCloseIconSvg());

    clip.append(dial, closeBtn);

    const expandTab = document.createElement('button');
    expandTab.type = 'button';
    expandTab.className = 'jog-expand-tab';
    expandTab.setAttribute('aria-label', ctx.i18n.t('btnExpand'));
    expandTab.appendChild(createExpandIconSvg());

    wrap.append(readout, clip, expandTab);
    shadow.append(style, wrap);

    const mobileQuery = window.matchMedia('(max-width: 768px), (max-aspect-ratio: 1/1)');

    function syncDialAria(currentTime, duration) {
        const safeTime = Math.max(0, Number(currentTime) || 0);
        dial.setAttribute('aria-valuenow', safeTime.toFixed(2));
        dial.setAttribute('aria-valuetext', formatTime(safeTime));
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
            dial.setAttribute('aria-valuemax', duration.toFixed(2));
        }
    }

    function applyLayout() {
        const shouldShow = runtimeVisible && (!settings.mobileOnly || mobileQuery.matches);
        const dialSize = resolveDialSize(settings.dialSize);
        const verticalPos = Math.min(85, Math.max(20, Number(settings.verticalPos) || 55));

        host.style.display = shouldShow ? 'block' : 'none';
        host.style.top = `${verticalPos}%`;
        wrap.style.setProperty('--dial-size', `${dialSize}px`);
        wrap.classList.toggle('is-collapsed', isCollapsed);

        const state = ctx.playback.getState?.();
        syncDialAria(state?.realTime, state?.duration);
    }

    let dialAngleDeg = 0;
    let isDragging = false;
    let activePointerId = null;
    let lastPointerAngle = 0;
    let sessionDelta = 0;
    let hideTimer = null;

    function getPointerAngle(clientX, clientY) {
        const rect = dial.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    }

    function showReadout(currentTime) {
        if (hideTimer) clearTimeout(hideTimer);
        const sign = sessionDelta >= 0 ? '+' : '';
        readoutText.textContent = `${formatTime(currentTime)} ${sign}${sessionDelta.toFixed(2)}s`;
        readout.classList.add('is-visible');
    }

    function scheduleHideReadout() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            readout.classList.remove('is-visible');
        }, 800);
    }

    function applyNudgeDelta(deltaSec, deltaDeg) {
        dialAngleDeg = (dialAngleDeg + deltaDeg) % 360;
        ticksSvg.style.transform = `rotate(${dialAngleDeg}deg)`;
        if (Math.abs(deltaSec) > 0.0001) {
            sessionDelta += deltaSec;
            ctx.playback.nudge(deltaSec);
            const state = ctx.playback.getState();
            syncDialAria(state?.realTime, state?.duration);
            showReadout(state?.realTime);
        }
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        activePointerId = null;
        dial.classList.remove('is-dragging');
        scheduleHideReadout();
    }

    const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target && e.target.closest('button')) return;
        e.preventDefault();
        isDragging = true;
        activePointerId = e.pointerId;
        sessionDelta = 0;
        lastPointerAngle = getPointerAngle(e.clientX, e.clientY);
        dial.classList.add('is-dragging');
        dial.setPointerCapture(e.pointerId);
        const state = ctx.playback.getState();
        syncDialAria(state?.realTime, state?.duration);
        showReadout(state?.realTime);
    };

    const onPointerMove = (e) => {
        if (!isDragging || (activePointerId !== null && e.pointerId !== activePointerId)) return;
        const currentAngle = getPointerAngle(e.clientX, e.clientY);
        let deltaDeg = currentAngle - lastPointerAngle;
        if (deltaDeg > 180) deltaDeg -= 360;
        if (deltaDeg < -180) deltaDeg += 360;
        lastPointerAngle = currentAngle;

        const secPerTurn = Math.max(0.5, Number(settings.secPerTurn) || 4);
        const deltaSec = (deltaDeg / 360) * secPerTurn;
        applyNudgeDelta(deltaSec, deltaDeg);
    };

    const onDialKeyDown = (e) => {
        let dir = 0;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') dir = 1;
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') dir = -1;
        if (dir === 0) return;

        e.preventDefault();
        const stepSec = (e.shiftKey ? KEYBOARD_FAST_STEP_SEC : KEYBOARD_STEP_SEC) * dir;
        const secPerTurn = Math.max(0.5, Number(settings.secPerTurn) || 4);
        const stepDeg = (stepSec / secPerTurn) * 360;
        sessionDelta = 0;
        applyNudgeDelta(stepSec, stepDeg);
        scheduleHideReadout();
    };

    const onCloseClick = (e) => {
        endDrag();
        isCollapsed = true;
        readout.classList.remove('is-visible');
        applyLayout();
        if (e.detail === 0) {
            expandTab.focus();
        }
    };

    const onExpandClick = (e) => {
        isCollapsed = false;
        applyLayout();
        if (e.detail === 0) {
            dial.focus();
        }
    };

    dial.addEventListener('pointerdown', onPointerDown);
    dial.addEventListener('pointermove', onPointerMove);
    dial.addEventListener('pointerup', endDrag);
    dial.addEventListener('pointercancel', endDrag);
    dial.addEventListener('lostpointercapture', endDrag);
    dial.addEventListener('keydown', onDialKeyDown);
    closeBtn.addEventListener('click', onCloseClick);
    expandTab.addEventListener('click', onExpandClick);

    const onMediaChange = () => applyLayout();
    mobileQuery.addEventListener('change', onMediaChange);

    ctx.ui.registerMenuItem({
        id: 'toggle-dial',
        labelKey: 'ext.com.wmcx.timeline-jog-dial.menuToggle',
        onClick: () => {
            if (!runtimeVisible) {
                runtimeVisible = true;
                isCollapsed = false;
            } else if (isCollapsed) {
                isCollapsed = false;
            } else {
                runtimeVisible = false;
            }
            applyLayout();
            ctx.ui.toast?.({
                content: ctx.i18n.t(runtimeVisible ? 'toastShown' : 'toastHidden'),
                type: 'info',
                timeout: 1500
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'dial-settings',
        labelKey: 'ext.com.wmcx.timeline-jog-dial.menuSettings',
        onClick: ({ anchorEl } = {}) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (_key, _val, allValues) => {
                    settings = allValues;
                    runtimeVisible = settings.visible !== false;
                    applyLayout();
                }
            });
        }
    });

    applyLayout();

    return () => {
        if (hideTimer) clearTimeout(hideTimer);
        dial.removeEventListener('pointerdown', onPointerDown);
        dial.removeEventListener('pointermove', onPointerMove);
        dial.removeEventListener('pointerup', endDrag);
        dial.removeEventListener('pointercancel', endDrag);
        dial.removeEventListener('lostpointercapture', endDrag);
        dial.removeEventListener('keydown', onDialKeyDown);
        closeBtn.removeEventListener('click', onCloseClick);
        expandTab.removeEventListener('click', onExpandClick);
        mobileQuery.removeEventListener('change', onMediaChange);
    };
}
