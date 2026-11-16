/**
 * @file index.js
 * @description 物量密度指示器示範擴充程式。
 * 遵循 Web mai Chart X 擴充程式規範，讀取譜面解析快照計算音符密度，
 * 提供可自由拖動的懸浮面板與時間軸拖曳跳轉功能。
 */

const SETTINGS_SCHEMA = [
    {
        key: 'visible',
        type: 'boolean',
        default: true,
        labelKey: 'ext.com.wmcx.chart-density-indicator.optVisible'
    },
    {
        key: 'bucketSec',
        type: 'number',
        default: 2,
        min: 0.5,
        max: 10,
        step: 0.5,
        labelKey: 'ext.com.wmcx.chart-density-indicator.optBucketSec'
    },
    {
        key: 'chartHeight',
        type: 'number',
        default: 72,
        min: 40,
        max: 140,
        step: 8,
        labelKey: 'ext.com.wmcx.chart-density-indicator.optChartHeight'
    },
    {
        key: 'colorMode',
        type: 'select',
        default: 'type',
        labelKey: 'ext.com.wmcx.chart-density-indicator.optColorMode',
        options: [
            { value: 'type', label: '音符類型色彩' },
            { value: 'mono', label: '單色簡約風格' }
        ]
    }
];

const LOCALES = {
    'zh-TW': {
        menuToggle: '顯示 / 隱藏物量指示器',
        menuSettings: '物量指示器設定',
        settingsTitle: '物量密度指示器設定',
        optVisible: '顯示懸浮指示器',
        optBucketSec: '統計時間區間（秒）',
        optChartHeight: '圖表高度（像素）',
        optColorMode: '圖表色彩模式',
        toastShown: '已顯示物量密度指示器',
        toastHidden: '已隱藏物量密度指示器',
        panelTitle: '物量密度',
        hintDrag: '拖曳標題移動視窗，點擊或滑動圖表跳轉進度'
    },
    'zh-CN': {
        menuToggle: '显示 / 隐藏物量指示器',
        menuSettings: '物量指示器设置',
        settingsTitle: '物量密度指示器设置',
        optVisible: '显示悬浮指示器',
        optBucketSec: '统计时间区间（秒）',
        optChartHeight: '图表高度（像素）',
        optColorMode: '图表色彩模式',
        toastShown: '已显示物量密度指示器',
        toastHidden: '已隐藏物量密度指示器',
        panelTitle: '物量密度',
        hintDrag: '拖曳标题移动窗口，点击或滑动图表跳转进度'
    },
    en: {
        menuToggle: 'Show / Hide Density Indicator',
        menuSettings: 'Density Settings',
        settingsTitle: 'Density Indicator Settings',
        optVisible: 'Show floating indicator',
        optBucketSec: 'Bucket interval (seconds)',
        optChartHeight: 'Chart height (px)',
        optColorMode: 'Color mode',
        toastShown: 'Density indicator shown',
        toastHidden: 'Density indicator hidden',
        panelTitle: 'Chart Density',
        hintDrag: 'Drag header to move, scrub chart to seek'
    },
    ja: {
        menuToggle: 'ノーツ密度表示切替',
        menuSettings: '密度インジケーター設定',
        settingsTitle: 'ノーツ密度インジケーター設定',
        optVisible: 'フローティング表示',
        optBucketSec: '集計区間（秒）',
        optChartHeight: 'グラフ高さ (px)',
        optColorMode: 'カラーモード',
        toastShown: 'ノーツ密度インジケーターを表示しました',
        toastHidden: 'ノーツ密度インジケーターを非表示にしました',
        panelTitle: 'ノーツ密度',
        hintDrag: 'ヘッダーをドラッグして移動、グラフ操作でシーク'
    },
    ko: {
        menuToggle: '노트 밀도 표시 전환',
        menuSettings: '밀도 표시기 설정',
        settingsTitle: '노트 밀도 표시기 설정',
        optVisible: '플로팅 표시기 표시',
        optBucketSec: '통계 시간 간격(초)',
        optChartHeight: '그래프 높이 (px)',
        optColorMode: '색상 모드',
        toastShown: '노트 밀도 표시기를 표시했습니다',
        toastHidden: '노트 밀도 표시기를 숨겼습니다',
        panelTitle: '노트 밀도',
        hintDrag: '헤더를 드래그하여 이동하고 그래프로 탐색'
    }
};

function formatTime(sec) {
    const safe = Math.max(0, Number(sec) || 0);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    const ms = Math.floor((safe % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(LOCALES);

    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let runtimeVisible = settings.visible !== false;

    const widget = ctx.ui.createFloatingWidget({
        id: 'density-indicator',
        position: 'right'
    });

    const shadow = widget.element.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            user-select: none;
            -webkit-user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12px;
            color: #f1f5f9;
        }
        .panel {
            width: 310px;
            background: rgba(18, 22, 31, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 12px;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .panel.is-moving {
            border-color: #38bdf8;
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.7);
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            cursor: grab;
            touch-action: none;
        }
        .header:active,
        .panel.is-moving .header {
            cursor: grabbing;
        }
        .title-group {
            display: flex;
            align-items: center;
            gap: 8px;
            pointer-events: none;
        }
        .title {
            font-weight: 600;
            font-size: 13px;
            letter-spacing: 0.3px;
        }
        .note-badge {
            padding: 2px 7px;
            border-radius: 10px;
            background: rgba(56, 189, 248, 0.2);
            border: 1px solid rgba(56, 189, 248, 0.4);
            color: #7dd3fc;
            font-size: 11px;
            font-weight: 500;
        }
        .body {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .canvas-wrap {
            position: relative;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.08);
            overflow: hidden;
            cursor: ew-resize;
            touch-action: none;
        }
        .chart-canvas {
            display: block;
            width: 100%;
            height: var(--chart-height, 72px);
        }
        .chart-canvas.is-scrubbing {
            cursor: ew-resize;
        }
        .info-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            color: #94a3b8;
        }
        .time-readout {
            color: #e2e8f0;
            font-weight: 500;
        }
        .density-readout {
            color: #38bdf8;
            font-weight: 600;
        }
        .legend-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 10px;
            color: #64748b;
        }
        .legend-items {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .legend-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
        }
    `;

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'header';
    header.title = ctx.i18n.t('hintDrag');

    const titleGroup = document.createElement('div');
    titleGroup.className = 'title-group';

    const titleEl = document.createElement('span');
    titleEl.className = 'title';
    titleEl.textContent = ctx.i18n.t('panelTitle');

    const totalBadge = document.createElement('span');
    totalBadge.className = 'note-badge';
    totalBadge.textContent = '0';

    titleGroup.append(titleEl, totalBadge);
    header.appendChild(titleGroup);

    const body = document.createElement('div');
    body.className = 'body';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'canvas-wrap';

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvasWrap.appendChild(canvas);

    const infoBar = document.createElement('div');
    infoBar.className = 'info-bar';

    const timeReadout = document.createElement('span');
    timeReadout.className = 'time-readout';
    timeReadout.textContent = '00:00.00 / 00:00.00';

    const densityReadout = document.createElement('span');
    densityReadout.className = 'density-readout';
    densityReadout.textContent = '0.0 n/s';

    infoBar.append(timeReadout, densityReadout);

    const legendBar = document.createElement('div');
    legendBar.className = 'legend-bar';

    const legendItems = document.createElement('div');
    legendItems.className = 'legend-items';

    const types = [
        { label: 'Tap', color: '#3b82f6' },
        { label: 'Hold', color: '#eab308' },
        { label: 'Slide', color: '#22c55e' },
        { label: 'Touch', color: '#f97316' },
        { label: 'Break', color: '#ef4444' }
    ];

    for (const item of types) {
        const itemSpan = document.createElement('span');
        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.backgroundColor = item.color;
        itemSpan.append(dot, document.createTextNode(` ${item.label}`));
        legendItems.appendChild(itemSpan);
    }

    legendBar.appendChild(legendItems);
    body.append(canvasWrap, infoBar, legendBar);
    panel.append(header, body);
    shadow.append(style, panel);

    // 視窗面板拖曳定位邏輯
    let isMovingPanel = false;
    let moveStartPointerX = 0;
    let moveStartPointerY = 0;
    let moveStartLeft = 0;
    let moveStartTop = 0;

    header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        isMovingPanel = true;
        header.setPointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        moveStartPointerX = e.clientX;
        moveStartPointerY = e.clientY;
        moveStartLeft = rect.left;
        moveStartTop = rect.top;
        panel.classList.add('is-moving');
    });

    header.addEventListener('pointermove', (e) => {
        if (!isMovingPanel) return;
        const dx = e.clientX - moveStartPointerX;
        const dy = e.clientY - moveStartPointerY;
        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
        const nextLeft = Math.max(0, Math.min(moveStartLeft + dx, maxLeft));
        const nextTop = Math.max(0, Math.min(moveStartTop + dy, maxTop));
        widget.element.style.left = `${nextLeft}px`;
        widget.element.style.top = `${nextTop}px`;
        widget.element.style.right = 'auto';
        widget.element.style.bottom = 'auto';
        widget.element.style.transform = 'none';
    });

    const endMovePanel = () => {
        if (!isMovingPanel) return;
        isMovingPanel = false;
        panel.classList.remove('is-moving');
    };
    header.addEventListener('pointerup', endMovePanel);
    header.addEventListener('pointercancel', endMovePanel);

    // 時間軸點擊與拖曳跳轉邏輯
    let isScrubbing = false;

    function handleScrub(e) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || chartDuration <= 0) return;
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = ratio * chartDuration;
        ctx.playback.seek(targetTime);
        renderChart();
    }

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isScrubbing = true;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('is-scrubbing');
        handleScrub(e);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isScrubbing) return;
        handleScrub(e);
    });

    const endScrub = () => {
        if (!isScrubbing) return;
        isScrubbing = false;
        canvas.classList.remove('is-scrubbing');
    };
    canvas.addEventListener('pointerup', endScrub);
    canvas.addEventListener('pointercancel', endScrub);

    // 譜面物量資料分桶與圖表繪製
    let chartDuration = 0;
    let buckets = [];
    let maxBucketTotal = 1;
    let totalNotesCount = 0;

    function recomputeBuckets() {
        const snapshot = ctx.chart.getSnapshot();
        chartDuration = Math.max(0, Number(snapshot.duration) || 0);
        const notes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
        totalNotesCount = notes.length;

        const bucketSec = Math.max(0.5, Number(settings.bucketSec) || 2);
        const count = chartDuration > 0 ? Math.ceil(chartDuration / bucketSec) : 1;
        buckets = new Array(count);
        for (let i = 0; i < count; i++) {
            buckets[i] = { tap: 0, hold: 0, slide: 0, touch: 0, break: 0, total: 0 };
        }

        for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            const t = Math.max(0, Number(n.time) || 0);
            const bIdx = Math.min(count - 1, Math.floor(t / bucketSec));
            const b = buckets[bIdx];
            if (n.isBreak) {
                b.break++;
            } else if (n.type === 'slide') {
                b.slide++;
            } else if (n.isHold || n.type === 'hold') {
                b.hold++;
            } else if (n.type === 'touch') {
                b.touch++;
            } else {
                b.tap++;
            }
            b.total++;
        }

        let maxVal = 1;
        for (let i = 0; i < count; i++) {
            if (buckets[i].total > maxVal) {
                maxVal = buckets[i].total;
            }
        }
        maxBucketTotal = maxVal;

        totalBadge.textContent = `${totalNotesCount}`;
        renderChart();
    }

    function renderChart() {
        if (!runtimeVisible) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const displayW = Math.max(160, Math.floor(rect.width) || 286);
        const displayH = Math.max(40, Number(settings.chartHeight) || 72);

        panel.style.setProperty('--chart-height', `${displayH}px`);

        if (canvas.width !== Math.floor(displayW * dpr) || canvas.height !== Math.floor(displayH * dpr)) {
            canvas.width = Math.floor(displayW * dpr);
            canvas.height = Math.floor(displayH * dpr);
        }

        const cCtx = canvas.getContext('2d');
        cCtx.save();
        cCtx.scale(dpr, dpr);
        cCtx.clearRect(0, 0, displayW, displayH);

        // 基準輔助格線
        cCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        cCtx.lineWidth = 1;
        cCtx.beginPath();
        cCtx.moveTo(0, displayH / 2);
        cCtx.lineTo(displayW, displayH / 2);
        cCtx.moveTo(0, displayH - 1);
        cCtx.lineTo(displayW, displayH - 1);
        cCtx.stroke();

        const bucketCount = buckets.length;
        if (bucketCount > 0 && maxBucketTotal > 0) {
            const barW = displayW / bucketCount;
            const isMono = settings.colorMode === 'mono';

            for (let i = 0; i < bucketCount; i++) {
                const b = buckets[i];
                if (b.total === 0) continue;
                const x = (i / bucketCount) * displayW;

                if (isMono) {
                    const h = (b.total / maxBucketTotal) * (displayH - 4);
                    cCtx.fillStyle = '#60a5fa';
                    cCtx.fillRect(x, displayH - h, Math.max(1, barW - 0.5), h);
                } else {
                    let yCursor = displayH;
                    const parts = [
                        { count: b.tap, color: '#3b82f6' },
                        { count: b.hold, color: '#eab308' },
                        { count: b.slide, color: '#22c55e' },
                        { count: b.touch, color: '#f97316' },
                        { count: b.break, color: '#ef4444' }
                    ];
                    for (const p of parts) {
                        if (p.count <= 0) continue;
                        const partH = (p.count / maxBucketTotal) * (displayH - 4);
                        yCursor -= partH;
                        cCtx.fillStyle = p.color;
                        cCtx.fillRect(x, yCursor, Math.max(1, barW - 0.5), partH);
                    }
                }
            }
        }

        // 繪製當前播放時間游標
        const playback = ctx.playback.getState();
        const curTime = playback.realTime || 0;
        const curX = chartDuration > 0 ? (curTime / chartDuration) * displayW : 0;
        const clampedX = Math.max(0, Math.min(curX, displayW));

        cCtx.strokeStyle = '#ffffff';
        cCtx.lineWidth = 2;
        cCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        cCtx.shadowBlur = 4;
        cCtx.beginPath();
        cCtx.moveTo(clampedX, 0);
        cCtx.lineTo(clampedX, displayH);
        cCtx.stroke();

        // 游標頂部菱形標記
        cCtx.fillStyle = '#38bdf8';
        cCtx.beginPath();
        cCtx.moveTo(clampedX, 0);
        cCtx.lineTo(clampedX + 4, 6);
        cCtx.lineTo(clampedX, 10);
        cCtx.lineTo(clampedX - 4, 6);
        cCtx.closePath();
        cCtx.fill();

        cCtx.restore();

        // 更新文字讀數
        timeReadout.textContent = `${formatTime(curTime)} / ${formatTime(chartDuration)}`;
        const bucketSec = Math.max(0.5, Number(settings.bucketSec) || 2);
        const bIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor(curTime / bucketSec)));
        const curNotes = (buckets[bIdx] && buckets[bIdx].total) || 0;
        const densityRate = (curNotes / bucketSec).toFixed(1);
        densityReadout.textContent = `${densityRate} n/s`;
    }

    // 動畫迴圈控制
    let animId = null;

    function tick() {
        renderChart();
        const state = ctx.playback.getState();
        if (state.isPlaying && runtimeVisible) {
            animId = requestAnimationFrame(tick);
        } else {
            animId = null;
        }
    }

    function checkAnimation() {
        const state = ctx.playback.getState();
        if (state.isPlaying && runtimeVisible) {
            if (!animId) animId = requestAnimationFrame(tick);
        } else {
            if (animId) {
                cancelAnimationFrame(animId);
                animId = null;
            }
            renderChart();
        }
    }

    function applyVisibility() {
        widget.element.style.display = runtimeVisible ? 'block' : 'none';
        if (runtimeVisible) {
            renderChart();
        }
    }

    // 註冊頂欄選單項目
    ctx.ui.registerMenuItem({
        id: 'toggle-density',
        labelKey: 'ext.com.wmcx.chart-density-indicator.menuToggle',
        onClick: () => {
            runtimeVisible = !runtimeVisible;
            applyVisibility();
            checkAnimation();
            ctx.ui.toast?.({
                content: ctx.i18n.t(runtimeVisible ? 'toastShown' : 'toastHidden'),
                type: 'info',
                timeout: 1500
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'density-settings',
        labelKey: 'ext.com.wmcx.chart-density-indicator.menuSettings',
        onClick: ({ anchorEl } = {}) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (_key, _val, allValues) => {
                    settings = allValues;
                    runtimeVisible = settings.visible !== false;
                    applyVisibility();
                    recomputeBuckets();
                    checkAnimation();
                }
            });
        }
    });

    // 訂閱事件更新
    ctx.events.on('chart:decoded', () => {
        recomputeBuckets();
        checkAnimation();
    });

    ctx.events.on('playback:seek', () => {
        renderChart();
    });

    ctx.events.on('playback:state-changed', () => {
        checkAnimation();
    });

    ctx.events.on('project:loaded', () => {
        recomputeBuckets();
        checkAnimation();
    });

    applyVisibility();
    recomputeBuckets();
    checkAnimation();

    return () => {
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    };
}

