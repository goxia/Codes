// Enhanced Command Converter with Microsoft Learn Integration
class EnhancedCommandConverter extends CommandConverter {
    constructor() {
        super();
        this.enhancedQuery = new EnhancedCommandQuery();
        this.suggestionEngine = new CommandSuggestionEngine();
    }

    // Main conversion method with enhanced query capabilities
    async convert(input, sourceType = 'auto') {
        try {
            if (!input || !input.trim()) {
                return { output: '', type: 'empty', suggestions: [], documentation: null };
            }

            const trimmedInput = input.trim();
            let result;

            // Auto-detect source type if not specified
            if (sourceType === 'auto') {
                sourceType = this.detectCommandType(trimmedInput);
            }

            if (sourceType === 'cmd') {
                // Try base converter first for documentation
                const baseResult = super.convert(trimmedInput, sourceType);
                if (baseResult && baseResult.output && !baseResult.output.includes('No direct')) {
                    return baseResult;
                }
                // If base converter can't handle it, use enhanced version
                result = await this.convertCmdToPowerShellEnhanced(trimmedInput);
            } else if (sourceType === 'powershell') {
                // Try base converter first for documentation  
                const baseResult = super.convert(trimmedInput, sourceType);
                if (baseResult && baseResult.output && !baseResult.output.includes('REM No direct')) {
                    return baseResult;
                }
                // If base converter can't handle it, use enhanced version
                result = await this.convertPowerShellToCmdEnhanced(trimmedInput);
            } else {
                result = {
                    output: '# Unable to determine command type',
                    type: 'unknown',
                    suggestions: [],
                    documentation: null
                };
            }

            // Add to history if conversion was successful
            if (result.type !== 'unknown' && result.type !== 'empty') {
                this.addToHistory(trimmedInput, result.output, sourceType);
            }

            return result;
            
        } catch (error) {
            console.error('Enhanced conversion error:', error);
            return {
                output: `# 转换出错: ${error.message}`,
                type: 'error',
                suggestions: [],
                documentation: null
            };
        }
    }

    // Enhanced CMD to PowerShell conversion
    async convertCmdToPowerShellEnhanced(cmdInput) {
        const suggestions = [];
        let output = '';

        // Handle multi-line input
        const commands = this.splitCommands(cmdInput, 'cmd');
        const convertedCommands = [];

        for (const cmd of commands) {
            const convertedCmd = await this.convertSingleCmdCommandEnhanced(cmd.trim());
            convertedCommands.push(convertedCmd.output);
            suggestions.push(...convertedCmd.suggestions);
        }

        output = convertedCommands.join(';\n');

        return {
            output: output,
            type: 'powershell',
            suggestions: this.removeDuplicateSuggestions(suggestions),
            originalType: 'cmd',
            documentation: null // Enhanced converter doesn't provide documentation
        };
    }

    // Enhanced single CMD command conversion with Microsoft Learn lookup
    async convertSingleCmdCommandEnhanced(cmd) {
        const baseCommand = cmd.split(' ')[0].toLowerCase();
        
        // First try local mappings (fast path)
        const localResult = this.convertSingleCmdCommandLocal(cmd);
        if (localResult.found) {
            return localResult;
        }

        // If not found locally, try enhanced query
        const queryResult = await this.enhancedQuery.queryCommand(baseCommand, 'cmd');
        
        if (queryResult.found) {
            return await this.processEnhancedQueryResult(cmd, queryResult);
        } else {
            return await this.handleUnknownCommand(cmd, 'cmd', queryResult);
        }
    }

    // Process local command conversion
    convertSingleCmdCommandLocal(cmd) {
        // Try complex patterns first
        const complexMatch = this.commandMappings.getComplexPattern(cmd);
        if (complexMatch) {
            return {
                found: true,
                output: complexMatch.result,
                suggestions: [complexMatch.description, complexMatch.example],
                documentation: this.commandMappings.getOfficialDocUrl(cmd.split(' ')[0], true),
                source: 'local_complex'
            };
        }

        // Parse command and parameters
        const words = cmd.split(' ');
        const baseCommand = words[0].toLowerCase();
        const args = words.slice(1);
        
        // Get basic mapping
        const psEquivalent = this.commandMappings.getBasicMapping(baseCommand);

        if (psEquivalent) {
            let output = psEquivalent;
            
            // Convert parameters
            if (args.length > 0) {
                const convertedParams = this.convertCmdParametersOfficial(baseCommand, args);
                if (convertedParams) {
                    output += convertedParams;
                }
            }

            const cmdDescription = this.commandMappings.getCommandDescription(baseCommand);
            
            return {
                found: true,
                output: output,
                suggestions: this.generateSuggestionsWithDocs(cmd, 'cmd', cmdDescription),
                documentation: {
                    cmd: cmdDescription?.cmdDocumentation,
                    powershell: cmdDescription?.powershellDocumentation
                },
                source: 'local_basic'
            };
        }

        return { found: false, source: 'local' };
    }

    // Process enhanced query result from Microsoft Learn
    async processEnhancedQueryResult(cmd, queryResult) {
        const suggestions = await this.suggestionEngine.generateSuggestions(cmd, 'cmd');
        
        if (queryResult.source === 'microsoft_learn') {
            // Process Microsoft Learn search results
            const conversion = await this.parseMicrosoftLearnResult(cmd, queryResult);
            return {
                output: conversion.output || `# Found documentation for '${cmd}' - see suggestions below`,
                suggestions: [
                    `Microsoft Learn documentation available for '${cmd}'`,
                    `Check: ${queryResult.documentation?.official}`,
                    ...suggestions.searchTips || []
                ],
                documentation: queryResult.documentation,
                source: 'microsoft_learn',
                searchResult: queryResult
            };
        } else {
            // Use cached or parsed result
            return {
                output: queryResult.target || `# Information found for '${cmd}'`,
                suggestions: [
                    queryResult.description,
                    ...queryResult.examples?.map(ex => `Example: ${ex.cmd} → ${ex.ps}`) || []
                ],
                documentation: queryResult.documentation,
                source: queryResult.source
            };
        }
    }

    // Handle unknown commands with intelligent suggestions
    async handleUnknownCommand(cmd, type, queryResult) {
        const suggestions = await this.suggestionEngine.generateSuggestions(cmd, type);
        
        const output = [
            `# Command '${cmd}' not found in mappings`,
            `# Suggestions:`
        ];

        if (suggestions.similarCommands && suggestions.similarCommands.length > 0) {
            output.push(`# Similar commands:`);
            for (const similar of suggestions.similarCommands) {
                output.push(`#   ${similar.command} → ${similar.target} (${similar.similarity} match)`);
            }
        }

        output.push(`# Check documentation: ${suggestions.documentationLinks?.official}`);

        return {
            output: output.join('\n'),
            suggestions: [
                `Command '${cmd}' not recognized`,
                ...suggestions.searchTips || [],
                ...suggestions.similarCommands?.map(s => `Try: ${s.command}`) || []
            ],
            documentation: suggestions.documentationLinks,
            source: 'unknown',
            similar: suggestions.similarCommands
        };
    }

    // Parse Microsoft Learn search results (placeholder for actual implementation)
    async parseMicrosoftLearnResult(cmd, queryResult) {
        // This would parse actual Microsoft Learn search results
        // and extract command syntax, parameters, examples
        
        return {
            output: `# Microsoft Learn documentation found for '${cmd}'`,
            examples: [],
            description: queryResult.description || `Command information from Microsoft Learn`
        };
    }

    // Enhanced PowerShell to CMD conversion
    async convertPowerShellToCmdEnhanced(psInput) {
        // Use base converter for the main logic
        const baseConverter = new CommandConverter();
        const baseResult = baseConverter.convertPowerShellToCmd(psInput);
        
        // Add enhanced documentation if available
        try {
            const cmdletMatch = psInput.match(/^([A-Za-z-]+)/);
            if (cmdletMatch && baseResult.output.includes('No direct CMD equivalent')) {
                const cmdletName = cmdletMatch[1].toLowerCase();
                const queryResult = await this.enhancedQuery.queryCommand(cmdletName, 'powershell');
                if (queryResult.found && queryResult.documentation) {
                    baseResult.suggestions.push(`📚 Documentation: ${queryResult.documentation.official}`);
                }
            }
        } catch (error) {
            console.warn('Could not fetch enhanced documentation:', error);
        }
        
        return baseResult;
    }

    // Enhanced single PowerShell command conversion
    async convertSinglePowerShellCommandEnhanced(psCmd) {
        // Use the base converter for the actual conversion logic
        const baseConverter = new CommandConverter();
        const result = baseConverter.convertSinglePowerShellCommand(psCmd);
        
        // Add enhanced suggestions if available
        const cmdletMatch = psCmd.match(/^([A-Za-z-]+)/);
        const cmdletName = cmdletMatch ? cmdletMatch[1].toLowerCase() : '';
        
        // Try to get additional documentation if command was not found
        if (result.output.includes('No direct CMD equivalent')) {
            try {
                const queryResult = await this.enhancedQuery.queryCommand(cmdletName, 'powershell');
                if (queryResult.found && queryResult.documentation) {
                    result.suggestions.push(`Documentation: ${queryResult.documentation.official}`);
                    result.documentation = queryResult.documentation;
                }
            } catch (error) {
                console.warn('Could not fetch enhanced documentation:', error);
            }
        }
        
        return result;
    }

    // Find CMD equivalent for PowerShell cmdlet (reverse lookup)
    findCmdEquivalent(cmdletName) {
        const reverseMappings = {
            'get-childitem': 'dir',
            'set-location': 'cd',
            'copy-item': 'copy',
            'remove-item': 'del',
            'new-item': 'md',
            'get-content': 'type',
            'select-string': 'find',
            'clear-host': 'cls',
            'write-host': 'echo',
            'get-process': 'tasklist',
            'stop-process': 'taskkill',
            'test-netconnection': 'ping',
            'get-netip': 'ipconfig'
        };

        return reverseMappings[cmdletName] || null;
    }

    // Detect command type (same as original)
    detectCommandType(input) {
        const lowerInput = input.toLowerCase();
        
        const psIndicators = [
            'get-', 'set-', 'new-', 'remove-', 'start-', 'stop-',
            'invoke-', 'test-', 'select-', 'where-', 'sort-',
            '$', '|', '-path', '-name', '-filter', '-recurse',
            'foreach-object', 'where-object'
        ];

        const cmdIndicators = [
            'dir', 'cd', 'copy', 'del', 'move', 'ren', 'md', 'rd',
            'type', 'find', 'tasklist', 'taskkill', 'ping', 'ipconfig',
            'net ', 'reg ', 'echo', 'cls', 'exit', '/s', '/q', '/f'
        ];

        let psScore = 0;
        let cmdScore = 0;

        for (const indicator of psIndicators) {
            if (lowerInput.includes(indicator)) {
                psScore += indicator.startsWith('$') || indicator === '|' ? 3 : 2;
            }
        }

        for (const indicator of cmdIndicators) {
            if (lowerInput.includes(indicator)) {
                cmdScore += 2;
            }
        }

        if (input.match(/^[a-zA-Z-]+\s+-\w+/)) psScore += 3;
        if (input.match(/\s+\/\w+/)) cmdScore += 2;
        if (input.includes('\\')) cmdScore += 1;
        if (input.includes('"') && input.includes('-')) psScore += 1;

        return psScore > cmdScore ? 'powershell' : 'cmd';
    }

    // Utility methods (kept from original converter)
    splitCommands(input, type) {
        if (type === 'cmd') {
            return input.split(/\s*&&\s*|\s*&\s*/).filter(cmd => cmd.trim());
        } else {
            return input.split(/\s*;\s*/).filter(cmd => cmd.trim());
        }
    }

    removeDuplicateSuggestions(suggestions) {
        return [...new Set(suggestions)];
    }

    // Parameter conversion methods (from original)
    convertCmdParametersOfficial(command, args) {
        const paramMappings = this.commandMappings.getParameterMappings(command);
        if (!paramMappings) return ' ' + args.join(' ');

        let result = '';
        let i = 0;

        while (i < args.length) {
            const arg = args[i];
            
            if (arg.startsWith('/')) {
                const mapping = paramMappings[arg.toLowerCase()];
                if (mapping) {
                    result += ' ' + mapping;
                } else {
                    result += ' ' + arg; // Keep unmapped parameters
                }
            } else {
                // Handle paths and arguments
                if (arg.includes(' ') && !arg.startsWith('"')) {
                    result += ' "' + arg + '"';
                } else {
                    result += ' ' + arg;
                }
            }
            i++;
        }

        return result;
    }

    generateSuggestionsWithDocs(originalCmd, type, description) {
        const suggestions = [];
        
        if (description) {
            suggestions.push(description.description);
            if (description.examples && description.examples.length > 0) {
                suggestions.push(`Example: ${description.examples[0]}`);
            }
        }

        suggestions.push(`Original ${type.toUpperCase()} command: ${originalCmd}`);
        
        return suggestions;
    }

    // History management (from original converter)
    async loadHistory() {
        try {
            if (typeof window !== 'undefined' && window.StorageManager) {
                const history = await window.StorageManager.loadHistory();
                if (Array.isArray(history)) {
                    this.conversionHistory = history;
                } else {
                    console.warn('Invalid history format, initializing empty array');
                    this.conversionHistory = [];
                }
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.conversionHistory = [];
        }
    }

    addToHistory(input, output, sourceType) {
        try {
            if (!Array.isArray(this.conversionHistory)) {
                console.warn('conversionHistory is not an array, reinitializing...');
                this.conversionHistory = [];
            }
            
            const historyItem = {
                id: Date.now(),
                input: input,
                output: output,
                sourceType: sourceType,
                targetType: sourceType === 'cmd' ? 'powershell' : 'cmd',
                timestamp: new Date()
            };

            this.conversionHistory.unshift(historyItem);
            
            if (this.conversionHistory.length > 50) {
                this.conversionHistory = this.conversionHistory.slice(0, 50);
            }

            if (typeof window !== 'undefined' && window.StorageManager) {
                window.StorageManager.saveHistory(this.conversionHistory);
            }
        } catch (error) {
            console.error('Error adding to history:', error);
            this.conversionHistory = [];
        }
    }

    getHistory() {
        return this.conversionHistory;
    }

    clearHistory() {
        this.conversionHistory = [];
        if (typeof window !== 'undefined' && window.StorageManager) {
            window.StorageManager.saveHistory([]);
        }
    }

    // Get command examples
    getExamples() {
        return this.commandMappings.getExamples();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCommandConverter;
}