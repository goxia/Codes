// Command converter engine - handles the actual conversion logic
class CommandConverter {
    constructor() {
        this.commandMappings = new CommandMappings();
        this.conversionHistory = [];
    }

    // Main conversion method - determines direction and converts
    convert(input, sourceType = 'auto') {
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
                result = this.convertCmdToPowerShell(trimmedInput);
            } else if (sourceType === 'powershell') {
                result = this.convertPowerShellToCmd(trimmedInput);
            } else {
                result = {
                    output: '# Unable to determine command type',
                    type: 'unknown',
                    suggestions: []
                };
            }

            // Add to history if conversion was successful
            if (result.type !== 'unknown' && result.type !== 'empty') {
                this.addToHistory(trimmedInput, result.output, sourceType);
            }

            return result;
            
        } catch (error) {
            console.error('Conversion error:', error);
            return {
                output: `# 转换出错: ${error.message}`,
                type: 'error',
                suggestions: []
            };
        }
    }

    // Detect whether input is CMD or PowerShell
    detectCommandType(input) {
        const lowerInput = input.toLowerCase();
        
        // PowerShell indicators
        const psIndicators = [
            'get-', 'set-', 'new-', 'remove-', 'start-', 'stop-',
            'invoke-', 'test-', 'select-', 'where-', 'sort-',
            '$', '|', '-path', '-name', '-filter', '-recurse',
            'foreach-object', 'where-object'
        ];

        // CMD indicators
        const cmdIndicators = [
            'dir', 'cd', 'copy', 'del', 'move', 'ren', 'md', 'rd',
            'type', 'find', 'tasklist', 'taskkill', 'ping', 'ipconfig',
            'net ', 'reg ', 'echo', 'cls', 'exit', '/s', '/q', '/f'
        ];

        let psScore = 0;
        let cmdScore = 0;

        // Score based on indicators
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

        // Additional scoring based on syntax patterns
        if (input.match(/^[a-zA-Z-]+\s+-\w+/)) psScore += 3; // PowerShell parameter syntax
        if (input.match(/\s+\/\w+/)) cmdScore += 2; // CMD switch syntax
        if (input.includes('\\')) cmdScore += 1; // Windows paths more common in CMD
        if (input.includes('"') && input.includes('-')) psScore += 1;

        return psScore > cmdScore ? 'powershell' : 'cmd';
    }

    // Convert CMD command to PowerShell
    convertCmdToPowerShell(cmdInput) {
        const suggestions = [];
        let output = '';

        // Handle multi-line input (commands separated by && or &)
        const commands = this.splitCommands(cmdInput, 'cmd');
        const convertedCommands = [];

        for (const cmd of commands) {
            const convertedCmd = this.convertSingleCmdCommand(cmd.trim());
            convertedCommands.push(convertedCmd.output);
            suggestions.push(...convertedCmd.suggestions);
        }

        output = convertedCommands.join(';\n');

        return {
            output: output,
            type: 'powershell',
            suggestions: this.removeDuplicateSuggestions(suggestions),
            originalType: 'cmd'
        };
    }

    // Convert single CMD command using official Microsoft documentation mappings
    convertSingleCmdCommand(cmd) {
        const suggestions = [];
        
        // Try complex patterns first (based on official CMD documentation)
        const complexMatch = this.commandMappings.getComplexPattern(cmd);
        if (complexMatch) {
            return {
                output: complexMatch.result,
                suggestions: [complexMatch.description, complexMatch.example],
                documentation: this.commandMappings.getOfficialDocUrl(cmd.split(' ')[0], true)
            };
        }

        // Parse command and parameters
        const words = cmd.split(' ');
        const baseCommand = words[0].toLowerCase();
        const args = words.slice(1);
        
        // Get basic mapping from official documentation
        const psEquivalent = this.commandMappings.getBasicMapping(baseCommand);

        if (psEquivalent) {
            let output = psEquivalent;
            
            // Convert parameters using official parameter mappings
            if (args.length > 0) {
                const convertedParams = this.convertCmdParametersOfficial(baseCommand, args);
                if (convertedParams) {
                    output += convertedParams;
                }
            }

            const cmdDescription = this.commandMappings.getCommandDescription(baseCommand);
            
            return {
                output: output,
                suggestions: this.generateSuggestionsWithDocs(cmd, 'cmd', cmdDescription),
                documentation: {
                    cmd: cmdDescription?.cmdDocumentation,
                    powershell: cmdDescription?.powershellDocumentation
                }
            };
        }

        // If no mapping found, provide explanation with documentation reference
        const docUrl = this.commandMappings.getOfficialDocUrl(baseCommand, true);
        return {
            output: `# No direct PowerShell equivalent found for: ${cmd}\n# See official documentation: ${docUrl || 'https://learn.microsoft.com/en-us/powershell/'}`,
            suggestions: [`Command '${baseCommand}' not found in official mappings`, 'Try Get-Help or search PowerShell documentation'],
            documentation: { cmd: docUrl }
        };
    }

    // Convert PowerShell command to CMD
    convertPowerShellToCmd(psInput) {
        const suggestions = [];
        let output = '';

        // Handle pipelines and multiple commands
        const commands = this.splitCommands(psInput, 'powershell');
        const convertedCommands = [];

        for (const cmd of commands) {
            const convertedCmd = this.convertSinglePowerShellCommand(cmd.trim());
            convertedCommands.push(convertedCmd.output);
            suggestions.push(...convertedCmd.suggestions);
        }

        output = convertedCommands.join(' && ');

        return {
            output: output,
            type: 'cmd',
            suggestions: this.removeDuplicateSuggestions(suggestions),
            originalType: 'powershell'
        };
    }

    // Convert single PowerShell command
    convertSinglePowerShellCommand(psCmd) {
        // Handle common PowerShell patterns first (they have better parameter handling)
        if (psCmd.includes('Get-ChildItem')) {
            return this.convertGetChildItemToDir(psCmd);
        } else if (psCmd.includes('Remove-Item')) {
            return this.convertRemoveItemToDel(psCmd);
        } else if (psCmd.includes('Copy-Item')) {
            return this.convertCopyItemToCopy(psCmd);
        }

        // Extract the main cmdlet
        const words = psCmd.split(' ');
        const mainCmdlet = words[0];
        
        // Try reverse mapping for simple commands
        const cmdEquivalent = this.commandMappings.getReverseMapping(mainCmdlet);
        
        if (cmdEquivalent) {
            let output = cmdEquivalent;
            const params = words.slice(1).join(' ');
            
            if (params) {
                output += this.convertPowerShellParameters(params);
            }

            return {
                output: output,
                suggestions: this.generateSuggestions(psCmd, 'powershell'),
                documentation: {
                    cmd: this.commandMappings.getOfficialDocUrl(cmdEquivalent, true),
                    powershell: this.commandMappings.getOfficialDocUrl(mainCmdlet, false)
                }
            };
        }

        return {
            output: `REM No direct CMD equivalent for: ${psCmd}`,
            suggestions: [`PowerShell command '${psCmd}' has no direct CMD equivalent`, 'Consider using PowerShell for this functionality'],
            documentation: {
                cmd: null,
                powershell: this.commandMappings.getOfficialDocUrl(mainCmdlet, false)
            }
        };
    }

    // Convert Get-ChildItem to DIR
    convertGetChildItemToDir(psCmd) {
        let dirCmd = 'dir';
        
        // Extract path (can be without -Path parameter)
        // Match patterns like: Get-ChildItem c:\ -Force
        const pathPattern1 = psCmd.match(/Get-ChildItem\s+([^\s-]+)/i); // Direct path
        const pathPattern2 = psCmd.match(/-Path\s+"?([^"\s-]+)"?/i); // -Path parameter
        
        let path = '';
        if (pathPattern1) {
            path = pathPattern1[1];
        } else if (pathPattern2) {
            path = pathPattern2[1];
        }
        
        // Add path to command
        if (path) {
            dirCmd += ` ${path}`;
        }
        
        // Add parameters
        if (psCmd.includes('-Recurse')) dirCmd += ' /s';
        if (psCmd.includes('-Force')) dirCmd += ' /a';
        if (psCmd.includes('-Hidden')) dirCmd += ' /ah';
        
        // Extract filter
        const filterMatch = psCmd.match(/-Filter\s+"?([^"\s-]+)"?/i);
        if (filterMatch) {
            dirCmd += ` ${filterMatch[1]}`;
        }

        return {
            output: dirCmd,
            suggestions: [`Convert PowerShell 'Get-ChildItem' to CMD equivalent`, `Original PowerShell command: ${psCmd}`],
            documentation: {
                cmd: this.commandMappings.getOfficialDocUrl('dir', true),
                powershell: this.commandMappings.getOfficialDocUrl('Get-ChildItem', false)
            }
        };
    }

    // Convert Remove-Item to DEL
    convertRemoveItemToDel(psCmd) {
        let delCmd = 'del';
        
        // Extract path (can be without -Path parameter)
        const pathPattern1 = psCmd.match(/Remove-Item\s+([^\s-]+)/i); // Direct path
        const pathPattern2 = psCmd.match(/-Path\s+"?([^"\s-]+)"?/i); // -Path parameter
        
        let path = '';
        if (pathPattern1) {
            path = pathPattern1[1];
        } else if (pathPattern2) {
            path = pathPattern2[1];
        }
        
        // Add path to command
        if (path) {
            delCmd += ` ${path}`;
        }
        
        // Add parameters
        if (psCmd.includes('-Force')) delCmd += ' /f';
        if (psCmd.includes('-Recurse')) delCmd += ' /s';
        if (psCmd.includes('-Confirm:$false')) delCmd += ' /q';

        return {
            output: delCmd,
            suggestions: [`Convert PowerShell 'Remove-Item' to CMD equivalent`, `Original PowerShell command: ${psCmd}`],
            documentation: {
                cmd: this.commandMappings.getOfficialDocUrl('del', true),
                powershell: this.commandMappings.getOfficialDocUrl('Remove-Item', false)
            }
        };
    }

    // Convert Copy-Item to COPY
    convertCopyItemToCopy(psCmd) {
        let copyCmd = 'copy';
        
        // Extract source and destination
        const sourceMatch = psCmd.match(/-Path\s+"([^"]+)"/);
        const destMatch = psCmd.match(/-Destination\s+"([^"]+)"/);
        
        if (sourceMatch && destMatch) {
            copyCmd += ` "${sourceMatch[1]}" "${destMatch[1]}"`;
        }
        
        if (psCmd.includes('-Recurse')) copyCmd += ' /s';
        if (psCmd.includes('-Force')) copyCmd += ' /y';

        return {
            output: copyCmd,
            suggestions: [`Convert PowerShell 'Copy-Item' to CMD equivalent`, `Original PowerShell command: ${psCmd}`],
            documentation: {
                cmd: this.commandMappings.getOfficialDocUrl('copy', true),
                powershell: this.commandMappings.getOfficialDocUrl('Copy-Item', false)
            }
        };
    }

    // Split commands based on separators
    splitCommands(input, type) {
        if (type === 'cmd') {
            // Split on && or & but preserve quoted strings
            return input.split(/\s*&&\s*|\s*&\s*/).filter(cmd => cmd.trim());
        } else {
            // Split on ; but preserve quoted strings and pipelines
            return input.split(/\s*;\s*/).filter(cmd => cmd.trim());
        }
    }

    // Convert CMD parameters to PowerShell syntax
    // Convert CMD parameters using official Microsoft documentation mappings
    convertCmdParametersOfficial(baseCommand, args) {
        let converted = '';
        let pathArgs = [];
        let i = 0;
        
        // Get parameter mappings for this specific command
        const cmdParamMappings = this.commandMappings.parameterMappings[baseCommand] || {};
        
        while (i < args.length) {
            const arg = args[i];
            
            // Handle CMD-style switches (start with /)
            if (arg.startsWith('/')) {
                const mapping = cmdParamMappings[arg.toLowerCase()];
                if (mapping) {
                    // Some mappings are empty strings (feature not needed in PS)
                    if (mapping.trim()) {
                        converted += ` ${mapping}`;
                    }
                } else {
                    // Unknown parameter, add as comment
                    converted += ` # Unknown parameter: ${arg}`;
                }
            }
            // Handle file paths and other non-switch arguments
            else {
                pathArgs.push(arg);
            }
            i++;
        }
        
        // Add path arguments
        if (pathArgs.length > 0) {
            const pathString = pathArgs.join(' ');
            // Add -Path parameter for commands that need it
            if (['dir', 'ls', 'del', 'copy', 'move', 'type'].includes(baseCommand)) {
                converted += ` -Path "${pathString}"`;
            } else {
                converted += ` "${pathString}"`;
            }
        }
        
        return converted;
    }

    // Legacy parameter conversion for backward compatibility
    convertCmdParameters(params) {
        let converted = '';
        let remainingParams = params;
        const paramMappings = this.commandMappings.parameterMappings;
        
        // Handle switches first
        for (const [cmdParam, psParam] of Object.entries(paramMappings)) {
            if (remainingParams.includes(cmdParam)) {
                converted += ` ${psParam}`;
                remainingParams = remainingParams.replace(new RegExp(cmdParam.replace('/', '\\/'),'g'), '');
            }
        }
        
        // Handle remaining non-switch parameters (paths, filenames, etc.)
        const remaining = remainingParams.trim();
        if (remaining) {
            // Don't add -Path prefix if it's already a parameter or contains quotes
            if (!remaining.startsWith('-') && !converted.includes('-Path')) {
                converted += ` -Path "${remaining}"`;
            } else if (!remaining.startsWith('-')) {
                converted += ` "${remaining}"`;
            } else {
                converted += ` ${remaining}`;
            }
        }
        
        return converted;
    }

    // Convert PowerShell parameters to CMD syntax
    convertPowerShellParameters(params) {
        let converted = '';
        
        // Reverse parameter mappings
        const reverseMappings = {};
        for (const [cmdParam, psParam] of Object.entries(this.commandMappings.parameterMappings)) {
            reverseMappings[psParam] = cmdParam;
        }
        
        for (const [psParam, cmdParam] of Object.entries(reverseMappings)) {
            if (params.includes(psParam)) {
                converted += ` ${cmdParam}`;
            }
        }
        
        return converted;
    }

    // Generate helpful suggestions with documentation links
    generateSuggestionsWithDocs(input, sourceType, cmdDescription) {
        const suggestions = [];
        const baseCommand = input.split(' ')[0].toLowerCase();
        
        // Add command description with documentation links
        if (cmdDescription) {
            suggestions.push(`✓ ${cmdDescription.description}`);
            if (cmdDescription.cmdDocumentation) {
                suggestions.push(`📖 CMD Documentation: ${cmdDescription.cmdDocumentation}`);
            }
            if (cmdDescription.powershellDocumentation) {
                suggestions.push(`📖 PowerShell Documentation: ${cmdDescription.powershellDocumentation}`);
            }
        }
        
        // Add parameter usage examples based on official documentation
        const paramMappings = this.commandMappings.parameterMappings[baseCommand];
        if (paramMappings && Object.keys(paramMappings).length > 0) {
            suggestions.push(`💡 Available parameters: ${Object.keys(paramMappings).slice(0, 3).join(', ')}`);
        }
        
        return suggestions;
    }

    // Legacy generate suggestions method for backward compatibility
    generateSuggestions(input, sourceType) {
        const suggestions = [];
        const baseCommand = input.split(' ')[0].toLowerCase();
        
        // Get basic mapping
        const mapping = this.commandMappings.getBasicMapping(baseCommand);
        if (mapping) {
            suggestions.push(`✓ Maps to: ${mapping}`);
        }
        
        // Add common usage patterns
        const paramMappings = this.commandMappings.parameterMappings[baseCommand];
        if (paramMappings) {
            const commonParams = Object.keys(paramMappings).slice(0, 3);
            if (commonParams.length > 0) {
                suggestions.push(`💡 Common parameters: ${commonParams.join(', ')}`);
            }
        }
        
        return suggestions;
    }

    // Remove duplicate suggestions
    removeDuplicateSuggestions(suggestions) {
        const seen = new Set();
        return suggestions.filter(suggestion => {
            const key = suggestion.command + suggestion.description;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Add conversion to history
    addToHistory(input, output, sourceType) {
        try {
            // Ensure conversionHistory is an array
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
            
            // Keep only last 50 conversions
            if (this.conversionHistory.length > 50) {
                this.conversionHistory = this.conversionHistory.slice(0, 50);
            }

            // Save to storage
            if (typeof window !== 'undefined' && window.StorageManager) {
                window.StorageManager.saveHistory(this.conversionHistory);
            }
        } catch (error) {
            console.error('Error adding to history:', error);
            // Reinitialize history array if there's an error
            this.conversionHistory = [];
        }
    }

    // Get conversion history
    getHistory() {
        return this.conversionHistory;
    }

    // Clear history
    clearHistory() {
        this.conversionHistory = [];
        if (typeof window !== 'undefined' && window.StorageManager) {
            window.StorageManager.clearHistory();
        }
    }

    // Load history from storage
    async loadHistory() {
        if (typeof window !== 'undefined' && window.StorageManager) {
            try {
                const savedHistory = await window.StorageManager.loadHistory();
                if (savedHistory && Array.isArray(savedHistory)) {
                    this.conversionHistory = savedHistory;
                } else {
                    this.conversionHistory = [];
                }
            } catch (error) {
                console.error('Error loading history:', error);
                this.conversionHistory = [];
            }
        }
    }

    // Get command examples
    getExamples() {
        return this.commandMappings.getExamples();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandConverter;
} else {
    window.CommandConverter = CommandConverter;
}