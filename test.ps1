Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinMM {
    [DllImport("winmm.dll", CharSet = CharSet.Ansi)]
    public static extern int mciSendString(string command, StringBuilder returnString, int returnLength, IntPtr hwndCallback);
}
'@

[WinMM]::mciSendString("open new Type waveaudio Alias r", $null, 0, [IntPtr]::Zero)
[WinMM]::mciSendString("record r", $null, 0, [IntPtr]::Zero)
Write-Host "Recording for 3 seconds... Speak now!" -ForegroundColor Cyan
Start-Sleep -Seconds 3
[WinMM]::mciSendString("save r input.wav", $null, 0, [IntPtr]::Zero)
[WinMM]::mciSendString("close r", $null, 0, [IntPtr]::Zero)
Write-Host "Done! Check your folder for input.wav." -ForegroundColor Green