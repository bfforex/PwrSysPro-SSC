/**
 * results_store.js
 * Results Storage Singleton - localStorage-backed persistent storage
 * Stores last calculation results for export and retrieval
 */

/**
 * ResultsStore Singleton Class
 * Manages persistent storage of calculation results
 */
class ResultsStore {
    constructor() {
        if (ResultsStore.instance) {
            return ResultsStore.instance;
        }
        
        this.storageKey = 'pwrsyspro_last_results';
        this.metadataKey = 'pwrsyspro_results_metadata';
        ResultsStore.instance = this;
    }
    
    /**
     * Store calculation results
     * @param {Object} results - Calculation results object
     */
    saveResults(results) {
        try {
            // Add timestamp if not present
            if (!results.timestamp) {
                results.timestamp = new Date().toISOString();
            }
            
            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(results));
            
            // Save metadata
            const metadata = {
                lastSaved: results.timestamp,
                hasShortCircuit: !!results.shortCircuit,
                hasVoltageDrop: !!results.voltageDrop,
                hasArcFlash: !!results.arcFlash,
                hasMotorContribution: !!results.motorContribution,
                busCount: results.topology?.buses?.length || 0
            };
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
            
            console.log('[ResultsStore] Results saved successfully:', metadata);
            return true;
        } catch (error) {
            console.error('[ResultsStore] Failed to save results:', error);
            return false;
        }
    }
    
    /**
     * Retrieve stored results
     * @returns {Object|null} - Stored results or null
     */
    getResults() {
        try {
            const storedData = localStorage.getItem(this.storageKey);
            if (!storedData) {
                console.log('[ResultsStore] No stored results found');
                return null;
            }
            
            const results = JSON.parse(storedData);
            console.log('[ResultsStore] Results retrieved successfully');
            return results;
        } catch (error) {
            console.error('[ResultsStore] Failed to retrieve results:', error);
            return null;
        }
    }
    
    /**
     * Get metadata about stored results
     * @returns {Object|null} - Metadata or null
     */
    getMetadata() {
        try {
            const metadataStr = localStorage.getItem(this.metadataKey);
            if (!metadataStr) {
                return null;
            }
            return JSON.parse(metadataStr);
        } catch (error) {
            console.error('[ResultsStore] Failed to retrieve metadata:', error);
            return null;
        }
    }
    
    /**
     * Check if results exist
     * @returns {boolean}
     */
    hasResults() {
        return !!localStorage.getItem(this.storageKey);
    }
    
    /**
     * Clear stored results
     */
    clearResults() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.metadataKey);
            console.log('[ResultsStore] Results cleared');
            return true;
        } catch (error) {
            console.error('[ResultsStore] Failed to clear results:', error);
            return false;
        }
    }
    
    /**
     * Get storage size in KB
     * @returns {number}
     */
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return 0;
            return (new Blob([data]).size / 1024).toFixed(2);
        } catch (error) {
            return 0;
        }
    }
}

// Create singleton instance
const resultsStore = new ResultsStore();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.ResultsStore = ResultsStore;
    window.resultsStore = resultsStore;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ResultsStore,
        resultsStore
    };
}
