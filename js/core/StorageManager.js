class StorageManager {
    constructor() {
        this.storageKey = 'linkCanvasData';
        this.init();
    }

    init() {
        console.log('[INIT] StorageManager initialized');
    }

    // saveDataメソッドを以下に置換：
    async saveData(tiles, groups, settings = {}) {
        try {
            const data = {
                version: '2.0.0',
                timestamp: Date.now(),
                tiles: this.serializeTiles(tiles),
                groups: this.serializeGroups(groups),
                settings: settings,
                metadata: {
                    totalTiles: tiles.size,
                    totalGroups: groups.size
                }
            };

            // chrome.storage.local に変更（大容量対応）
            await chrome.storage.local.set({ [this.storageKey]: data });
            console.log('[INFO] Data saved to local storage - Size:', JSON.stringify(data).length, 'bytes');
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to save data:', error);
            return false;
        }
    }

    // loadDataメソッドを以下に置換：
    async loadData() {
        try {
            // chrome.storage.local から読み込み
            const result = await chrome.storage.local.get([this.storageKey]);
            if (result[this.storageKey]) {
                console.log('[INFO] Data loaded from local storage');
                return result[this.storageKey];
            }

            // 旧データがsyncにある場合は移行
            const syncResult = await chrome.storage.sync.get([this.storageKey]);
            if (syncResult[this.storageKey]) {
                console.log('[INFO] Migrating data from sync to local storage');
                const data = syncResult[this.storageKey];

                // localに保存
                await chrome.storage.local.set({ [this.storageKey]: data });

                // syncから削除（容量節約）
                await chrome.storage.sync.remove([this.storageKey]);

                return data;
            }

            console.log('[INFO] No saved data found');
            return null;

        } catch (error) {
            console.log('[ERROR] Failed to load data:', error);
            return null;
        }
    }

    // clearAllDataメソッドも修正：
    async clearAllData() {
        try {
            await chrome.storage.local.remove([this.storageKey]);
            await chrome.storage.sync.remove([this.storageKey]); // 念のため
            console.log('[INFO] All data cleared from both storages');
            return true;
        } catch (error) {
            console.log('[ERROR] Failed to clear data:', error);
            return false;
        }
    }


    serializeTiles(tilesMap) {
        const tiles = [];
        for (const [id, tile] of tilesMap) {
            tiles.push({
                id: tile.id,
                url: tile.url,
                title: tile.title,
                position: tile.position,
                groupId: tile.groupId || null,
                relativePosition: tile.relativePosition || null
            });
        }
        return tiles;
    }

    serializeGroups(groupsMap) {
        const groups = [];
        for (const [id, group] of groupsMap) {
            groups.push({
                id: group.id,
                color: group.color,
                name: group.name,
                position: group.position,
                size: group.size,
                isExpanded: group.isExpanded,
                tileIds: group.tiles.map(tile => tile.id)
            });
        }
        return groups;
    }

    async clearAllData() {
        try {
            await chrome.storage.sync.remove([this.storageKey]);
            console.log('[INFO] All data cleared');
            return true;
        } catch (error) {
            console.log('[ERROR] Failed to clear data:', error);
            return false;
        }
    }
}

