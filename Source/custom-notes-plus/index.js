/**
 * 自訂音符Plus
 * 支援手選本機圖片覆寫所有原生音符、判定環與特效貼圖，並自動持久化記憶。
 */

const STORAGE_KEY = 'custom_textures_v1';

const NOTE_GROUPS = [
    { id: 'all', label: '全部貼圖', match: () => true },
    { id: 'tap', label: 'Tap', match: (k) => k.startsWith('tap') },
    { id: 'hold', label: 'Hold', match: (k) => k.toLowerCase().startsWith('hold') },
    { id: 'star', label: 'Star', match: (k) => k.startsWith('star') },
    {
        id: 'slide',
        label: 'Slide / Arc',
        match: (k) => k.endsWith('Arc') || k.startsWith('Normal') || k.startsWith('Break') || k.startsWith('Each') || k.startsWith('Slide') || k.startsWith('Mine') || k.startsWith('wifi')
    },
    { id: 'touch', label: 'Touch', match: (k) => k.startsWith('touch') },
    {
        id: 'other',
        label: '判定環與特效',
        match: (k) => !k.startsWith('tap') && !k.toLowerCase().startsWith('hold') && !k.startsWith('star') && !k.startsWith('touch') && !k.endsWith('Arc') && !k.startsWith('wifi')
    }
];

const CORE_NOTE_MATCH = (k) => (
    k.startsWith('tap') ||
    k.toLowerCase().startsWith('hold') ||
    k.startsWith('star') ||
    k.startsWith('touch') ||
    k.endsWith('Arc') ||
    k === 'Normal' || k === 'Break' || k === 'Each' || k === 'Slide' || k === 'Mine' ||
    k.startsWith('wifi')
);

function fileToDataUrl(file, maxEdge = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('讀取圖片檔案失敗'));
        reader.onload = () => {
            const rawUrl = String(reader.result || '');
            const img = new Image();
            img.onerror = () => resolve(rawUrl);
            img.onload = () => {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                if (!w || !h || (w <= maxEdge && h <= maxEdge)) {
                    resolve(rawUrl);
                    return;
                }
                const scale = maxEdge / Math.max(w, h);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(w * scale));
                canvas.height = Math.max(1, Math.round(h * scale));
                const c = canvas.getContext('2d');
                c.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = rawUrl;
        };
        reader.readAsDataURL(file);
    });
}

function pickImageFile() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        let settled = false;
        const cleanup = () => {
            if (input.parentNode) input.remove();
        };

        input.addEventListener('change', () => {
            settled = true;
            const file = input.files && input.files[0] ? input.files[0] : null;
            cleanup();
            resolve(file);
        }, { once: true });

        window.addEventListener('focus', () => {
            setTimeout(() => {
                if (!settled) {
                    cleanup();
                    resolve(null);
                }
            }, 350);
        }, { once: true });

        input.click();
    });
}

export async function activate(ctx) {
    let disposed = false;
    const activeDisposers = new Map();
    const savedTextures = await ctx.storage.get(STORAGE_KEY, {});
    const customMap = (savedTextures && typeof savedTextures === 'object') ? { ...savedTextures } : {};

    let widget = null;
    let isPanelOpen = false;
    let currentGroup = 'tap';
    let searchKeyword = '';
    let renderListFn = null;

    const persistCustomMap = async () => {
        try {
            await ctx.storage.set(STORAGE_KEY, customMap);
        } catch (err) {
            console.error('[CustomNotesPlus] 儲存自訂貼圖失敗:', err);
        }
    };

    const applySingleKey = async (key, dataUrl) => {
        if (disposed) return;
        const oldDispose = activeDisposers.get(key);
        if (oldDispose) {
            oldDispose();
            activeDisposers.delete(key);
        }
        const dispose = await ctx.assets.overrideImage(key, dataUrl);
        if (disposed) {
            dispose();
            return;
        }
        activeDisposers.set(key, dispose);
    };

    const restoreSingleKey = async (key) => {
        const oldDispose = activeDisposers.get(key);
        if (oldDispose) {
            oldDispose();
            activeDisposers.delete(key);
        }
        delete customMap[key];
        await persistCustomMap();
        renderListFn?.();
    };

    const restoreAllKeys = async () => {
        for (const dispose of activeDisposers.values()) {
            try { dispose(); } catch (_) { }
        }
        activeDisposers.clear();
        for (const k of Object.keys(customMap)) {
            delete customMap[k];
        }
        await persistCustomMap();
        renderListFn?.();
        ctx.ui.toast({
            content: '已還原所有原生音符貼圖',
            type: 'info',
            timeout: 2000
        });
    };

    const applyToKeys = async (keys, file) => {
        if (!file || keys.length === 0) return;
        const dataUrl = await fileToDataUrl(file);
        for (const k of keys) {
            customMap[k] = dataUrl;
            await applySingleKey(k, dataUrl);
        }
        await persistCustomMap();
        renderListFn?.();
        ctx.ui.toast({
            content: `已套用圖片至 ${keys.length} 項貼圖`,
            type: 'success',
            timeout: 2000
        });
    };

    // 啟動時自動恢復先前保存的自訂貼圖
    const savedEntries = Object.entries(customMap);
    if (savedEntries.length > 0) {
        for (const [k, dataUrl] of savedEntries) {
            try {
                await applySingleKey(k, dataUrl);
            } catch (err) {
                console.warn(`[CustomNotesPlus] 恢復貼圖 "${k}" 失敗:`, err);
            }
        }
    }

    const getVisibleKeys = () => {
        const allKeys = ctx.assets.listImageKeys().slice().sort((a, b) => a.localeCompare(b));
        const group = NOTE_GROUPS.find((g) => g.id === currentGroup) || NOTE_GROUPS[0];
        const kw = searchKeyword.trim().toLowerCase();
        return allKeys.filter((k) => {
            if (!group.match(k)) return false;
            if (kw && !k.toLowerCase().includes(kw)) return false;
            return true;
        });
    };

    const buildPanel = () => {
        if (widget) {
            widget.element.style.display = 'flex';
            isPanelOpen = true;
            renderListFn?.();
            return;
        }

        widget = ctx.ui.createFloatingWidget({ id: 'panel', position: 'center' });
        if (!widget) return;

        const host = widget.element;
        Object.assign(host.style, {
            position: 'fixed',
            top: '80px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '76vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(20, 22, 28, 0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '14px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.48)',
            color: '#f2f4f8',
            fontFamily: 'inherit',
            zIndex: '9500',
            overflow: 'hidden'
        });

        // 標題列（可拖曳）
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'grab',
            userSelect: 'none'
        });

        const titleEl = document.createElement('strong');
        titleEl.textContent = '自訂音符Plus';
        titleEl.style.fontSize = '15px';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        Object.assign(closeBtn.style, {
            background: 'transparent',
            border: 'none',
            color: '#b8c0cc',
            fontSize: '20px',
            lineHeight: '1',
            cursor: 'pointer',
            padding: '2px 6px'
        });
        closeBtn.addEventListener('click', () => {
            host.style.display = 'none';
            isPanelOpen = false;
        });

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        // 拖曳移動邏輯
        let dragState = null;
        header.addEventListener('pointerdown', (e) => {
            if (e.target === closeBtn) return;
            const rect = host.getBoundingClientRect();
            dragState = {
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top
            };
            host.style.right = 'auto';
            host.style.left = `${rect.left}px`;
            host.style.top = `${rect.top}px`;
            header.style.cursor = 'grabbing';
        });
        const onPointerMove = (e) => {
            if (!dragState) return;
            const left = Math.max(8, Math.min(window.innerWidth - host.offsetWidth - 8, e.clientX - dragState.offsetX));
            const top = Math.max(8, Math.min(window.innerHeight - 60, e.clientY - dragState.offsetY));
            host.style.left = `${left}px`;
            host.style.top = `${top}px`;
        };
        const onPointerUp = () => {
            if (!dragState) return;
            dragState = null;
            header.style.cursor = 'grab';
        };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        // 工具操作列
        const actionBar = document.createElement('div');
        Object.assign(actionBar.style, {
            display: 'flex',
            gap: '8px',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap'
        });

        const makeBtn = (text, bg = 'rgba(255,255,255,0.1)') => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = text;
            Object.assign(btn.style, {
                background: bg,
                color: '#f2f4f8',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer'
            });
            return btn;
        };

        const applyAllNotesBtn = makeBtn('一鍵替換所有音符', 'rgba(79, 138, 255, 0.28)');
        applyAllNotesBtn.addEventListener('click', async () => {
            const file = await pickImageFile();
            if (!file) return;
            const noteKeys = ctx.assets.listImageKeys().filter(CORE_NOTE_MATCH);
            await applyToKeys(noteKeys, file);
        });

        const applyGroupBtn = makeBtn('套用目前分類');
        applyGroupBtn.addEventListener('click', async () => {
            const file = await pickImageFile();
            if (!file) return;
            await applyToKeys(getVisibleKeys(), file);
        });

        const resetAllBtn = makeBtn('全部還原', 'rgba(255, 86, 86, 0.22)');
        resetAllBtn.addEventListener('click', () => {
            restoreAllKeys();
        });

        actionBar.appendChild(applyAllNotesBtn);
        actionBar.appendChild(applyGroupBtn);
        actionBar.appendChild(resetAllBtn);

        // 搜尋與分類列
        const filterBox = document.createElement('div');
        Object.assign(filterBox.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        });

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜尋貼圖鍵名，例如 tap、hold、star、outline';
        Object.assign(searchInput.style, {
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(0, 0, 0, 0.3)',
            color: '#f2f4f8',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            outline: 'none'
        });
        searchInput.addEventListener('input', () => {
            searchKeyword = searchInput.value;
            renderListFn?.();
        });

        const tabRow = document.createElement('div');
        Object.assign(tabRow.style, {
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap'
        });

        const tabButtons = new Map();
        for (const group of NOTE_GROUPS) {
            const tabBtn = makeBtn(group.label);
            tabBtn.style.padding = '4px 8px';
            tabBtn.style.fontSize = '11px';
            tabBtn.addEventListener('click', () => {
                currentGroup = group.id;
                renderListFn?.();
            });
            tabButtons.set(group.id, tabBtn);
            tabRow.appendChild(tabBtn);
        }

        filterBox.appendChild(searchInput);
        filterBox.appendChild(tabRow);

        // 貼圖清單區
        const listEl = document.createElement('div');
        Object.assign(listEl.style, {
            flex: '1',
            overflowY: 'auto',
            padding: '8px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        renderListFn = () => {
            for (const [gid, btn] of tabButtons.entries()) {
                const active = gid === currentGroup;
                btn.style.background = active ? 'rgba(79, 138, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)';
                btn.style.borderColor = active ? 'rgba(120, 170, 255, 0.7)' : 'rgba(255, 255, 255, 0.14)';
            }

            listEl.textContent = '';
            const keys = getVisibleKeys();
            if (keys.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.textContent = '沒有符合條件的貼圖項目';
                emptyEl.style.color = '#98a2b3';
                emptyEl.style.fontSize = '12px';
                emptyEl.style.padding = '12px 0';
                listEl.appendChild(emptyEl);
                return;
            }

            for (const key of keys) {
                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: customMap[key] ? 'rgba(79, 138, 255, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                    border: customMap[key] ? '1px solid rgba(79, 138, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'
                });

                const left = document.createElement('div');
                Object.assign(left.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '0',
                    flex: '1'
                });

                if (customMap[key]) {
                    const thumb = document.createElement('img');
                    thumb.src = customMap[key];
                    thumb.alt = key;
                    Object.assign(thumb.style, {
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        flexShrink: '0'
                    });
                    left.appendChild(thumb);
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = key;
                Object.assign(nameSpan.style, {
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                });
                left.appendChild(nameSpan);

                const right = document.createElement('div');
                Object.assign(right.style, {
                    display: 'flex',
                    gap: '6px',
                    flexShrink: '0'
                });

                const pickBtn = makeBtn('選圖');
                pickBtn.style.padding = '4px 8px';
                pickBtn.style.fontSize = '11px';
                pickBtn.addEventListener('click', async () => {
                    const file = await pickImageFile();
                    if (!file) return;
                    const dataUrl = await fileToDataUrl(file);
                    customMap[key] = dataUrl;
                    await applySingleKey(key, dataUrl);
                    await persistCustomMap();
                    renderListFn?.();
                });
                right.appendChild(pickBtn);

                if (customMap[key]) {
                    const resetBtn = makeBtn('還原', 'rgba(255, 86, 86, 0.22)');
                    resetBtn.style.padding = '4px 8px';
                    resetBtn.style.fontSize = '11px';
                    resetBtn.addEventListener('click', () => {
                        restoreSingleKey(key);
                    });
                    right.appendChild(resetBtn);
                }

                row.appendChild(left);
                row.appendChild(right);
                listEl.appendChild(row);
            }
        };

        host.appendChild(header);
        host.appendChild(actionBar);
        host.appendChild(filterBox);
        host.appendChild(listEl);

        const origDispose = widget.dispose;
        widget.dispose = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            origDispose();
        };

        isPanelOpen = true;
        renderListFn();
    };

    ctx.ui.registerMenuItem({
        id: 'custom-notes-plus-toggle',
        label: '自訂音符Plus',
        icon: 'palette',
        onClick: () => {
            if (!widget || !isPanelOpen) {
                buildPanel();
            } else {
                widget.element.style.display = 'none';
                isPanelOpen = false;
            }
        }
    });

    // 初次啟用直接開啟面板方便選圖
    buildPanel();

    return () => {
        disposed = true;
        for (const dispose of activeDisposers.values()) {
            try { dispose(); } catch (_) { }
        }
        activeDisposers.clear();
        if (widget) {
            widget.dispose();
            widget = null;
        }
    };
}
