[CmdletBinding()]
param(
    [switch]$SendSuccessNotification
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Config = [ordered]@{
    MySqlBin       = 'C:\Program Files\MySQL\MySQL Server 9.7\bin'
    Host           = 'reseau.proxy.rlwy.net'
    Port           = 26154
    User           = 'root'
    Database       = 'railway'
    BackupRoot     = 'C:\Users\Excalibur\OneDrive\Desktop\vibecoding\KSK\database'
    StateRoot      = Join-Path $env:LOCALAPPDATA 'HalisahaBackup'
    MinimumFreeGB  = 1
    SmallRatio     = 0.20
}

$Config.LogRoot = Join-Path $Config.StateRoot 'logs'
$Config.SecretPath = Join-Path $Config.StateRoot 'telegram-secrets.xml'
$Config.MySqlSecretPath = Join-Path $Config.StateRoot 'mysql-credential.xml'
$Config.MySqlDump = Join-Path $Config.MySqlBin 'mysqldump.exe'
$Config.MySql = Join-Path $Config.MySqlBin 'mysql.exe'

function Write-BackupLog {
    param(
        [ValidateSet('INFO', 'WARN', 'ERROR')]
        [string]$Level,
        [string]$Message
    )

    New-Item -ItemType Directory -Path $Config.LogRoot -Force | Out-Null
    $line = '{0:u} [{1}] {2}' -f (Get-Date), $Level, $Message
    Add-Content -LiteralPath (Join-Path $Config.LogRoot 'backup.log') -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-TelegramSecret {
    if (-not (Test-Path -LiteralPath $Config.SecretPath)) {
        return $null
    }

    try {
        return Import-Clixml -LiteralPath $Config.SecretPath
    }
    catch {
        Write-BackupLog -Level WARN -Message 'Telegram secret could not be read for the current Windows user.'
        return $null
    }
}

function Get-MySqlCredential {
    if (-not (Test-Path -LiteralPath $Config.MySqlSecretPath)) {
        throw 'MySQL credential is not configured.'
    }

    try {
        return Import-Clixml -LiteralPath $Config.MySqlSecretPath
    }
    catch {
        throw 'MySQL credential could not be read for the current Windows user.'
    }
}

function Start-SecuredMySqlProcess {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$StandardOutputPath,
        [Parameter(Mandatory)][string]$StandardErrorPath
    )

    $credential = Get-MySqlCredential
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
    $outputStream = $null
    $errorStream = $null
    $process = $null
    try {
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
        $startInfo = New-Object Diagnostics.ProcessStartInfo
        $startInfo.FileName = $FilePath
        $startInfo.Arguments = $Arguments -join ' '
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.EnvironmentVariables['MYSQL_PWD'] = $plainPassword

        $outputStream = [IO.File]::Create($StandardOutputPath)
        $errorStream = [IO.File]::Create($StandardErrorPath)
        $process = New-Object Diagnostics.Process
        $process.StartInfo = $startInfo
        if (-not $process.Start()) {
            throw "Could not start MySQL process: $FilePath"
        }

        $outputCopy = $process.StandardOutput.BaseStream.CopyToAsync($outputStream)
        $errorCopy = $process.StandardError.BaseStream.CopyToAsync($errorStream)
        $process.WaitForExit()
        $outputCopy.GetAwaiter().GetResult()
        $errorCopy.GetAwaiter().GetResult()
        $exitCode = $process.ExitCode

        return [pscustomobject]@{
            ExitCode = $exitCode
        }
    }
    finally {
        if ($null -ne $outputStream) { $outputStream.Dispose() }
        if ($null -ne $errorStream) { $errorStream.Dispose() }
        if ($null -ne $process) { $process.Dispose() }
        if ($passwordPtr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        }
        Remove-Variable plainPassword -ErrorAction SilentlyContinue
    }
}

function Send-TelegramMessage {
    param([Parameter(Mandatory)][string]$Text)

    $secret = Get-TelegramSecret
    if ($null -eq $secret) {
        Write-BackupLog -Level WARN -Message 'Telegram notification skipped because no readable secret is configured.'
        return $false
    }

    $tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret.Password)
    try {
        $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
        $uri = 'https://api.telegram.org/bot{0}/sendMessage' -f $token
        $body = @{ chat_id = $secret.UserName; text = $Text }
        Invoke-RestMethod -Method Post -Uri $uri -Body $body -TimeoutSec 30 | Out-Null
        return $true
    }
    catch {
        Write-BackupLog -Level WARN -Message ('Telegram notification failed: {0}' -f $_.Exception.Message)
        return $false
    }
    finally {
        if ($tokenPtr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
        }
        Remove-Variable token -ErrorAction SilentlyContinue
    }
}

function Get-OutputPath {
    $dateName = Get-Date -Format 'yyyy-MM-dd'
    $basePath = Join-Path $Config.BackupRoot ('{0}-{1}.sql.gz' -f $Config.Database, $dateName)
    if (-not (Test-Path -LiteralPath $basePath)) {
        return $basePath
    }

    return Join-Path $Config.BackupRoot ('{0}-{1}_{2}.sql.gz' -f $Config.Database, $dateName, (Get-Date -Format 'HHmmss'))
}

function Compress-GZipFile {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )

    $inputStream = [IO.File]::OpenRead($Source)
    try {
        $outputStream = [IO.File]::Create($Destination)
        try {
            $gzipStream = New-Object IO.Compression.GZipStream(
                $outputStream,
                [IO.Compression.CompressionMode]::Compress
            )
            try {
                $inputStream.CopyTo($gzipStream)
            }
            finally {
                $gzipStream.Dispose()
            }
        }
        finally {
            $outputStream.Dispose()
        }
    }
    finally {
        $inputStream.Dispose()
    }
}

function Read-TrimmedTextFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ''
    }
    $content = Get-Content -LiteralPath $Path -Raw
    if ($null -eq $content) {
        return ''
    }
    return $content.Trim()
}

$tempSql = $null
$partialGzip = $null
$errorFile = $null
$connectionOut = $null
$connectionErr = $null

try {
    foreach ($requiredFile in @($Config.MySqlDump, $Config.MySql)) {
        if (-not (Test-Path -LiteralPath $requiredFile)) {
            throw "Required MySQL tool not found: $requiredFile"
        }
    }

    New-Item -ItemType Directory -Path $Config.BackupRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $Config.StateRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $Config.LogRoot -Force | Out-Null

    $backupDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($Config.BackupRoot).TrimEnd('\').TrimEnd(':')) -PSProvider FileSystem
    $requiredBytes = [int64]$Config.MinimumFreeGB * 1GB
    if ($backupDrive.Free -lt $requiredBytes) {
        throw ('Insufficient free space. Required at least {0} GB; available {1:N2} GB.' -f $Config.MinimumFreeGB, ($backupDrive.Free / 1GB))
    }

    $testId = [guid]::NewGuid().ToString('N').Substring(0, 8)
    $connectionOut = Join-Path $env:TEMP ("halisaha-connection-$testId.out")
    $connectionErr = Join-Path $env:TEMP ("halisaha-connection-$testId.err")
    $connectionArgs = @(
        "--host=$($Config.Host)",
        "--port=$($Config.Port)",
        "--user=$($Config.User)",
        '--protocol=TCP',
        '--default-character-set=utf8mb4',
        '--batch',
        '--skip-column-names',
        '--execute=SELECT(1);'
    )
    $connectionProcess = Start-SecuredMySqlProcess -FilePath $Config.MySql -Arguments $connectionArgs `
        -StandardOutputPath $connectionOut -StandardErrorPath $connectionErr
    $connectionText = Read-TrimmedTextFile -Path $connectionOut
    $connectionError = Read-TrimmedTextFile -Path $connectionErr
    if ($connectionProcess.ExitCode -ne 0 -or $connectionText -ne '1') {
        throw ('Railway MySQL connection test failed. ExitCode={0}; Output={1}; Error={2}' -f $connectionProcess.ExitCode, $connectionText, $connectionError)
    }

    $runId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), ([guid]::NewGuid().ToString('N').Substring(0, 8))
    $tempSql = Join-Path $env:TEMP ("halisaha-$runId.sql")
    $errorFile = Join-Path $env:TEMP ("halisaha-$runId.err")
    $outputPath = Get-OutputPath
    $partialGzip = "$outputPath.partial"

    Write-BackupLog -Level INFO -Message "Full backup started: $outputPath"

    $dumpArgs = @(
        "--host=$($Config.Host)",
        "--port=$($Config.Port)",
        "--user=$($Config.User)",
        '--protocol=TCP',
        '--single-transaction',
        '--quick',
        '--skip-lock-tables',
        '--routines',
        '--triggers',
        '--events',
        '--default-character-set=utf8mb4',
        '--set-gtid-purged=OFF',
        '--no-tablespaces',
        '--databases',
        $Config.Database
    )

    $dumpProcess = Start-SecuredMySqlProcess -FilePath $Config.MySqlDump -Arguments $dumpArgs `
        -StandardOutputPath $tempSql -StandardErrorPath $errorFile

    $dumpError = Read-TrimmedTextFile -Path $errorFile
    if ($dumpProcess.ExitCode -ne 0) {
        throw ('mysqldump failed with exit code {0}: {1}' -f $dumpProcess.ExitCode, $dumpError)
    }
    if (-not (Test-Path -LiteralPath $tempSql) -or (Get-Item -LiteralPath $tempSql).Length -eq 0) {
        throw 'mysqldump completed without producing a non-empty SQL file.'
    }

    Compress-GZipFile -Source $tempSql -Destination $partialGzip
    if (-not (Test-Path -LiteralPath $partialGzip) -or (Get-Item -LiteralPath $partialGzip).Length -eq 0) {
        throw 'GZip compression did not produce a non-empty file.'
    }

    Move-Item -LiteralPath $partialGzip -Destination $outputPath
    $currentFile = Get-Item -LiteralPath $outputPath
    $previousFile = Get-ChildItem -LiteralPath $Config.BackupRoot -Filter "$($Config.Database)-*.sql.gz" -File |
        Where-Object { $_.FullName -ne $currentFile.FullName } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $smallWarning = $false
    if ($null -ne $previousFile -and $previousFile.Length -gt 0) {
        $ratio = $currentFile.Length / $previousFile.Length
        if ($ratio -lt $Config.SmallRatio) {
            $smallWarning = $true
            Write-BackupLog -Level WARN -Message ('Backup is unusually small: {0:N2}% of previous backup.' -f ($ratio * 100))
            [void](Send-TelegramMessage -Text ('UYARI: {0} tarihli veritabani yedegi onceki yedegin %20''sinden kucuk. Dosya: {1}, Boyut: {2:N2} MB' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $currentFile.Name, ($currentFile.Length / 1MB)))
        }
    }

    Write-BackupLog -Level INFO -Message ('Full backup completed: {0} ({1:N2} MB)' -f $currentFile.FullName, ($currentFile.Length / 1MB))
    if ($SendSuccessNotification -and -not $smallWarning) {
        [void](Send-TelegramMessage -Text ('Basarili: {0} tarihli Railway MySQL tam yedegi olusturuldu. Dosya: {1}, Boyut: {2:N2} MB' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $currentFile.Name, ($currentFile.Length / 1MB)))
    }

    exit 0
}
catch {
    $failureMessage = $_.Exception.Message
    $failureLocation = $_.InvocationInfo.PositionMessage -replace "`r?`n", ' '
    Write-BackupLog -Level ERROR -Message ("$failureMessage $failureLocation")
    [void](Send-TelegramMessage -Text ('HATA: {0} tarihli Railway MySQL yedeklemesi basarisiz oldu. Sebep: {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $failureMessage))
    exit 1
}
finally {
    foreach ($temporaryFile in @($tempSql, $partialGzip, $errorFile, $connectionOut, $connectionErr)) {
        if ($temporaryFile -and (Test-Path -LiteralPath $temporaryFile)) {
            Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
        }
    }
}
