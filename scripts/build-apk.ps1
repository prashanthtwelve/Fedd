param([string]$SigningFile, [switch]$CreateSigningKey)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\android-env.ps1"
$feddProject = Split-Path -Parent $PSScriptRoot
if (!$SigningFile) { $SigningFile = "$env:FEDD_TOOL_ROOT\signing\fedd-signing.json" }
if (!(Test-Path -LiteralPath $SigningFile)) {
    if (!$CreateSigningKey) { throw 'Private signing file is missing. For the first build only, pass -CreateSigningKey. Keep this key for all future updates.' }
    $feddSigningDir = Split-Path -Parent $SigningFile
    New-Item -ItemType Directory -Force -Path $feddSigningDir | Out-Null
    $feddSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls.exe $feddSigningDir /inheritance:r /grant:r "*${feddSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not restrict signing folder permissions.' }
    $feddStore = Join-Path $feddSigningDir 'fedd-release.p12'
    if (Test-Path -LiteralPath $feddStore) { throw 'A key already exists here. Restore its original credential file rather than overwriting it.' }
    $feddBytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Fill($feddBytes)
    $env:FEDD_RELEASE_STORE_PASSWORD = [Convert]::ToBase64String($feddBytes)
    $env:FEDD_RELEASE_KEY_PASSWORD = $env:FEDD_RELEASE_STORE_PASSWORD
    try {
        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $feddStore -storetype PKCS12 -alias fedd -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=FedD Personal Testing' -storepass:env FEDD_RELEASE_STORE_PASSWORD -keypass:env FEDD_RELEASE_KEY_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Release signing key generation failed.' }
        @{ storeFile = $feddStore; storePassword = $env:FEDD_RELEASE_STORE_PASSWORD; keyAlias = 'fedd'; keyPassword = $env:FEDD_RELEASE_KEY_PASSWORD } | ConvertTo-Json | Set-Content -LiteralPath $SigningFile -Encoding utf8
    } finally {
        Remove-Item Env:FEDD_RELEASE_STORE_PASSWORD, Env:FEDD_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
    }
    Write-Output "Created private signing material outside the repository: $feddSigningDir. Back it up securely; future updates must use the same key."
}
$feddSigning = Get-Content -LiteralPath $SigningFile -Raw | ConvertFrom-Json
$env:FEDD_RELEASE_STORE_FILE = $feddSigning.storeFile
$env:FEDD_RELEASE_STORE_PASSWORD = $feddSigning.storePassword
$env:FEDD_RELEASE_KEY_ALIAS = $feddSigning.keyAlias
$env:FEDD_RELEASE_KEY_PASSWORD = $feddSigning.keyPassword
try {
    Push-Location "$feddProject\android"
    try {
        & .\gradlew.bat assembleRelease --no-daemon --console=plain --max-workers=2 --project-cache-dir "$env:FEDD_TOOL_ROOT\project-cache\Fedd"
        if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE. No APK success is claimed." }
    } finally { Pop-Location }
} finally {
    Remove-Item Env:FEDD_RELEASE_STORE_FILE, Env:FEDD_RELEASE_STORE_PASSWORD, Env:FEDD_RELEASE_KEY_ALIAS, Env:FEDD_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
    $feddSigning = $null
}
$feddApk = "$feddProject\android\app\build\outputs\apk\release\app-release.apk"
if (!(Test-Path -LiteralPath $feddApk)) { throw "Gradle did not produce the expected APK: $feddApk" }
$feddTools = "$env:ANDROID_HOME\build-tools\37.0.0"
& "$feddTools\apksigner.bat" verify --verbose --print-certs $feddApk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
& "$feddTools\zipalign.exe" -c -P 16 4 $feddApk
if ($LASTEXITCODE -ne 0) { throw 'APK alignment verification failed.' }
$feddBadging = & "$feddTools\aapt2.exe" dump badging $feddApk
if ($LASTEXITCODE -ne 0 -or !($feddBadging -match "package: name='com.fedd'") -or !($feddBadging -match "application-label:'FedD'")) { throw 'Unexpected APK package or label.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$feddArchive = [IO.Compression.ZipFile]::OpenRead($feddApk)
try {
    foreach ($feddAsset in @('assets/index.android.bundle', 'assets/fonts/Sora.ttf', 'assets/fonts/DMSans.ttf')) {
        $feddEntry = $feddArchive.GetEntry($feddAsset)
        if (!$feddEntry -or $feddEntry.Length -eq 0) { throw "APK is missing bundled asset: $feddAsset" }
    }
    $feddBundleStream = $feddArchive.GetEntry('assets/index.android.bundle').Open()
    try {
        $feddHeader = New-Object byte[] 8
        $null = $feddBundleStream.Read($feddHeader, 0, 8)
        if ([Convert]::ToHexString($feddHeader) -ne 'C61FBC03C103191F') { throw 'Expected compiled Hermes bytecode in APK.' }
    } finally { $feddBundleStream.Dispose() }
    $feddNativeLibs = @($feddArchive.Entries | Where-Object { $_.FullName -match '^lib/[^/]+/libhermes(?:vm)?\.so$' } | ForEach-Object { $_.FullName })
    foreach ($feddAbi in @('arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64')) {
        if (!($feddNativeLibs -match "^lib/$feddAbi/") -or !$feddArchive.GetEntry("lib/$feddAbi/libappmodules.so")) { throw "APK is missing native runtime/modules for $feddAbi." }
    }
} finally { $feddArchive.Dispose() }
New-Item -ItemType Directory -Force -Path "$feddProject\artifacts" | Out-Null
$feddOutput = "$feddProject\artifacts\Fedd.apk"
Copy-Item -LiteralPath $feddApk -Destination $feddOutput -Force
$feddReport = @{
    generatedAt = (Get-Date).ToString('o'); apk = $feddOutput; bytes = (Get-Item -LiteralPath $feddOutput).Length
    sha256 = (Get-FileHash -LiteralPath $feddOutput -Algorithm SHA256).Hash
    package = 'com.fedd'; label = 'FedD'; signatureVerified = $true; alignmentVerified = $true
    bundleAndFontsVerified = $true; hermesBytecodeVerified = $true; nativeLibraries = $feddNativeLibs; badging = $feddBadging
}
$feddReport | ConvertTo-Json -Depth 3 | Set-Content "$feddProject\artifacts\verification.json" -Encoding utf8
Write-Output "Verified standalone release APK: $feddOutput ($($feddReport.bytes) bytes)"
