const SETTINGS_SCHEMA = [
    { key: 'visible', type: 'boolean', default: true, labelKey: 'ext.com.wmcx.timeline-jog-dial.optVisible' },
    { key: 'mobileOnly', type: 'boolean', default: false, labelKey: 'ext.com.wmcx.timeline-jog-dial.optMobileOnly' },
    { key: 'secPerTurn', type: 'number', default: 4, min: 0.5, max: 30, step: 0.5, labelKey: 'ext.com.wmcx.timeline-jog-dial.optSecPerTurn' },
    { key: 'verticalPos', type: 'number', default: 55, min: 20, max: 85, step: 1, labelKey: 'ext.com.wmcx.timeline-jog-dial.optVerticalPos' },
    { key: 'dialSize', type: 'number', default: 76, min: 56, max: 112, step: 4, labelKey: 'ext.com.wmcx.timeline-jog-dial.optDialSize' }
];

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
        toastHidden: '已隱藏時間軸微調旋鈕'
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
        toastHidden: '已隐藏时间轴微調旋钮'
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
        toastHidden: 'Timeline jog dial hidden'
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
        toastHidden: 'ジョグダイヤルを非表示にしました'
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
        toastHidden: '조그 다이얼을 숨겼습니다'
    }
};

function formatTime(sec) {
    const safe = Math.max(0, Number(sec) || 0);
    const m = Math.floor(safe / 60);
    const s = (safe % 60).toFixed(2).padStart(5, '0');
    return `${String(m).padStart(2, '0')}:${s}`;
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(LOCALES);

    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let runtimeVisible = settings.visible !== false;

    const widget = ctx.ui.createFloatingWidget({
        id: 'jog-dial',
        position: 'right'
    });

    const shadow = widget.element.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            user-select: none;
            -webkit-user-select: none;
        }
        .jog-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .jog-dial {
            width: var(--dial-size, 76px);
            height: var(--dial-size, 76px);
            border-radius: 50%;
            background: radial-gradient(circle at 32% 28%, rgba(56, 62, 74, 0.92), rgba(18, 20, 26, 0.94));
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.22);
            backdrop-filter: blur(10px);
            position: relative;
            touch-action: none;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s ease, border-color 0.15s ease;
        }
        .jog-dial:active,
        .jog-dial.is-dragging {
            cursor: grabbing;
            border-color: #49e;
            transform: scale(1.05);
        }
        .jog-ring {
            position: absolute;
            inset: 5px;
            border-radius: 50%;
            border: 2px dashed rgba(255, 255, 255, 0.25);
            pointer-events: none;
        }
        .jog-marker {
            position: absolute;
            top: 7px;
            left: 50%;
            width: 6px;
            height: 6px;
            margin-left: -3px;
            border-radius: 50%;
            background: #49e;
            box-shadow: 0 0 8px #49e;
        }
        .jog-center {
            width: 38%;
            height: 38%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            pointer-events: none;
        }
        .jog-readout {
            position: absolute;
            right: calc(100% + 10px);
            top: 50%;
            transform: translateY(-50%);
            padding: 5px 10px;
            border-radius: 8px;
            background: rgba(18, 20, 26, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: #fff;
            font-family: monospace;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
        }
        .jog-readout.is-visible {
            opacity: 1;
        }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'jog-wrap';

    const readout = document.createElement('div');
    readout.className = 'jog-readout';

    const dial = document.createElement('div');
    dial.className = 'jog-dial';
    dial.setAttribute('role', 'slider');
    dial.setAttribute('aria-label', 'Timeline Jog Dial');

    const ring = document.createElement('div');
    ring.className = 'jog-ring';

    const marker = document.createElement('div');
    marker.className = 'jog-marker';
    ring.appendChild(marker);

    const center = document.createElement('div');
    center.className = 'jog-center';

    dial.append(ring, center);
    wrap.append(readout, dial);
    shadow.append(style, wrap);

    const mobileQuery = window.matchMedia('(max-width: 768px), (max-aspect-ratio: 1/1)');

    function applyLayout() {
        const shouldShow = runtimeVisible && (!settings.mobileOnly || mobileQuery.matches);
        widget.element.style.display = shouldShow ? 'block' : 'none';
        widget.element.style.top = `${settings.verticalPos ?? 55}%`;
        dial.style.setProperty('--dial-size', `${settings.dialSize ?? 76}px`);
    }

    let dialAngleDeg = 0;
    let isDragging = false;
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
        readout.textContent = `${formatTime(currentTime)} (${sign}${sessionDelta.toFixed(2)}s)`;
        readout.classList.add('is-visible');
    }

    function scheduleHideReadout() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            readout.classList.remove('is-visible');
        }, 800);
    }

    dial.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDragging = true;
        sessionDelta = 0;
        lastPointerAngle = getPointerAngle(e.clientX, e.clientY);
        dial.classList.add('is-dragging');
        dial.setPointerCapture(e.pointerId);
        showReadout(ctx.playback.getState().realTime);
    });

    dial.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const currentAngle = getPointerAngle(e.clientX, e.clientY);
        let deltaDeg = currentAngle - lastPointerAngle;
        if (deltaDeg > 180) deltaDeg -= 360;
        if (deltaDeg < -180) deltaDeg += 360;
        lastPointerAngle = currentAngle;

        dialAngleDeg = (dialAngleDeg + deltaDeg) % 360;
        ring.style.transform = `rotate(${dialAngleDeg}deg)`;

        const secPerTurn = Math.max(0.5, Number(settings.secPerTurn) || 4);
        const deltaSec = (deltaDeg / 360) * secPerTurn;
        if (Math.abs(deltaSec) > 0.0001) {
            sessionDelta += deltaSec;
            ctx.playback.nudge(deltaSec);
            showReadout(ctx.playback.getState().realTime);
        }
    });

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        dial.classList.remove('is-dragging');
        scheduleHideReadout();
    };

    dial.addEventListener('pointerup', endDrag);
    dial.addEventListener('pointercancel', endDrag);

    const onMediaChange = () => applyLayout();
    mobileQuery.addEventListener('change', onMediaChange);

    ctx.ui.registerMenuItem({
        id: 'toggle-dial',
        labelKey: 'ext.com.wmcx.timeline-jog-dial.menuToggle',
        onClick: () => {
            runtimeVisible = !runtimeVisible;
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
        mobileQuery.removeEventListener('change', onMediaChange);
    };
}

