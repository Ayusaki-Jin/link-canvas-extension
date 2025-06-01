class StorageManager {
    constructor() {
        this.storageKey = 'linkCanvasData';
        this.init();
    }

    init() {
        console.log('[INIT] StorageManager initialized');
    }

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

            await chrome.storage.sync.set({ [this.storageKey]: data });
            console.log('[INFO] Data saved successfully');
            return true;

        } catch (error) {
            console.log('[ERROR] Failed to save data:', error);
            return false;
        }
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get([this.storageKey]);
            if (result[this.storageKey]) {
                console.log('[INFO] Data loaded successfully');
                return result[this.storageKey];
            }
            console.log('[INFO] No saved data found');
            return null;

        } catch (error) {
            console.log('[ERROR] Failed to load data:', error);
            return null;
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
