const EXTENSION_ID = 'com.wmcx.chart-brush';
const MAX_HISTORY = 20;
const VIEWPORT_MARGIN = 8;

const TOOLS = [
    { id: 'pen', icon: 'draw', labelKey: 'toolPen', fallback: '實線筆' },
    { id: 'highlighter', icon: 'ink_highlighter', labelKey: 'toolHighlighter', fallback: '螢光筆' },
    { id: 'eraser', icon: 'ink_eraser', labelKey: 'toolEraser', fallback: '橡皮擦' }
];

const SHAPES = [
    { id: 'line', icon: 'horizontal_rule', labelKey: 'shapeLine', fallback: '直線' },
    { id: 'arrow', icon: 'north_east', labelKey: 'shapeArrow', fallback: '箭頭' },
    { id: 'rect', icon: 'crop_square', labelKey: 'shapeRect', fallback: '矩形' },
    { id: 'circle', icon: 'radio_button_unchecked', labelKey: 'shapeCircle', fallback: '圓形' }
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

const PRESET_SIZES = [2, 4, 6, 10, 16, 24, 36];

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
    },
    {
        key: 'allowDrawWhilePlaying',
        type: 'boolean',
        default: false,
        label: '播放時允許繪製',
        labelKey: `ext.${EXTENSION_ID}.optAllowDrawWhilePlaying`
    }
];

const TRANSLATIONS = {
    'zh-TW': {
        menuToggleBar: '顯示或隱藏工具列',
        menuClear: '清除繪圖畫布',
        menuSettings: '筆刷設定',
        settingsTitle: '畫筆工具設定',
        optDefaultSize: '預設筆刷粗細',
        optClearOnPlay: '開始播放時自動清除',
        optShowToolbar: '顯示浮動繪圖工具列',
        optAllowDrawWhilePlaying: '播放時允許繪製',
        drawOn: '繪圖：開',
        drawOff: '繪圖：關',
        toolPen: '實線筆',
        toolHighlighter: '螢光筆',
        toolEraser: '橡皮擦',
        btnShape: '形狀',
        shapeLine: '直線',
        shapeArrow: '箭頭',
        shapeRect: '矩形',
        shapeCircle: '圓形',
        btnUndo: '復原',
        btnClear: '清除',
        btnColor: '筆刷顏色',
        btnSize: '筆刷粗細',
        btnMinimize: '最小化工具列',
        btnRestore: '展開繪圖工具列',
        toastNeedPause: '播放中無法繪圖，請先暫停譜面',
        toastPausedMode: '已暫停繪圖模式',
        toastActiveMode: '已開啟繪圖模式，按 Esc 可暫停並操作編輯器',
        toastCleared: '已清除畫布'
    },
    en: {
        menuToggleBar: 'Toggle Drawing Toolbar',
        menuClear: 'Clear Drawing Canvas',
        menuSettings: 'Brush Settings',
        settingsTitle: 'Brush Tool Settings',
        optDefaultSize: 'Default Brush Size',
        optClearOnPlay: 'Auto Clear on Play',
        optShowToolbar: 'Show Floating Toolbar',
        optAllowDrawWhilePlaying: 'Allow Drawing While Playing',
        drawOn: 'Draw: ON',
        drawOff: 'Draw: OFF',
        toolPen: 'Pen',
        toolHighlighter: 'Highlighter',
        toolEraser: 'Eraser',
        btnShape: 'Shapes',
        shapeLine: 'Line',
        shapeArrow: 'Arrow',
        shapeRect: 'Rectangle',
        shapeCircle: 'Circle',
        btnUndo: 'Undo',
        btnClear: 'Clear',
        btnColor: 'Brush Color',
        btnSize: 'Brush Size',
        btnMinimize: 'Minimize Toolbar',
        btnRestore: 'Expand Drawing Toolbar',
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

const MATERIAL_SYMBOLS_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

function ensureMaterialSymbolsFont() {
    if (typeof document === 'undefined' || !document.head) return;
    const existing = document.head.querySelector('link[data-chart-brush-ms="1"]');
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = MATERIAL_SYMBOLS_URL;
    link.dataset.chartBrushMs = '1';
    document.head.appendChild(link);
}

function createMaterialIcon(name, className = 'ms-icon') {
    const span = document.createElement('span');
    span.className = className;
    span.setAttribute('aria-hidden', 'true');
    span.setAttribute('translate', 'no');
    span.textContent = name;
    return span;
}

function createCornerArrow() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'corner-arrow');
    svg.setAttribute('viewBox', '0 0 6 6');
    svg.setAttribute('aria-hidden', 'true');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '0,0 6,0 0,6');
    poly.setAttribute('fill', 'currentColor');
    svg.appendChild(poly);
    return svg;
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(TRANSLATIONS);
    ensureMaterialSymbolsFont();

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
        @import url('${MATERIAL_SYMBOLS_URL}');

        :host {
            --cb-main-color: #131313;
            --cb-active-bg: #484852;
            --cb-hover-bg: rgba(255, 255, 255, 0.08);
            --cb-icon-muted: rgba(255, 255, 255, 0.6);
            --cb-icon-hover: rgba(255, 255, 255, 0.95);
            --cb-text: #ffffff;
            --cb-draw-on: #ffffff;
            --cb-draw-on-text: #000000;
            --cb-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.25);
            display: block;
            user-select: none;
            -webkit-user-select: none;
        }
        canvas {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
            pointer-events: none;
        }
        .preview-canvas.active {
            pointer-events: auto;
            cursor: crosshair;
            touch-action: none;
        }
        .ms-icon {
            font-family: 'Material Symbols Outlined', sans-serif;
            font-weight: 400;
            font-style: normal;
            font-size: 20px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-smoothing: antialiased;
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32;
            pointer-events: none;
        }
        .toolbar {
            position: fixed;
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: center;
            gap: 3px;
            max-width: calc(100vw - 16px);
            padding: 4px;
            border-radius: 6px;
            background: var(--cb-main-color);
            border: none;
            box-shadow: var(--cb-shadow);
            pointer-events: auto;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            color: var(--cb-text);
        }
        .toolbar::-webkit-scrollbar,
        .sub-popover::-webkit-scrollbar {
            display: none;
        }
        .toolbar.hidden {
            display: none;
        }
        .grip {
            flex-shrink: 0;
            display: grid;
            grid-template-columns: repeat(2, 3px);
            grid-template-rows: repeat(3, 3px);
            gap: 2px;
            padding: 6px 4px;
            cursor: grab;
            opacity: 0.55;
            touch-action: none;
        }
        .grip:active {
            cursor: grabbing;
        }
        .grip-dot {
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.7);
        }
        .btn {
            position: relative;
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: var(--cb-icon-muted);
            border-radius: 4px;
            padding: 0;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            touch-action: manipulation;
        }
        .btn:hover {
            color: var(--cb-icon-hover);
            background: var(--cb-hover-bg);
        }
        .btn.active,
        .btn.menu-open {
            background: var(--cb-active-bg);
            color: var(--cb-text);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .btn.draw-on {
            background: var(--cb-draw-on);
            color: var(--cb-draw-on-text);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .btn.draw-on:hover {
            background: #f0f0f0;
            color: #000000;
        }
        .btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }
        .divider {
            flex-shrink: 0;
            width: 1px;
            height: 18px;
            background: rgba(255, 255, 255, 0.12);
            margin: 0 2px;
        }
        .trigger-icon-slot {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        .corner-arrow {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 6px;
            height: 6px;
            pointer-events: none;
            display: block;
            color: rgba(255, 255, 255, 0.7);
        }
        .btn:hover .corner-arrow,
        .btn.menu-open .corner-arrow {
            color: #ffffff;
        }
        .color-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 1.5px solid rgba(255, 255, 255, 0.75);
            flex-shrink: 0;
            pointer-events: none;
        }
        .size-badge {
            font-size: 12px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1;
            color: rgba(255, 255, 255, 0.9);
            pointer-events: none;
        }
        .btn:hover .size-badge,
        .btn.menu-open .size-badge {
            color: #ffffff;
        }
        .sub-popover {
            position: fixed;
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: center;
            gap: 3px;
            max-width: calc(100vw - 16px);
            padding: 4px;
            border-radius: 6px;
            background: var(--cb-main-color);
            border: none;
            box-shadow: var(--cb-shadow);
            pointer-events: auto;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            color: var(--cb-text);
            animation: paletteSlideIn 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes paletteSlideIn {
            from {
                opacity: 0;
                transform: translateY(4px) scale(0.96);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        .sub-popover.hidden {
            display: none;
        }
        .palette-item {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: transparent;
            color: rgba(255, 255, 255, 0.7);
            transition: all 0.15s ease;
            touch-action: manipulation;
            flex-shrink: 0;
            padding: 0;
        }
        .palette-item:hover {
            background: var(--cb-hover-bg);
            color: var(--cb-text);
        }
        .palette-item.active {
            background: var(--cb-active-bg);
            color: var(--cb-text);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .swatch-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1.5px solid rgba(255, 255, 255, 0.35);
            pointer-events: none;
        }
        .palette-item.active .swatch-dot {
            border-color: #ffffff;
        }
        .color-input {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border: none;
            border-radius: 4px;
            padding: 0;
            background: transparent;
            cursor: pointer;
        }
        .size-chip-text {
            font-size: 11px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1;
            pointer-events: none;
        }
        .size-slider {
            flex-shrink: 0;
            width: 80px;
            margin: 0 4px;
            accent-color: #49e;
            cursor: pointer;
        }
        .size-val {
            flex-shrink: 0;
            min-width: 22px;
            padding-right: 4px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: rgba(255, 255, 255, 0.7);
        }
        .mini-fab {
            position: fixed;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            background: #000000;
            border: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 1px 4px rgba(0, 0, 0, 0.3);
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            pointer-events: auto;
            touch-action: none;
            transition: color 0.15s ease, background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s ease;
        }
        .mini-fab:hover {
            color: #ffffff;
            background: #111111;
        }
        .mini-fab.draw-on {
            box-shadow: 0 0 0 1.5px #ffffff, 0 4px 16px rgba(0, 0, 0, 0.6);
            color: #ffffff;
        }
        .mini-fab.hidden {
            display: none;
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
    const modeIcon = createMaterialIcon('edit');
    modeBtn.appendChild(modeIcon);

    const div1 = document.createElement('span');
    div1.className = 'divider';

    const toolBtns = {};
    toolbar.append(grip, modeBtn, div1);

    for (let i = 0; i < TOOLS.length; i++) {
        const def = TOOLS[i];
        const label = ctx.i18n.t(def.labelKey) || def.fallback;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.appendChild(createMaterialIcon(def.icon));
        btn.addEventListener('click', () => {
            closeSubPopover();
            setActiveTool(def.id);
        });
        toolBtns[def.id] = btn;
        toolbar.appendChild(btn);
    }

    const shapeBtn = document.createElement('button');
    shapeBtn.type = 'button';
    shapeBtn.className = 'btn';
    shapeBtn.setAttribute('aria-label', ctx.i18n.t('btnShape'));
    shapeBtn.title = ctx.i18n.t('btnShape');
    const shapeSlot = document.createElement('span');
    shapeSlot.className = 'trigger-icon-slot';
    const shapeIcon = createMaterialIcon(SHAPES[0].icon);
    shapeSlot.appendChild(shapeIcon);
    shapeBtn.append(shapeSlot, createCornerArrow());
    toolbar.appendChild(shapeBtn);

    const shapePopover = document.createElement('div');
    shapePopover.className = 'sub-popover hidden';
    const shapeItemBtns = {};

    for (let i = 0; i < SHAPES.length; i++) {
        const def = SHAPES[i];
        const label = ctx.i18n.t(def.labelKey) || def.fallback;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'palette-item';
        item.setAttribute('aria-label', label);
        item.title = label;
        item.appendChild(createMaterialIcon(def.icon));
        item.addEventListener('click', () => {
            activeShape = def.id;
            shapeIcon.textContent = def.icon;
            setActiveTool(def.id);
            closeSubPopover();
        });
        shapeItemBtns[def.id] = item;
        shapePopover.appendChild(item);
    }

    const div2 = document.createElement('span');
    div2.className = 'divider';

    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'btn';
    colorBtn.setAttribute('aria-label', ctx.i18n.t('btnColor'));
    colorBtn.title = ctx.i18n.t('btnColor');
    const colorSlot = document.createElement('span');
    colorSlot.className = 'trigger-icon-slot';
    const colorDot = document.createElement('span');
    colorDot.className = 'color-dot';
    colorSlot.appendChild(colorDot);
    colorBtn.append(colorSlot, createCornerArrow());

    const sizeBtn = document.createElement('button');
    sizeBtn.type = 'button';
    sizeBtn.className = 'btn';
    sizeBtn.setAttribute('aria-label', ctx.i18n.t('btnSize'));
    sizeBtn.title = ctx.i18n.t('btnSize');
    const sizeSlot = document.createElement('span');
    sizeSlot.className = 'trigger-icon-slot';
    const sizeBadge = document.createElement('span');
    sizeBadge.className = 'size-badge';
    sizeSlot.appendChild(sizeBadge);
    sizeBtn.append(sizeSlot, createCornerArrow());

    const colorPopover = document.createElement('div');
    colorPopover.className = 'sub-popover hidden';
    const swatchBtns = [];

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'color-input';
    colorPicker.value = PRESET_COLORS[0];

    for (let i = 0; i < PRESET_COLORS.length; i++) {
        const hex = PRESET_COLORS[i];
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'palette-item';
        const swDot = document.createElement('span');
        swDot.className = 'swatch-dot';
        swDot.style.backgroundColor = hex;
        sw.appendChild(swDot);
        sw.addEventListener('click', () => {
            setBrushColor(hex);
            closeSubPopover();
        });
        swatchBtns.push({ hex, el: sw });
        colorPopover.appendChild(sw);
    }
    const pickerWrap = document.createElement('span');
    pickerWrap.className = 'palette-item';
    pickerWrap.appendChild(colorPicker);
    colorPicker.addEventListener('input', (e) => setBrushColor(e.target.value));
    colorPopover.appendChild(pickerWrap);

    const sizePopover = document.createElement('div');
    sizePopover.className = 'sub-popover hidden';
    const sizeChipBtns = [];

    for (let i = 0; i < PRESET_SIZES.length; i++) {
        const sz = PRESET_SIZES[i];
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'palette-item';
        const chipText = document.createElement('span');
        chipText.className = 'size-chip-text';
        chipText.textContent = String(sz);
        chip.appendChild(chipText);
        chip.addEventListener('click', () => {
            setBrushSize(sz);
            closeSubPopover();
        });
        sizeChipBtns.push({ size: sz, el: chip });
        sizePopover.appendChild(chip);
    }

    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.className = 'size-slider';
    sizeSlider.min = '2';
    sizeSlider.max = '36';
    sizeSlider.step = '1';
    const sizeVal = document.createElement('span');
    sizeVal.className = 'size-val';
    sizePopover.append(sizeSlider, sizeVal);

    const div4 = document.createElement('span');
    div4.className = 'divider';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'btn';
    undoBtn.setAttribute('aria-label', ctx.i18n.t('btnUndo'));
    undoBtn.title = ctx.i18n.t('btnUndo');
    undoBtn.appendChild(createMaterialIcon('undo'));

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.setAttribute('aria-label', ctx.i18n.t('btnClear'));
    clearBtn.title = ctx.i18n.t('btnClear');
    clearBtn.appendChild(createMaterialIcon('delete_sweep'));

    const minimizeBtn = document.createElement('button');
    minimizeBtn.type = 'button';
    minimizeBtn.className = 'btn';
    minimizeBtn.setAttribute('aria-label', ctx.i18n.t('btnMinimize'));
    minimizeBtn.title = ctx.i18n.t('btnMinimize');
    minimizeBtn.appendChild(createMaterialIcon('remove'));

    const miniFab = document.createElement('button');
    miniFab.type = 'button';
    miniFab.className = 'mini-fab hidden';
    miniFab.setAttribute('aria-label', ctx.i18n.t('btnRestore'));
    miniFab.title = ctx.i18n.t('btnRestore');
    miniFab.appendChild(createMaterialIcon('brush'));

    toolbar.append(div2, colorBtn, sizeBtn, div4, undoBtn, clearBtn, minimizeBtn);
    shadow.append(style, drawCanvas, previewCanvas, toolbar, shapePopover, colorPopover, sizePopover, miniFab);

    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let drawMode = true;
    let activeTool = 'pen';
    let activeShape = SHAPES[0].id;
    let brushColor = PRESET_COLORS[0];
    let brushSize = settings.defaultSize || 6;

    let canvasWidth = Math.max(1, window.innerWidth);
    let canvasHeight = Math.max(1, window.innerHeight);

    let isDrawing = false;
    let activePointerId = null;
    let strokePoints = [];
    let lastX = 0;
    let lastY = 0;
    const history = [];

    let isToolbarVisible = Boolean(settings.showToolbar);
    let isMinimized = false;
    let activePopover = null;
    let toolbarPos = null;
    let isDraggingBar = false;
    let barDragOffsetX = 0;
    let barDragOffsetY = 0;

    let miniPos = null;
    let isDraggingMini = false;
    let miniPointerId = null;
    let miniDragMoved = false;
    let miniDragStartX = 0;
    let miniDragStartY = 0;
    let miniDragOffsetX = 0;
    let miniDragOffsetY = 0;

    const isPlayingNow = () => {
        const st = ctx.playback.getState();
        return Boolean(st && st.isPlaying);
    };

    const canDrawNow = () => drawMode && (Boolean(settings.allowDrawWhilePlaying) || !isPlayingNow());

    const positionSubPopover = (popoverEl, anchorEl) => {
        const anchorRect = anchorEl.getBoundingClientRect();
        const barRect = toolbar.getBoundingClientRect();
        const popRect = popoverEl.getBoundingClientRect();
        const pw = popRect.width || 240;
        const ph = popRect.height || 38;
        const gap = 8;

        let x = anchorRect.left + (anchorRect.width - pw) * 0.5;
        x = clamp(x, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - pw - VIEWPORT_MARGIN));

        let y = barRect.top - ph - gap;
        if (y < VIEWPORT_MARGIN) {
            y = Math.min(window.innerHeight - ph - VIEWPORT_MARGIN, barRect.bottom + gap);
        }
        popoverEl.style.left = `${x}px`;
        popoverEl.style.top = `${y}px`;
    };

    const closeSubPopover = () => {
        activePopover = null;
        shapePopover.classList.add('hidden');
        colorPopover.classList.add('hidden');
        sizePopover.classList.add('hidden');
        shapeBtn.classList.remove('menu-open');
        colorBtn.classList.remove('menu-open');
        sizeBtn.classList.remove('menu-open');
    };

    const toggleSubPopover = (type) => {
        if (activePopover === type) {
            closeSubPopover();
            return;
        }
        closeSubPopover();
        activePopover = type;
        const popMap = {
            shape: { pop: shapePopover, btn: shapeBtn },
            color: { pop: colorPopover, btn: colorBtn },
            size: { pop: sizePopover, btn: sizeBtn }
        };
        const target = popMap[type];
        if (!target) return;
        target.pop.classList.remove('hidden');
        target.btn.classList.add('menu-open');
        positionSubPopover(target.pop, target.btn);
    };

    const syncToolbarVisibility = () => {
        if (!isToolbarVisible || isMinimized) {
            closeSubPopover();
        }
        toolbar.classList.toggle('hidden', !isToolbarVisible || isMinimized);
        miniFab.classList.toggle('hidden', !isToolbarVisible || !isMinimized);
    };

    const syncCanvasInteractive = () => {
        const canDraw = canDrawNow();
        previewCanvas.classList.toggle('active', canDraw);
        modeBtn.classList.toggle('draw-on', drawMode);
        modeIcon.textContent = drawMode ? 'edit' : 'edit_off';
        const modeLabel = ctx.i18n.t(drawMode ? 'drawOn' : 'drawOff');
        modeBtn.setAttribute('aria-label', modeLabel);
        modeBtn.title = modeLabel;
        miniFab.classList.toggle('draw-on', drawMode);
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
        drawCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        history.length = 0;
        strokePoints = [];
        isDrawing = false;
        activePointerId = null;
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

    const applyMiniPos = (x, y) => {
        const size = 44;
        const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - size - VIEWPORT_MARGIN);
        const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - size - VIEWPORT_MARGIN);
        const clampedX = clamp(x, VIEWPORT_MARGIN, maxX);
        const clampedY = clamp(y, VIEWPORT_MARGIN, maxY);
        miniPos = { x: clampedX, y: clampedY };
        miniFab.style.left = `${clampedX}px`;
        miniFab.style.top = `${clampedY}px`;
    };

    const centerToolbarBottom = () => {
        const rect = toolbar.getBoundingClientRect();
        const w = rect.width || 560;
        const h = rect.height || 40;
        applyToolbarPos((window.innerWidth - w) * 0.5, window.innerHeight - h - 14);
    };

    const getCanvasPoint = (event) => {
        const rect = previewCanvas.getBoundingClientRect();
        const rw = rect.width || canvasWidth;
        const rh = rect.height || canvasHeight;
        return {
            x: ((event.clientX - rect.left) * canvasWidth) / rw,
            y: ((event.clientY - rect.top) * canvasHeight) / rh
        };
    };

    const resizeCanvases = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = previewCanvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width || window.innerWidth));
        const h = Math.max(1, Math.round(rect.height || window.innerHeight));
        canvasWidth = w;
        canvasHeight = h;

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
        if (miniPos) {
            applyMiniPos(miniPos.x, miniPos.y);
        }
    };

    const isShapeTool = (toolId) => SHAPES.some((s) => s.id === toolId);

    const setActiveTool = (toolId) => {
        activeTool = toolId;
        for (let i = 0; i < TOOLS.length; i++) {
            const id = TOOLS[i].id;
            toolBtns[id].classList.toggle('active', id === toolId);
        }
        shapeBtn.classList.toggle('active', isShapeTool(toolId));
        for (let i = 0; i < SHAPES.length; i++) {
            const id = SHAPES[i].id;
            shapeItemBtns[id].classList.toggle('active', id === toolId);
        }
    };

    const setBrushColor = (hex) => {
        brushColor = hex;
        colorPicker.value = hex;
        colorDot.style.backgroundColor = hex;
        for (let i = 0; i < swatchBtns.length; i++) {
            swatchBtns[i].el.classList.toggle('active', swatchBtns[i].hex.toLowerCase() === hex.toLowerCase());
        }
    };

    const setBrushSize = (val) => {
        brushSize = clamp(Number(val) || 6, 2, 36);
        sizeSlider.value = String(brushSize);
        sizeVal.textContent = String(brushSize);
        sizeBadge.textContent = String(brushSize);
        for (let i = 0; i < sizeChipBtns.length; i++) {
            sizeChipBtns[i].el.classList.toggle('active', sizeChipBtns[i].size === brushSize);
        }
    };

    const renderPreviewStroke = () => {
        previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (strokePoints.length === 0) return;

        const first = strokePoints[0];
        const last = strokePoints[strokePoints.length - 1];

        if (activeTool === 'arrow') {
            drawArrow(previewCtx, first.x, first.y, last.x, last.y, brushSize, brushColor);
            return;
        }
        if (activeTool === 'line') {
            drawSegment(previewCtx, first.x, first.y, last.x, last.y, brushColor, brushSize, false);
            return;
        }
        if (activeTool === 'rect') {
            previewCtx.save();
            previewCtx.strokeStyle = brushColor;
            previewCtx.lineWidth = brushSize;
            previewCtx.lineJoin = 'round';
            previewCtx.strokeRect(
                Math.min(first.x, last.x),
                Math.min(first.y, last.y),
                Math.abs(last.x - first.x),
                Math.abs(last.y - first.y)
            );
            previewCtx.restore();
            return;
        }
        if (activeTool === 'circle') {
            const cx = (first.x + last.x) * 0.5;
            const cy = (first.y + last.y) * 0.5;
            const rx = Math.abs(last.x - first.x) * 0.5;
            const ry = Math.abs(last.y - first.y) * 0.5;
            previewCtx.save();
            previewCtx.strokeStyle = brushColor;
            previewCtx.lineWidth = brushSize;
            previewCtx.beginPath();
            previewCtx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
            previewCtx.stroke();
            previewCtx.restore();
            return;
        }

        previewCtx.save();
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';
        previewCtx.strokeStyle = brushColor;

        if (activeTool === 'highlighter') {
            previewCtx.globalAlpha = 0.36;
            previewCtx.lineWidth = Math.max(12, brushSize * 2.4);
        } else {
            previewCtx.lineWidth = brushSize;
        }

        traceSmoothPath(previewCtx, strokePoints);
        previewCtx.stroke();
        previewCtx.restore();
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
        if (isDrawing && activePointerId !== null && activePointerId !== event.pointerId) return;

        if (isPlayingNow() && !settings.allowDrawWhilePlaying) {
            ctx.ui.toast({ content: ctx.i18n.t('toastNeedPause'), type: 'warning' });
            syncCanvasInteractive();
            return;
        }

        isDrawing = true;
        activePointerId = event.pointerId;
        if (typeof previewCanvas.setPointerCapture === 'function') {
            try {
                previewCanvas.setPointerCapture(event.pointerId);
            } catch {
                // 忽略不支援指標捕獲的環境
            }
        }
        const pt = getCanvasPoint(event);
        lastX = pt.x;
        lastY = pt.y;
        strokePoints = [{ x: lastX, y: lastY }];
        pushHistory();

        if (activeTool === 'eraser') {
            drawSegment(drawCtx, lastX, lastY, lastX + 0.01, lastY + 0.01, '#000', Math.max(10, brushSize * 2), true);
        } else {
            renderPreviewStroke();
        }
    };

    const onCanvasPointerMove = (event) => {
        if (!isDrawing) return;
        if (activePointerId !== null && event.pointerId !== activePointerId) return;
        const { x, y } = getCanvasPoint(event);

        if (activeTool === 'eraser') {
            drawSegment(drawCtx, lastX, lastY, x, y, '#000', Math.max(10, brushSize * 2), true);
        } else {
            if (isShapeTool(activeTool)) {
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
        activePointerId = null;

        if (activeTool !== 'eraser') {
            drawCtx.drawImage(previewCanvas, 0, 0, canvasWidth, canvasHeight);
            previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        strokePoints = [];
    };

    const onGripPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        closeSubPopover();
        const rect = toolbar.getBoundingClientRect();
        isDraggingBar = true;
        barDragOffsetX = event.clientX - rect.left;
        barDragOffsetY = event.clientY - rect.top;
        event.preventDefault();
    };

    const onMiniPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = miniFab.getBoundingClientRect();
        isDraggingMini = true;
        miniPointerId = event.pointerId;
        miniDragMoved = false;
        miniDragStartX = event.clientX;
        miniDragStartY = event.clientY;
        miniDragOffsetX = event.clientX - rect.left;
        miniDragOffsetY = event.clientY - rect.top;
        if (typeof miniFab.setPointerCapture === 'function') {
            try {
                miniFab.setPointerCapture(event.pointerId);
            } catch {
                // 忽略不支援指標捕獲的環境
            }
        }
        event.preventDefault();
    };

    const onWindowPointerMove = (event) => {
        if (isDraggingBar) {
            applyToolbarPos(event.clientX - barDragOffsetX, event.clientY - barDragOffsetY);
            return;
        }
        if (isDraggingMini && (miniPointerId === null || event.pointerId === miniPointerId)) {
            if (!miniDragMoved && Math.hypot(event.clientX - miniDragStartX, event.clientY - miniDragStartY) > 5) {
                miniDragMoved = true;
            }
            if (miniDragMoved) {
                applyMiniPos(event.clientX - miniDragOffsetX, event.clientY - miniDragOffsetY);
            }
            return;
        }
        onCanvasPointerMove(event);
    };

    const onWindowPointerUp = (event) => {
        if (isDraggingBar) {
            isDraggingBar = false;
        }
        if (isDraggingMini && (!event || miniPointerId === null || event.pointerId === miniPointerId)) {
            const shouldRestore = !miniDragMoved && (!event || event.type !== 'pointercancel');
            isDraggingMini = false;
            miniPointerId = null;
            miniDragMoved = false;
            if (shouldRestore) {
                isMinimized = false;
                syncToolbarVisibility();
                if (toolbarPos) {
                    applyToolbarPos(toolbarPos.x, toolbarPos.y);
                }
            }
        }
        if (!event || activePointerId === null || event.pointerId === activePointerId) {
            finishStroke();
        }
    };

    const onWindowPointerDown = (event) => {
        if (!activePopover) return;
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        if (path.includes(toolbar) || path.includes(shapePopover) || path.includes(colorPopover) || path.includes(sizePopover)) {
            return;
        }
        closeSubPopover();
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            if (activePopover) {
                closeSubPopover();
                return;
            }
            if (drawMode) {
                drawMode = false;
                finishStroke();
                syncCanvasInteractive();
                ctx.ui.toast({ content: ctx.i18n.t('toastPausedMode'), type: 'info' });
            }
        }
    };

    modeBtn.addEventListener('click', () => {
        closeSubPopover();
        drawMode = !drawMode;
        if (!drawMode) finishStroke();
        syncCanvasInteractive();
        ctx.ui.toast({
            content: ctx.i18n.t(drawMode ? 'toastActiveMode' : 'toastPausedMode'),
            type: 'info'
        });
    });

    shapeBtn.addEventListener('click', () => {
        setActiveTool(activeShape);
        toggleSubPopover('shape');
    });
    colorBtn.addEventListener('click', () => toggleSubPopover('color'));
    sizeBtn.addEventListener('click', () => toggleSubPopover('size'));
    sizeSlider.addEventListener('input', (e) => setBrushSize(e.target.value));
    undoBtn.addEventListener('click', () => {
        closeSubPopover();
        undo();
    });
    clearBtn.addEventListener('click', () => {
        closeSubPopover();
        clearAll(true);
    });
    minimizeBtn.addEventListener('click', () => {
        isMinimized = true;
        if (!miniPos) {
            const rect = toolbar.getBoundingClientRect();
            const initX = rect.width > 0 ? rect.right - 46 : window.innerWidth - 58;
            const initY = rect.height > 0 ? rect.top : window.innerHeight - 54;
            applyMiniPos(initX, initY);
        } else {
            applyMiniPos(miniPos.x, miniPos.y);
        }
        syncToolbarVisibility();
    });
    miniFab.addEventListener('pointerdown', onMiniPointerDown);
    grip.addEventListener('pointerdown', onGripPointerDown);
    previewCanvas.addEventListener('pointerdown', onCanvasPointerDown);

    window.addEventListener('pointerdown', onWindowPointerDown);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', resizeCanvases);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeCanvases);
    }

    ctx.events.on('playback:state-changed', ({ isPlaying }) => {
        if (isPlaying) {
            if (!settings.allowDrawWhilePlaying || settings.clearOnPlay) {
                finishStroke();
            }
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
            isToolbarVisible = !isToolbarVisible;
            syncToolbarVisibility();
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
                    if (key === 'showToolbar') {
                        isToolbarVisible = Boolean(allValues.showToolbar);
                        syncToolbarVisibility();
                    }
                    if (key === 'allowDrawWhilePlaying') {
                        syncCanvasInteractive();
                    }
                }
            });
        }
    });

    resizeCanvases();
    setActiveTool('pen');
    setBrushColor(PRESET_COLORS[0]);
    setBrushSize(brushSize);
    updateUndoState();
    syncToolbarVisibility();
    syncCanvasInteractive();
    requestAnimationFrame(centerToolbarBottom);

    return () => {
        finishStroke();
        miniFab.removeEventListener('pointerdown', onMiniPointerDown);
        previewCanvas.removeEventListener('pointerdown', onCanvasPointerDown);
        window.removeEventListener('pointerdown', onWindowPointerDown);
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', resizeCanvases);
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', resizeCanvases);
        }
    };
}
