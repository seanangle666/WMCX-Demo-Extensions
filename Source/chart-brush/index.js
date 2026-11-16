const EXTENSION_ID = 'com.wmcx.chart-brush';
const MAX_HISTORY = 20;
const VIEWPORT_MARGIN = 8;

const TOOLS = [
    { id: 'pen', labelKey: 'toolPen', fallback: '實線筆' },
    { id: 'highlighter', labelKey: 'toolHighlighter', fallback: '螢光筆' },
    { id: 'dashed', labelKey: 'toolDashed', fallback: '虛線筆' },
    { id: 'spray', labelKey: 'toolSpray', fallback: '噴漆' },
    { id: 'arrow', labelKey: 'toolArrow', fallback: '箭頭' },
    { id: 'rainbow', labelKey: 'toolRainbow', fallback: '彩虹' },
    { id: 'eraser', labelKey: 'toolEraser', fallback: '橡皮擦' }
];

const PRESET_COLORS = [
    '#ef4444',
    '#facc15',
    '#22c55e',
    '#38bdf8',
    '#a855f7',
    '#f472b6',
    '#ffffff'
];

const SETTINGS_SCHEMA = [
    {
        key: 'defaultSize',
        type: 'number',
        default: 6,
        min: 2,
        max: 36,
        step: 1,
        label: '預設筆刷粗細',
        labelKey: `ext.${EXTENSION_ID}.optDefaultSize`
    },
    {
        key: 'clearOnPlay',
        type: 'boolean',
        default: true,
        label: '開始播放時自動清除',
        labelKey: `ext.${EXTENSION_ID}.optClearOnPlay`
    },
    {
        key: 'showToolbar',
        type: 'boolean',
        default: true,
        label: '顯示浮動繪圖工具列',
        labelKey: `ext.${EXTENSION_ID}.optShowToolbar`
    }
];

const TRANSLATIONS = {
    'zh-TW': {
        menuToggleBar: '顯示或隱藏工具列',
        menuClear: '清除繪圖畫布',
        menuSettings: '筆刷設定',
        settingsTitle: '譜面暫停繪圖筆刷設定',
        optDefaultSize: '預設筆刷粗細',
        optClearOnPlay: '開始播放時自動清除',
        optShowToolbar: '顯示浮動繪圖工具列',
        drawOn: '繪圖：開',
        drawOff: '繪圖：關',
        toolPen: '實線筆',
        toolHighlighter: '螢光筆',
        toolDashed: '虛線筆',
        toolSpray: '噴漆',
        toolArrow: '箭頭',
        toolRainbow: '彩虹',
        toolEraser: '橡皮擦',
        btnUndo: '復原',
        btnClear: '清除',
        toastNeedPause: '播放中無法繪圖，請先暫停譜面',
        toastPausedMode: '已暫停繪圖模式',
        toastActiveMode: '已開啟繪圖模式，按 Esc 可暫停並操作編輯器',
        toastCleared: '已清除畫布'
    },
    en: {
        menuToggleBar: 'Toggle Drawing Toolbar',
        menuClear: 'Clear Drawing Canvas',
        menuSettings: 'Brush Settings',
        settingsTitle: 'Chart Pause Brush Settings',
        optDefaultSize: 'Default Brush Size',
        optClearOnPlay: 'Auto Clear on Play',
        optShowToolbar: 'Show Floating Toolbar',
        drawOn: 'Draw: ON',
        drawOff: 'Draw: OFF',
        toolPen: 'Pen',
        toolHighlighter: 'Highlighter',
        toolDashed: 'Dashed',
        toolSpray: 'Spray',
        toolArrow: 'Arrow',
        toolRainbow: 'Rainbow',
        toolEraser: 'Eraser',
        btnUndo: 'Undo',
        btnClear: 'Clear',
        toastNeedPause: 'Pause playback before drawing',
        toastPausedMode: 'Drawing mode paused',
        toastActiveMode: 'Drawing mode enabled, press Esc to pause',
        toastCleared: 'Canvas cleared'
    }
};

function clamp(val, min, max) {
    return Math.min(Math.max(min, val), max);
}

/**
 * 繪製平滑二次貝茲曲線路徑
 * @param {CanvasRenderingContext2D} ctx2d
 * @param {Array<{ x: number, y: number }>} points
 */
function traceSmoothPath(ctx2d, points) {
    if (points.length === 0) return;
    ctx2d.beginPath();
    ctx2d.moveTo(points[0].x, points[0].y);
    if (points.length === 1) {
        ctx2d.lineTo(points[0].x + 0.01, points[0].y + 0.01);
        return;
    }
    for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) * 0.5;
        const midY = (points[i].y + points[i + 1].y) * 0.5;
        ctx2d.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx2d.lineTo(last.x, last.y);
}

/**
 * 繪製帶箭頭線段
 * @param {CanvasRenderingContext2D} ctx2d
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} lineWidth
 * @param {string} color
 */
function drawArrow(ctx2d, x1, y1, x2, y2, lineWidth, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;

    const angle = Math.atan2(dy, dx);
    const headLen = Math.max(12, lineWidth * 3);

    ctx2d.save();
    ctx2d.strokeStyle = color;
    ctx2d.fillStyle = color;
    ctx2d.lineWidth = lineWidth;
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';

    ctx2d.beginPath();
    ctx2d.moveTo(x1, y1);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();

    ctx2d.beginPath();
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx2d.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.restore();
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(TRANSLATIONS);

    const widget = ctx.ui.createFloatingWidget({
        id: 'chart-brush',
        position: 'custom'
    });
    const host = widget.element;
    host.style.inset = '0';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            user-select: none;
            -webkit-user-select: none;
        }
        canvas {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            display: block;
            pointer-events: none;
        }
        .preview-canvas.active {
            pointer-events: auto;
            cursor: crosshair;
            touch-action: none;
        }
        .toolbar {
            position: fixed;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            max-width: calc(100vw - 16px);
            padding: 6px 10px 6px 8px;
            border-radius: 12px;
            background: rgba(16, 20, 29, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            pointer-events: auto;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            color: #f8fafc;
        }
        .toolbar.hidden {
            display: none;
        }
        .grip {
            display: grid;
            grid-template-columns: repeat(2, 3px);
            grid-template-rows: repeat(3, 3px);
            gap: 2px;
            padding: 4px 3px;
            cursor: grab;
            opacity: 0.6;
            touch-action: none;
        }
        .grip:active {
            cursor: grabbing;
        }
        .grip-dot {
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: #cbd5e1;
        }
        .btn {
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.06);
            color: #e2e8f0;
            border-radius: 8px;
            padding: 4px 9px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
        }
        .btn:hover {
            background: rgba(255, 255, 255, 0.14);
        }
        .btn.active {
            background: #2563eb;
            border-color: #60a5fa;
            color: #ffffff;
        }
        .btn.draw-on {
            background: #16a34a;
            border-color: #4ade80;
            color: #ffffff;
        }
        .btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .divider {
            width: 1px;
            height: 18px;
            background: rgba(255, 255, 255, 0.16);
            margin: 0 2px;
        }
        .colors {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .swatch {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid transparent;
            padding: 0;
            cursor: pointer;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
        }
        .swatch.active {
            border-color: #ffffff;
            transform: scale(1.12);
        }
        .color-input {
            width: 22px;
            height: 22px;
            border: none;
            border-radius: 6px;
            padding: 0;
            background: transparent;
            cursor: pointer;
        }
        .size-wrap {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .size-slider {
            width: 68px;
            accent-color: #38bdf8;
            cursor: pointer;
        }
        .size-val {
            min-width: 22px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #cbd5e1;
        }
    `;

    const drawCanvas = document.createElement('canvas');
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'preview-canvas';

    const drawCtx = drawCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const grip = document.createElement('div');
    grip.className = 'grip';
    grip.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
        const dot = document.createElement('span');
        dot.className = 'grip-dot';
        grip.appendChild(dot);
    }

    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.className = 'btn';

    const div1 = document.createElement('span');
    div1.className = 'divider';

    const toolBtns = {};
    toolbar.append(grip, modeBtn, div1);

    for (let i = 0; i < TOOLS.length; i++) {
        const def = TOOLS[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.textContent = ctx.i18n.t(def.labelKey) || def.fallback;
        btn.addEventListener('click', () => setActiveTool(def.id));
        toolBtns[def.id] = btn;
        toolbar.appendChild(btn);
    }

    const div2 = document.createElement('span');
    div2.className = 'divider';

    const colorsWrap = document.createElement('div');
    colorsWrap.className = 'colors';
    const swatchBtns = [];

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'color-input';
    colorPicker.value = PRESET_COLORS[0];

    for (let i = 0; i < PRESET_COLORS.length; i++) {
        const hex = PRESET_COLORS[i];
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'swatch';
        sw.style.backgroundColor = hex;
        sw.addEventListener('click', () => setBrushColor(hex));
        swatchBtns.push({ hex, el: sw });
        colorsWrap.appendChild(sw);
    }
    colorPicker.addEventListener('input', (e) => setBrushColor(e.target.value));
    colorsWrap.appendChild(colorPicker);

    const div3 = document.createElement('span');
    div3.className = 'divider';

    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'size-wrap';
    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.className = 'size-slider';
    sizeSlider.min = '2';
    sizeSlider.max = '36';
    sizeSlider.step = '1';
    const sizeVal = document.createElement('span');
    sizeVal.className = 'size-val';
    sizeWrap.append(sizeSlider, sizeVal);

    const div4 = document.createElement('span');
    div4.className = 'divider';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'btn';
    undoBtn.textContent = ctx.i18n.t('btnUndo');

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = ctx.i18n.t('btnClear');

    toolbar.append(div2, colorsWrap, div3, sizeWrap, div4, undoBtn, clearBtn);
    shadow.append(style, drawCanvas, previewCanvas, toolbar);

    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let drawMode = true;
    let activeTool = 'pen';
    let brushColor = PRESET_COLORS[0];
    let brushSize = settings.defaultSize || 6;
    let rainbowHue = 0;

    let isDrawing = false;
    let strokePoints = [];
    let lastX = 0;
    let lastY = 0;
    const history = [];

    let toolbarPos = null;
    let isDraggingBar = false;
    let barDragOffsetX = 0;
    let barDragOffsetY = 0;

    const isPlayingNow = () => {
        const st = ctx.playback.getState();
        return Boolean(st && st.isPlaying);
    };

    const syncCanvasInteractive = () => {
        const canDraw = drawMode && !isPlayingNow();
        previewCanvas.classList.toggle('active', canDraw);
        modeBtn.classList.toggle('draw-on', drawMode);
        modeBtn.textContent = ctx.i18n.t(drawMode ? 'drawOn' : 'drawOff');
    };

    const updateUndoState = () => {
        undoBtn.disabled = history.length === 0;
    };

    const pushHistory = () => {
        if (drawCanvas.width <= 0 || drawCanvas.height <= 0) return;
        if (history.length >= MAX_HISTORY) {
            history.shift();
        }
        history.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
        updateUndoState();
    };

    const undo = () => {
        if (history.length === 0) return;
        const prev = history.pop();
        drawCtx.putImageData(prev, 0, 0);
        updateUndoState();
    };

    const clearAll = (notify = false) => {
        drawCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        previewCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        history.length = 0;
        strokePoints = [];
        isDrawing = false;
        updateUndoState();
        if (notify) {
            ctx.ui.toast({ content: ctx.i18n.t('toastCleared'), type: 'info' });
        }
    };

    const applyToolbarPos = (x, y) => {
        const rect = toolbar.getBoundingClientRect();
        const w = rect.width || 560;
        const h = rect.height || 40;
        const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - w - VIEWPORT_MARGIN);
        const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN);
        const clampedX = clamp(x, VIEWPORT_MARGIN, maxX);
        const clampedY = clamp(y, VIEWPORT_MARGIN, maxY);
        toolbarPos = { x: clampedX, y: clampedY };
        toolbar.style.left = `${clampedX}px`;
        toolbar.style.top = `${clampedY}px`;
    };

    const centerToolbarBottom = () => {
        const rect = toolbar.getBoundingClientRect();
        const w = rect.width || 560;
        const h = rect.height || 40;
        applyToolbarPos((window.innerWidth - w) * 0.5, window.innerHeight - h - 14);
    };

    const resizeCanvases = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);

        let snapshot = null;
        if (drawCanvas.width > 0 && drawCanvas.height > 0) {
            snapshot = document.createElement('canvas');
            snapshot.width = drawCanvas.width;
            snapshot.height = drawCanvas.height;
            const snapCtx = snapshot.getContext('2d');
            if (snapCtx) {
                snapCtx.drawImage(drawCanvas, 0, 0);
            }
        }

        drawCanvas.width = Math.round(w * dpr);
        drawCanvas.height = Math.round(h * dpr);
        previewCanvas.width = Math.round(w * dpr);
        previewCanvas.height = Math.round(h * dpr);

        drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (snapshot) {
            drawCtx.drawImage(snapshot, 0, 0, w, h);
        }

        if (toolbarPos) {
            applyToolbarPos(toolbarPos.x, toolbarPos.y);
        }
    };

    const setActiveTool = (toolId) => {
        activeTool = toolId;
        for (let i = 0; i < TOOLS.length; i++) {
            const id = TOOLS[i].id;
            toolBtns[id].classList.toggle('active', id === toolId);
        }
    };

    const setBrushColor = (hex) => {
        brushColor = hex;
        colorPicker.value = hex;
        for (let i = 0; i < swatchBtns.length; i++) {
            swatchBtns[i].el.classList.toggle('active', swatchBtns[i].hex.toLowerCase() === hex.toLowerCase());
        }
    };

    const setBrushSize = (val) => {
        brushSize = clamp(Number(val) || 6, 2, 36);
        sizeSlider.value = String(brushSize);
        sizeVal.textContent = String(brushSize);
    };

    const renderPreviewStroke = () => {
        previewCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (strokePoints.length === 0) return;

        if (activeTool === 'arrow') {
            const first = strokePoints[0];
            const last = strokePoints[strokePoints.length - 1];
            drawArrow(previewCtx, first.x, first.y, last.x, last.y, brushSize, brushColor);
            return;
        }

        previewCtx.save();
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';
        previewCtx.strokeStyle = brushColor;

        if (activeTool === 'highlighter') {
            previewCtx.globalAlpha = 0.36;
            previewCtx.lineWidth = Math.max(12, brushSize * 2.4);
        } else if (activeTool === 'dashed') {
            previewCtx.lineWidth = brushSize;
            previewCtx.setLineDash([brushSize * 2.2, brushSize * 1.6]);
        } else {
            previewCtx.lineWidth = brushSize;
        }

        traceSmoothPath(previewCtx, strokePoints);
        previewCtx.stroke();
        previewCtx.restore();
    };

    const drawSprayAt = (x, y) => {
        const radius = Math.max(8, brushSize * 2);
        const count = Math.max(14, Math.floor(brushSize * 2.2));
        drawCtx.save();
        drawCtx.fillStyle = brushColor;
        drawCtx.globalAlpha = 0.45;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            const dotR = Math.max(0.8, brushSize * 0.14);
            drawCtx.beginPath();
            drawCtx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, dotR, 0, Math.PI * 2);
            drawCtx.fill();
        }
        drawCtx.restore();
    };

    const drawSegment = (targetCtx, x1, y1, x2, y2, color, width, isEraser) => {
        targetCtx.save();
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        targetCtx.lineWidth = width;
        if (isEraser) {
            targetCtx.globalCompositeOperation = 'destination-out';
            targetCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
        } else {
            targetCtx.strokeStyle = color;
        }
        targetCtx.beginPath();
        targetCtx.moveTo(x1, y1);
        targetCtx.lineTo(x2, y2);
        targetCtx.stroke();
        targetCtx.restore();
    };

    const onCanvasPointerDown = (event) => {
        if (!drawMode) return;
        if (event.button !== undefined && event.button !== 0) return;

        if (isPlayingNow()) {
            ctx.ui.toast({ content: ctx.i18n.t('toastNeedPause'), type: 'warning' });
            syncCanvasInteractive();
            return;
        }

        isDrawing = true;
        lastX = event.clientX;
        lastY = event.clientY;
        strokePoints = [{ x: lastX, y: lastY }];
        pushHistory();

        if (activeTool === 'spray') {
            drawSprayAt(lastX, lastY);
        } else if (activeTool === 'rainbow') {
            rainbowHue = (rainbowHue + 4) % 360;
            drawSegment(drawCtx, lastX, lastY, lastX + 0.01, lastY + 0.01, `hsl(${rainbowHue}, 90%, 60%)`, brushSize, false);
        } else if (activeTool === 'eraser') {
            drawSegment(drawCtx, lastX, lastY, lastX + 0.01, lastY + 0.01, '#000', Math.max(10, brushSize * 2), true);
        } else {
            renderPreviewStroke();
        }
    };

    const onCanvasPointerMove = (event) => {
        if (!isDrawing) return;
        const x = event.clientX;
        const y = event.clientY;

        if (activeTool === 'spray') {
            drawSprayAt(x, y);
        } else if (activeTool === 'rainbow') {
            rainbowHue = (rainbowHue + 5) % 360;
            drawSegment(drawCtx, lastX, lastY, x, y, `hsl(${rainbowHue}, 90%, 60%)`, brushSize, false);
        } else if (activeTool === 'eraser') {
            drawSegment(drawCtx, lastX, lastY, x, y, '#000', Math.max(10, brushSize * 2), true);
        } else {
            if (activeTool === 'arrow') {
                strokePoints = [strokePoints[0], { x, y }];
            } else {
                strokePoints.push({ x, y });
            }
            renderPreviewStroke();
        }

        lastX = x;
        lastY = y;
    };

    const finishStroke = () => {
        if (!isDrawing) return;
        isDrawing = false;

        if (activeTool !== 'spray' && activeTool !== 'rainbow' && activeTool !== 'eraser') {
            drawCtx.drawImage(previewCanvas, 0, 0, window.innerWidth, window.innerHeight);
            previewCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
        strokePoints = [];
    };

    const onGripPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = toolbar.getBoundingClientRect();
        isDraggingBar = true;
        barDragOffsetX = event.clientX - rect.left;
        barDragOffsetY = event.clientY - rect.top;
        event.preventDefault();
    };

    const onWindowPointerMove = (event) => {
        if (isDraggingBar) {
            applyToolbarPos(event.clientX - barDragOffsetX, event.clientY - barDragOffsetY);
            return;
        }
        onCanvasPointerMove(event);
    };

    const onWindowPointerUp = () => {
        if (isDraggingBar) {
            isDraggingBar = false;
        }
        finishStroke();
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape' && drawMode) {
            drawMode = false;
            finishStroke();
            syncCanvasInteractive();
            ctx.ui.toast({ content: ctx.i18n.t('toastPausedMode'), type: 'info' });
        }
    };

    modeBtn.addEventListener('click', () => {
        drawMode = !drawMode;
        if (!drawMode) finishStroke();
        syncCanvasInteractive();
        ctx.ui.toast({
            content: ctx.i18n.t(drawMode ? 'toastActiveMode' : 'toastPausedMode'),
            type: 'info'
        });
    });

    sizeSlider.addEventListener('input', (e) => setBrushSize(e.target.value));
    undoBtn.addEventListener('click', undo);
    clearBtn.addEventListener('click', () => clearAll(true));
    grip.addEventListener('pointerdown', onGripPointerDown);
    previewCanvas.addEventListener('pointerdown', onCanvasPointerDown);

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', resizeCanvases);

    ctx.events.on('playback:state-changed', ({ isPlaying }) => {
        if (isPlaying) {
            finishStroke();
            if (settings.clearOnPlay) {
                clearAll(false);
            }
        }
        syncCanvasInteractive();
    });

    ctx.ui.registerMenuItem({
        id: 'toggle-toolbar',
        label: '顯示或隱藏工具列',
        labelKey: `ext.${EXTENSION_ID}.menuToggleBar`,
        onClick: () => {
            toolbar.classList.toggle('hidden');
        }
    });

    ctx.ui.registerMenuItem({
        id: 'clear-canvas',
        label: '清除繪圖畫布',
        labelKey: `ext.${EXTENSION_ID}.menuClear`,
        onClick: () => clearAll(true)
    });

    ctx.ui.registerMenuItem({
        id: 'open-settings',
        label: '筆刷設定',
        labelKey: `ext.${EXTENSION_ID}.menuSettings`,
        onClick: ({ anchorEl }) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (key, _val, allValues) => {
                    settings = allValues;
                    if (key === 'defaultSize') {
                        setBrushSize(allValues.defaultSize);
                    }
                    toolbar.classList.toggle('hidden', !allValues.showToolbar);
                }
            });
        }
    });

    resizeCanvases();
    setActiveTool('pen');
    setBrushColor(PRESET_COLORS[0]);
    setBrushSize(brushSize);
    updateUndoState();
    toolbar.classList.toggle('hidden', !settings.showToolbar);
    syncCanvasInteractive();
    requestAnimationFrame(centerToolbarBottom);

    return () => {
        finishStroke();
        previewCanvas.removeEventListener('pointerdown', onCanvasPointerDown);
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', resizeCanvases);
    };
}
