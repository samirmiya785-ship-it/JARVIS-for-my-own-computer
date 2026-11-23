const {exec, execFile} = require('child_process');
const bridge = require('./bridge.js');
function runPS(psCommand) {
    return new Promise((resolve) => {
        const cleanCmd = psCommand.replace(/\n/g, ' ');
        exec(`powershell -NoProfile -Command "${cleanCmd}"`, (err, stdout, stderr) => {
            if (err) return resolve(`Error: ${stderr || err.message}`);
            resolve(stdout.trim() || 'Done.');
        });
    });
}
async function searchFiles(directory, query) {
    const results = await bridge.searchFiles(directory, query);
    return results.length > 0 ? results.join('\n') : 'No matching files found.';
}
async function openTarget(targetPath) {
    if (typeof targetPath !== 'string' || !targetPath.trim()) {
        throw new Error('An application name, path, or URL is required.');
    }

    const target = targetPath.trim();
    const encodedTarget = Buffer.from(target, 'utf8').toString('base64');
    const ps = `
        $target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTarget}'));
        $app = $null;
        if (-not (Test-Path -LiteralPath $target) -and $target -notmatch '^[A-Za-z][A-Za-z0-9+.-]*:' -and (Get-Command Get-StartApps -ErrorAction SilentlyContinue)) {
            $apps = @(Get-StartApps);
            $app = $apps | Where-Object { $_.Name -ieq $target } | Select-Object -First 1;
            if (-not $app) {
                $appMatches = @($apps | Where-Object { $_.Name.IndexOf($target, [StringComparison]::OrdinalIgnoreCase) -ge 0 });
                if ($appMatches.Count -eq 1) {
                    $app = $appMatches[0];
                }
            }
        }
        if ($app) {
            Start-Process -FilePath ("shell:AppsFolder\\$($app.AppID)") -ErrorAction Stop;
        } else {
            Start-Process -FilePath $target -ErrorAction Stop;
        }
    `.replace(/\n/g, ' ');

    return await new Promise((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', ps],
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr.trim() || error.message));
                    return;
                }
                resolve(`Opened ${target}`);
            },
        );
    });
}
async function closeApp(appName) {
    const cleanName = appName.replace('.exe', '');
    return await runPS(`Stop-Process -Name '${cleanName}' -Force -ErrorAction SilentlyContinue; Write-Output 'Closed ${cleanName}'`);
}
async function typeText(text) {
    // Escape special SendKeys characters (+, ^, %, ~, (, ), [, ])
    const escaped = text.replace(/([+^%~()[\]])/g, '{$1}').replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`;
    await runPS(ps);
    return `Typed: "${text}"`;
}
async function runShell(command) {
    return await new Promise((resolve) => {
        exec(command, (err, stdout, stderr) => {
            if (err) return resolve(`Command failed: ${stderr || err.message}`);
            resolve(stdout.trim() || 'Command executed.');
        });
    });
}
module.exports =
    {
     searchFiles, openTarget, closeApp, typeText, runShell
    };