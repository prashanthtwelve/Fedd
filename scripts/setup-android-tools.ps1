param([string]$ToolRoot = 'D:\FeddTools')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$ToolRoot = [IO.Path]::GetFullPath($ToolRoot)
New-Item -ItemType Directory -Force -Path $ToolRoot, "$ToolRoot\downloads", "$ToolRoot\tmp", "$ToolRoot\java", "$ToolRoot\android\cmdline-tools" | Out-Null

function Download-Checked([string]$Url, [string]$Destination, [string]$Checksum) {
    if (!(Test-Path -LiteralPath $Destination) -or (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ne $Checksum) {
        Invoke-WebRequest -Uri $Url -OutFile $Destination
    }
    if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ne $Checksum) { throw "Download checksum mismatch: $Destination" }
}
$feddJava = Get-ChildItem -LiteralPath "$ToolRoot\java" -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
if (!$feddJava) {
    Write-Output 'Downloading verified Temurin JDK 17 to the tool drive...'
    $feddAssets = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $feddPackage = $feddAssets[0].binary.package
    Download-Checked $feddPackage.link "$ToolRoot\downloads\jdk17.zip" $feddPackage.checksum
    Expand-Archive -LiteralPath "$ToolRoot\downloads\jdk17.zip" -DestinationPath "$ToolRoot\java" -Force
    $feddJava = Get-ChildItem -LiteralPath "$ToolRoot\java" -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
}
if (!(Test-Path -LiteralPath "$ToolRoot\android\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Write-Output 'Downloading verified Android command-line tools to the tool drive...'
    Download-Checked 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' "$ToolRoot\downloads\android-tools.zip" '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
    Expand-Archive -LiteralPath "$ToolRoot\downloads\android-tools.zip" -DestinationPath "$ToolRoot\commandline-extract" -Force
    $feddSource = (Resolve-Path -LiteralPath "$ToolRoot\commandline-extract\cmdline-tools").Path
    $feddDestination = [IO.Path]::GetFullPath("$ToolRoot\android\cmdline-tools\latest")
    if (!$feddSource.StartsWith($ToolRoot + '\') -or !$feddDestination.StartsWith($ToolRoot + '\')) { throw 'Tool move outside the chosen tool root' }
    Move-Item -LiteralPath $feddSource -Destination $feddDestination
}
$feddEnv = @{
    FEDD_TOOL_ROOT = $ToolRoot
    JAVA_HOME = $feddJava.FullName
    ANDROID_HOME = "$ToolRoot\android"
    ANDROID_SDK_ROOT = "$ToolRoot\android"
    ANDROID_USER_HOME = "$ToolRoot\.android"
    ANDROID_AVD_HOME = "$ToolRoot\.android\avd"
    GRADLE_USER_HOME = "$ToolRoot\gradle"
    FEDD_BUILD_ROOT = "$ToolRoot\build"
    NPM_CONFIG_CACHE = "$ToolRoot\npm-cache"
}
foreach ($feddPair in $feddEnv.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($feddPair.Key, $feddPair.Value, 'User')
    [Environment]::SetEnvironmentVariable($feddPair.Key, $feddPair.Value, 'Process')
}
$feddUserPath = [string][Environment]::GetEnvironmentVariable('Path', 'User')
foreach ($feddBin in @("$env:JAVA_HOME\bin", "$env:ANDROID_HOME\platform-tools", "$env:ANDROID_HOME\cmdline-tools\latest\bin")) {
    if ($feddUserPath.Split(';') -notcontains $feddBin) { $feddUserPath += ";$feddBin" }
}
[Environment]::SetEnvironmentVariable('Path', $feddUserPath, 'User')
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
$env:TMP = "$ToolRoot\tmp"
$env:TEMP = "$ToolRoot\tmp"
& "$env:JAVA_HOME\bin\java.exe" -version
Write-Output "Build environment installed/configured under $ToolRoot. SDK packages and licenses are the next step."
