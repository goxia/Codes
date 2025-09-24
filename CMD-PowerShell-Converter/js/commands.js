// CMD to PowerShell Command Mappings and Conversion Rules
// Based on Microsoft Official Documentation:
// - Windows Commands: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands
// - PowerShell Module Reference: https://learn.microsoft.com/en-us/powershell/module/?view=powershell-5.1

class CommandMappings {
    constructor() {
        // Initialize all mapping data based on official Microsoft documentation
        this.basicMappings = this.initializeBasicMappings();
        this.parameterMappings = this.initializeParameterMappings();
        this.complexPatterns = this.initializeComplexPatterns();
        this.officialDocs = this.initializeDocumentationLinks();
    }

    // Basic command mappings based on Microsoft official documentation
    initializeBasicMappings() {
        return {
            // File and directory operations (dir command reference)
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dir
            'dir': 'Get-ChildItem',
            'ls': 'Get-ChildItem',
            
            // Directory navigation commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cd
            'cd': 'Set-Location',
            'chdir': 'Set-Location',
            
            // Directory creation commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/md
            'md': 'New-Item -ItemType Directory',
            'mkdir': 'New-Item -ItemType Directory',
            
            // Directory removal commands  
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/rd
            'rd': 'Remove-Item',
            'rmdir': 'Remove-Item',
            
            // File deletion commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/del
            'del': 'Remove-Item',
            'erase': 'Remove-Item',
            
            // File copy operations
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/copy
            'copy': 'Copy-Item',
            'xcopy': 'Copy-Item',
            
            // File move/rename operations
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/move
            'move': 'Move-Item',
            'ren': 'Rename-Item',
            'rename': 'Rename-Item',
            
            // Display and content commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cls
            'cls': 'Clear-Host',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/type
            'type': 'Get-Content',
            'more': 'Get-Content',
            
            // Search commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/find
            'find': 'Select-String',
            'findstr': 'Select-String',
            
            // Sorting and comparison
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sort
            'sort': 'Sort-Object',
            'fc': 'Compare-Object',
            'comp': 'Compare-Object',
            
            // Network commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
            'ping': 'Test-NetConnection',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
            'ipconfig': 'Get-NetIPConfiguration',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
            'nslookup': 'Resolve-DnsName',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat
            'netstat': 'Get-NetTCPConnection',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
            'tracert': 'Test-NetConnection -TraceRoute',
            
            // Process management
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist
            'tasklist': 'Get-Process',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill
            'taskkill': 'Stop-Process',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/start
            'start': 'Start-Process',
            
            // System information commands
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/systeminfo
            'systeminfo': 'Get-ComputerInfo',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami
            'whoami': '$env:USERNAME',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/hostname
            'hostname': '$env:COMPUTERNAME',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ver
            'ver': 'Get-Host',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/date
            'date': 'Get-Date',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/time
            'time': 'Get-Date',
            
            // Environment and variables
            'set': 'Get-Variable',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/echo
            'echo': 'Write-Host',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/path
            'path': '$env:PATH',
            
            // File attributes and permissions
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/attrib
            'attrib': 'Get-ItemProperty',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cacls
            'cacls': 'Get-Acl',
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls
            'icacls': 'Get-Acl',
            
            // Service operations
            'sc': 'Get-Service',
            'net': 'Get-Service',
            
            // File tree display
            // Source: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tree  
            'tree': 'Get-ChildItem -Recurse'
        };
    }

    // Parameter mappings based on official CMD command documentation
    initializeParameterMappings() {
        return {
            'dir': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dir
                '/s': '-Recurse',                    // Lists every occurrence in subdirectories
                '/b': '-Name',                       // Displays bare list of directories and files
                '/w': '| Format-Wide',               // Displays listing in wide format
                '/p': '| more',                      // Displays one screen at a time
                '/a': '-Force',                      // Shows all files including hidden/system
                '/ah': '-Hidden',                    // Shows hidden files only
                '/as': '-System',                    // Shows system files only
                '/ar': '-ReadOnly',                  // Shows read-only files only
                '/ad': '-Directory',                 // Shows directories only
                '/a-d': '-File',                     // Shows files only (excludes directories)
                '/o:n': '| Sort-Object Name',        // Sort alphabetically by name
                '/o:s': '| Sort-Object Length',      // Sort by size
                '/o:d': '| Sort-Object LastWriteTime', // Sort by date/time
                '/o:e': '| Sort-Object Extension',   // Sort by extension
                '/o:-n': '| Sort-Object Name -Descending',        // Reverse name sort
                '/o:-s': '| Sort-Object Length -Descending',      // Reverse size sort
                '/o:-d': '| Sort-Object LastWriteTime -Descending', // Reverse date sort
                '/q': '| Select-Object Name,@{n="Owner";e={Get-Acl $_.FullName | Select-Object -ExpandProperty Owner}}', // Display ownership
                '/t:c': '| Sort-Object CreationTime',    // Sort by creation time
                '/t:a': '| Sort-Object LastAccessTime',  // Sort by last access time
                '/t:w': '| Sort-Object LastWriteTime',   // Sort by last write time
                '/c': '',                               // Thousand separator (default in PowerShell)
                '/4': '',                               // Four-digit years (default in PowerShell)
                '/l': '| ForEach-Object {$_.Name.ToLower()}', // Lowercase display
                '/x': '-Force'                          // Display short names (8.3 format)
            },
            
            'copy': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/copy
                '/y': '-Force',                      // Suppress overwrite confirmation
                '/z': '',                           // Copy in restartable mode (not applicable)
                '/v': '-Verify',                    // Verify files are written correctly
                '/a': '',                           // ASCII text mode (PowerShell handles automatically)
                '/b': '',                           // Binary mode (PowerShell default)
                '/d': '-Force'                      // Allow decrypted destination
            },
            
            'xcopy': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/xcopy
                '/s': '-Recurse',                   // Copy directories and subdirectories
                '/e': '-Recurse',                   // Copy directories, subdirectories, and empty directories  
                '/y': '-Force',                     // Suppress overwrite confirmation
                '/i': '',                           // Assume destination is directory (PowerShell auto-detects)
                '/q': '',                           // Quiet mode (use -Verbose for detailed output)
                '/f': '-Verbose',                   // Display full source and destination filenames
                '/l': '-WhatIf',                    // List files that would be copied
                '/h': '-Force',                     // Copy files with hidden and system attributes
                '/r': '-Force',                     // Overwrite read-only files
                '/k': '',                           // Copy attributes (PowerShell preserves by default)
                '/o': '',                           // Copy ownership and ACL info
                '/x': '',                           // Copy audit settings
                '/v': '-Verbose',                   // Verify each file
                '/w': '',                           // Prompt before copying
                '/c': '',                           // Continue copying even if errors occur
                '/t': '-Recurse -Directory'         // Copy subdirectory structure only
            },
            
            'del': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/del
                '/p': '-Confirm',                   // Prompt for confirmation
                '/f': '-Force',                     // Force deletion of read-only files
                '/s': '-Recurse',                   // Delete from subdirectories
                '/q': '',                           // Quiet mode (default in PowerShell)
                '/a': '',                           // Delete based on attributes
                '/ar': '-ReadOnly',                 // Delete read-only files
                '/ah': '-Hidden',                   // Delete hidden files
                '/as': '-System'                    // Delete system files
            },
            
            'move': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/move
                '/y': '-Force',                     // Suppress overwrite confirmation
                '/-y': '-Confirm'                   // Prompt for overwrite confirmation
            },
            
            'type': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/type
                // type command doesn't have standard parameters, but common usage patterns:
                '| more': '| more',                 // Page through content
                '| find': '| Select-String'         // Search within content
            },
            
            'find': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/find
                '/i': '',                           // Case-insensitive (PowerShell default for Select-String)
                '/v': '-NotMatch',                  // Display lines that don't contain the string
                '/c': '| Measure-Object -Line',     // Display count of matching lines
                '/n': '-LineNumber'                 // Display line numbers
            },
            
            'findstr': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr  
                '/i': '',                           // Case-insensitive search
                '/v': '-NotMatch',                  // Lines that don't match
                '/r': '-SimpleMatch:$false',        // Regular expressions
                '/s': '-Recurse',                   // Search subdirectories
                '/m': '-List',                      // Print only filename if file contains match
                '/l': '-SimpleMatch',               // Literal search string
                '/c': '-Pattern',                   // Use specified string as literal search
                '/g': '',                           // Get search strings from file
                '/f': '',                           // Read file list from file
                '/d': '',                           // Search list of directories
                '/a': '',                           // Color attributes
                '/off': '',                         // Skip files with offline attribute
                '/offline': '',                     // Don't skip files with offline attribute
                '/n': '-LineNumber',                // Print line number before each matching line
                '/e': '',                           // End of line
                '/b': '',                           // Beginning of line
                '/x': ''                            // Exact match
            },
            
            'tasklist': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist
                '/fi': 'Where-Object',              // Apply filters
                '/fo': 'Format-Table',              // Output format
                '/m': '| Select-Object ProcessName,Modules', // Display modules
                '/svc': '| Select-Object ProcessName,Services', // Display services
                '/v': '| Format-List *'             // Verbose information
            },
            
            'taskkill': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill
                '/f': '-Force',                     // Force termination
                '/im': '-ProcessName',              // Terminate by image name
                '/pid': '-Id',                      // Terminate by process ID
                '/t': '-IncludeTree'                // Terminate process tree
            },
            
            'ping': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
                '/t': '',                           // Ping continuously (use while loop in PS)
                '/n': '-Count',                     // Number of echo requests
                '/l': '-BufferSize',                // Send buffer size  
                '/f': '',                           // Set Don't Fragment flag
                '/i': '-TimeToLive',                // Time To Live
                '/v': '',                           // Type of Service
                '/r': '',                           // Record route
                '/s': '',                           // Timestamp
                '/j': '',                           // Loose source route
                '/k': '',                           // Strict source route
                '/w': '-DelaySeconds',              // Timeout in milliseconds
                '/4': '-IPv4',                      // Force IPv4
                '/6': '-IPv6'                       // Force IPv6
            },
            
            'ipconfig': {
                // Based on https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
                '/all': '-Detailed',                // Display full configuration
                '/release': 'Release-NetIPAddress', // Release IP address
                '/renew': 'Renew-NetIPAddress',     // Renew IP address
                '/flushdns': 'Clear-DnsClientCache', // Flush DNS resolver cache
                '/displaydns': 'Get-DnsClientCache', // Display DNS resolver cache
                '/registerdns': 'Register-DnsClient', // Refresh DHCP leases
                '/showclassid': '',                 // Display DHCP class IDs
                '/setclassid': ''                   // Modify DHCP class ID
            }
        };
    }

    // Complex pattern mappings for advanced command structures
    initializeComplexPatterns() {
        return [
            // DIR command with specific patterns
            {
                pattern: /^dir\s+(.*?)\s*\/s\s*$/i,
                handler: (match) => {
                    const path = match[1].trim() || '.';
                    return `Get-ChildItem -Path "${path}" -Recurse`;
                },
                description: 'Lists files in directory and all subdirectories',
                example: 'dir C:\\Windows /s → Get-ChildItem -Path "C:\\Windows" -Recurse'
            },
            
            {
                pattern: /^dir\s+(.*?)\s*\/b\s*$/i,
                handler: (match) => {
                    const path = match[1].trim() || '.';
                    return `Get-ChildItem -Path "${path}" -Name`;
                },
                description: 'Displays bare list of files and directories',
                example: 'dir /b → Get-ChildItem -Name'
            },
            
            {
                pattern: /^dir\s+(.*?)\s*\/a:d\s*$/i,
                handler: (match) => {
                    const path = match[1].trim() || '.';
                    return `Get-ChildItem -Path "${path}" -Directory`;
                },
                description: 'Lists directories only',
                example: 'dir /a:d → Get-ChildItem -Directory'
            },
            
            {
                pattern: /^dir\s+(.*?)\s*\/a:-d\s*$/i,
                handler: (match) => {
                    const path = match[1].trim() || '.';
                    return `Get-ChildItem -Path "${path}" -File`;
                },
                description: 'Lists files only (excludes directories)',
                example: 'dir /a:-d → Get-ChildItem -File'
            },
            
            // Advanced DIR patterns with multiple parameters
            {
                pattern: /^dir\s+(.*?)\s*\/s\s*\/b\s*$/i,
                handler: (match) => {
                    const path = match[1].trim() || '.';
                    return `Get-ChildItem -Path "${path}" -Recurse -Name`;
                },
                description: 'Lists all files recursively in bare format',
                example: 'dir /s /b → Get-ChildItem -Recurse -Name'
            },
            
            // COPY command patterns
            {
                pattern: /^copy\s+([^/]+)\s+([^/]+)\s*\/y\s*$/i,
                handler: (match) => {
                    const source = match[1].trim();
                    const dest = match[2].trim();
                    return `Copy-Item -Path "${source}" -Destination "${dest}" -Force`;
                },
                description: 'Copies files with overwrite confirmation suppressed',
                example: 'copy file1.txt file2.txt /y → Copy-Item -Path "file1.txt" -Destination "file2.txt" -Force'
            },
            
            // XCOPY command patterns
            {
                pattern: /^xcopy\s+([^/]+)\s+([^/]+)\s*\/s\s*\/e\s*$/i,
                handler: (match) => {
                    const source = match[1].trim();
                    const dest = match[2].trim();
                    return `Copy-Item -Path "${source}" -Destination "${dest}" -Recurse -Force`;
                },
                description: 'Copies directories and subdirectories including empty ones',
                example: 'xcopy C:\\Source D:\\Backup /s /e → Copy-Item -Path "C:\\Source" -Destination "D:\\Backup" -Recurse -Force'
            },
            
            // DEL command patterns
            {
                pattern: /^del\s+(.*?)\s*\/s\s*\/q\s*$/i,
                handler: (match) => {
                    const path = match[1].trim();
                    return `Remove-Item -Path "${path}" -Recurse -Force`;
                },
                description: 'Deletes files from all subdirectories quietly',
                example: 'del *.tmp /s /q → Remove-Item -Path "*.tmp" -Recurse -Force'
            },
            
            // FIND command patterns
            {
                pattern: /^find\s+"([^"]+)"\s+(.+)$/i,
                handler: (match) => {
                    const searchText = match[1];
                    const files = match[2].trim();
                    return `Select-String -Pattern "${searchText}" -Path ${files}`;
                },
                description: 'Searches for text string in files',
                example: 'find "error" *.log → Select-String -Pattern "error" -Path *.log'
            },
            
            // TASKKILL command patterns
            {
                pattern: /^taskkill\s+\/im\s+([^\s]+)\s*\/f\s*$/i,
                handler: (match) => {
                    const processName = match[1];
                    return `Stop-Process -Name "${processName}" -Force`;
                },
                description: 'Forcefully terminates process by name',
                example: 'taskkill /im notepad.exe /f → Stop-Process -Name "notepad.exe" -Force'
            },
            
            {
                pattern: /^taskkill\s+\/pid\s+(\d+)\s*\/f\s*$/i,
                handler: (match) => {
                    const pid = match[1];
                    return `Stop-Process -Id ${pid} -Force`;
                },
                description: 'Forcefully terminates process by ID',
                example: 'taskkill /pid 1234 /f → Stop-Process -Id 1234 -Force'
            },
            
            // Network command patterns
            {
                pattern: /^ping\s+([^\s]+)\s+-n\s+(\d+)\s*$/i,
                handler: (match) => {
                    const target = match[1];
                    const count = match[2];
                    return `Test-NetConnection -ComputerName "${target}" -Count ${count}`;
                },
                description: 'Pings target with specified count',
                example: 'ping google.com -n 4 → Test-NetConnection -ComputerName "google.com" -Count 4'
            },
            
            // File attribute patterns
            {
                pattern: /^attrib\s+([+-][rhas]+)\s+(.+)$/i,
                handler: (match) => {
                    const attributes = match[1];
                    const files = match[2];
                    // Convert attributes to PowerShell format
                    let psCommand = `Set-ItemProperty -Path "${files}"`;
                    if (attributes.includes('+r')) psCommand += ' -Name IsReadOnly -Value $true';
                    if (attributes.includes('-r')) psCommand += ' -Name IsReadOnly -Value $false';
                    if (attributes.includes('+h')) psCommand += ' -Name Attributes -Value ([System.IO.FileAttributes]::Hidden)';
                    return psCommand;
                },
                description: 'Sets or removes file attributes',
                example: 'attrib +r file.txt → Set-ItemProperty -Path "file.txt" -Name IsReadOnly -Value $true'
            }
        ];
    }

    // Official documentation links for reference
    initializeDocumentationLinks() {
        return {
            cmd: {
                baseUrl: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/',
                commands: {
                    'dir': 'dir',
                    'cd': 'cd', 
                    'copy': 'copy',
                    'xcopy': 'xcopy',
                    'del': 'del',
                    'md': 'md',
                    'rd': 'rd',
                    'move': 'move',
                    'ren': 'ren',
                    'type': 'type',
                    'find': 'find',
                    'findstr': 'findstr',
                    'tasklist': 'tasklist',
                    'taskkill': 'taskkill',
                    'ping': 'ping',
                    'ipconfig': 'ipconfig',
                    'netstat': 'netstat',
                    'tracert': 'tracert',
                    'systeminfo': 'systeminfo',
                    'whoami': 'whoami',
                    'hostname': 'hostname',
                    'ver': 'ver',
                    'date': 'date',
                    'time': 'time',
                    'echo': 'echo',
                    'cls': 'cls',
                    'attrib': 'attrib',
                    'cacls': 'cacls',
                    'icacls': 'icacls',
                    'tree': 'tree'
                }
            },
            powershell: {
                baseUrl: 'https://learn.microsoft.com/en-us/powershell/module/',
                modules: {
                    'Get-ChildItem': 'microsoft.powershell.management/get-childitem',
                    'Set-Location': 'microsoft.powershell.management/set-location',
                    'New-Item': 'microsoft.powershell.management/new-item',
                    'Remove-Item': 'microsoft.powershell.management/remove-item',
                    'Copy-Item': 'microsoft.powershell.management/copy-item',
                    'Move-Item': 'microsoft.powershell.management/move-item',
                    'Rename-Item': 'microsoft.powershell.management/rename-item',
                    'Get-Content': 'microsoft.powershell.management/get-content',
                    'Select-String': 'microsoft.powershell.utility/select-string',
                    'Sort-Object': 'microsoft.powershell.utility/sort-object',
                    'Compare-Object': 'microsoft.powershell.utility/compare-object',
                    'Get-Process': 'microsoft.powershell.management/get-process',
                    'Stop-Process': 'microsoft.powershell.management/stop-process',
                    'Start-Process': 'microsoft.powershell.management/start-process',
                    'Get-Service': 'microsoft.powershell.management/get-service',
                    'Test-NetConnection': 'nettcpip/test-netconnection',
                    'Get-NetIPConfiguration': 'nettcpip/get-netipconfiguration',
                    'Resolve-DnsName': 'dnsclient/resolve-dnsname',
                    'Get-NetTCPConnection': 'nettcpip/get-nettcpconnection',
                    'Get-ComputerInfo': 'microsoft.powershell.management/get-computerinfo',
                    'Get-Date': 'microsoft.powershell.utility/get-date',
                    'Write-Host': 'microsoft.powershell.utility/write-host',
                    'Clear-Host': 'microsoft.powershell.core/clear-host',
                    'Get-Acl': 'microsoft.powershell.security/get-acl'
                }
            }
        };
    }

    // Get official documentation URL for a command
    getOfficialDocUrl(command, isCmd = true) {
        if (isCmd) {
            const cmdPath = this.officialDocs.cmd.commands[command.toLowerCase()];
            return cmdPath ? `${this.officialDocs.cmd.baseUrl}${cmdPath}` : null;
        } else {
            const psPath = this.officialDocs.powershell.modules[command];
            return psPath ? `${this.officialDocs.powershell.baseUrl}${psPath}?view=powershell-5.1` : null;
        }
    }

    // Get basic mapping for a command
    getBasicMapping(command) {
        return this.basicMappings[command.toLowerCase()];
    }

    // Get parameter mappings for a command
    getParameterMapping(command, parameter) {
        const cmdMappings = this.parameterMappings[command.toLowerCase()];
        return cmdMappings ? cmdMappings[parameter] : null;
    }

    // Get all parameter mappings for a command
    getParameterMappings(command) {
        return this.parameterMappings[command.toLowerCase()] || null;
    }

    // Get complex pattern match
    getComplexPattern(input) {
        for (const pattern of this.complexPatterns) {
            const match = input.match(pattern.pattern);
            if (match) {
                return {
                    result: pattern.handler(match),
                    description: pattern.description,
                    example: pattern.example
                };
            }
        }
        return null;
    }

    // Get all available commands
    getAllCommands() {
        return Object.keys(this.basicMappings);
    }

    // Get reverse mapping (PowerShell to CMD)
    getReverseMapping(psCmd) {
        const cmdlet = psCmd.toLowerCase();
        
        // Create reverse mapping from basicMappings
        for (const [cmdCommand, psCommand] of Object.entries(this.basicMappings)) {
            const psCmdLower = psCommand.toLowerCase();
            if (psCmdLower === cmdlet || psCmdLower.startsWith(cmdlet + ' ')) {
                return cmdCommand;
            }
        }
        
        // Common PowerShell cmdlets to CMD mappings
        const reverseMappings = {
            'get-childitem': 'dir',
            'set-location': 'cd',
            'new-item': 'md',
            'remove-item': 'del',
            'copy-item': 'copy',
            'move-item': 'move',
            'rename-item': 'ren',
            'get-content': 'type',
            'clear-host': 'cls',
            'get-process': 'tasklist',
            'stop-process': 'taskkill',
            'test-netconnection': 'ping',
            'get-netipaddress': 'ipconfig'
        };
        
        return reverseMappings[cmdlet] || null;
    }

    // Get command description with official documentation reference
    getCommandDescription(command) {
        const mapping = this.getBasicMapping(command);
        const docUrl = this.getOfficialDocUrl(command, true);
        
        if (mapping) {
            return {
                powershell: mapping,
                description: `Convert ${command.toUpperCase()} command to PowerShell equivalent`,
                cmdDocumentation: docUrl,
                powershellDocumentation: this.getOfficialDocUrl(mapping.split(' ')[0], false)
            };
        }
        return null;
    }

    // Get common command examples for the examples section
    getExamples() {
        return [
            {
                cmd: 'dir',
                powershell: 'Get-ChildItem',
                description: '列出当前目录内容'
            },
            {
                cmd: 'dir *.txt',
                powershell: 'Get-ChildItem *.txt',
                description: '列出所有 .txt 文件'
            },
            {
                cmd: 'cd C:\\Windows',
                powershell: 'Set-Location C:\\Windows',
                description: '切换到 Windows 目录'
            },
            {
                cmd: 'md newfolder',
                powershell: 'New-Item -ItemType Directory -Name newfolder',
                description: '创建新文件夹'
            },
            {
                cmd: 'copy file.txt backup.txt',
                powershell: 'Copy-Item file.txt backup.txt',
                description: '复制文件'
            },
            {
                cmd: 'del *.tmp',
                powershell: 'Remove-Item *.tmp',
                description: '删除所有临时文件'
            },
            {
                cmd: 'type config.txt',
                powershell: 'Get-Content config.txt',
                description: '显示文件内容'
            },
            {
                cmd: 'cls',
                powershell: 'Clear-Host',
                description: '清屏'
            },
            {
                cmd: 'tasklist',
                powershell: 'Get-Process',
                description: '显示运行的进程'
            },
            {
                cmd: 'ipconfig',
                powershell: 'Get-NetIPAddress',
                description: '显示网络配置'
            },
            {
                cmd: 'ping google.com',
                powershell: 'Test-NetConnection google.com',
                description: '测试网络连接'
            },
            {
                cmd: 'find "error" log.txt',
                powershell: 'Select-String -Pattern "error" -Path log.txt',
                description: '在文件中搜索文本'
            }
        ];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandMappings;
}