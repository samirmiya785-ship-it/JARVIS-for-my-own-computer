require("dotenv").config();
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing. Add it to the .env file.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TEMP_AUDIO = path.join(__dirname, "input.wav");
const REC_SCRIPT = path.join(__dirname, "test.ps1");
const TRANSCRIPTION_PROMPT = "Transcribe exactly what is spoken in this audio. If there is only silence, background noise, or no clear speech, reply with literally just: SILENCE";

// 1. Speak using Windows TTS, preferring a female voice when installed.
function speak(text) {
  return new Promise((resolve) => {
    const cleanText = text.replace(/[*_#`]/g, "");
    const encodedText = Buffer.from(cleanText, "utf8").toString("base64");
    const ps = `
            Add-Type -AssemblyName System.Speech;
            $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedText}'));
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $femaleVoice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq [System.Speech.Synthesis.VoiceGender]::Female } | Select-Object -First 1;
            if ($femaleVoice) { $synth.SelectVoice($femaleVoice.VoiceInfo.Name); }
            $synth.Rate = 1;
            $synth.Speak($text);
        `.replace(/\n/g, " ");

    execFile("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error("\n[TTS Error]:", stderr.trim() || error.message);
      }
      resolve();
    });
  });
}

// 2. Record a short microphone clip.
function recordAudio() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(TEMP_AUDIO)) fs.unlinkSync(TEMP_AUDIO);

    execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", REC_SCRIPT, "-OutFile", TEMP_AUDIO], { cwd: __dirname, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || stdout.trim() || error.message));
        return;
      }

      try {
        const { size } = fs.statSync(TEMP_AUDIO);
        if (size <= 44) {
          reject(new Error("The microphone recording is missing or empty."));
          return;
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function transcribe(audioBytes) {
  const contents = [{ text: TRANSCRIPTION_PROMPT }, { inlineData: { mimeType: "audio/wav", data: audioBytes } }];

  return ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents,
    config: { temperature: 0.0 },
  });
}

// 3. Transcribe the recorded clip.
async function listen() {
  process.stdout.write(".");

  try {
    await recordAudio();
    const audioBytes = fs.readFileSync(TEMP_AUDIO).toString("base64");
    const response = await transcribe(audioBytes);

    const transcript = response.text ? response.text.trim() : "";
    if (!transcript) {
      console.log("\n[Mic] No transcript returned for this clip.");
      return "";
    }
    if (transcript.toUpperCase() === "SILENCE") {
      console.log("\n[Mic] No speech detected in this clip.");
      return "";
    }

    console.log(`\n[Mic Debug] Heard: "${transcript}"`);
    return transcript;
  } catch (err) {
    console.error("\n[Voice Error]:", err.message);
    return "";
  }
}

module.exports = { speak, listen };
