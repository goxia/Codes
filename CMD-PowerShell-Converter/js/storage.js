// Storage manager for handling IndexedDB operations
class StorageManager {
    constructor() {
        this.dbName = 'CmdPowerShellConverter';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
    }

    // Initialize IndexedDB
    async init() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;

                // Create object stores
                this.createObjectStores();
            };
        });
    }

    // Create object stores for the database
    createObjectStores() {
        // History store
        if (!this.db.objectStoreNames.contains('history')) {
            const historyStore = this.db.createObjectStore('history', { keyPath: 'id' });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
            historyStore.createIndex('sourceType', 'sourceType', { unique: false });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains('settings')) {
            const settingsStore = this.db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Custom commands store
        if (!this.db.objectStoreNames.contains('customCommands')) {
            const customStore = this.db.createObjectStore('customCommands', { keyPath: 'id', autoIncrement: true });
            customStore.createIndex('cmdCommand', 'cmdCommand', { unique: false });
            customStore.createIndex('psCommand', 'psCommand', { unique: false });
        }

        // Favorites store
        if (!this.db.objectStoreNames.contains('favorites')) {
            const favoritesStore = this.db.createObjectStore('favorites', { keyPath: 'id', autoIncrement: true });
            favoritesStore.createIndex('command', 'command', { unique: false });
            favoritesStore.createIndex('type', 'type', { unique: false });
        }
    }

    // Save conversion history
    async saveHistory(historyArray) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');

            // Clear existing history first
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Add new history items
                let completed = 0;
                const total = historyArray.length;

                if (total === 0) {
                    resolve();
                    return;
                }

                historyArray.forEach(item => {
                    const addRequest = store.add(item);
                    
                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    };
                    
                    addRequest.onerror = () => {
                        console.error('Error saving history item:', addRequest.error);
                        reject(addRequest.error);
                    };
                });
            };

            clearRequest.onerror = () => {
                reject(clearRequest.error);
            };
        });
    }

    // Load conversion history
    async loadHistory() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('timestamp');
            
            const request = index.getAll();

            request.onsuccess = () => {
                const history = request.result;
                // Sort by timestamp descending (newest first)
                history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(history);
            };

            request.onerror = () => {
                console.error('Error loading history:', request.error);
                reject(request.error);
            };
        });
    }

    // Clear history
    async clearHistory() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Save application settings
    async saveSetting(key, value) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key: key, value: value, timestamp: new Date() });

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Load application setting
    async loadSetting(key, defaultValue = null) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.value);
                } else {
                    resolve(defaultValue);
                }
            };

            request.onerror = () => {
                console.error('Error loading setting:', request.error);
                resolve(defaultValue);
            };
        });
    }

    // Save custom command mapping
    async saveCustomCommand(cmdCommand, psCommand, description = '') {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customCommands'], 'readwrite');
            const store = transaction.objectStore('customCommands');
            
            const customCommand = {
                cmdCommand: cmdCommand,
                psCommand: psCommand,
                description: description,
                created: new Date(),
                isCustom: true
            };

            const request = store.add(customCommand);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Load custom commands
    async loadCustomCommands() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customCommands'], 'readonly');
            const store = transaction.objectStore('customCommands');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error loading custom commands:', request.error);
                reject(request.error);
            };
        });
    }

    // Delete custom command
    async deleteCustomCommand(id) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customCommands'], 'readwrite');
            const store = transaction.objectStore('customCommands');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Save favorite command
    async saveFavorite(command, type, description = '') {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites'], 'readwrite');
            const store = transaction.objectStore('favorites');
            
            const favorite = {
                command: command,
                type: type,
                description: description,
                created: new Date()
            };

            const request = store.add(favorite);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Load favorites
    async loadFavorites() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites'], 'readonly');
            const store = transaction.objectStore('favorites');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error loading favorites:', request.error);
                reject(request.error);
            };
        });
    }

    // Delete favorite
    async deleteFavorite(id) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['favorites'], 'readwrite');
            const store = transaction.objectStore('favorites');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Get storage usage statistics
    async getStorageStats() {
        if (!this.isInitialized) await this.init();

        try {
            const [history, settings, customCommands, favorites] = await Promise.all([
                this.loadHistory(),
                this.getAllSettings(),
                this.loadCustomCommands(),
                this.loadFavorites()
            ]);

            return {
                history: history.length,
                settings: Object.keys(settings).length,
                customCommands: customCommands.length,
                favorites: favorites.length,
                totalItems: history.length + Object.keys(settings).length + customCommands.length + favorites.length
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                history: 0,
                settings: 0,
                customCommands: 0,
                favorites: 0,
                totalItems: 0
            };
        }
    }

    // Get all settings (for stats)
    async getAllSettings() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = () => {
                const settingsObj = {};
                request.result.forEach(item => {
                    settingsObj[item.key] = item.value;
                });
                resolve(settingsObj);
            };

            request.onerror = () => {
                console.error('Error loading all settings:', request.error);
                reject(request.error);
            };
        });
    }

    // Export all data for backup
    async exportData() {
        if (!this.isInitialized) await this.init();

        try {
            const [history, settings, customCommands, favorites] = await Promise.all([
                this.loadHistory(),
                this.getAllSettings(),
                this.loadCustomCommands(),
                this.loadFavorites()
            ]);

            return {
                version: this.dbVersion,
                exportDate: new Date(),
                data: {
                    history,
                    settings,
                    customCommands,
                    favorites
                }
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    // Import data from backup
    async importData(exportedData) {
        if (!this.isInitialized) await this.init();

        try {
            const data = exportedData.data;
            
            // Import each type of data
            if (data.history && data.history.length > 0) {
                await this.saveHistory(data.history);
            }

            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.saveSetting(key, value);
                }
            }

            if (data.customCommands && data.customCommands.length > 0) {
                for (const cmd of data.customCommands) {
                    await this.saveCustomCommand(cmd.cmdCommand, cmd.psCommand, cmd.description);
                }
            }

            if (data.favorites && data.favorites.length > 0) {
                for (const fav of data.favorites) {
                    await this.saveFavorite(fav.command, fav.type, fav.description);
                }
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    // Clear all data
    async clearAllData() {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history', 'settings', 'customCommands', 'favorites'], 'readwrite');
            
            const promises = [
                this.clearStore(transaction, 'history'),
                this.clearStore(transaction, 'settings'),
                this.clearStore(transaction, 'customCommands'),
                this.clearStore(transaction, 'favorites')
            ];

            Promise.all(promises)
                .then(() => resolve())
                .catch(error => reject(error));
        });
    }

    // Helper method to clear a store
    clearStore(transaction, storeName) {
        return new Promise((resolve, reject) => {
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Check if IndexedDB is supported
    static isSupported() {
        return 'indexedDB' in window;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.StorageManager = new StorageManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}