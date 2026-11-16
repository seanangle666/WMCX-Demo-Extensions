const EXTENSION_ID = 'com.wmcx.dvd-bounce';

const SVG_WIDTH = 1058.4;
const SVG_HEIGHT = 465.84;
const DVD_PATH_DATA = 'm91.053 0-13.719 57.707 102.28 0.039063h24c65.747 0 105.91 26.44 94.746 73.4-12.147 51.133-69.613 73.4-130.67 73.4h-22.947l29.787-125.45h-102.27l-43.521 183.2h145.05c109.07 0 212.76-57.573 231.01-131.15 3.3467-13.507 2.8806-47.253-5.3594-67.359-0.21299-0.787-0.42594-1.4-1.1855-3-0.293-0.653-0.56012-3.6412 1.1465-4.2812 0.947-0.36 2.7069 1.4944 2.9336 2.041 0.853 2.24 1.5059 3.9062 1.5059 3.9062l92.293 260.6 234.97-265.21 99.535-0.089844h24c65.76 0 106.25 26.44 95.092 73.4-12.147 51.133-69.947 73.4-131 73.4h-22.959l29.799-125.47h-102.27l-43.533 183.21h145.07c109.05 0 213.48-57.4 231-131.15 17.52-73.75-59.107-131.15-168.69-131.15h-216.4s-57.319 67.88-67.959 80.693c-57.12 68.787-67.241 87.226-68.961 91.986 0.24-4.8-1.8138-23.412-26.174-92.959-6.48-18.52-27.359-79.721-27.359-79.721h-389.25zm408.77 324.16c-276.04 0-499.83 31.72-499.83 70.84s223.79 70.84 499.83 70.84c276.04 0 499.83-31.72 499.83-70.84s-223.79-70.84-499.83-70.84zm-18.094 48.627c63.04 0 114.13 10.573 114.13 23.613s-51.095 23.613-114.13 23.613c-63.027 0-114.13-10.573-114.13-23.613s51.106-23.613 114.13-23.613z';

const COLOR_PALETTE = [
    '#38bdf8',
    '#f472b6',
    '#facc15',
    '#4ade80',
    '#fb923c',
    '#c084fc',
    '#f87171',
    '#2dd4bf'
];

const SETTINGS_SCHEMA = [
    {
        key: 'enabled',
        type: 'boolean',
        default: true,
        label: '啟用彈跳標誌',
        labelKey: `ext.${EXTENSION_ID}.optEnabled`
    },
    {
        key: 'phase',
        type: 'select',
        default: 'beforeNotes',
        label: '圖層順序',
        labelKey: `ext.${EXTENSION_ID}.optPhase`,
        options: [
            { value: 'beforeNotes', label: '音符後方' },
            { value: 'afterNotes', label: '音符前方' }
        ]
    },
    {
        key: 'speed',
        type: 'number',
        default: 1,
        min: 0.2,
        max: 4,
        step: 0.2,
        label: '移動速度倍率',
        labelKey: `ext.${EXTENSION_ID}.optSpeed`
    },
    {
        key: 'scale',
        type: 'number',
        default: 0.16,
        min: 0.06,
        max: 0.35,
        step: 0.02,
        label: '標誌大小比例',
        labelKey: `ext.${EXTENSION_ID}.optScale`
    },
    {
        key: 'opacity',
        type: 'number',
        default: 0.85,
        min: 0.15,
        max: 1,
        step: 0.05,
        label: '標誌透明度',
        labelKey: `ext.${EXTENSION_ID}.optOpacity`
    },
    {
        key: 'includeInVideo',
        type: 'boolean',
        default: false,
        label: '匯出影片時一併繪製',
        labelKey: `ext.${EXTENSION_ID}.optIncludeInVideo`
    }
];

const TRANSLATIONS = {
    'zh-TW': {
        menuSettings: '彈跳標誌設定',
        settingsTitle: 'DVD 彈跳標誌設定',
        optEnabled: '啟用彈跳標誌',
        optPhase: '圖層順序',
        optSpeed: '移動速度倍率',
        optScale: '標誌大小比例',
        optOpacity: '標誌透明度',
        optIncludeInVideo: '匯出影片時一併繪製'
    },
    en: {
        menuSettings: 'DVD Bounce Settings',
        settingsTitle: 'DVD Bounce Settings',
        optEnabled: 'Enable DVD Bounce',
        optPhase: 'Layer Phase',
        optSpeed: 'Speed Multiplier',
        optScale: 'Logo Size Ratio',
        optOpacity: 'Logo Opacity',
        optIncludeInVideo: 'Include in Video Export'
    }
};

export default function activate(ctx) {
    ctx.i18n.registerTranslations(TRANSLATIONS);

    const dvdPath = new Path2D(DVD_PATH_DATA);
    let currentSettings = ctx.ui.getSettings(SETTINGS_SCHEMA);

    let posX = null;
    let posY = null;
    let dirX = 1;
    let dirY = 1;
    let colorIndex = 0;
    let lastTickMs = 0;
    let rafId = 0;
    let unregisterOverlay = null;
    let isDisposed = false;

    const getStageRect = (renderContext) => {
        const sr = renderContext.stageRect;
        if (sr && sr.width > 0 && sr.height > 0) {
            return sr;
        }
        return {
            x: 0,
            y: 0,
            width: renderContext.width || 1,
            height: renderContext.height || 1
        };
    };

    const drawOverlay = (renderContext) => {
        if (!currentSettings.enabled) return;
        if (renderContext.isRenderingVideo && !currentSettings.includeInVideo) return;

        const g = renderContext.ctx;
        if (!g) return;

        const stage = getStageRect(renderContext);
        const logoWidth = Math.max(24, stage.width * currentSettings.scale);
        const logoHeight = logoWidth * (SVG_HEIGHT / SVG_WIDTH);

        const minX = stage.x;
        const minY = stage.y;
        const maxX = Math.max(minX, stage.x + stage.width - logoWidth);
        const maxY = Math.max(minY, stage.y + stage.height - logoHeight);

        if (posX === null || posY === null) {
            posX = minX + (maxX - minX) * 0.25;
            posY = minY + (maxY - minY) * 0.25;
        }

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        // 限制單步時間差上限，避免分頁切換回來時發生大幅跳躍
        const dt = lastTickMs > 0 ? Math.min(0.05, Math.max(0, (now - lastTickMs) / 1000)) : 0;
        lastTickMs = now;

        const baseSpeed = stage.width * 0.22 * currentSettings.speed;
        posX += dirX * baseSpeed * dt;
        posY += dirY * baseSpeed * dt;

        let hitEdge = false;
        if (posX <= minX) {
            posX = minX;
            dirX = 1;
            hitEdge = true;
        } else if (posX >= maxX) {
            posX = maxX;
            dirX = -1;
            hitEdge = true;
        }

        if (posY <= minY) {
            posY = minY;
            dirY = 1;
            hitEdge = true;
        } else if (posY >= maxY) {
            posY = maxY;
            dirY = -1;
            hitEdge = true;
        }

        if (hitEdge) {
            colorIndex = (colorIndex + 1) % COLOR_PALETTE.length;
        }

        // 主程式畫布原點預設於中心且帶有縮放倍率，重設為物理像素座標系以對齊 stageRect
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = currentSettings.opacity;
        g.fillStyle = COLOR_PALETTE[colorIndex];
        g.translate(posX, posY);
        g.scale(logoWidth / SVG_WIDTH, logoHeight / SVG_HEIGHT);
        g.fill(dvdPath);
    };

    const registerLayer = () => {
        if (typeof unregisterOverlay === 'function') {
            unregisterOverlay();
            unregisterOverlay = null;
        }
        unregisterOverlay = ctx.render.registerOverlay({
            target: 'main',
            phase: currentSettings.phase === 'afterNotes' ? 'afterNotes' : 'beforeNotes',
            order: 5,
            includeInVideo: Boolean(currentSettings.includeInVideo),
            draw: drawOverlay
        });
    };

    const stopLoop = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        lastTickMs = 0;
    };

    const tick = () => {
        if (isDisposed || !currentSettings.enabled) {
            rafId = 0;
            return;
        }
        ctx.render.requestRedraw();
        rafId = requestAnimationFrame(tick);
    };

    const syncLoopState = () => {
        if (currentSettings.enabled && !rafId) {
            lastTickMs = 0;
            rafId = requestAnimationFrame(tick);
        } else if (!currentSettings.enabled) {
            stopLoop();
            ctx.render.requestRedraw();
        }
    };

    ctx.ui.registerMenuItem({
        id: 'open-settings',
        label: '彈跳標誌設定',
        labelKey: `ext.${EXTENSION_ID}.menuSettings`,
        onClick: ({ anchorEl }) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (key, _val, allValues) => {
                    const prevPhase = currentSettings.phase;
                    const prevVideo = currentSettings.includeInVideo;
                    currentSettings = allValues;

                    if (key === 'phase' || key === 'includeInVideo' ||
                        prevPhase !== allValues.phase || prevVideo !== allValues.includeInVideo) {
                        registerLayer();
                    }
                    syncLoopState();
                }
            });
        }
    });

    registerLayer();
    syncLoopState();

    return () => {
        isDisposed = true;
        stopLoop();
        if (typeof unregisterOverlay === 'function') {
            unregisterOverlay();
            unregisterOverlay = null;
        }
    };
}
