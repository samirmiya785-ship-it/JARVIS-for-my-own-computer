param (
    [int]$Seconds = 4,
    [string]$OutFile = (Join-Path $PSScriptRoot "input.wav")
)

if ($Seconds -lt 1) {
    throw "Seconds must be at least 1."
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WinMM {
    [DllImport("winmm.dll", EntryPoint = "mciSendStringW", CharSet = CharSet.Unicode)]
    public static extern int Send(string command, StringBuilder returnString, int returnLength, IntPtr callback);

    [DllImport("winmm.dll", EntryPoint = "mciGetErrorStringW", CharSet = CharSet.Unicode)]
    public static extern bool GetErrorString(int errorCode, StringBuilder errorText, int errorTextSize);
}
'@

function Invoke-Mci {
    param([string]$Command)

    $result = [WinMM]::Send($Command, $null, 0, [IntPtr]::Zero)
    if ($result -ne 0) {
        $message = New-Object System.Text.StringBuilder 256
        [void][WinMM]::GetErrorString($result, $message, $message.Capacity)
        throw "Microphone command failed: $($message.ToString())"
    }
}

$OutFile = [System.IO.Path]::GetFullPath($OutFile)
Invoke-Mci "open new Type waveaudio Alias r"
try {
    Invoke-Mci "record r"
    Start-Sleep -Seconds $Seconds
    Invoke-Mci "stop r"
    Invoke-Mci "save r `"$OutFile`""
}
finally {
    Invoke-Mci "close r"
}

if (-not (Test-Path $OutFile) -or (Get-Item $OutFile).Length -le 44) {
    throw "No microphone audio was recorded."
}

Write-Output "Recording saved to $OutFile"
