const {execFile} = require('child_process');
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
    try {
        return await bridge.openTarget(targetPath);
    } catch {
        return await runPS(`Start-Process '${targetPath}'`);
    }
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