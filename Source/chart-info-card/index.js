/**
 * @file index.js
 * @description 譜面資訊與即時密度示範擴充套件
 * 參照原生畫布輔助文字座標系，沿圓盤左側基準線固定對齊顯示難度、曲名、作曲、譜師名與即時密度資訊。
 */

const DIFFICULTY_META = {
    1: { name: 'EASY', color: '#45b7fe', textColor: '#ffffff' },
    2: { name: 'BASIC', color: '#22bb5b', textColor: '#ffffff' },
    3: { name: 'ADVANCED', color: '#fb9c2d', textColor: '#ffffff' },
    4: { name: 'EXPERT', color: '#f64861', textColor: '#ffffff' },
    5: { name: 'MASTER', color: '#9e45e2', textColor: '#ffffff' },
    6: { name: 'Re:MASTER', color: '#d7a9f9', textColor: '#2c1242' },
    7: { name: 'ORIGINAL', color: '#38bdf8', textColor: '#0c2438' }
};

const BIN_SEC = 0.5;
const WINDOW_HALF_SEC = 4.0;

function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let end = text.length;
    while (end > 0 && ctx.measureText(`${text.slice(0, end)}...`).width > maxWidth) {
        end -= 1;
    }
    return end > 0 ? `${text.slice(0, end)}...` : '...';
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations({
        'zh-TW': {
            menuToggle: '切換譜面資訊顯示',
            menuSettings: '譜面資訊設定',
            settingsTitle: '譜面資訊設定',
            optVisible: '顯示譜面資訊',
            optShowDensity: '顯示即時密度資訊',
            optOnlyWideView: '僅於隱藏編輯器或全螢幕顯示',
            optShowInVideo: '於匯出影片中顯示',
            optOpacity: '文字透明度',
            optScale: '縮放倍率',
            toastShown: '已顯示譜面資訊',
            toastHidden: '已隱藏譜面資訊',
            untitled: '未命名樂曲',
            unknownArtist: '未知作曲者',
            unknownDesigner: '未知譜師',
            designerPrefix: '譜師：',
            peakPrefix: '峰值'
        },
        'zh-CN': {
            menuToggle: '切换谱面信息显示',
            menuSettings: '谱面信息设置',
            settingsTitle: '谱面信息设置',
            optVisible: '显示谱面信息',
            optShowDensity: '显示实时密度信息',
            optOnlyWideView: '仅在隐藏编辑器或全屏显示',
            optShowInVideo: '在导出视频中显示',
            optOpacity: '文字透明度',
            optScale: '缩放倍率',
            toastShown: '已显示谱面信息',
            toastHidden: '已隐藏谱面信息',
            untitled: '未命名乐曲',
            unknownArtist: '未知作曲者',
            unknownDesigner: '未知谱师',
            designerPrefix: '谱师：',
            peakPrefix: '峰值'
        },
        'en': {
            menuToggle: 'Toggle Chart Info',
            menuSettings: 'Chart Info Settings',
            settingsTitle: 'Chart Info Settings',
            optVisible: 'Show Chart Info',
            optShowDensity: 'Show Live Density',
            optOnlyWideView: 'Only When Editor Hidden or Fullscreen',
            optShowInVideo: 'Include in Exported Video',
            optOpacity: 'Text Opacity',
            optScale: 'Scale',
            toastShown: 'Chart info shown',
            toastHidden: 'Chart info hidden',
            untitled: 'Untitled Track',
            unknownArtist: 'Unknown Artist',
            unknownDesigner: 'Unknown Designer',
            designerPrefix: 'Chart: ',
            peakPrefix: 'PEAK'
        },
        'ja': {
            menuToggle: '譜面情報の表示切替',
            menuSettings: '譜面情報設定',
            settingsTitle: '譜面情報設定',
            optVisible: '譜面情報を表示',
            optShowDensity: 'リアルタイム密度を表示',
            optOnlyWideView: 'エディタ非表示または全画面時のみ表示',
            optShowInVideo: '書き出し動画に含める',
            optOpacity: 'テキスト不透明度',
            optScale: '拡大率',
            toastShown: '譜面情報を表示しました',
            toastHidden: '譜面情報を非表示にしました',
            untitled: '無題の楽曲',
            unknownArtist: '作曲者不明',
            unknownDesigner: '譜面作者不明',
            designerPrefix: '譜面：',
            peakPrefix: 'PEAK'
        },
        'ko': {
            menuToggle: '채보 정보 표시 전환',
            menuSettings: '채보 정보 설정',
            settingsTitle: '채보 정보 설정',
            optVisible: '채보 정보 표시',
            optShowDensity: '실시간 밀도 표시',
            optOnlyWideView: '에디터 숨김 또는 전체 화면에서만 표시',
            optShowInVideo: '내보낸 영상에 포함',
            optOpacity: '텍스트 불투명도',
            optScale: '배율',
            toastShown: '채보 정보를 표시했습니다',
            toastHidden: '채보 정보를 숨겼습니다',
            untitled: '제목 없는 곡',
            unknownArtist: '작곡가 미상',
            unknownDesigner: '채보 제작자 미상',
            designerPrefix: '채보: ',
            peakPrefix: 'PEAK'
        }
    });

    const settingsSchema = [
        {
            key: 'visible',
            type: 'boolean',
            default: true,
            label: ctx.i18n.t('optVisible'),
            labelKey: `ext.${ctx.extensionId}.optVisible`
        },
        {
            key: 'showDensity',
            type: 'boolean',
            default: true,
            label: ctx.i18n.t('optShowDensity'),
            labelKey: `ext.${ctx.extensionId}.optShowDensity`
        },
        {
            key: 'onlyWideView',
            type: 'boolean',
            default: false,
            label: ctx.i18n.t('optOnlyWideView'),
            labelKey: `ext.${ctx.extensionId}.optOnlyWideView`
        },
        {
            key: 'showInVideo',
            type: 'boolean',
            default: true,
            label: ctx.i18n.t('optShowInVideo'),
            labelKey: `ext.${ctx.extensionId}.optShowInVideo`
        },
        {
            key: 'opacity',
            type: 'number',
            default: 0.96,
            min: 0.3,
            max: 1.0,
            step: 0.05,
            label: ctx.i18n.t('optOpacity'),
            labelKey: `ext.${ctx.extensionId}.optOpacity`
        },
        {
            key: 'scale',
            type: 'number',
            default: 1.0,
            min: 0.6,
            max: 1.8,
            step: 0.1,
            label: ctx.i18n.t('optScale'),
            labelKey: `ext.${ctx.extensionId}.optScale`
        }
    ];

    let settings = ctx.ui.getSettings(settingsSchema);
    let viewMode = ctx.view.getMode();
    let popoverCtrl = null;

    let cachedInfo = {
        title: '',
        artist: '',
        designer: '',
        diffName: 'MASTER',
        diffColor: '#9e45e2',
        diffTextColor: '#ffffff',
        level: ''
    };
    let densityBins = [];
    let maxNps = 1;

    function buildDensityBins(notes, duration) {
        const list = Array.isArray(notes) ? notes : [];
        let maxNoteTime = Number(duration) || 0;
        for (let i = 0; i < list.length; i++) {
            const nt = Number(list[i]?.time);
            if (Number.isFinite(nt) && nt > maxNoteTime) maxNoteTime = nt;
        }
        const totalBins = Math.max(1, Math.ceil(maxNoteTime / BIN_SEC) + 1);
        const counts = new Float32Array(totalBins);

        for (let i = 0; i < list.length; i++) {
            const t = Number(list[i]?.time);
            if (!Number.isFinite(t) || t < 0) continue;
            const idx = Math.min(totalBins - 1, Math.floor(t / BIN_SEC));
            counts[idx] += 1 / BIN_SEC;
        }

        let peak = 1;
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > peak) peak = counts[i];
        }
        densityBins = counts;
        maxNps = peak;
    }

    function getNpsAt(timeSec) {
        if (!densityBins.length || timeSec < 0) return 0;
        const idx = Math.floor(timeSec / BIN_SEC);
        if (idx < 0 || idx >= densityBins.length) return 0;
        return densityBins[idx];
    }

    function refreshChartInfo() {
        const snap = ctx.chart.getSnapshot();
        const diff = Number(snap?.difficulty) || 5;
        const maidata = snap?.maidata || {};
        const diffMeta = DIFFICULTY_META[diff] || DIFFICULTY_META[5];

        const rawTitle = typeof maidata.title === 'string' ? maidata.title.trim() : '';
        const rawArtist = typeof maidata.artist === 'string' ? maidata.artist.trim() : '';
        const diffDesigner = typeof maidata[`des_${diff}`] === 'string' ? maidata[`des_${diff}`].trim() : '';
        const fallbackDesigner = typeof maidata.des === 'string' ? maidata.des.trim() : '';
        const rawLevel = typeof maidata[`lv_${diff}`] === 'string' ? maidata[`lv_${diff}`].trim() : '';

        cachedInfo = {
            title: rawTitle || ctx.i18n.t('untitled'),
            artist: rawArtist || ctx.i18n.t('unknownArtist'),
            designer: diffDesigner || fallbackDesigner || ctx.i18n.t('unknownDesigner'),
            diffName: diffMeta.name,
            diffColor: diffMeta.color,
            diffTextColor: diffMeta.textColor,
            level: rawLevel
        };

        buildDensityBins(snap?.notes, snap?.duration);
        ctx.render.requestRedraw();
    }

    refreshChartInfo();

    ctx.events.on('chart:decoded', () => refreshChartInfo());
    ctx.events.on('project:loaded', () => refreshChartInfo());
    ctx.events.on('maidata:changed', () => refreshChartInfo());
    ctx.events.on('view:mode-changed', (nextMode) => {
        viewMode = nextMode || ctx.view.getMode();
        ctx.render.requestRedraw();
    });

    ctx.render.registerOverlay({
        target: 'main',
        phase: 'afterNotes',
        order: 50,
        includeInVideo: true,
        draw(renderContext) {
            const isVideo = Boolean(renderContext.isRenderingVideo);
            if (isVideo && !settings.showInVideo) return;
            if (!isVideo && settings.onlyWideView && !viewMode.isEditorHidden && !viewMode.isFullscreen) return;

            const { ctx: g, width, height, unitPx, scaleBase, globalTime } = renderContext;
            if (!g || width <= 0 || height <= 0 || !unitPx || unitPx <= 0) return;

            const userScale = Number(settings.scale) || 1.0;
            const baseScale = Number(scaleBase) || 100;
            const u = (baseScale / 100) * userScale;
            const opacity = Math.max(0.3, Math.min(1, Number(settings.opacity) || 0.96));

            // 完全採用與原生白色輔助文字相同的中心原點座標系與圓盤左側對齊線 (-baseScale / 2 - 3)
            g.save();
            g.setTransform(unitPx, 0, 0, unitPx, width * 0.5, height * 0.5);
            g.globalAlpha = opacity;

            const rightAnchorX = -baseScale / 2 - 3;
            const logicalHalfW = (width * 0.5) / unitPx;
            const logicalHalfH = (height * 0.5) / unitPx;
            const availLeftW = rightAnchorX - (-logicalHalfW + 2.0);

            // 若左側可用空間足夠，才繪製左側對齊元件，且寬度固定不隨螢幕變化內外跳動
            if (availLeftW >= 18) {
                const maxBlockW = Math.min(34 * u, availLeftW);

                // 1. 左上方純文字譜面資訊（右對齊於原生左側基準線，不隨畫面寬度內外漂移）
                if (settings.visible) {
                    const topY = -logicalHalfH + 2.6 * u;
                    const stripeW = 0.6 * u;
                    const textRightX = rightAnchorX - stripeW - 1.2 * u;
                    const textMaxW = Math.max(10, maxBlockW - stripeW - 1.2 * u);

                    const badgeH = 3.1 * u;
                    const titleGap = 0.9 * u;
                    const titleLineH = 3.5 * u;
                    const artistLineH = 2.7 * u;
                    const designerLineH = 2.2 * u;
                    const totalTextH = badgeH + titleGap + titleLineH + artistLineH + designerLineH;

                    g.save();
                    g.shadowColor = 'rgba(0, 0, 0, 0.72)';
                    g.shadowBlur = 0.7 * u;
                    g.shadowOffsetY = 0.18 * u;

                    // 難度顏色直條貼齊右側基準線
                    g.fillStyle = cachedInfo.diffColor;
                    drawRoundedRectPath(g, rightAnchorX - stripeW, topY, stripeW, totalTextH, stripeW * 0.5);
                    g.fill();

                    // 難度徽章
                    const badgeText = cachedInfo.level ? `${cachedInfo.diffName} ${cachedInfo.level}` : cachedInfo.diffName;
                    g.font = `700 ${1.95 * u}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
                    const badgePadX = 0.95 * u;
                    const badgeW = Math.min(textMaxW, g.measureText(badgeText).width + badgePadX * 2);
                    const badgeX = textRightX - badgeW;

                    g.fillStyle = cachedInfo.diffColor;
                    drawRoundedRectPath(g, badgeX, topY, badgeW, badgeH, 0.6 * u);
                    g.fill();

                    g.save();
                    g.shadowColor = 'transparent';
                    g.fillStyle = cachedInfo.diffTextColor;
                    g.textAlign = 'center';
                    g.textBaseline = 'middle';
                    g.fillText(fitText(g, badgeText, badgeW - badgePadX * 2), badgeX + badgeW * 0.5, topY + badgeH * 0.5 + 0.08 * u);
                    g.restore();

                    // 曲名
                    g.font = `700 ${3.1 * u}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
                    g.fillStyle = '#ffffff';
                    g.textAlign = 'right';
                    g.textBaseline = 'top';
                    const titleY = topY + badgeH + titleGap;
                    g.fillText(fitText(g, cachedInfo.title, textMaxW), textRightX, titleY);

                    // 作曲
                    g.font = `500 ${2.3 * u}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
                    g.fillStyle = 'rgba(241, 245, 249, 0.9)';
                    const artistY = titleY + titleLineH;
                    g.fillText(fitText(g, cachedInfo.artist, textMaxW), textRightX, artistY);

                    // 譜師名
                    g.font = `400 ${1.95 * u}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
                    g.fillStyle = 'rgba(203, 213, 225, 0.88)';
                    const designerY = artistY + artistLineH;
                    const designerText = `${ctx.i18n.t('designerPrefix')}${cachedInfo.designer}`;
                    g.fillText(fitText(g, designerText, textMaxW), textRightX, designerY);

                    g.restore();
                }

                // 2. 在 DELUXE Rate 百分比下方繪製固定寬度的即時密度資訊
                const canShowDensity = settings.showDensity !== false && (isVideo || viewMode.showAuxiliaryText !== false);
                if (canShowDensity) {
                    const boxW = Math.min(28 * u, availLeftW);
                    const boxX = rightAnchorX - boxW;
                    const topY = 17.8;
                    const maxBottomY = logicalHalfH - 7.5;
                    const graphH = Math.min(13.0 * u, Math.max(5, maxBottomY - topY - 4.0 * u));

                    if (graphH >= 5) {
                        const currentTime = Number(globalTime) || 0;
                        const currentNps = getNpsAt(currentTime);

                        g.save();
                        g.shadowColor = 'rgba(0, 0, 0, 0.72)';
                        g.shadowBlur = 0.6 * u;
                        g.shadowOffsetY = 0.15 * u;

                        g.textAlign = 'right';
                        g.textBaseline = 'top';
                        g.font = `700 ${2.9 * u}px mono, "Plus Jakarta Sans", monospace`;
                        g.fillStyle = cachedInfo.diffColor;
                        const npsLabel = `${currentNps.toFixed(1)} NPS`;
                        g.fillText(npsLabel, rightAnchorX, topY);

                        g.textAlign = 'left';
                        g.font = `500 ${2.0 * u}px mono, "Plus Jakarta Sans", sans-serif`;
                        g.fillStyle = 'rgba(203, 213, 225, 0.85)';
                        const peakLabel = `${ctx.i18n.t('peakPrefix')} ${maxNps.toFixed(1)}`;
                        g.fillText(fitText(g, peakLabel, Math.max(4, boxW - g.measureText(npsLabel).width - 1.2 * u)), boxX, topY + 0.7 * u);

                        const graphY = topY + 3.6 * u;
                        const sampleCount = 33;
                        const startT = currentTime - WINDOW_HALF_SEC;
                        const totalWindow = WINDOW_HALF_SEC * 2;
                        const stepX = boxW / (sampleCount - 1);

                        g.shadowColor = 'transparent';

                        g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        g.lineWidth = 0.15 * u;
                        g.beginPath();
                        g.moveTo(boxX, graphY + graphH);
                        g.lineTo(rightAnchorX, graphY + graphH);
                        g.stroke();

                        const points = [];
                        for (let i = 0; i < sampleCount; i++) {
                            const t = startT + (i / (sampleCount - 1)) * totalWindow;
                            const val = getNpsAt(t);
                            const ratio = maxNps > 0 ? Math.min(1, val / maxNps) : 0;
                            points.push({
                                x: boxX + i * stepX,
                                y: graphY + graphH - ratio * (graphH - 0.6 * u)
                            });
                        }

                        if (points.length > 1) {
                            const grad = g.createLinearGradient(0, graphY, 0, graphY + graphH);
                            grad.addColorStop(0, cachedInfo.diffColor);
                            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                            g.save();
                            g.globalAlpha = opacity * 0.42;
                            g.fillStyle = grad;
                            g.beginPath();
                            g.moveTo(points[0].x, graphY + graphH);
                            for (let i = 0; i < points.length; i++) {
                                g.lineTo(points[i].x, points[i].y);
                            }
                            g.lineTo(points[points.length - 1].x, graphY + graphH);
                            g.closePath();
                            g.fill();
                            g.restore();

                            g.strokeStyle = cachedInfo.diffColor;
                            g.lineWidth = 0.28 * u;
                            g.lineJoin = 'round';
                            g.beginPath();
                            g.moveTo(points[0].x, points[0].y);
                            for (let i = 1; i < points.length; i++) {
                                g.lineTo(points[i].x, points[i].y);
                            }
                            g.stroke();
                        }

                        const centerX = boxX + boxW * 0.5;
                        g.strokeStyle = 'rgba(255, 255, 255, 0.88)';
                        g.lineWidth = 0.2 * u;
                        g.beginPath();
                        g.moveTo(centerX, graphY);
                        g.lineTo(centerX, graphY + graphH);
                        g.stroke();

                        g.restore();
                    }
                }
            }

            g.restore();
        }
    });

    ctx.ui.registerMenuItem({
        id: 'toggle',
        label: ctx.i18n.t('menuToggle'),
        labelKey: `ext.${ctx.extensionId}.menuToggle`,
        onClick() {
            settings.visible = !settings.visible;
            ctx.render.requestRedraw();
            ctx.ui.toast({
                content: ctx.i18n.t(settings.visible ? 'toastShown' : 'toastHidden'),
                type: 'info'
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'settings',
        label: ctx.i18n.t('menuSettings'),
        labelKey: `ext.${ctx.extensionId}.menuSettings`,
        onClick({ anchorEl }) {
            popoverCtrl = ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: settingsSchema,
                anchorEl,
                onChange(_key, _value, allValues) {
                    settings = { ...allValues };
                    ctx.render.requestRedraw();
                }
            });
        }
    });

    return () => {
        if (popoverCtrl) {
            popoverCtrl.close();
            popoverCtrl = null;
        }
    };
}
