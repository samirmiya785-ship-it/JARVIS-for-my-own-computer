const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TEMP_AUDIO = path.join(__dirname, "input.wav");

// 1. Speak text out loud using Windows female TTS voice
function speak(text) {
  return new Promise((resolve) => {
    const cleanText = text.replace(/[*_#`]/g, "").replace(/'/g, "''");
    const ps = `
            Add-Type -AssemblyName System.Speech;
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Female);
            $synth.Rate = 1;
            $synth.Speak('${cleanText}');
        `.replace(/\n/g, " ");

    exec(`powershell -NoProfile -Command "${ps}"`, () => resolve());
  });
}

// 2. Record 4 seconds of microphone audio using WinMM
function recordAudio(seconds = 4) {
  return new Promise((resolve) => {
    if (fs.existsSync(TEMP_AUDIO)) fs.unlinkSync(TEMP_AUDIO);

    const ps = `
            Add-Type -TypeDefinition '
                using System;
                using System.Runtime.InteropServices;
                using System.Text;
                public class WinMM {
                    [DllImport("winmm.dll", CharSet = CharSet.Ansi)]
                    public static extern int mciSendString(string command, StringBuilder returnString, int returnLength, IntPtr hwndCallback);
                }
            ';
            [WinMM]::mciSendString("open new Type waveaudio Alias r", $null, 0, [IntPtr]::Zero);
            [WinMM]::mciSendString("record r", $null, 0, [IntPtr]::Zero);
            Start-Sleep -Seconds ${seconds};
            [WinMM]::mciSendString("save r \\"${TEMP_AUDIO.replace(/\\/g, "\\\\")}\\"", $null, 0, [IntPtr]::Zero);
            [WinMM]::mciSendString("close r", $null, 0, [IntPtr]::Zero);
        `.replace(/\n/g, " ");

    exec(`powershell -NoProfile -Command "${ps}"`, () => {
      resolve(fs.existsSync(TEMP_AUDIO));
    });
  });
}

// 3. Listen & Transcribe using Gemini's audio model
async function listen() {
  process.stdout.write("."); // Prints a dot so you know she's listening
  const recorded = await recordAudio(4);
  if (!recorded) return "";

  try {
    const audioBytes = fs.readFileSync(TEMP_AUDIO).toString("base64");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: "Transcribe exactly what is spoken in this audio. If there is only silence, background noise, or no clear speech, reply with literally just: SILENCE" },
        { inlineData: { mimeType: "audio/wav", data: audioBytes } },
      ],
      config: { temperature: 0.0 },
    });

    const transcript = response.text ? response.text.trim() : "";
    if (!transcript || transcript.toUpperCase().includes("SILENCE")) {
      return "";
    }

    console.log(`\n[Mic Debug] Heard: "${transcript}"`);
    return transcript;
  } catch (err) {
    return "";
  }
}

module.exports = { speak, listen };
