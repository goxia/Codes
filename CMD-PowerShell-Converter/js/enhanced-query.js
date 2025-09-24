// Enhanced Command Query System with Microsoft Learn Integration
// Handles both local mappings and dynamic documentation lookup

class EnhancedCommandQuery {
    constructor() {
        this.cache = new Map(); // Cache for searched commands
        this.searchInProgress = new Set(); // Track ongoing searches
    }

    /**
     * Main query method - tries local mapping first, then searches Microsoft Learn
     * @param {string} command - The command to query
     * @param {string} type - 'cmd' or 'powershell'
     * @returns {Promise<Object>} - Command conversion result
     */
    async queryCommand(command, type = 'cmd') {
        const normalizedCommand = this.normalizeCommand(command);
        const cacheKey = `${type}:${normalizedCommand}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Check if search is already in progress
        if (this.searchInProgress.has(cacheKey)) {
            return this.waitForSearch(cacheKey);
        }

        // Try local mapping first (fast path)
        const localResult = this.queryLocalMapping(normalizedCommand, type);
        if (localResult.found) {
            this.cache.set(cacheKey, localResult);
            return localResult;
        }

        // If not found locally, search Microsoft Learn
        return await this.searchMicrosoftLearn(normalizedCommand, type, cacheKey);
    }

    /**
     * Normalize command for consistent matching
     */
    normalizeCommand(command) {
        return command.toLowerCase().trim().split(/\s+/)[0]; // Extract base command
    }

    /**
     * Query existing local mappings
     */
    queryLocalMapping(command, type) {
        const commandMappings = new CommandMappings();
        
        if (type === 'cmd') {
            const mapping = commandMappings.basicMappings[command];
            if (mapping) {
                return {
                    found: true,
                    source: 'local',
                    command: command,
                    target: mapping,
                    type: 'cmd_to_powershell',
                    documentation: commandMappings.officialDocs[command] || null,
                    description: this.getLocalDescription(command),
                    examples: this.getLocalExamples(command)
                };
            }
        }

        return { found: false, source: 'local' };
    }

    /**
     * Search Microsoft Learn documentation
     */
    async searchMicrosoftLearn(command, type, cacheKey) {
        try {
            this.searchInProgress.add(cacheKey);
            
            const searchQuery = type === 'cmd' 
                ? `${command} command windows server administration`
                : `${command} powershell cmdlet module`;

            // Use the Microsoft documentation search tool if available
            if (typeof window !== 'undefined' && window.mcp_microsoft_doc_microsoft_docs_search) {
                const searchResults = await this.performDocumentationSearch(searchQuery, type);
                const result = this.parseSearchResults(command, type, searchResults);
                
                this.cache.set(cacheKey, result);
                this.searchInProgress.delete(cacheKey);
                return result;
            }

            // Fallback: return partial result with suggestion to check documentation
            const fallbackResult = {
                found: false,
                source: 'fallback',
                command: command,
                type: type,
                suggestion: `Command "${command}" not found in local mappings. Please check:`,
                documentationLinks: this.getDocumentationLinks(command, type),
                searchQuery: searchQuery
            };

            this.cache.set(cacheKey, fallbackResult);
            this.searchInProgress.delete(cacheKey);
            return fallbackResult;

        } catch (error) {
            console.error('Error searching Microsoft Learn:', error);
            this.searchInProgress.delete(cacheKey);
            
            return {
                found: false,
                source: 'error',
                command: command,
                error: error.message,
                suggestion: `Unable to search for "${command}". Try checking the documentation manually.`,
                documentationLinks: this.getDocumentationLinks(command, type)
            };
        }
    }

    /**
     * Perform actual documentation search
     */
    async performDocumentationSearch(query, type) {
        // This would integrate with Microsoft Learn search API
        // For now, return a structured response that can be implemented
        return {
            query: query,
            type: type,
            results: [], // Would be populated by actual search
            timestamp: new Date()
        };
    }

    /**
     * Parse search results into structured command info
     */
    parseSearchResults(command, type, searchResults) {
        // Parse Microsoft Learn search results
        // Extract command syntax, parameters, examples
        
        return {
            found: true,
            source: 'microsoft_learn',
            command: command,
            type: type,
            searchResults: searchResults,
            parsed: true,
            // These would be extracted from actual search results
            target: null,
            description: `Information for ${command} found in Microsoft documentation`,
            examples: [],
            documentation: this.getDocumentationLinks(command, type)
        };
    }

    /**
     * Wait for ongoing search to complete
     */
    async waitForSearch(cacheKey) {
        return new Promise((resolve) => {
            const checkSearch = () => {
                if (!this.searchInProgress.has(cacheKey)) {
                    resolve(this.cache.get(cacheKey));
                } else {
                    setTimeout(checkSearch, 100);
                }
            };
            checkSearch();
        });
    }

    /**
     * Get local command description
     */
    getLocalDescription(command) {
        const descriptions = {
            'dir': 'Displays a list of files and subdirectories in a directory',
            'cd': 'Changes the current directory or displays the current directory name',
            'copy': 'Copies one or more files to another location',
            'del': 'Deletes one or more files',
            'md': 'Creates a directory or subdirectory',
            'type': 'Displays the contents of a text file',
            'find': 'Searches for a text string in a file or files',
            'ping': 'Tests network connectivity to a host',
            'ipconfig': 'Displays network configuration information',
            'tasklist': 'Displays currently running processes',
            'systeminfo': 'Displays detailed system configuration information'
        };
        
        return descriptions[command] || `${command} command`;
    }

    /**
     * Get local command examples
     */
    getLocalExamples(command) {
        const examples = {
            'dir': [
                { cmd: 'dir', ps: 'Get-ChildItem', description: 'List files in current directory' },
                { cmd: 'dir /s', ps: 'Get-ChildItem -Recurse', description: 'List files recursively' },
                { cmd: 'dir *.txt', ps: 'Get-ChildItem -Filter "*.txt"', description: 'List .txt files only' }
            ],
            'cd': [
                { cmd: 'cd Documents', ps: 'Set-Location Documents', description: 'Change to Documents folder' },
                { cmd: 'cd ..', ps: 'Set-Location ..', description: 'Go to parent directory' },
                { cmd: 'cd \\', ps: 'Set-Location \\', description: 'Go to root directory' }
            ],
            'copy': [
                { cmd: 'copy file1.txt file2.txt', ps: 'Copy-Item file1.txt file2.txt', description: 'Copy a file' },
                { cmd: 'copy *.txt backup\\', ps: 'Copy-Item *.txt backup\\', description: 'Copy all .txt files' }
            ]
        };
        
        return examples[command] || [];
    }

    /**
     * Get documentation links for commands
     */
    getDocumentationLinks(command, type) {
        if (type === 'cmd') {
            return {
                official: `https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/${command}`,
                search: `https://learn.microsoft.com/en-us/search/?terms=${command}%20windows%20command`,
                category: 'Windows Commands'
            };
        } else {
            return {
                official: `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/${command}`,
                search: `https://learn.microsoft.com/en-us/search/?terms=${command}%20powershell%20cmdlet`,
                category: 'PowerShell Cmdlets'
            };
        }
    }

    /**
     * Clear cache (for memory management)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
            searches: this.searchInProgress.size
        };
    }
}

// Intelligent Command Suggestion System
class CommandSuggestionEngine {
    constructor() {
        this.commandQuery = new EnhancedCommandQuery();
    }

    /**
     * Generate intelligent suggestions for unknown commands
     */
    async generateSuggestions(input, type = 'cmd') {
        const command = this.extractCommand(input);
        const result = await this.commandQuery.queryCommand(command, type);
        
        if (result.found) {
            return this.formatKnownCommandSuggestion(result, input);
        } else {
            return this.formatUnknownCommandSuggestion(command, input, type);
        }
    }

    /**
     * Extract base command from input
     */
    extractCommand(input) {
        return input.trim().split(/\s+/)[0].toLowerCase();
    }

    /**
     * Format suggestion for known commands
     */
    formatKnownCommandSuggestion(result, originalInput) {
        return {
            found: true,
            original: originalInput,
            suggestion: result.target,
            description: result.description,
            examples: result.examples,
            documentation: result.documentation,
            source: result.source
        };
    }

    /**
     * Format suggestion for unknown commands
     */
    formatUnknownCommandSuggestion(command, originalInput, type) {
        const similarCommands = this.findSimilarCommands(command);
        
        return {
            found: false,
            original: originalInput,
            command: command,
            type: type,
            similarCommands: similarCommands,
            suggestion: `Command "${command}" not recognized. Try one of the similar commands or check the documentation.`,
            documentationLinks: this.commandQuery.getDocumentationLinks(command, type),
            searchTips: [
                `Try searching for "${command}" in Microsoft Learn`,
                `Check if the command name is spelled correctly`,
                `Look for similar commands in the suggestions below`
            ]
        };
    }

    /**
     * Find similar commands using fuzzy matching
     */
    findSimilarCommands(command) {
        const commandMappings = new CommandMappings();
        const allCommands = Object.keys(commandMappings.basicMappings);
        
        return allCommands
            .map(cmd => ({
                command: cmd,
                similarity: this.calculateSimilarity(command, cmd)
            }))
            .filter(item => item.similarity > 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5)
            .map(item => ({
                command: item.command,
                target: commandMappings.basicMappings[item.command],
                similarity: Math.round(item.similarity * 100) + '%'
            }));
    }

    /**
     * Calculate string similarity (Levenshtein distance based)
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedCommandQuery, CommandSuggestionEngine };
}