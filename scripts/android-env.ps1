# Load the installed toolchain into this shell, including an already-open Codex terminal.
param([string]$ToolRoot = [Environment]::GetEnvironmentVariable('FEDD_TOOL_ROOT', 'User'))
if (!$ToolRoot) { throw 'Run scripts/setup-android-tools.ps1 first, or supply -ToolRoot.' }
foreach ($feddName in @('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT')) {
    $feddValue = [Environment]::GetEnvironmentVariable($feddName, 'User')
    if (!$feddValue) { throw "$feddName is missing. Run the setup script first." }
    [Environment]::SetEnvironmentVariable($feddName, $feddValue, 'Process')
}
$env:FEDD_TOOL_ROOT = $ToolRoot
$env:ANDROID_USER_HOME = "$ToolRoot\.android"
$env:ANDROID_AVD_HOME = "$ToolRoot\.android\avd"
$env:GRADLE_USER_HOME = "$ToolRoot\gradle"
$env:FEDD_BUILD_ROOT = "$ToolRoot\build"
$env:NPM_CONFIG_CACHE = "$ToolRoot\npm-cache"
$env:TMP = "$ToolRoot\tmp"
$env:TEMP = "$ToolRoot\tmp"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\emulator;$env:Path"
New-Item -ItemType Directory -Force -Path $env:TMP, $env:ANDROID_USER_HOME, $env:ANDROID_AVD_HOME, $env:FEDD_BUILD_ROOT | Out-Null
