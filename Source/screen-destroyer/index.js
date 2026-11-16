const EXTENSION_ID = 'com.wmcx.screen-destroyer';

const TOOLS = [
    { id: 'hammer', labelKey: 'toolHammer', fallback: '鐵鎚' },
    { id: 'gun', labelKey: 'toolGun', fallback: '機槍' },
    { id: 'paint', labelKey: 'toolPaint', fallback: '油漆彈' },
    { id: 'saw', labelKey: 'toolSaw', fallback: '電鋸' },
    { id: 'flame', labelKey: 'toolFlame', fallback: '火焰' }
];

const PAINT_COLORS = [
    '#ef4444', '#f97316', '#facc15', '#22c55e',
    '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'
];

const SETTINGS_SCHEMA = [
    {
        key: 'effectScale',
        type: 'number',
        default: 1,
        min: 0.5,
        max: 2,
        step: 0.1,
        label: '破壞特效大小',
        labelKey: `ext.${EXTENSION_ID}.optScale`
    },
    {
        key: 'particlesEnabled',
        type: 'boolean',
        default: true,
        label: '啟用粒子飛濺特效',
        labelKey: `ext.${EXTENSION_ID}.optParticles`
    },
    {
        key: 'soundEnabled',
        type: 'boolean',
        default: true,
        label: '啟用合成音效',
        labelKey: `ext.${EXTENSION_ID}.optSound`
    }
];

const TRANSLATIONS = {
    'zh-TW': {
        menuToggleMode: '切換破壞模式',
        menuClear: '清除螢幕痕跡',
        menuSettings: '破壞程式設定',
        settingsTitle: '螢幕破壞程式設定',
        optScale: '破壞特效大小',
        optParticles: '啟用粒子飛濺特效',
        optSound: '啟用合成音效',
        modeOn: '破壞模式：開',
        modeOff: '破壞模式：關',
        toolHammer: '鐵鎚',
        toolGun: '機槍',
        toolPaint: '油漆彈',
        toolSaw: '電鋸',
        toolFlame: '火焰',
        btnClear: '清除',
        toastModeOn: '已開啟破壞模式，按 Esc 可暫停並操作編輯器',
        toastModeOff: '已暫停破壞模式',
        toastCleared: '已清除所有螢幕破壞痕跡'
    },
    en: {
        menuToggleMode: 'Toggle Destroy Mode',
        menuClear: 'Clear Screen Marks',
        menuSettings: 'Destroyer Settings',
        settingsTitle: 'Screen Destroyer Settings',
        optScale: 'Effect Scale',
        optParticles: 'Enable Particles',
        optSound: 'Enable Sound Effects',
        modeOn: 'Destroy: ON',
        modeOff: 'Destroy: OFF',
        toolHammer: 'Hammer',
        toolGun: 'Machine Gun',
        toolPaint: 'Paintball',
        toolSaw: 'Chainsaw',
        toolFlame: 'Flame',
        btnClear: 'Clear',
        toastModeOn: 'Destroy mode enabled, press Esc to pause',
        toastModeOff: 'Destroy mode paused',
        toastCleared: 'Cleared all screen marks'
    }
};

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * 建立純 Web Audio API 合成音效播放器，避免依賴外部音訊檔案
 */
function createSynthAudio() {
    let audioCtx = null;

    const getCtx = () => {
        if (typeof window === 'undefined') return null;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        if (!audioCtx) {
            audioCtx = new AudioCtor();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    };

    const playNoiseBurst = (duration, filterFreq, gainVal) => {
        const ac = getCtx();
        if (!ac) return;
        const sampleCount = Math.max(1, Math.floor(ac.sampleRate * duration));
        const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
        }

        const src = ac.createBufferSource();
        src.buffer = buffer;

        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const gain = ac.createGain();
        gain.gain.setValueAtTime(gainVal, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        src.start();
    };

    const playTone = (startFreq, endFreq, duration, type, gainVal) => {
        const ac = getCtx();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ac.currentTime + duration);

        gain.gain.setValueAtTime(gainVal, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration);
    };

    return {
        hammer() {
            playNoiseBurst(0.14, 1800, 0.22);
            playTone(1200, 260, 0.11, 'triangle', 0.12);
        },
        gun() {
            playNoiseBurst(0.06, 2600, 0.16);
        },
        paint() {
            playTone(380, 140, 0.08, 'sine', 0.14);
        },
        saw() {
            playTone(130 + Math.random() * 30, 95, 0.06, 'sawtooth', 0.06);
        },
        flame() {
            playNoiseBurst(0.08, 650, 0.06);
        },
        dispose() {
            if (audioCtx && typeof audioCtx.close === 'function') {
                audioCtx.close().catch(() => {});
                audioCtx = null;
            }
        }
    };
}

export default function activate(ctx) {
    ctx.i18n.registerTranslations(TRANSLATIONS);

    const widget = ctx.ui.createFloatingWidget({
        id: 'screen-destroyer',
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
        .fx-canvas.active {
            pointer-events: auto;
            cursor: crosshair;
            touch-action: none;
        }
        .dock {
            position: fixed;
            bottom: 14px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 12px;
            background: rgba(16, 20, 29, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            pointer-events: auto;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            color: #f8fafc;
            white-space: nowrap;
        }
        .btn {
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.06);
            color: #e2e8f0;
            border-radius: 8px;
            padding: 5px 10px;
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
        .btn.mode-on {
            background: #dc2626;
            border-color: #f87171;
            color: #ffffff;
        }
        .divider {
            width: 1px;
            height: 18px;
            background: rgba(255, 255, 255, 0.16);
            margin: 0 2px;
        }
    `;

    const decalCanvas = document.createElement('canvas');
    const fxCanvas = document.createElement('canvas');
    fxCanvas.className = 'fx-canvas';

    const decalCtx = decalCanvas.getContext('2d');
    const fxCtx = fxCanvas.getContext('2d');

    const dock = document.createElement('div');
    dock.className = 'dock';

    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.className = 'btn';

    const divider1 = document.createElement('span');
    divider1.className = 'divider';

    const toolButtons = {};
    const divider2 = document.createElement('span');
    divider2.className = 'divider';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = ctx.i18n.t('btnClear');

    dock.append(modeBtn, divider1);
    for (let i = 0; i < TOOLS.length; i++) {
        const def = TOOLS[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.textContent = ctx.i18n.t(def.labelKey) || def.fallback;
        btn.addEventListener('click', () => {
            setActiveTool(def.id);
        });
        toolButtons[def.id] = btn;
        dock.appendChild(btn);
    }
    dock.append(divider2, clearBtn);

    shadow.append(style, decalCanvas, fxCanvas, dock);

    const audio = createSynthAudio();
    let settings = ctx.ui.getSettings(SETTINGS_SCHEMA);
    let destroyMode = true;
    let activeTool = 'hammer';
    let isHolding = false;
    let pointerX = 0;
    let pointerY = 0;
    let lastMoveX = 0;
    let lastMoveY = 0;
    let holdTimer = 0;
    let rafId = 0;
    let isDisposed = false;
    const particles = [];

    const resizeCanvases = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);

        let snapshot = null;
        if (decalCanvas.width > 0 && decalCanvas.height > 0) {
            snapshot = document.createElement('canvas');
            snapshot.width = decalCanvas.width;
            snapshot.height = decalCanvas.height;
            const snapCtx = snapshot.getContext('2d');
            if (snapCtx) {
                snapCtx.drawImage(decalCanvas, 0, 0);
            }
        }

        decalCanvas.width = Math.round(w * dpr);
        decalCanvas.height = Math.round(h * dpr);
        fxCanvas.width = Math.round(w * dpr);
        fxCanvas.height = Math.round(h * dpr);

        decalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (snapshot) {
            decalCtx.drawImage(snapshot, 0, 0, w, h);
        }
    };

    const spawnParticles = (count, factory) => {
        if (!settings.particlesEnabled) return;
        for (let i = 0; i < count; i++) {
            if (particles.length >= 260) {
                particles.shift();
            }
            particles.push(factory(i));
        }
        ensureFxLoop();
    };

    const drawHammerCrack = (x, y) => {
        const s = settings.effectScale;
        const rayCount = 12 + Math.floor(Math.random() * 6);
        decalCtx.save();
        decalCtx.translate(x, y);

        const impactGrad = decalCtx.createRadialGradient(0, 0, 1, 0, 0, 14 * s);
        impactGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        impactGrad.addColorStop(0.5, 'rgba(200, 230, 255, 0.35)');
        impactGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        decalCtx.fillStyle = impactGrad;
        decalCtx.beginPath();
        decalCtx.arc(0, 0, 14 * s, 0, Math.PI * 2);
        decalCtx.fill();

        const ringPoints = [];
        for (let i = 0; i < rayCount; i++) {
            const baseAngle = (Math.PI * 2 * i) / rayCount + randomRange(-0.12, 0.12);
            const len = randomRange(42, 95) * s;
            let cx = 0;
            let cy = 0;
            const steps = 4;

            decalCtx.beginPath();
            decalCtx.moveTo(0, 0);
            for (let step = 1; step <= steps; step++) {
                const t = step / steps;
                const jitter = randomRange(-0.18, 0.18);
                const r = len * t;
                cx = Math.cos(baseAngle + jitter) * r;
                cy = Math.sin(baseAngle + jitter) * r;
                decalCtx.lineTo(cx, cy);
                if (step === 2) {
                    ringPoints.push({ x: cx, y: cy });
                }
            }
            decalCtx.strokeStyle = 'rgba(235, 248, 255, 0.85)';
            decalCtx.lineWidth = randomRange(1.1, 2.1);
            decalCtx.stroke();
        }

        if (ringPoints.length > 2) {
            decalCtx.beginPath();
            decalCtx.moveTo(ringPoints[0].x, ringPoints[0].y);
            for (let i = 1; i < ringPoints.length; i++) {
                decalCtx.lineTo(ringPoints[i].x, ringPoints[i].y);
            }
            decalCtx.closePath();
            decalCtx.strokeStyle = 'rgba(210, 235, 255, 0.55)';
            decalCtx.lineWidth = 1;
            decalCtx.stroke();
        }
        decalCtx.restore();

        spawnParticles(14, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(90, 280);
            return {
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                gravity: 620,
                size: randomRange(3, 7) * s,
                life: 0.55,
                maxLife: 0.55,
                color: 'rgba(224, 242, 254, 0.9)',
                shape: 'shard',
                rot: randomRange(0, Math.PI),
                vRot: randomRange(-8, 8)
            };
        });

        if (settings.soundEnabled) audio.hammer();
    };

    const drawBulletHole = (x, y) => {
        const s = settings.effectScale;
        const jx = x + randomRange(-5, 5) * s;
        const jy = y + randomRange(-5, 5) * s;

        decalCtx.save();
        decalCtx.translate(jx, jy);

        for (let i = 0; i < 6; i++) {
            const a = randomRange(0, Math.PI * 2);
            const l = randomRange(8, 18) * s;
            decalCtx.beginPath();
            decalCtx.moveTo(0, 0);
            decalCtx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
            decalCtx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
            decalCtx.lineWidth = 1;
            decalCtx.stroke();
        }

        decalCtx.fillStyle = 'rgba(71, 85, 105, 0.75)';
        decalCtx.beginPath();
        decalCtx.arc(0, 0, 5.5 * s, 0, Math.PI * 2);
        decalCtx.fill();

        decalCtx.fillStyle = '#090d16';
        decalCtx.beginPath();
        decalCtx.arc(0, 0, 3.2 * s, 0, Math.PI * 2);
        decalCtx.fill();
        decalCtx.restore();

        spawnParticles(8, () => {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(110, 260);
            return {
                x: jx,
                y: jy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 300,
                size: randomRange(1.5, 3) * s,
                life: 0.25,
                maxLife: 0.25,
                color: '#fbbf24',
                shape: 'circle'
            };
        });

        if (settings.soundEnabled) audio.gun();
    };

    const drawPaintSplatter = (x, y) => {
        const s = settings.effectScale;
        const color = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
        const baseR = randomRange(12, 24) * s;

        decalCtx.save();
        decalCtx.fillStyle = color;
        decalCtx.globalAlpha = 0.88;

        decalCtx.beginPath();
        decalCtx.arc(x, y, baseR, 0, Math.PI * 2);
        decalCtx.fill();

        for (let i = 0; i < 8; i++) {
            const a = randomRange(0, Math.PI * 2);
            const dist = randomRange(baseR * 0.6, baseR * 1.9);
            const r = randomRange(2, 7) * s;
            decalCtx.beginPath();
            decalCtx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, r, 0, Math.PI * 2);
            decalCtx.fill();
        }

        const dripLen = randomRange(14, 42) * s;
        decalCtx.beginPath();
        decalCtx.roundRect(x - 2 * s, y, 4 * s, dripLen, 2 * s);
        decalCtx.fill();
        decalCtx.restore();

        spawnParticles(8, () => {
            const a = randomRange(0, Math.PI * 2);
            const speed = randomRange(50, 170);
            return {
                x,
                y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - 40,
                gravity: 480,
                size: randomRange(2, 5) * s,
                life: 0.4,
                maxLife: 0.4,
                color,
                shape: 'circle'
            };
        });

        if (settings.soundEnabled) audio.paint();
    };

    const drawSawCut = (x1, y1, x2, y2) => {
        const s = settings.effectScale;
        decalCtx.save();
        decalCtx.lineCap = 'round';
        decalCtx.lineJoin = 'round';

        decalCtx.beginPath();
        decalCtx.moveTo(x1, y1);
        decalCtx.lineTo(x2 + randomRange(-2, 2), y2 + randomRange(-2, 2));
        decalCtx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        decalCtx.lineWidth = 7 * s;
        decalCtx.stroke();

        decalCtx.beginPath();
        decalCtx.moveTo(x1, y1);
        decalCtx.lineTo(x2, y2);
        decalCtx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
        decalCtx.lineWidth = 2.5 * s;
        decalCtx.stroke();
        decalCtx.restore();

        spawnParticles(5, () => {
            const angle = randomRange(-Math.PI, 0);
            const speed = randomRange(120, 260);
            return {
                x: x2,
                y: y2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 500,
                size: randomRange(1.5, 3) * s,
                life: 0.3,
                maxLife: 0.3,
                color: '#fde047',
                shape: 'circle'
            };
        });

        if (settings.soundEnabled) audio.saw();
    };

    const drawFlameScorch = (x, y) => {
        const s = settings.effectScale;
        const r = randomRange(14, 24) * s;
        const grad = decalCtx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(15, 15, 15, 0.35)');
        grad.addColorStop(0.6, 'rgba(69, 26, 3, 0.16)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        decalCtx.fillStyle = grad;
        decalCtx.beginPath();
        decalCtx.arc(x, y, r, 0, Math.PI * 2);
        decalCtx.fill();

        spawnParticles(10, () => {
            const hueColor = Math.random() > 0.45 ? '#fb923c' : '#fde047';
            return {
                x: x + randomRange(-10, 10) * s,
                y: y + randomRange(-6, 6) * s,
                vx: randomRange(-35, 35),
                vy: randomRange(-170, -70),
                gravity: -90,
                size: randomRange(4, 10) * s,
                life: 0.48,
                maxLife: 0.48,
                color: hueColor,
                shape: 'circle'
            };
        });

        if (settings.soundEnabled) audio.flame();
    };

    let lastFxTime = 0;
    const fxLoop = (now) => {
        if (isDisposed) {
            rafId = 0;
            return;
        }
        const dt = lastFxTime > 0 ? Math.min(0.05, (now - lastFxTime) / 1000) : 0.016;
        lastFxTime = now;

        const w = window.innerWidth;
        const h = window.innerHeight;
        fxCtx.clearRect(0, 0, w, h);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const alpha = Math.max(0, p.life / p.maxLife);
            fxCtx.save();
            fxCtx.globalAlpha = alpha;
            fxCtx.fillStyle = p.color;

            if (p.shape === 'shard') {
                p.rot += p.vRot * dt;
                fxCtx.translate(p.x, p.y);
                fxCtx.rotate(p.rot);
                fxCtx.beginPath();
                fxCtx.moveTo(0, -p.size);
                fxCtx.lineTo(p.size * 0.8, p.size * 0.7);
                fxCtx.lineTo(-p.size * 0.7, p.size * 0.5);
                fxCtx.closePath();
                fxCtx.fill();
            } else {
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
                fxCtx.fill();
            }
            fxCtx.restore();
        }

        if (particles.length > 0) {
            rafId = requestAnimationFrame(fxLoop);
        } else {
            rafId = 0;
            lastFxTime = 0;
        }
    };

    const ensureFxLoop = () => {
        if (!rafId && !isDisposed) {
            lastFxTime = 0;
            rafId = requestAnimationFrame(fxLoop);
        }
    };

    const stopHoldTimer = () => {
        if (holdTimer) {
            clearInterval(holdTimer);
            holdTimer = 0;
        }
        isHolding = false;
    };

    const setActiveTool = (toolId) => {
        activeTool = toolId;
        for (let i = 0; i < TOOLS.length; i++) {
            const id = TOOLS[i].id;
            toolButtons[id].classList.toggle('active', id === toolId);
        }
    };

    const setDestroyMode = (enabled, notify = false) => {
        destroyMode = Boolean(enabled);
        if (!destroyMode) {
            stopHoldTimer();
        }
        fxCanvas.classList.toggle('active', destroyMode);
        modeBtn.classList.toggle('mode-on', destroyMode);
        modeBtn.textContent = ctx.i18n.t(destroyMode ? 'modeOn' : 'modeOff');

        if (notify) {
            ctx.ui.toast({
                content: ctx.i18n.t(destroyMode ? 'toastModeOn' : 'toastModeOff'),
                type: 'info'
            });
        }
    };

    const clearAll = (notify = false) => {
        decalCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.length = 0;
        if (notify) {
            ctx.ui.toast({ content: ctx.i18n.t('toastCleared'), type: 'info' });
        }
    };

    const onPointerDown = (event) => {
        if (!destroyMode) return;
        if (event.button !== undefined && event.button !== 0) return;

        isHolding = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        lastMoveX = pointerX;
        lastMoveY = pointerY;

        if (activeTool === 'hammer') {
            drawHammerCrack(pointerX, pointerY);
        } else if (activeTool === 'gun') {
            drawBulletHole(pointerX, pointerY);
            holdTimer = setInterval(() => {
                if (isHolding) drawBulletHole(pointerX, pointerY);
            }, 90);
        } else if (activeTool === 'paint') {
            drawPaintSplatter(pointerX, pointerY);
        } else if (activeTool === 'saw') {
            drawSawCut(pointerX, pointerY, pointerX + 1, pointerY + 1);
        } else if (activeTool === 'flame') {
            drawFlameScorch(pointerX, pointerY);
            holdTimer = setInterval(() => {
                if (isHolding) drawFlameScorch(pointerX, pointerY);
            }, 65);
        }
    };

    const onPointerMove = (event) => {
        if (!isHolding || !destroyMode) return;
        pointerX = event.clientX;
        pointerY = event.clientY;

        const dx = pointerX - lastMoveX;
        const dy = pointerY - lastMoveY;
        const dist = Math.hypot(dx, dy);

        if (activeTool === 'paint' && dist >= 26) {
            drawPaintSplatter(pointerX, pointerY);
            lastMoveX = pointerX;
            lastMoveY = pointerY;
        } else if (activeTool === 'saw' && dist >= 4) {
            drawSawCut(lastMoveX, lastMoveY, pointerX, pointerY);
            lastMoveX = pointerX;
            lastMoveY = pointerY;
        }
    };

    const onPointerUp = () => {
        stopHoldTimer();
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape' && destroyMode) {
            setDestroyMode(false, true);
        }
    };

    modeBtn.addEventListener('click', () => setDestroyMode(!destroyMode, true));
    clearBtn.addEventListener('click', () => clearAll(true));

    fxCanvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', resizeCanvases);

    ctx.ui.registerMenuItem({
        id: 'toggle-mode',
        label: '切換破壞模式',
        labelKey: `ext.${EXTENSION_ID}.menuToggleMode`,
        onClick: () => setDestroyMode(!destroyMode, true)
    });

    ctx.ui.registerMenuItem({
        id: 'clear-marks',
        label: '清除螢幕痕跡',
        labelKey: `ext.${EXTENSION_ID}.menuClear`,
        onClick: () => clearAll(true)
    });

    ctx.ui.registerMenuItem({
        id: 'open-settings',
        label: '破壞程式設定',
        labelKey: `ext.${EXTENSION_ID}.menuSettings`,
        onClick: ({ anchorEl }) => {
            ctx.ui.openPopover({
                title: ctx.i18n.t('settingsTitle'),
                schema: SETTINGS_SCHEMA,
                anchorEl,
                onChange: (_key, _val, allValues) => {
                    settings = allValues;
                }
            });
        }
    });

    resizeCanvases();
    setActiveTool('hammer');
    setDestroyMode(true, false);

    return () => {
        isDisposed = true;
        stopHoldTimer();
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        fxCanvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', resizeCanvases);
        audio.dispose();
    };
}
