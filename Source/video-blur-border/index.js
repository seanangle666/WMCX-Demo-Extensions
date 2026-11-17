/**
 * @file index.js
 * @description 外圍影片模糊背景插件：
 * - 支援選取本機影片作為譜面判定圓外圍的動態模糊背景，並可隨時移除恢復原生黑邊。
 * - 即時預覽採用硬體解碼視訊與離屏兩段降採樣雙線性縮放，避免主執行緒觸發渲染預算熔斷。
 * - 離線匯出採用惰性初始化的循序影格解碼器與時間戳去重快取，提升逐幀輸出效率。
 */

const EXTENSION_ID = 'com.wmcx.video-blur-border';

const QUALITY_PRESETS = {
    high: { midW: 240, blurDivisor: 0.2, smoothing: 'high' },
    medium: { midW: 128, blurDivisor: 0.25, smoothing: 'medium' },
    low: { midW: 64, blurDivisor: 0.3, smoothing: 'low' }
};

const TRANSLATIONS = {
    'zh-TW': {
        menuSelectVideo: '選擇外圍背景影片',
        menuClearVideo: '移除外圍背景影片',
        menuSettings: '外圍模糊背景設定',
        settingsTitle: '外圍模糊背景設定',
        settingEnabled: '啟用外圍模糊影片',
        settingIncludeInVideo: '包含於影片匯出',
        settingDisableBlackBorder: '停用原生黑色遮罩',
        settingDisableBlackBorderNotice: '開啟後將透過設定覆寫關閉原生圓外純黑遮罩，改由模糊影片顯示。',
        settingEndBehavior: '超出影片長度行為',
        optionStop: '超出後停止',
        optionLoop: '循環播放',
        settingBlurRadius: '模糊半徑',
        settingQualityMode: '渲染畫質',
        optionQualityHigh: '標準畫質',
        optionQualityMedium: '均衡降採樣',
        optionQualityLow: '極速低畫質',
        settingDimOpacity: '暗化遮罩透明度',
        settingFillBlackOutsideStage: '舞台外圍填滿黑底',
        settingFillBlackOutsideStageNotice: '當畫布寬於 16:9 且停用原生黑色遮罩時，以黑底填補兩側避免透明漏底。',
        toastLoaded: '已載入背景影片：{name}',
        toastCleared: '已移除外圍背景影片',
        toastNoVideo: '目前尚未載入任何背景影片'
    },
    'zh-CN': {
        menuSelectVideo: '选择外围背景视频',
        menuClearVideo: '移除外围背景视频',
        menuSettings: '外围模糊背景设置',
        settingsTitle: '外围模糊背景设置',
        settingEnabled: '启用外围模糊视频',
        settingIncludeInVideo: '包含于视频导出',
        settingDisableBlackBorder: '停用原生黑色遮罩',
        settingDisableBlackBorderNotice: '开启后将通过设置覆写关闭原生圆外纯黑遮罩，改由模糊视频显示。',
        settingEndBehavior: '超出视频长度行为',
        optionStop: '超出后停止',
        optionLoop: '循环播放',
        settingBlurRadius: '模糊半径',
        settingQualityMode: '渲染画质',
        optionQualityHigh: '标准画质',
        optionQualityMedium: '均衡降采样',
        optionQualityLow: '极速低画质',
        settingDimOpacity: '暗化遮罩透明度',
        settingFillBlackOutsideStage: '舞台外围填满黑底',
        settingFillBlackOutsideStageNotice: '当画布宽于 16:9 且停用原生黑色遮罩时，以黑底填补两侧避免透明漏底。',
        toastLoaded: '已加载背景视频：{name}',
        toastCleared: '已移除外围背景视频',
        toastNoVideo: '当前尚未加载任何背景视频'
    },
    en: {
        menuSelectVideo: 'Select Outer Background Video',
        menuClearVideo: 'Remove Outer Background Video',
        menuSettings: 'Outer Blur Background Settings',
        settingsTitle: 'Outer Blur Background Settings',
        settingEnabled: 'Enable Outer Blur Video',
        settingIncludeInVideo: 'Include in Video Export',
        settingDisableBlackBorder: 'Disable Native Black Border',
        settingDisableBlackBorderNotice: 'Overrides native black border setting so the blurred video is visible outside the judgment circle.',
        settingEndBehavior: 'End of Video Behavior',
        optionStop: 'Stop at End',
        optionLoop: 'Loop Playback',
        settingBlurRadius: 'Blur Radius',
        settingQualityMode: 'Render Quality',
        optionQualityHigh: 'High Quality',
        optionQualityMedium: 'Balanced',
        optionQualityLow: 'Fast Low',
        settingDimOpacity: 'Dim Overlay Opacity',
        settingFillBlackOutsideStage: 'Fill Black Outside 16:9 Stage',
        settingFillBlackOutsideStageNotice: 'Fills sidebars with black when canvas is wider than 16:9 and native border is disabled.',
        toastLoaded: 'Background video loaded: {name}',
        toastCleared: 'Outer background video removed',
        toastNoVideo: 'No background video is currently loaded'
    },
    ja: {
        menuSelectVideo: '外周背景動画を選択',
        menuClearVideo: '外周背景動画を削除',
        menuSettings: '外周ぼかし背景設定',
        settingsTitle: '外周ぼかし背景設定',
        settingEnabled: '外周ぼかし動画を有効にする',
        settingIncludeInVideo: '動画書き出しに含める',
        settingDisableBlackBorder: '標準の黒マスクを無効化',
        settingDisableBlackBorderNotice: '有効にすると判定円外側の標準黒マスクを上書きしてぼかし動画を表示します。',
        settingEndBehavior: '動画終了時の動作',
        optionStop: '終了時に停止',
        optionLoop: 'ループ再生',
        settingBlurRadius: 'ぼかし半径',
        settingQualityMode: '描画品質',
        optionQualityHigh: '標準画質',
        optionQualityMedium: 'バランス',
        optionQualityLow: '高速低画質',
        settingDimOpacity: '暗転オーバーレイ不透明度',
        settingFillBlackOutsideStage: 'ステージ外周を黒で塗りつぶす',
        settingFillBlackOutsideStageNotice: 'キャンバスが16:9より広く標準黒マスクが無効な場合、両端の透過を防ぎます。',
        toastLoaded: '背景動画を読み込みました：{name}',
        toastCleared: '外周背景動画を削除しました',
        toastNoVideo: '背景動画が読み込まれていません'
    },
    ko: {
        menuSelectVideo: '외곽 배경 영상 선택',
        menuClearVideo: '외곽 배경 영상 제거',
        menuSettings: '외곽 블러 배경 설정',
        settingsTitle: '외곽 블러 배경 설정',
        settingEnabled: '외곽 블러 영상 사용',
        settingIncludeInVideo: '영상 내보내기에 포함',
        settingDisableBlackBorder: '기본 검은 테두리 비활성화',
        settingDisableBlackBorderNotice: '활성화하면 판정원 바깥쪽 기본 검은 마스크를 덮어써서 블러 영상을 표시합니다.',
        settingEndBehavior: '영상 종료 후 동작',
        optionStop: '종료 후 정지',
        optionLoop: '반복 재생',
        settingBlurRadius: '블러 반경',
        settingQualityMode: '렌더링 화질',
        optionQualityHigh: '표준 화질',
        optionQualityMedium: '균형 다운샘플',
        optionQualityLow: '고속 저화질',
        settingDimOpacity: '어둡기 오버레이 투명도',
        settingFillBlackOutsideStage: '스테이지 외곽 검은색 채우기',
        settingFillBlackOutsideStageNotice: '캔버스가 16:9보다 넓고 기본 검은 테두리가 꺼져 있을 때 양쪽 여백을 검은색으로 채웁니다.',
        toastLoaded: '배경 영상을 불러왔습니다: {name}',
        toastCleared: '외곽 배경 영상을 제거했습니다',
        toastNoVideo: '불러온 배경 영상이 없습니다'
    }
};

export function activate(ctx) {
    let disposed = false;
    const t = (key, params) => (ctx.i18n ? ctx.i18n.t(key, params) : key);
    ctx.i18n?.registerTranslations(TRANSLATIONS);

    function getSettingsSchema() {
        return [
            {
                key: 'enabled',
                type: 'boolean',
                default: true,
                label: t('settingEnabled')
            },
            {
                key: 'includeInVideo',
                type: 'boolean',
                default: true,
                label: t('settingIncludeInVideo')
            },
            {
                key: 'disableBlackBorder',
                type: 'boolean',
                default: true,
                label: t('settingDisableBlackBorder'),
                notice: t('settingDisableBlackBorderNotice')
            },
            {
                key: 'endBehavior',
                type: 'select',
                default: 'stop',
                label: t('settingEndBehavior'),
                options: [
                    { value: 'stop', label: t('optionStop') },
                    { value: 'loop', label: t('optionLoop') }
                ]
            },
            {
                key: 'blurRadius',
                type: 'number',
                default: 14,
                min: 0,
                max: 40,
                step: 1,
                label: t('settingBlurRadius')
            },
            {
                key: 'qualityMode',
                type: 'select',
                default: 'medium',
                label: t('settingQualityMode'),
                options: [
                    { value: 'high', label: t('optionQualityHigh') },
                    { value: 'medium', label: t('optionQualityMedium') },
                    { value: 'low', label: t('optionQualityLow') }
                ]
            },
            {
                key: 'dimOpacity',
                type: 'number',
                default: 0.35,
                min: 0,
                max: 0.9,
                step: 0.05,
                label: t('settingDimOpacity')
            },
            {
                key: 'fillBlackOutsideStage',
                type: 'boolean',
                default: true,
                label: t('settingFillBlackOutsideStage'),
                notice: t('settingFillBlackOutsideStageNotice')
            }
        ];
    }

    let settings = ctx.ui.getSettings(getSettingsSchema());

    let currentVideoFile = null;
    let videoEl = null;
    let videoDecoder = null;
    let decoderInitPromise = null;
    let videoObjectUrl = '';
    let downCanvas = null;
    let downCtx = null;
    let blurCanvas = null;
    let blurCtx = null;
    let blurFrameInfo = { width: 0, height: 0, aspect: 16 / 9 };

    let revertNoBorder = null;
    let rafId = 0;
    let rvfcId = 0;
    let lastDrawnVideoTime = -1;
    let lastOfflineFrameTimestamp = -1;
    let lastDrawnBlurRadius = -1;
    let lastDrawnDim = -1;
    let lastDrawnQuality = '';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    function safeGetPlaybackState() {
        try {
            const state = ctx.playback.getState();
            return {
                isPlaying: Boolean(state?.isPlaying),
                globalTime: Number.isFinite(state?.globalTime) ? state.globalTime : 0
            };
        } catch {
            return { isPlaying: false, globalTime: 0 };
        }
    }

    function getRenderParams() {
        const radius = Math.max(0, Number(settings.blurRadius) || 0);
        const dim = Math.max(0, Math.min(0.95, Number(settings.dimOpacity) || 0));
        const qualityKey = QUALITY_PRESETS[settings.qualityMode] ? settings.qualityMode : 'medium';
        return { radius, dim, qualityKey, preset: QUALITY_PRESETS[qualityKey] };
    }

    function applyBorderOverride() {
        const shouldDisableBorder = Boolean(settings.enabled && settings.disableBlackBorder && videoEl);
        if (shouldDisableBorder && !revertNoBorder) {
            revertNoBorder = ctx.settings.override('noBorder', true);
        } else if (!shouldDisableBorder && revertNoBorder) {
            const revert = revertNoBorder;
            revertNoBorder = null;
            revert();
        }
    }

    function computeTargetVideoTime(globalTime, duration) {
        if (!Number.isFinite(duration) || duration <= 0) return 0;
        if (!Number.isFinite(globalTime) || globalTime <= 0) return 0;
        if (settings.endBehavior === 'loop') {
            return globalTime % duration;
        }
        return Math.min(globalTime, duration);
    }

    function seekVideoTo(targetTime, signal = null) {
        if (!videoEl || videoEl.readyState < 1 || signal?.aborted) return Promise.resolve();
        const duration = videoEl.duration;
        const clamped = (Number.isFinite(duration) && duration > 0)
            ? Math.max(0, Math.min(targetTime, Math.max(0, duration - 0.001)))
            : Math.max(0, targetTime);

        if (Math.abs(videoEl.currentTime - clamped) <= 0.004) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            if (!videoEl || disposed || signal?.aborted) {
                resolve();
                return;
            }
            const targetEl = videoEl;
            let settled = false;
            let timerId = null;

            const finish = () => {
                if (settled) return;
                settled = true;
                targetEl.removeEventListener('seeked', finish);
                targetEl.removeEventListener('error', finish);
                if (signal) signal.removeEventListener('abort', finish);
                if (timerId !== null) clearTimeout(timerId);
                resolve();
            };

            targetEl.addEventListener('seeked', finish, { once: true });
            targetEl.addEventListener('error', finish, { once: true });
            if (signal) signal.addEventListener('abort', finish, { once: true });
            timerId = setTimeout(finish, 2500);

            try {
                targetEl.currentTime = clamped;
            } catch {
                finish();
            }
        });
    }

    function ensureVideoElement() {
        if (videoEl) return videoEl;
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        video.addEventListener('loadedmetadata', () => {
            if (disposed || video !== videoEl) return;
            lastDrawnVideoTime = -1;
            const state = safeGetPlaybackState();
            syncVideoPlayback(state.isPlaying, state.globalTime, true);
            updateBlurCache(true);
            ctx.render.requestRedraw();
            startVideoFrameLoop();
        });

        video.addEventListener('loadeddata', () => {
            if (disposed || video !== videoEl) return;
            if (updateBlurCache(true)) {
                ctx.render.requestRedraw();
            }
        });

        video.addEventListener('seeked', () => {
            if (disposed || video !== videoEl) return;
            updateBlurCache(true);
            ctx.render.requestRedraw();
        });

        video.addEventListener('ended', () => {
            if (disposed || video !== videoEl) return;
            updateBlurCache(true);
            ctx.render.requestRedraw();
        });

        videoEl = video;
        return video;
    }

    function releaseVideo() {
        currentVideoFile = null;
        decoderInitPromise = null;
        if (videoEl) {
            if (rvfcId && typeof videoEl.cancelVideoFrameCallback === 'function') {
                try { videoEl.cancelVideoFrameCallback(rvfcId); } catch { }
            }
            rvfcId = 0;
            try {
                videoEl.pause();
                videoEl.playbackRate = 1;
                videoEl.removeAttribute('src');
                videoEl.load();
            } catch {
                // 忽略已卸載媒體元素的清理例外
            }
            videoEl = null;
        }
        if (videoDecoder) {
            const dec = videoDecoder;
            videoDecoder = null;
            dec.dispose();
        }
        if (videoObjectUrl) {
            URL.revokeObjectURL(videoObjectUrl);
            videoObjectUrl = '';
        }
        blurFrameInfo = { width: 0, height: 0, aspect: 16 / 9 };
        lastDrawnVideoTime = -1;
        lastOfflineFrameTimestamp = -1;
    }

    async function ensureVideoDecoder() {
        if (videoDecoder) return videoDecoder;
        if (!currentVideoFile || typeof ctx.render.createVideoFrameDecoder !== 'function') {
            return null;
        }
        if (decoderInitPromise) {
            return decoderInitPromise;
        }
        const targetFile = currentVideoFile;
        decoderInitPromise = ctx.render.createVideoFrameDecoder(targetFile, {
            endBehavior: settings.endBehavior,
            width: 240
        }).then((dec) => {
            if (disposed || targetFile !== currentVideoFile) {
                dec.dispose();
                return null;
            }
            videoDecoder = dec;
            return dec;
        }).catch((err) => {
            console.warn(`[${EXTENSION_ID}] 建立逐幀解碼器失敗，將回退至原生視訊跳轉:`, err);
            return null;
        }).finally(() => {
            decoderInitPromise = null;
        });
        return decoderInitPromise;
    }

    function loadVideoFile(file) {
        if (!file) return;
        releaseVideo();
        currentVideoFile = file;
        const video = ensureVideoElement();
        videoObjectUrl = URL.createObjectURL(file);
        video.loop = settings.endBehavior === 'loop';
        video.src = videoObjectUrl;
        video.load();
        applyBorderOverride();
        ctx.ui.toast({
            content: t('toastLoaded', { name: file.name }),
            type: 'success',
            timeout: 2500
        });
    }

    function clearVideo() {
        if (!videoEl && !currentVideoFile) {
            ctx.ui.toast({
                content: t('toastNoVideo'),
                type: 'info',
                timeout: 2000
            });
            return;
        }
        releaseVideo();
        applyBorderOverride();
        ctx.render.requestRedraw();
        ctx.ui.toast({
            content: t('toastCleared'),
            type: 'info',
            timeout: 2200
        });
    }

    function syncVideoPlayback(isPlaying, globalTime, forceSeek = false) {
        const playing = Boolean(isPlaying);
        const time = Number.isFinite(globalTime) ? globalTime : 0;
        if (!videoEl || videoEl.readyState < 1) return;

        const duration = videoEl.duration;
        const isLoop = settings.endBehavior === 'loop';
        videoEl.loop = isLoop;

        const targetTime = computeTargetVideoTime(time, duration);
        const reachedEnd = !isLoop && Number.isFinite(duration) && duration > 0 && time >= duration;

        if (!settings.enabled || !playing || reachedEnd) {
            if (!videoEl.paused) {
                videoEl.pause();
            }
            const clampedEndTime = reachedEnd ? Math.max(0, duration - 0.001) : targetTime;
            if (forceSeek || Math.abs(videoEl.currentTime - clampedEndTime) > 0.04) {
                try {
                    videoEl.currentTime = clampedEndTime;
                } catch {
                    // 略過尚未可跳轉時機的瀏覽器限制
                }
            }
            return;
        }

        if (forceSeek || Math.abs(videoEl.currentTime - targetTime) > 0.25) {
            try {
                videoEl.currentTime = targetTime;
            } catch {
                // 略過尚未可跳轉時機的瀏覽器限制
            }
        }
        if (videoEl.paused) {
            const playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    // 瀏覽器阻擋自動播放時維持由時間軸更新畫面
                });
            }
        }
    }

    function renderSourceToBlurCanvas(sourceEl, vw, vh) {
        if (!sourceEl || !vw || !vh) return false;
        const { radius, dim, qualityKey, preset } = getRenderParams();
        const aspect = vw / vh;

        // 採用兩段降採樣雙線性縮放替代耗效能濾鏡，並將暗化遮罩直接合併進離屏小畫布
        const midW = Math.min(preset.midW, Math.max(48, vw));
        const midH = Math.max(32, Math.round(midW / aspect));
        const targetW = radius > 0
            ? Math.max(16, Math.round(midW / (1 + radius * preset.blurDivisor)))
            : Math.min(preset.midW * 2, Math.max(96, vw));
        const targetH = Math.max(12, Math.round(targetW / aspect));

        if (!blurCanvas) {
            blurCanvas = document.createElement('canvas');
            blurCtx = blurCanvas.getContext('2d', { alpha: false });
        }
        if (!blurCtx) return false;

        if (blurCanvas.width !== targetW || blurCanvas.height !== targetH) {
            blurCanvas.width = targetW;
            blurCanvas.height = targetH;
        }
        blurCtx.imageSmoothingEnabled = true;
        blurCtx.imageSmoothingQuality = preset.smoothing;

        if (radius > 0) {
            if (!downCanvas) {
                downCanvas = document.createElement('canvas');
                downCtx = downCanvas.getContext('2d', { alpha: false });
            }
            if (downCtx) {
                if (downCanvas.width !== midW || downCanvas.height !== midH) {
                    downCanvas.width = midW;
                    downCanvas.height = midH;
                }
                downCtx.imageSmoothingEnabled = true;
                downCtx.imageSmoothingQuality = preset.smoothing;
                downCtx.drawImage(sourceEl, 0, 0, midW, midH);
                blurCtx.drawImage(downCanvas, 0, 0, targetW, targetH);
            } else {
                blurCtx.drawImage(sourceEl, 0, 0, targetW, targetH);
            }
        } else {
            blurCtx.drawImage(sourceEl, 0, 0, targetW, targetH);
        }

        if (dim > 0) {
            blurCtx.fillStyle = `rgba(0, 0, 0, ${dim})`;
            blurCtx.fillRect(0, 0, targetW, targetH);
        }

        blurFrameInfo = { width: targetW, height: targetH, aspect };
        lastDrawnBlurRadius = radius;
        lastDrawnDim = dim;
        lastDrawnQuality = qualityKey;
        return true;
    }

    function updateBlurCache(force = false) {
        if (!videoEl || videoEl.seeking || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
            return false;
        }
        const { radius, dim, qualityKey } = getRenderParams();
        if (
            !force
            && lastDrawnVideoTime === videoEl.currentTime
            && lastDrawnBlurRadius === radius
            && lastDrawnDim === dim
            && lastDrawnQuality === qualityKey
        ) {
            return false;
        }

        if (!renderSourceToBlurCanvas(videoEl, videoEl.videoWidth, videoEl.videoHeight)) {
            return false;
        }
        lastDrawnVideoTime = videoEl.currentTime;
        return true;
    }

    function adjustPlaybackSync(globalTime) {
        if (!videoEl || videoEl.readyState < 1 || videoEl.seeking) return;
        const duration = videoEl.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;

        const isLoop = settings.endBehavior === 'loop';
        if (!isLoop && globalTime >= duration) {
            if (!videoEl.paused) {
                videoEl.pause();
                videoEl.playbackRate = 1;
            }
            return;
        }

        const targetTime = computeTargetVideoTime(globalTime, duration);
        const diff = targetTime - videoEl.currentTime;
        if (isLoop && Math.abs(diff) > duration * 0.5) {
            return;
        }

        const absDiff = Math.abs(diff);
        if (absDiff > 0.14) {
            try {
                videoEl.currentTime = targetTime;
            } catch {
                // 略過尚未可跳轉時機
            }
            if (videoEl.playbackRate !== 1) videoEl.playbackRate = 1;
        } else if (absDiff > 0.03) {
            // 細微時間差以調整播放速率平滑追趕，避免頻繁跳轉造成閃爍
            const nextRate = diff > 0 ? 1.08 : 0.92;
            if (videoEl.playbackRate !== nextRate) {
                videoEl.playbackRate = nextRate;
            }
        } else if (videoEl.playbackRate !== 1) {
            videoEl.playbackRate = 1;
        }
    }

    function startVideoFrameLoop() {
        if (disposed || !videoEl) return;
        if (rvfcId && typeof videoEl.cancelVideoFrameCallback === 'function') {
            try { videoEl.cancelVideoFrameCallback(rvfcId); } catch { }
            rvfcId = 0;
        }
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }

        if (typeof videoEl.requestVideoFrameCallback === 'function') {
            const onFrame = () => {
                if (disposed || !videoEl) return;
                if (settings.enabled && !videoEl.paused && !videoEl.ended && !videoEl.seeking) {
                    updateBlurCache(false);
                }
                rvfcId = videoEl.requestVideoFrameCallback(onFrame);
            };
            rvfcId = videoEl.requestVideoFrameCallback(onFrame);
        } else {
            const onTick = () => {
                if (disposed) return;
                if (settings.enabled && videoEl && !videoEl.paused && !videoEl.ended && !videoEl.seeking) {
                    updateBlurCache(false);
                }
                rafId = requestAnimationFrame(onTick);
            };
            rafId = requestAnimationFrame(onTick);
        }
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) {
            loadVideoFile(file);
        }
        fileInput.value = '';
    });

    function selectVideo() {
        fileInput.click();
    }

    function openSettingsPopover({ anchorEl } = {}) {
        ctx.ui.openPopover({
            title: t('settingsTitle'),
            schema: getSettingsSchema(),
            anchorEl,
            onChange: (key, _value, allValues) => {
                settings = allValues;
                lastOfflineFrameTimestamp = -1;
                applyBorderOverride();
                if (key === 'endBehavior' || key === 'enabled') {
                    const state = safeGetPlaybackState();
                    syncVideoPlayback(state.isPlaying, state.globalTime, key === 'endBehavior');
                }
                if (videoEl && !videoEl.seeking) {
                    updateBlurCache(true);
                }
                ctx.render.requestRedraw();
            }
        });
    }

    ctx.commands?.register('selectVideo', selectVideo, { title: t('menuSelectVideo') });
    ctx.commands?.register('clearVideo', clearVideo, { title: t('menuClearVideo') });
    ctx.commands?.register('openSettings', openSettingsPopover, { title: t('menuSettings') });

    ctx.ui.registerMenuItem({
        id: 'select-video',
        label: t('menuSelectVideo'),
        labelKey: `ext.${EXTENSION_ID}.menuSelectVideo`,
        onClick: selectVideo
    });

    ctx.ui.registerMenuItem({
        id: 'clear-video',
        label: t('menuClearVideo'),
        labelKey: `ext.${EXTENSION_ID}.menuClearVideo`,
        onClick: clearVideo
    });

    ctx.ui.registerMenuItem({
        id: 'open-settings',
        label: t('menuSettings'),
        labelKey: `ext.${EXTENSION_ID}.menuSettings`,
        onClick: openSettingsPopover
    });

    ctx.events.on('playback:state-changed', ({ isPlaying }) => {
        const state = safeGetPlaybackState();
        syncVideoPlayback(isPlaying, state.globalTime, false);
        if (videoEl && !videoEl.seeking && updateBlurCache(true) && !isPlaying) {
            ctx.render.requestRedraw();
        }
    });

    ctx.events.on('playback:seek', ({ time }) => {
        const state = safeGetPlaybackState();
        syncVideoPlayback(state.isPlaying, time, true);
        if (videoEl && !videoEl.seeking && updateBlurCache(true) && !state.isPlaying) {
            ctx.render.requestRedraw();
        }
    });

    ctx.render.registerOverlay({
        target: 'main',
        phase: 'afterBorder',
        order: 0,
        includeInVideo: true,
        prepareTimeoutMs: 3000,
        async prepareVideoFrame({ globalTime, dt, signal }) {
            if (signal?.aborted || !settings.enabled || !settings.includeInVideo) {
                return;
            }
            if (videoEl && !videoEl.paused) {
                videoEl.pause();
            }

            const dec = await ensureVideoDecoder();
            if (dec) {
                const frame = await dec.getFrameAt(globalTime, {
                    endBehavior: settings.endBehavior
                });
                if (!signal?.aborted && frame && frame.canvas) {
                    const { radius, dim, qualityKey } = getRenderParams();
                    const sameFrame = lastOfflineFrameTimestamp === frame.timestamp
                        && lastDrawnBlurRadius === radius
                        && lastDrawnDim === dim
                        && lastDrawnQuality === qualityKey;
                    if (!sameFrame && renderSourceToBlurCanvas(frame.canvas, frame.width, frame.height)) {
                        lastOfflineFrameTimestamp = frame.timestamp;
                    }
                }
                return;
            }

            if (!videoEl || videoEl.readyState < 1) {
                return;
            }
            const duration = videoEl.duration;
            const isLoop = settings.endBehavior === 'loop';
            let targetTime = computeTargetVideoTime(globalTime, duration);
            if (!isLoop && Number.isFinite(duration) && duration > 0 && globalTime >= duration) {
                targetTime = Math.max(0, duration - 0.001);
            }
            const tolerance = Math.max(0.004, (Number.isFinite(dt) ? dt : 1 / 60) * 0.45);
            if (Math.abs(videoEl.currentTime - targetTime) > tolerance) {
                await seekVideoTo(targetTime, signal);
            }
            if (!signal?.aborted) {
                updateBlurCache(true);
            }
        },
        draw(rc) {
            if (rc.isRenderingVideo && !settings.includeInVideo) {
                return;
            }
            if (!settings.enabled || !videoEl || !blurCanvas || blurFrameInfo.width <= 0) {
                return;
            }

            if (!rc.isRenderingVideo && rc.isPlaying) {
                adjustPlaybackSync(rc.globalTime);
            }

            const { ctx: c, width: w, height: h, scaleBase, unitPx, stageRect } = rc;
            const stage = stageRect || { x: 0, y: 0, width: w, height: h };
            const circleRadius = Math.max(0, (scaleBase * 0.5) * unitPx);
            const { preset } = getRenderParams();

            // 使用物理像素座標計算，確保不受進入時的畫布矩陣影響
            c.setTransform(1, 0, 0, 1, 0, 0);

            if (settings.fillBlackOutsideStage && (stage.x > 0 || stage.y > 0 || stage.width < w || stage.height < h)) {
                c.save();
                c.beginPath();
                c.rect(0, 0, w, h);
                c.arc(w * 0.5, h * 0.5, circleRadius, 0, Math.PI * 2);
                c.clip('evenodd');
                c.fillStyle = '#000000';
                c.fillRect(0, 0, w, h);
                c.restore();
            }

            // 鎖定 16:9 舞台區域並挖空中央判定圓
            c.beginPath();
            c.rect(stage.x, stage.y, stage.width, stage.height);
            c.arc(w * 0.5, h * 0.5, circleRadius, 0, Math.PI * 2);
            c.clip('evenodd');

            // 維持影片原始長寬比橫向填滿 16:9 舞台寬度，垂直置中
            const videoAspect = blurFrameInfo.aspect || (blurFrameInfo.width / blurFrameInfo.height);
            const drawW = stage.width;
            const drawH = drawW / videoAspect;
            const drawX = stage.x;
            const drawY = stage.y + (stage.height - drawH) * 0.5;

            c.imageSmoothingEnabled = true;
            c.imageSmoothingQuality = preset.smoothing;
            c.drawImage(
                blurCanvas,
                0,
                0,
                blurFrameInfo.width,
                blurFrameInfo.height,
                drawX,
                drawY,
                drawW,
                drawH
            );
        }
    });

    return () => {
        disposed = true;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        if (revertNoBorder) {
            revertNoBorder();
            revertNoBorder = null;
        }
        releaseVideo();
        downCanvas = null;
        downCtx = null;
        blurCanvas = null;
        blurCtx = null;
        if (fileInput.parentNode) {
            fileInput.parentNode.removeChild(fileInput);
        }
    };
}
