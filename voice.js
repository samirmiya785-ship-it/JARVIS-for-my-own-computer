const { exec } = require('child_process');
function speak(text) {
    return new Promise((resolve) => {
        // Strip markdown asterisks/symbols so she doesn't read them aloud
        const cleanText = text.replace(/[*_#`]/g, '').replace(/'/g, "''");
        const ps = `
            Add-Type -AssemblyName System.Speech;
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Female);
            $synth.Rate = 1;
            $synth.Speak('${cleanText}');
        `.replace(/\n/g, ' ');

        exec(`powershell -NoProfile -Command "${ps}"`, () => resolve());
    });
}
function listen() {
    return new Promise((resolve) => {
        const ps = `
            Add-Type -AssemblyName System.Speech;
            $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
            $rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar));
            $rec.SetInputToDefaultAudioDevice();
            $result = $rec.Recognize([TimeSpan]::FromSeconds(6));
            if ($result) { Write-Output $result.Text }
        `.replace(/\n/g, ' ');

        exec(`powershell -NoProfile -Command "${ps}"`, (err, stdout) => {
            resolve(stdout ? stdout.trim() : '');
        });
    });
}

module.exports = {
    speak, listen
};