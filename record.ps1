@"
param (
    [int]$Seconds = 4,
    [string]$OutFile = "input.wav"
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinMM {
    [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
    public static extern int mciSendString(string command, StringBuilder returnString, int returnLength, IntPtr hwndCallback);

    [DllImport("winmm.dll", EntryPoint = "mciGetErrorStringA", CharSet = CharSet.Ansi)]
    public static extern bool mciGetErrorString(int errorCode, StringBuilder errorText, int errorTextSize);

    public static string Run(string cmd) {
        StringBuilder sb = new StringBuilder(256);
        int err = mciSendString(cmd, sb, sb.Capacity, IntPtr.Zero);
        if (err != 0) {
            StringBuilder errMsg = new StringBuilder(256);
            mciGetErrorString(err, errMsg, errMsg.Capacity);
            return "ERR (" + err + "): " + errMsg.ToString();
        }
        return "OK";
    }
}
"@

Write-Output ("OPEN: " + [WinMM]::Run("open new Type waveaudio Alias recsound"))
Write-Output ("REC:  " + [WinMM]::Run("record recsound"))
Start-Sleep -Seconds $Seconds
Write-Output ("STOP: " + [WinMM]::Run("stop recsound"))
Write-Output ("SAVE: " + [WinMM]::Run("save recsound $OutFile"))
Write-Output ("CLOS: " + [WinMM]::Run("close recsound"))