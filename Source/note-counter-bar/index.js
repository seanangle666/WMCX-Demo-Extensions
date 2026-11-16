const EXTENSION_ID = 'com.wmcx.note-counter-bar';
const STORAGE_POS_KEY = 'barPosition';
const VIEWPORT_MARGIN = 8;
const DEFAULT_TOP = 64;

const NOTE_ITEMS = [
    { key: 'total', label: 'TOTAL', color: '#e2e8f0', settingFlag: 'showTotal' },
    { key: 'tap', label: 'TAP', color: '#f472b6' },
    { key: 'hold', label: 'HOLD', color: '#fb7185' },
    { key: 'slide', label: 'SLIDE', color: '#38bdf8' },
    { key: 'touch', label: 'TOUCH', color: '#facc15' },
    { key: 'break', label: 'BREAK', color: '#fb923c' },
    { key: 'ex', label: 'EX', color: '#c084fc', settingFlag: 'showEx' }
];

const SETTINGS_SCHEMA = [
    {
        key: 'visible',
        type: 'boolean',
        default: true,
        label: '顯示物量橫條',
        labelKey: `ext.${EXTENSION_ID}.optVisible`
    },
    {
        key: 'compact',
        type: 'boolean',
        default: false,
        label: '精簡顯示模式',
        labelKey: `ext.${EXTENSION_ID}.optCompact`
    },
    {
        key: 'showTotal',
        type: 'boolean',
        default: true,
        label: '顯示總物量',
        labelKey: `ext.${EXTENSION_ID}.optShowTotal`
    },
    {
        key: 'showEx',
        type: 'boolean',
        default: false,
        label: '顯示保護音符統計',
        labelKey: `ext.${EXTENSION_ID}.optShowEx`
    },
    {
        key: 'opacity',
        type: 'number',
        default: 0.9,
        min: 0.3,
        max: 1,
        step: 0.05,
        label: '橫條透明度',
        labelKey: `ext.${EXTENSION_ID}.optOpacity`
    }
];

const TRANSLATIONS = {
    'zh-TW': {
        menuSettings: '橫條設定',
        menuResetPos: '重設橫條位置',
        settingsTitle: '音符物量橫條設定',
        optVisible: '顯示物量橫條',
        optCompact: '精簡顯示模式',
        optShowTotal: '顯示總物量',
        optShowEx: '顯示保護音符統計',
        optOpacity: '橫條透明度'
    },
    en: {
        menuSettings: 'Counter Bar Settings',
        menuResetPos: 'Reset Bar Position',
        settingsTitle: 'Note Counter Bar Settings',
        optVisible: 'Show Counter Bar',
        optCompact: 'Compact Mode',
        optShowTotal: 'Show Total Count',
        optShowEx: 'Show Ex Note Count',
        optOpacity: 'Bar Opacity'
    }
};

/**
 * 依主程式 decode.js 規則統計各類音符數量
 * @param {Array<Object>} notes
 * @returns {Object}
 */
function countNotes(notes) {
    const counts = {
        total: 0,
        tap: 0,
        hold: 0,
        slide: 0,
        touch: 0,
        break: 0,
        ex: 0
    };

    if (!Array.isArray(notes)) {
        return counts;
    }

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (!note) continue;

        // 多段滑星會產生多個分段物件，僅最後一段計入滑星數量
        if (note.type === 'slide' && note.lastSlide === false) {
            continue;
        }

        if (note.isEx) {
            counts.ex += 1;
        }

        if (note.isBreak) {
            counts.break += 1;
        } else if (note.type === 'tap') {
            counts.tap += 1;
        } else if (note.type === 'hold' || (note.type === 'touch' && note.isHold)) {
            counts.hold += 1;
        } else if (note.type === 'slide') {
            counts.slide += 1;
        } else if (note.type === 'touch') {
            counts.touch += 1;
        } else {
            continue;
        }

        counts.total += 1;
    }

    return counts;
}

/**
 * 將座標限制在可視視窗邊界內
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number }}
 */
function clampPosition(x, y, width, height) {
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
    return {
        x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
        y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY)
    };
}

/**
 * 建立橫條內部 Shadow DOM 結構與樣式
 * @param {HTMLElement} hostElement
 * @returns {{ bar: HTMLElement, valueNodes: Object, itemNodes: Object }}
 */
function buildBarDom(hostElement) {
    const shadow = hostElement.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host {
            display: block;
            user-select: none;
            -webkit-user-select: none;
        }
        .bar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 12px 6px 8px;
            border-radius: 10px;
            background: rgba(18, 22, 31, 0.88);
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: #f8fafc;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            line-height: 1;
            cursor: grab;
            touch-action: none;
            white-space: nowrap;
        }
        .bar.dragging {
            cursor: grabbing;
            border-color: rgba(255, 255, 255, 0.32);
        }
        .bar.compact {
            gap: 8px;
            padding: 5px 10px 5px 7px;
            font-size: 11px;
        }
        .grip {
            display: grid;
            grid-template-columns: repeat(2, 3px);
            grid-template-rows: repeat(3, 3px);
            gap: 2px;
            padding: 2px 3px;
            opacity: 0.55;
            flex-shrink: 0;
        }
        .grip-dot {
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: #cbd5e1;
        }
        .items {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .bar.compact .items {
            gap: 7px;
        }
        .item {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .item.hidden {
            display: none;
        }
        .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .label {
            font-weight: 600;
            letter-spacing: 0.03em;
            color: #cbd5e1;
        }
        .bar.compact .label {
            display: none;
        }
        .value {
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #ffffff;
        }
    `;

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');

    const grip = document.createElement('div');
    grip.className = 'grip';
    grip.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
        const dot = document.createElement('span');
        dot.className = 'grip-dot';
        grip.appendChild(dot);
    }

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'items';

    const valueNodes = {};
    const itemNodes = {};

    for (let i = 0; i < NOTE_ITEMS.length; i++) {
        const def = NOTE_ITEMS[i];
        const item = document.createElement('div');
        item.className = 'item';

        const colorDot = document.createElement('span');
        colorDot.className = 'dot';
        colorDot.style.backgroundColor = def.color;

        const labelNode = document.createElement('span');
        labelNode.className = 'label';
        labelNode.textContent = def.label;

        const valNode = document.createElement('span');
        valNode.className = 'value';
        valNode.textContent = '0';

        item.append(colorDot, labelNode, valNode);
        itemsWrap.appendChild(item);

        itemNodes[def.key] = item;
        valueNodes[def.key] = valNode;
    }

    bar.append(grip, itemsWrap);
    shadow.append(style, bar);

    return { bar, valueNodes, itemNodes };
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(TRANSLATIONS);

    // 採用自訂定位避免套用系統預設右側靠邊樣式
    const widget = ctx.ui.createFloatingWidget({
        id: 'note-counter-bar',
        position: 'custom'
    });
    const host = widget.element;
    const { bar, valueNodes, itemNodes } = buildBarDom(host);

    let currentSettings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let currentPos = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const applyPosition = (x, y) => {
        const rect = host.getBoundingClientRect();
        const width = rect.width || 320;
        const height = rect.height || 32;
        const clamped = clampPosition(x, y, width, height);
        currentPos = clamped;
        host.style.left = `${clamped.x}px`;
        host.style.top = `${clamped.y}px`;
    };

    const restoreOrCenterPosition = () => {
        const saved = ctx.storage.get(STORAGE_POS_KEY, null);
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            applyPosition(saved.x, saved.y);
            return;
        }
        const rect = host.getBoundingClientRect();
        const defaultX = Math.round((window.innerWidth - (rect.width || 320)) / 2);
        applyPosition(defaultX, DEFAULT_TOP);
    };

    const applySettings = (settings) => {
        currentSettings = settings;
        host.style.display = settings.visible ? 'block' : 'none';
        bar.style.opacity = String(settings.opacity);
        bar.classList.toggle('compact', Boolean(settings.compact));

        for (let i = 0; i < NOTE_ITEMS.length; i++) {
            const def = NOTE_ITEMS[i];
            if (!def.settingFlag) continue;
            const visible = Boolean(settings[def.settingFlag]);
            itemNodes[def.key].classList.toggle('hidden', !visible);
        }

        if (settings.visible && currentPos) {
            applyPosition(currentPos.x, currentPos.y);
        }
    };

    const updateCounts = () => {
        const snapshot = ctx.chart.getSnapshot();
        const counts = countNotes(snapshot ? snapshot.notes : []);
        for (let i = 0; i < NOTE_ITEMS.length; i++) {
            const key = NOTE_ITEMS[i].key;
            valueNodes[key].textContent = String(counts[key]);
        }
    };

    const onPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = host.getBoundingClientRect();
        isDragging = true;
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        bar.classList.add('dragging');
        event.preventDefault();
    };

    const onPointerMove = (event) => {
        if (!isDragging) return;
        applyPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    };

    const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        bar.classList.remove('dragging');
        if (currentPos) {
            ctx.storage.set(STORAGE_POS_KEY, currentPos);
        }
    };

    const onResize = () => {
        if (currentPos) {
            applyPosition(currentPos.x, currentPos.y);
        }
    };

    bar.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', onResize);

    ctx.events.on('app:ready', updateCounts);
    ctx.events.on('project:loaded', updateCounts);
    ctx.events.on('maidata:changed', updateCounts);
    ctx.events.on('chart:decoded', updateCounts);

    ctx.ui.registerMenuItem({
        id: 'open-settings',
        label: '橫條設定',
        labelKey: `ext.${EXTENSION_ID}.menuSettings`,
        onClick: ({ anchorEl }) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (_key, _val, allValues) => {
                    applySettings(allValues);
                }
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'reset-position',
        label: '重設橫條位置',
        labelKey: `ext.${EXTENSION_ID}.menuResetPos`,
        onClick: () => {
            ctx.storage.remove(STORAGE_POS_KEY);
            restoreOrCenterPosition();
        }
    });

    updateCounts();
    applySettings(currentSettings);
    requestAnimationFrame(restoreOrCenterPosition);

    return () => {
        bar.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('resize', onResize);
    };
}
