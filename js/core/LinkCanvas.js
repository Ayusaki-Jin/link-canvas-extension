class LinkCanvas {
    constructor() {
        this.canvas = document.getElementById('link-canvas');
        this.gridSize = 50; // デフォルト50px
        this.tiles = new Map();
        this.groups = new Map();

        // 依存関係用のプロパティを追加
        this.gridManager = null;
        this.storageManager = null;
        this.autoGrouping = null;
        this.colorManager = null;
        this.nameGenerator = null;

        this.dragState = {
            isDragging: false,
            draggedTile: null,
            startPosition: null,
            hoverTimer: null
        };

        this.init();
    }

    // ← この メソッドを追加
    setDependencies(gridManager, storageManager, autoGrouping, colorManager, nameGenerator) {
        this.gridManager = gridManager;
        this.storageManager = storageManager;
        this.autoGrouping = autoGrouping;
        this.colorManager = colorManager;
        this.nameGenerator = nameGenerator;

        console.log('[INFO] Dependencies injected successfully');
    }

    async init() {
        console.log('[INIT] LinkCanvas initializing');

        // キャンバスの設定
        this.setupCanvas();

        // ドラッグ&ドロップの設定
        this.setupDragAndDrop();

        // 保存データの読み込み
        await this.loadSavedData();

        // キーボードイベント
        this.setupKeyboardEvents();

        console.log('[INFO] LinkCanvas initialization complete');
    }

    setupCanvas() {
        this.canvas.style.position = 'relative';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.overflow = 'hidden';
        this.canvas.style.backgroundColor = '#f5f5f5';

        // グリッド表示（開発時のみ）
        this.showGridLines();
    }

    setupDragAndDrop() {
        // 外部からのドロップを受け入れ
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e);
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
        });

        // キャンバス全体でのドラッグ終了
        this.canvas.addEventListener('dragend', () => {
            this.clearDragState();
        });

        // ブックマークバーからのドラッグ検知
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'A') {
                console.log('[SCAN] Drag detected from bookmark');
            }
        });
    }

    handleDragOver(e) {
        const position = this.snapToGrid(e.clientX, e.clientY);

        // ホバー中のタイル検知
        const hoveredTile = this.getTileAt(position.x, position.y);
        if (hoveredTile && this.dragState.draggedTile && hoveredTile !== this.dragState.draggedTile) {
            this.startHoverTimer(hoveredTile);
        } else {
            this.clearHoverTimer();
        }

        // ドロップ位置のプレビュー表示
        this.showDropPreview(position);
    }

    handleDrop(e) {
        const position = this.snapToGrid(e.clientX, e.clientY);

        if (this.dragState.draggedTile) {
            // 既存タイル移動（重複防止）
            const tile = this.dragState.draggedTile;

            // 移動処理
            if (tile.groupId) {
                this.moveGroupTile(tile, position);
            } else {
                tile.position = position;
                tile.element.style.left = position.x + 'px';
                tile.element.style.top = position.y + 'px';
            }

            // 見た目を元に戻す
            tile.element.style.opacity = '1';
            tile.element.classList.remove('dragging');

            console.log('[INFO] Tile moved to:', position);
        } else {
            // 新規作成の場合のみURL取得
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                this.createLinkTile(url, 'New Link', position);
                console.log('[INFO] New tile created');
            }
        }

        this.clearDragState();
        this.hideDropPreview();
        this.saveData();
    }

    startHoverTimer(targetTile) {
        if (this.dragState.hoverTimer) {
            clearTimeout(this.dragState.hoverTimer);
        }

        this.dragState.hoverTimer = setTimeout(() => {
            this.createAutoGroup(this.dragState.draggedTile, targetTile);
            console.log('[INFO] Auto-group created');
        }, 800); // 0.8秒
    }

    clearHoverTimer() {
        if (this.dragState.hoverTimer) {
            clearTimeout(this.dragState.hoverTimer);
            this.dragState.hoverTimer = null;
        }
    }

    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    createLinkTile(url, title, position) {
        const tileId = this.generateId();
        const tile = {
            id: tileId,
            url: url,
            title: this.extractTitle(title),
            position: position,
            groupId: null,
            element: null
        };

        // DOM要素作成
        tile.element = this.createTileElement(tile);
        this.canvas.appendChild(tile.element);

        // データ保存
        this.tiles.set(tileId, tile);
        this.saveData();

        return tile;
    }

    createTileElement(tile) {
        const element = document.createElement('div');
        element.className = 'link-tile';
        element.style.position = 'absolute';
        element.style.left = tile.position.x + 'px';
        element.style.top = tile.position.y + 'px';
        element.style.width = this.gridSize + 'px';
        element.style.height = this.gridSize + 'px';
        element.style.border = '1px solid #ddd';
        element.style.borderRadius = '4px';
        element.style.backgroundColor = '#fff';
        element.style.cursor = 'pointer';
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.padding = '4px';
        element.style.boxSizing = 'border-box';

        // ファビコン（ドラッグ無効化）
        const favicon = document.createElement('img');
        favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tile.url).hostname}`;
        favicon.style.width = '16px';
        favicon.style.height = '16px';
        favicon.style.marginBottom = '4px';
        favicon.draggable = false; // ← 追加：画像ドラッグを無効化
        favicon.style.pointerEvents = 'none'; // ← 追加：クリックイベントも無効化

        // タイトル
        const titleEl = document.createElement('div');
        titleEl.textContent = tile.title;
        titleEl.style.fontSize = '10px';
        titleEl.style.textAlign = 'center';
        titleEl.style.overflow = 'hidden';
        titleEl.style.lineHeight = '1.2';
        titleEl.style.userSelect = 'none'; // ← 追加：テキスト選択無効化

        element.appendChild(favicon);
        element.appendChild(titleEl);

        // イベント設定
        this.setupTileEvents(element, tile);

        return element;
    }

    setupTileEvents(element, tile) {
        // クリックでページ開く
        element.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                window.open(tile.url, '_blank');
            }
        });

        // ドラッグ開始
        element.draggable = true;
        element.addEventListener('dragstart', (e) => {
            this.dragState.isDragging = true;
            this.dragState.draggedTile = tile;
            this.dragState.startPosition = { ...tile.position };

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); // 空文字で上書き

            element.style.opacity = '0.5';
            element.classList.add('dragging');

            console.log('[SCAN] Tile drag started');
        });

        element.addEventListener('dragend', (e) => {
            element.style.opacity = '1';
            element.classList.remove('dragging');
            this.clearDragState();
        });

        // 右クリック - シンプル実装（確実に動作）
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('[INFO] Right click detected on tile:', tile.id);

            const action = confirm('タイル操作\n\nOK: タイトル変更\nキャンセル: タイル削除');

            if (action) {
                // タイトル変更
                const newTitle = prompt('新しいタイトル:', tile.title);
                if (newTitle !== null && newTitle.trim()) {
                    tile.title = newTitle.trim();
                    const titleElement = element.querySelector('div:last-child');
                    if (titleElement) {
                        titleElement.textContent = tile.title;
                    }
                    this.saveData();
                    console.log('[INFO] Tile title changed:', tile.id);
                }
            } else {
                // タイル削除
                if (confirm('このタイルを削除しますか？')) {
                    this.deleteTile(tile);
                }
            }
        });

        
    }

    // deleteTile メソッドも追加（まだない場合）
    deleteTile(tile) {
        // グループ内タイルの場合
        if (tile.groupId) {
            const groupArea = this.groups.get(tile.groupId);
            if (groupArea) {
                groupArea.removeTile(tile);
                if (groupArea.tiles.length === 0) {
                    groupArea.element.remove();
                    this.groups.delete(groupArea.id);
                }
            }
        }

        // タイル削除
        if (tile.element && tile.element.parentNode) {
            tile.element.parentNode.removeChild(tile.element);
        }
        this.tiles.delete(tile.id);
        this.saveData();

        console.log('[INFO] Tile deleted:', tile.id);
    }
    
getTileAt(x, y) {
    for (const tile of this.tiles.values()) {
        if (tile.position.x === x && tile.position.y === y) {
            return tile;
        }
    }
    return null;
}

showDropPreview(position) {
    let preview = document.getElementById('drop-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'drop-preview';
        preview.style.position = 'absolute';
        preview.style.border = '2px dashed #007acc';
        preview.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
        preview.style.width = this.gridSize + 'px';
        preview.style.height = this.gridSize + 'px';
        preview.style.pointerEvents = 'none';
        this.canvas.appendChild(preview);
    }

    preview.style.left = position.x + 'px';
    preview.style.top = position.y + 'px';
    preview.style.display = 'block';
}

hideDropPreview() {
    const preview = document.getElementById('drop-preview');
    if (preview) {
        preview.style.display = 'none';
    }
}

showGridLines() {
    const gridOverlay = document.createElement('div');
    gridOverlay.style.position = 'absolute';
    gridOverlay.style.top = '0';
    gridOverlay.style.left = '0';
    gridOverlay.style.width = '100%';
    gridOverlay.style.height = '100%';
    gridOverlay.style.pointerEvents = 'none';
    gridOverlay.style.opacity = '0.1';
    gridOverlay.style.backgroundImage = `
        linear-gradient(to right, #000 1px, transparent 1px),
        linear-gradient(to bottom, #000 1px, transparent 1px)
      `;
    gridOverlay.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;

    this.canvas.appendChild(gridOverlay);
}

clearDragState() {
    this.dragState.isDragging = false;
    this.dragState.draggedTile = null;
    this.dragState.startPosition = null;
    this.clearHoverTimer();
}

extractTitle(titleData) {
    // HTMLからテキストを抽出
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = titleData;
    return tempDiv.textContent || tempDiv.innerText || 'New Link';
}

generateId() {
    return 'tile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

    async saveData() {
    const data = {
        tiles: Array.from(this.tiles.entries()),
        groups: Array.from(this.groups.entries()),
        settings: { gridSize: this.gridSize }
    };

    try {
        await chrome.storage.sync.set({ linkCanvasData: data });
        console.log('[INFO] Data saved successfully');
    } catch (error) {
        console.log('[ERROR] Failed to save data:', error);
    }
}

    async loadSavedData() {
        try {
            const result = await chrome.storage.sync.get('linkCanvasData');
            if (result.linkCanvasData) {
                const data = result.linkCanvasData;

                console.log('[INFO] Loading data format:', Object.keys(data));

                // データ形式チェック
                if (data.tiles && Array.isArray(data.tiles)) {
                    // 新形式
                    for (const tileData of data.tiles) {
                        const tile = { ...tileData };
                        tile.element = this.createTileElement(tile);
                        this.canvas.appendChild(tile.element);
                        this.tiles.set(tile.id, tile);
                    }
                } else if (data.tiles && data.tiles.length) {
                    // 古い形式への対応
                    for (const [id, tileData] of data.tiles) {
                        const tile = { ...tileData };
                        tile.element = this.createTileElement(tile);
                        this.canvas.appendChild(tile.element);
                        this.tiles.set(id, tile);
                    }
                }

                // 設定復元
                if (data.settings) {
                    this.gridSize = data.settings.gridSize || 50;
                }

                console.log('[INFO] Data loaded successfully');
            }
        } catch (error) {
            console.log('[ERROR] Failed to load data:', error);
            // エラー時は古いデータをクリア
            await chrome.storage.sync.clear();
            console.log('[INFO] Cleared corrupted data');
        }
    }

setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && this.selectedTile) {
            this.deleteTile(this.selectedTile);
        }
    });
}
}

// 初期化
// document.addEventListener('DOMContentLoaded', () => {
//     new LinkCanvas();
// });
