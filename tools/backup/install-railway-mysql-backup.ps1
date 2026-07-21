[CmdletBinding()]
param(
    [switch]$SkipInitialBackup
)

$ErrorActionPreference = 'Stop'

$InstallRoot = Join-Path $env:LOCALAPPDATA 'HalisahaBackup\bin'
$InstalledScript = Join-Path $InstallRoot 'railway-mysql-backup.ps1'
$SourceScript = Join-Path $PSScriptRoot 'railway-mysql-backup.ps1'
$StateRoot = Join-Path $env:LOCALAPPDATA 'HalisahaBackup'
$MySqlSecretPath = Join-Path $StateRoot 'mysql-credential.xml'
$TelegramSecretPath = Join-Path $StateRoot 'telegram-secrets.xml'
$BackupRoot = 'C:\Users\Excalibur\OneDrive\Desktop\vibecoding\KSK\database'
$MySqlBin = 'C:\Program Files\MySQL\MySQL Server 9.7\bin'
$TaskName = 'Halisaha Railway MySQL Daily Full Backup'
$ChatId = '8491714962'

function Protect-UserFile {
    param([Parameter(Mandatory)][string]$Path)

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $fileAcl = Get-Acl -LiteralPath $Path
    $fileAcl.SetAccessRuleProtection($true, $false)
    $fileRule = New-Object Security.AccessControl.FileSystemAccessRule(
        $identity,
        [Security.AccessControl.FileSystemRights]::FullControl,
        [Security.AccessControl.AccessControlType]::Allow
    )
    $fileAcl.SetAccessRule($fileRule)
    Set-Acl -LiteralPath $Path -AclObject $fileAcl
}

foreach ($requiredFile in @(
    $SourceScript,
    (Join-Path $MySqlBin 'mysql.exe'),
    (Join-Path $MySqlBin 'mysqldump.exe')
)) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Required file not found: $requiredFile"
    }
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name

if (Test-Path -LiteralPath $MySqlSecretPath) {
    try {
        $mysqlCredential = Import-Clixml -LiteralPath $MySqlSecretPath
        Write-Host 'Kayitli Railway MySQL parolasi kullanilacak.' -ForegroundColor Cyan
    }
    catch {
        throw 'Kayitli Railway MySQL parolasi bu Windows hesabi tarafindan okunamiyor.'
    }
}
else {
    Write-Host 'Railway MySQL parolasini girin; ekranda gorunmeyecek.' -ForegroundColor Yellow
    $mysqlPassword = Read-Host -AsSecureString
    if ($mysqlPassword.Length -eq 0) {
        throw 'Railway MySQL password cannot be empty.'
    }
    $mysqlCredential = New-Object Management.Automation.PSCredential('root', $mysqlPassword)
    $mysqlCredential | Export-Clixml -LiteralPath $MySqlSecretPath -Force
    Protect-UserFile -Path $MySqlSecretPath
}

if (Test-Path -LiteralPath $TelegramSecretPath) {
    try {
        $telegramCredential = Import-Clixml -LiteralPath $TelegramSecretPath
        Write-Host 'Kayitli Telegram bot tokeni kullanilacak.' -ForegroundColor Cyan
    }
    catch {
        throw 'Kayitli Telegram bot tokeni bu Windows hesabi tarafindan okunamiyor.'
    }
}
else {
    Write-Host 'Telegram bot tokenini girin; ekranda gorunmeyecek.' -ForegroundColor Yellow
    $telegramToken = Read-Host -AsSecureString
    if ($telegramToken.Length -eq 0) {
        throw 'Telegram bot token cannot be empty.'
    }
    $telegramCredential = New-Object Management.Automation.PSCredential($ChatId, $telegramToken)
    $telegramCredential | Export-Clixml -LiteralPath $TelegramSecretPath -Force
    Protect-UserFile -Path $TelegramSecretPath
}

$checkTokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($telegramCredential.Password)
try {
    $checkToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($checkTokenPtr)
    $botInfo = Invoke-RestMethod -Method Get -Uri ('https://api.telegram.org/bot{0}/getMe' -f $checkToken) -TimeoutSec 30
    try {
        Invoke-RestMethod -Method Post -Uri ('https://api.telegram.org/bot{0}/getChat' -f $checkToken) -Body @{ chat_id = $ChatId } -TimeoutSec 30 | Out-Null
    }
    catch {
        throw ('Telegram bot @{0}, Chat ID {1} icin erisim saglayamiyor. Telegram''da bu botu acip /start gonderin ve kurulumu tekrar calistirin.' -f $botInfo.result.username, $ChatId)
    }
}
finally {
    if ($checkTokenPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($checkTokenPtr)
    }
    Remove-Variable checkToken -ErrorAction SilentlyContinue
}

Copy-Item -LiteralPath $SourceScript -Destination $InstalledScript -Force

if (-not $SkipInitialBackup) {
    Write-Host 'Ilk tam yedek aliniyor. Bu islem veritabani boyutuna gore surebilir.' -ForegroundColor Cyan
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $InstalledScript
    if ($LASTEXITCODE -ne 0) {
        throw "Initial backup failed with exit code $LASTEXITCODE. Check the backup log."
    }
}
else {
    Write-Host 'Dogrulanmis ilk yedek mevcut; tekrar alinmayacak.' -ForegroundColor Cyan
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $InstalledScript) -WorkingDirectory $InstallRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 2) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId $currentIdentity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description 'Railway production MySQL daily full backup' -Force | Out-Null

$tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($telegramCredential.Password)
try {
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)
    $uri = 'https://api.telegram.org/bot{0}/sendMessage' -f $token
    $body = @{
        chat_id = $ChatId
        text = 'Kurulum tamamlandi: Railway MySQL gunluk tam yedekleme sistemi kuruldu, ilk yedek yerel olarak basariyla alindi ve gorev her gun 03:00 icin zamanlandi.'
    }
    Invoke-RestMethod -Method Post -Uri $uri -Body $body -TimeoutSec 30 | Out-Null
}
finally {
    if ($tokenPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
    }
    Remove-Variable token -ErrorAction SilentlyContinue
}

Write-Host 'Kurulum tamamlandi. Telegram mesaji gonderildi.' -ForegroundColor Green
