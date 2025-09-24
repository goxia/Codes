// CMD to PowerShell command mappings and conversion rules
class CommandMappings {
    constructor() {
        // Basic command mappings
        this.basicMappings = {
            // File and Directory Operations
            'dir': 'Get-ChildItem',
            'ls': 'Get-ChildItem', 
            'cd': 'Set-Location',
            'chdir': 'Set-Location',
            'pushd': 'Push-Location',
            'popd': 'Pop-Location',
            'md': 'New-Item -ItemType Directory',
            'mkdir': 'New-Item -ItemType Directory',
            'rmdir': 'Remove-Item',
            'rd': 'Remove-Item',
            'del': 'Remove-Item',
            'erase': 'Remove-Item',
            'copy': 'Copy-Item',
            'xcopy': 'Copy-Item',
            'move': 'Move-Item',
            'ren': 'Rename-Item',
            'rename': 'Rename-Item',
            'attrib': 'Get-ItemProperty',
            'tree': 'Get-ChildItem -Recurse',
            
            // File Content Operations
            'type': 'Get-Content',
            'more': 'Get-Content',
            'find': 'Select-String',
            'findstr': 'Select-String',
            'sort': 'Sort-Object',
            'fc': 'Compare-Object',
            'comp': 'Compare-Object',
            
            // System Information
            'systeminfo': 'Get-ComputerInfo',
            'hostname': '$env:COMPUTERNAME',
            'whoami': '$env:USERNAME',
            'ver': '$PSVersionTable',
            'date': 'Get-Date',
            'time': 'Get-Date',
            'echo': 'Write-Output',
            'set': 'Get-Variable',
            
            // Process and Service Management
            'tasklist': 'Get-Process',
            'taskkill': 'Stop-Process',
            'sc': 'Get-Service',
            'net start': 'Start-Service',
            'net stop': 'Stop-Service',
            
            // Network Operations
            'ping': 'Test-NetConnection',
            'tracert': 'Test-NetConnection -TraceRoute',
            'nslookup': 'Resolve-DnsName',
            'ipconfig': 'Get-NetIPConfiguration',
            'netstat': 'Get-NetTCPConnection',
            'telnet': 'Test-NetConnection -Port',
            
            // File System
            'fsutil': 'Get-Volume',
            'chkdsk': 'Repair-Volume',
            'sfc': 'Repair-WindowsImage',
            
            // Registry
            'reg query': 'Get-ItemProperty',
            'reg add': 'New-ItemProperty',
            'reg delete': 'Remove-ItemProperty',
            
            // Help and Information
            'help': 'Get-Help',
            'cls': 'Clear-Host',
            'exit': 'exit'
        };

        // Parameter mappings for common switches
        this.parameterMappings = {
            '/s': '-Recurse',
            '/a': '-Force',
            '/q': '-Quiet',
            '/y': '-Confirm:$false',
            '/f': '-Force',
            '/p': '-Confirm',
            '/w': '-Wait',
            '/h': '-Hidden',
            '/b': '-Brief',
            '/l': '-Literal',
            '/i': '-IgnoreCase',
            '/c': '-Count',
            '/v': '-Verbose',
            '/d': '-Directory',
            '/r': '-Recurse',
            '/t': '-Time',
            '/n': '-Name',
            '/o': '-Order'
        };

        // Command examples with descriptions (based on Microsoft official documentation)
        this.commandExamples = [
            {
                cmd: 'dir /s *.txt',
                ps: 'Get-ChildItem -Filter "*.txt" -Path . -Recurse',
                description: '递归搜索当前目录及子目录中的所有 .txt 文件',
                officialDoc: 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/get-childitem'
            },
            {
                cmd: 'copy file.txt backup\\',
                ps: 'Copy-Item -Path "file.txt" -Destination "backup\\"',
                description: '复制文件到指定目录'
            },
            {
                cmd: 'del /q /f temp\\*.*',
                ps: 'Remove-Item -Path "temp\\*.*" -Force -Confirm:$false',
                description: '强制删除temp目录下所有文件，不询问确认'
            },
            {
                cmd: 'tasklist /fi "imagename eq notepad.exe"',
                ps: 'Get-Process -Name "notepad"',
                description: '显示所有notepad进程'
            },
            {
                cmd: 'find "error" logfile.txt',
                ps: 'Select-String -Path "logfile.txt" -Pattern "error"',
                description: '在日志文件中搜索包含"error"的行'
            },
            {
                cmd: 'ping -t google.com',
                ps: 'Test-NetConnection -ComputerName "google.com" -InformationLevel Detailed',
                description: '测试与google.com的网络连接'
            },
            {
                cmd: 'ipconfig /all',
                ps: 'Get-NetIPConfiguration -Detailed',
                description: '显示详细的网络配置信息'
            },
            {
                cmd: 'systeminfo | find "Total Physical Memory"',
                ps: '(Get-ComputerInfo).TotalPhysicalMemory',
                description: '获取系统总物理内存信息'
            },
            {
                cmd: 'net user admin /active:yes',
                ps: 'Enable-LocalUser -Name "admin"',
                description: '启用本地用户账户'
            },
            {
                cmd: 'schtasks /create /tn "MyTask" /tr notepad.exe /sc daily',
                ps: 'Register-ScheduledTask -TaskName "MyTask" -Action (New-ScheduledTaskAction -Execute "notepad.exe") -Trigger (New-ScheduledTaskTrigger -Daily -At 9am)',
                description: '创建每日运行的计划任务'
            }
        ];

        // Complex command patterns that need special handling
        this.complexPatterns = [
            {
                pattern: /^dir\s*(.*)$/i,
                converter: this.convertDirCommand.bind(this)
            },
            {
                pattern: /^copy\s+([^\s]+)\s+([^\s]+)(.*)$/i,
                converter: this.convertCopyCommand.bind(this)
            },
            {
                pattern: /^del\s+(.+)$/i,
                converter: this.convertDelCommand.bind(this)
            },
            {
                pattern: /^tasklist\s*(.*)$/i,
                converter: this.convertTasklistCommand.bind(this)
            },
            {
                pattern: /^taskkill\s*(.*)$/i,
                converter: this.convertTaskkillCommand.bind(this)
            },
            {
                pattern: /^find\s+"([^"]+)"\s+(.+)$/i,
                converter: this.convertFindCommand.bind(this)
            },
            {
                pattern: /^ping\s+(.+)$/i,
                converter: this.convertPingCommand.bind(this)
            },
            {
                pattern: /^ipconfig\s*(.*)$/i,
                converter: this.convertIpconfigCommand.bind(this)
            },
            {
                pattern: /^net\s+(\w+)\s*(.*)$/i,
                converter: this.convertNetCommand.bind(this)
            },
            {
                pattern: /^reg\s+(\w+)\s*(.*)$/i,
                converter: this.convertRegCommand.bind(this)
            }
        ];

        // PowerShell to CMD reverse mappings
        this.reverseMappings = this.createReverseMappings();
    }

    // Create reverse mappings for PowerShell to CMD conversion
    createReverseMappings() {
        const reverse = {};
        for (const [cmd, ps] of Object.entries(this.basicMappings)) {
            // Extract the main PowerShell cmdlet
            const psCmdlet = ps.split(' ')[0];
            if (!reverse[psCmdlet]) {
                reverse[psCmdlet] = cmd;
            }
        }
        return reverse;
    }

    // Convert DIR command with parameters
    convertDirCommand(match) {
        const allParams = match[1] || '';
        
        // Parse parameters to extract path and switches
        const parts = allParams.trim().split(/\s+/);
        let path = '.';
        let switches = '';
        
        for (const part of parts) {
            if (part.startsWith('/')) {
                switches += part + ' ';
            } else if (!part.includes('*') && !switches) {
                // First non-switch, non-wildcard parameter is likely a path
                path = part;
            } else {
                // Wildcards or parameters after switches
                switches += part + ' ';
            }
        }
        
        return this.buildDirCommand(path, switches.trim());
    }
    
    // Build DIR command with proper parameter handling
    buildDirCommand(path, params) {
        let psCommand = `Get-ChildItem`;
        
        // Handle file filters first
        const filterMatch = params.match(/(\*\.\w+|\*\w*)/);
        if (filterMatch) {
            psCommand += ` -Filter "${filterMatch[1]}"`;
            params = params.replace(filterMatch[1], '').trim();
        }
        
        // Add path
        psCommand += ` -Path "${path}"`;
        
        // Handle switches
        if (params.includes('/s')) psCommand += ' -Recurse';
        if (params.includes('/a')) psCommand += ' -Force';
        if (params.includes('/b')) psCommand += ' | Select-Object Name';
        if (params.includes('/o:n')) psCommand += ' | Sort-Object Name';
        if (params.includes('/o:s')) psCommand += ' | Sort-Object Length';
        if (params.includes('/o:d')) psCommand += ' | Sort-Object LastWriteTime';
        
        return psCommand;
    }

    // Convert COPY command
    convertCopyCommand(match) {
        const source = match[1];
        const dest = match[2];
        const params = match[3] || '';
        
        let psCommand = `Copy-Item -Path "${source}" -Destination "${dest}"`;
        
        if (params.includes('/s')) psCommand += ' -Recurse';
        if (params.includes('/y')) psCommand += ' -Force';
        if (params.includes('/v')) psCommand += ' -Verbose';
        
        return psCommand;
    }

    // Convert DEL command
    convertDelCommand(match) {
        const target = match[1];
        let psCommand = `Remove-Item -Path "${target}"`;
        
        if (target.includes('/s')) psCommand += ' -Recurse';
        if (target.includes('/q')) psCommand += ' -Confirm:$false';
        if (target.includes('/f')) psCommand += ' -Force';
        
        return psCommand;
    }

    // Convert TASKLIST command
    convertTasklistCommand(match) {
        const params = match[1] || '';
        let psCommand = 'Get-Process';
        
        // Handle filters
        const filterMatch = params.match(/\/fi\s+"([^"]+)"/i);
        if (filterMatch) {
            const filter = filterMatch[1];
            if (filter.includes('imagename eq')) {
                const processName = filter.match(/imagename eq (\S+)/i)[1].replace('.exe', '');
                psCommand = `Get-Process -Name "${processName}"`;
            }
        }
        
        if (params.includes('/v')) psCommand += ' | Format-List *';
        
        return psCommand;
    }

    // Convert TASKKILL command
    convertTaskkillCommand(match) {
        const params = match[1] || '';
        let psCommand = 'Stop-Process';
        
        const pidMatch = params.match(/\/pid\s+(\d+)/i);
        const nameMatch = params.match(/\/im\s+([^\s]+)/i);
        
        if (pidMatch) {
            psCommand += ` -Id ${pidMatch[1]}`;
        } else if (nameMatch) {
            const processName = nameMatch[1].replace('.exe', '');
            psCommand += ` -Name "${processName}"`;
        }
        
        if (params.includes('/f')) psCommand += ' -Force';
        
        return psCommand;
    }

    // Convert FIND command
    convertFindCommand(match) {
        const searchText = match[1];
        const file = match[2];
        
        return `Select-String -Path "${file}" -Pattern "${searchText}"`;
    }

    // Convert PING command
    convertPingCommand(match) {
        const target = match[1].trim();
        let psCommand = `Test-NetConnection -ComputerName "${target}"`;
        
        if (target.includes('-t')) {
            psCommand = `Test-NetConnection -ComputerName "${target.replace('-t', '').trim()}" -InformationLevel Detailed`;
        }
        
        return psCommand;
    }

    // Convert IPCONFIG command
    convertIpconfigCommand(match) {
        const params = match[1] || '';
        
        if (params.includes('/all')) {
            return 'Get-NetIPConfiguration -Detailed';
        } else if (params.includes('/release')) {
            return 'Remove-NetRoute -Confirm:$false';
        } else if (params.includes('/renew')) {
            return 'Restart-NetAdapter -Name "Ethernet"';
        } else {
            return 'Get-NetIPConfiguration';
        }
    }

    // Convert NET commands
    convertNetCommand(match) {
        const subcommand = match[1].toLowerCase();
        const params = match[2] || '';
        
        switch (subcommand) {
            case 'start':
                return `Start-Service -Name "${params.trim()}"`;
            case 'stop':
                return `Stop-Service -Name "${params.trim()}"`;
            case 'user':
                if (params.includes('/add')) {
                    const username = params.split(' ')[0];
                    return `New-LocalUser -Name "${username}"`;
                } else if (params.includes('/delete')) {
                    const username = params.split(' ')[0];
                    return `Remove-LocalUser -Name "${username}"`;
                } else {
                    return 'Get-LocalUser';
                }
            case 'share':
                return 'Get-SmbShare';
            default:
                return `# PowerShell equivalent for 'net ${subcommand}' may vary`;
        }
    }

    // Convert REG commands
    convertRegCommand(match) {
        const subcommand = match[1].toLowerCase();
        const params = match[2] || '';
        
        switch (subcommand) {
            case 'query':
                return `Get-ItemProperty -Path "${params.trim()}"`;
            case 'add':
                return `New-ItemProperty -Path "${params.trim()}"`;
            case 'delete':
                return `Remove-ItemProperty -Path "${params.trim()}"`;
            default:
                return `# PowerShell equivalent for 'reg ${subcommand}' requires specific parameters`;
        }
    }

    // Get command examples
    getExamples() {
        return this.commandExamples;
    }

    // Get basic mapping for a command
    getBasicMapping(cmd) {
        const cmdLower = cmd.toLowerCase();
        return this.basicMappings[cmdLower];
    }

    // Get reverse mapping for PowerShell to CMD
    getReverseMapping(psCmd) {
        const psCmdlet = psCmd.split(' ')[0];
        return this.reverseMappings[psCmdlet];
    }
    
    // Get official documentation links for PowerShell cmdlets
    getOfficialDocumentation(cmdlet) {
        const docLinks = {
            'Get-ChildItem': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/get-childitem',
            'Set-Location': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/set-location',
            'Copy-Item': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/copy-item',
            'Remove-Item': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/remove-item',
            'Get-Process': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/get-process',
            'Stop-Process': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/stop-process',
            'Test-NetConnection': 'https://docs.microsoft.com/powershell/module/nettcpip/test-netconnection',
            'Get-Content': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.management/get-content',
            'Select-String': 'https://docs.microsoft.com/powershell/module/microsoft.powershell.utility/select-string'
        };
        
        return docLinks[cmdlet] || 'https://docs.microsoft.com/powershell/';
    }
}

// Add metadata about command sources
const COMMAND_SOURCES = {
    official: '基于微软官方PowerShell文档',
    community: '基于PowerShell社区最佳实践',
    equivalent: '功能等价转换（可能语法略有不同）'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandMappings;
} else {
    window.CommandMappings = CommandMappings;
}