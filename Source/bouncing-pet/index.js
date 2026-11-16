/**
 * @file index.js
 * @description 彈彈桌寵示範擴充套件
 * 支援匯入自訂 PNG 圖片、自由拖曳視窗任意位置與 Q 彈擠壓拉伸跳動動畫。
 */

const DEFAULT_PET_SVG = 'data:image/webp;base64,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';

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations({
        'zh-TW': {
            menuPickPng: '選擇 PNG 圖片',
            menuToggle: '切換桌寵顯示',
            menuSettings: '桌寵設定',
            menuResetPos: '重設桌寵位置',
            menuClearImg: '恢復預設圖示',
            settingsTitle: '彈彈桌寵設定',
            optVisible: '顯示桌寵',
            optSize: '桌寵大小',
            optBounceSpeed: '彈跳速度',
            optBounceHeight: '彈跳高度',
            optSquash: 'Q 彈擠壓強度',
            optOpacity: '透明度',
            toastLoaded: '已載入自訂桌寵圖片',
            toastTooLarge: '圖片過大無法儲存於本機，僅於本次工作階段顯示',
            toastReadError: '讀取圖片失敗，請確認檔案格式',
            toastShown: '已顯示彈彈桌寵',
            toastHidden: '已隱藏彈彈桌寵',
            toastPosReset: '已重設桌寵位置',
            toastCleared: '已恢復預設圖示'
        },
        'zh-CN': {
            menuPickPng: '选择 PNG 图片',
            menuToggle: '切换桌宠显示',
            menuSettings: '桌宠设置',
            menuResetPos: '重设桌宠位置',
            menuClearImg: '恢复默认图标',
            settingsTitle: '弹弹桌宠设置',
            optVisible: '显示桌宠',
            optSize: '桌宠大小',
            optBounceSpeed: '弹跳速度',
            optBounceHeight: '弹跳高度',
            optSquash: 'Q 弹挤压强度',
            optOpacity: '透明度',
            toastLoaded: '已载入自定义桌宠图片',
            toastTooLarge: '图片过大无法保存于本地，仅在当前会话显示',
            toastReadError: '读取图片失败，请确认文件格式',
            toastShown: '已显示弹弹桌宠',
            toastHidden: '已隐藏弹弹桌宠',
            toastPosReset: '已重设桌宠位置',
            toastCleared: '已恢复默认图标'
        },
        'en': {
            menuPickPng: 'Choose PNG Image',
            menuToggle: 'Toggle Pet Visibility',
            menuSettings: 'Pet Settings',
            menuResetPos: 'Reset Pet Position',
            menuClearImg: 'Restore Default Icon',
            settingsTitle: 'Bouncing Pet Settings',
            optVisible: 'Show Pet',
            optSize: 'Pet Size',
            optBounceSpeed: 'Bounce Speed',
            optBounceHeight: 'Bounce Height',
            optSquash: 'Squash & Stretch',
            optOpacity: 'Opacity',
            toastLoaded: 'Custom pet image loaded',
            toastTooLarge: 'Image too large to persist; shown for this session only',
            toastReadError: 'Failed to load image file',
            toastShown: 'Bouncing pet shown',
            toastHidden: 'Bouncing pet hidden',
            toastPosReset: 'Pet position reset',
            toastCleared: 'Default icon restored'
        },
        'ja': {
            menuPickPng: 'PNG 画像を選択',
            menuToggle: 'マスコットの表示切替',
            menuSettings: 'マスコット設定',
            menuResetPos: '位置をリセット',
            menuClearImg: 'デフォルト画像に戻す',
            settingsTitle: 'ばねっこマスコット設定',
            optVisible: 'マスコットを表示',
            optSize: 'サイズ',
            optBounceSpeed: 'バウンド速度',
            optBounceHeight: 'バウンド高さ',
            optSquash: 'ぷにぷに強度',
            optOpacity: '不透明度',
            toastLoaded: 'カスタム画像を読み込みました',
            toastTooLarge: '画像が大きすぎるため保存できません（今回のみ表示）',
            toastReadError: '画像の読み込みに失敗しました',
            toastShown: 'マスコットを表示しました',
            toastHidden: 'マスコットを非表示にしました',
            toastPosReset: '位置をリセットしました',
            toastCleared: 'デフォルト画像に戻しました'
        },
        'ko': {
            menuPickPng: 'PNG 이미지 선택',
            menuToggle: '펫 표시 전환',
            menuSettings: '펫 설정',
            menuResetPos: '위치 초기화',
            menuClearImg: '기본 아이콘 복원',
            settingsTitle: '통통 펫 설정',
            optVisible: '펫 표시',
            optSize: '크기',
            optBounceSpeed: '점프 속도',
            optBounceHeight: '점프 높이',
            optSquash: '탄성 강도',
            optOpacity: '투명도',
            toastLoaded: '사용자 펫 이미지를 불러왔습니다',
            toastTooLarge: '이미지가 너무 커서 이번 세션에만 표시됩니다',
            toastReadError: '이미지를 불러오지 못했습니다',
            toastShown: '펫을 표시했습니다',
            toastHidden: '펫을 숨겼습니다',
            toastPosReset: '위치를 초기화했습니다',
            toastCleared: '기본 아이콘으로 복원했습니다'
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
            key: 'size',
            type: 'number',
            default: 96,
            min: 48,
            max: 240,
            step: 8,
            label: ctx.i18n.t('optSize'),
            labelKey: `ext.${ctx.extensionId}.optSize`
        },
        {
            key: 'bounceSpeed',
            type: 'number',
            default: 2.0,
            min: 0.4,
            max: 5.0,
            step: 0.2,
            label: ctx.i18n.t('optBounceSpeed'),
            labelKey: `ext.${ctx.extensionId}.optBounceSpeed`
        },
        {
            key: 'squash',
            type: 'number',
            default: 0.22,
            min: 0.04,
            max: 0.45,
            step: 0.02,
            label: ctx.i18n.t('optSquash'),
            labelKey: `ext.${ctx.extensionId}.optSquash`
        },
        {
            key: 'opacity',
            type: 'number',
            default: 1.0,
            min: 0.3,
            max: 1.0,
            step: 0.05,
            label: ctx.i18n.t('optOpacity'),
            labelKey: `ext.${ctx.extensionId}.optOpacity`
        }
    ];

    const IMG_STORAGE_KEY = 'petImage';
    const POS_STORAGE_KEY = 'petPosition';

    let settings = ctx.ui.getSettings(settingsSchema);
    let popoverCtrl = null;
    let rafId = 0;
    let isDisposed = false;

    function loadSavedImage() {
        const raw = ctx.storage.get(IMG_STORAGE_KEY, null);
        return typeof raw === 'string' && raw.startsWith('data:image/') ? raw : DEFAULT_PET_SVG;
    }

    function saveCustomImage(dataUrl) {
        return ctx.storage.set(IMG_STORAGE_KEY, dataUrl);
    }

    function clearCustomImage() {
        ctx.storage.remove(IMG_STORAGE_KEY);
    }

    function getDefaultPosition(size) {
        const vw = window.innerWidth || 1280;
        const vh = window.innerHeight || 720;
        return {
            x: Math.max(16, vw - size - 48),
            y: Math.max(16, vh - size - 64)
        };
    }

    function loadSavedPosition(size) {
        const parsed = ctx.storage.get(POS_STORAGE_KEY, null);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return clampPosition(parsed.x, parsed.y, size);
        }
        return getDefaultPosition(size);
    }

    function savePosition(x, y) {
        ctx.storage.set(POS_STORAGE_KEY, { x: Math.round(x), y: Math.round(y) });
    }

    function clampPosition(x, y, size) {
        const vw = window.innerWidth || 1280;
        const vh = window.innerHeight || 720;
        const maxX = Math.max(8, vw - size - 8);
        const maxY = Math.max(8, vh - size - 8);
        return {
            x: clamp(x, 8, maxX),
            y: clamp(y, 8, maxY)
        };
    }

    const widget = ctx.ui.createFloatingWidget({ id: 'pet-stage', position: 'bottom-right' });
    const host = widget.element;
    host.style.position = 'fixed';
    host.style.left = '0px';
    host.style.top = '0px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        :host {
            user-select: none;
            -webkit-user-select: none;
        }
        .pet-box {
            position: relative;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            cursor: grab;
            pointer-events: auto;
            touch-action: none;
        }
        .pet-box.dragging {
            cursor: grabbing;
        }
        .pet-shadow {
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 68%;
            height: 14%;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.28);
            filter: blur(3px);
            transform: translateX(-50%);
            pointer-events: none;
        }
        .pet-img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            transform-origin: 50% 100%;
            pointer-events: none;
            will-change: transform;
        }
    `;

    const petBox = document.createElement('div');
    petBox.className = 'pet-box';

    const shadowSpot = document.createElement('div');
    shadowSpot.className = 'pet-shadow';

    const petImg = document.createElement('img');
    petImg.className = 'pet-img';
    petImg.alt = 'Bouncing Pet';
    petImg.draggable = false;
    petImg.src = loadSavedImage();

    petBox.append(shadowSpot, petImg);
    shadow.append(styleEl, petBox);

    let pos = loadSavedPosition(Number(settings.size) || 96);

    function applyLayout() {
        const size = clamp(Number(settings.size) || 96, 48, 240);
        const opacity = clamp(Number(settings.opacity) || 1.0, 0.3, 1.0);
        pos = clampPosition(pos.x, pos.y, size);

        host.style.display = settings.visible ? 'block' : 'none';
        host.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        petBox.style.width = `${size}px`;
        petBox.style.height = `${size}px`;
        petImg.style.opacity = String(opacity);
    }

    applyLayout();

    // 拖曳互動
    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    function onPointerDown(e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true;
        petBox.classList.add('dragging');
        dragOffsetX = e.clientX - pos.x;
        dragOffsetY = e.clientY - pos.y;
        try {
            petBox.setPointerCapture(e.pointerId);
        } catch (_) { }
    }

    function onPointerMove(e) {
        if (!dragging) return;
        const size = clamp(Number(settings.size) || 96, 48, 240);
        pos = clampPosition(e.clientX - dragOffsetX, e.clientY - dragOffsetY, size);
        host.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }

    function onPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        petBox.classList.remove('dragging');
        savePosition(pos.x, pos.y);
        try {
            if (petBox.hasPointerCapture(e.pointerId)) {
                petBox.releasePointerCapture(e.pointerId);
            }
        } catch (_) { }
    }

    function onWindowResize() {
        applyLayout();
    }

    petBox.addEventListener('pointerdown', onPointerDown);
    petBox.addEventListener('pointermove', onPointerMove);
    petBox.addEventListener('pointerup', onPointerUp);
    petBox.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', onWindowResize);

    // 連續 Q 彈跳動動畫
    let animStart = performance.now();
    function tick(now) {
        if (isDisposed) return;

        if (settings.visible) {
            const speed = clamp(Number(settings.bounceSpeed) || 2.0, 0.4, 5.0);
            const squash = clamp(Number(settings.squash) ?? 0.22, 0.04, 0.45);

            const elapsedSec = (now - animStart) / 1000;
            const phase = (elapsedSec * speed) % 1;

            let scaleX = 1;
            let scaleY = 1;
            let shadowScale = 1;
            let shadowAlpha = 0.26;

            if (dragging) {
                scaleX = 0.96;
                scaleY = 1.04;
                shadowScale = 0.88;
                shadowAlpha = 0.18;
            } else {
                // 底部固定貼地，反覆平滑壓扁與還原
                const wave = (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
                scaleX = 1 + squash * 0.75 * wave;
                scaleY = 1 - squash * wave;
                shadowScale = 1 + squash * 0.45 * wave;
                shadowAlpha = 0.26 + 0.1 * wave;
            }

            petImg.style.transform = `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            shadowSpot.style.transform = `translateX(-50%) scale(${shadowScale.toFixed(3)})`;
            shadowSpot.style.opacity = String(shadowAlpha / 0.26);
        }

        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function openImagePicker() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/*';
        input.onchange = () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    petImg.src = reader.result;
                    const persisted = saveCustomImage(reader.result);
                    ctx.ui.toast({
                        content: ctx.i18n.t(persisted ? 'toastLoaded' : 'toastTooLarge'),
                        type: persisted ? 'success' : 'warning'
                    });
                }
            };
            reader.onerror = () => {
                ctx.ui.toast({ content: ctx.i18n.t('toastReadError'), type: 'error' });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    ctx.ui.registerMenuItem({
        id: 'pick-png',
        label: ctx.i18n.t('menuPickPng'),
        labelKey: `ext.${ctx.extensionId}.menuPickPng`,
        onClick: openImagePicker
    });

    ctx.ui.registerMenuItem({
        id: 'toggle',
        label: ctx.i18n.t('menuToggle'),
        labelKey: `ext.${ctx.extensionId}.menuToggle`,
        onClick() {
            settings.visible = !settings.visible;
            applyLayout();
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
                    applyLayout();
                }
            });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'reset-pos',
        label: ctx.i18n.t('menuResetPos'),
        labelKey: `ext.${ctx.extensionId}.menuResetPos`,
        onClick() {
            const size = clamp(Number(settings.size) || 96, 48, 240);
            pos = getDefaultPosition(size);
            savePosition(pos.x, pos.y);
            applyLayout();
            ctx.ui.toast({ content: ctx.i18n.t('toastPosReset'), type: 'info' });
        }
    });

    ctx.ui.registerMenuItem({
        id: 'clear-img',
        label: ctx.i18n.t('menuClearImg'),
        labelKey: `ext.${ctx.extensionId}.menuClearImg`,
        onClick() {
            clearCustomImage();
            petImg.src = DEFAULT_PET_SVG;
            ctx.ui.toast({ content: ctx.i18n.t('toastCleared'), type: 'info' });
        }
    });

    return () => {
        isDisposed = true;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        petBox.removeEventListener('pointerdown', onPointerDown);
        petBox.removeEventListener('pointermove', onPointerMove);
        petBox.removeEventListener('pointerup', onPointerUp);
        petBox.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('resize', onWindowResize);
        if (popoverCtrl) {
            popoverCtrl.close();
            popoverCtrl = null;
        }
    };
}

