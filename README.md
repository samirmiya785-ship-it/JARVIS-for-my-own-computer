# JARVIS for My Own Computer (Nirfaa)

Nirfaa is a Windows voice-controlled desktop assistant. It listens for a wake phrase, transcribes short microphone recordings with Google Gemini, sends recognized commands to a Gemini chat model, and can perform selected actions on the computer.

## What it can do

- Wake on a transcript containing **“Nirfaa”** or **“you up”** and return to standby when told **“go to sleep”** or **“standby.”**
- Open applications, files, folders, and URLs.
- Search for files through the bundled C helper (`core.exe`, built from `core.c`).
- Close applications, type text into the currently focused window, and run Windows shell commands.
- Speak responses using Windows text-to-speech, preferring an installed female voice.

The assistant uses `gemini-3.5-transcribe` for speech-to-text, with **Nirfaa** as a custom vocabulary term, and `gemini-3.5-flash-lite` for conversation and tool selection. Windows PowerShell records microphone clips and handles speech synthesis and desktop actions.

## Requirements

- Windows with PowerShell, Node.js, and a working microphone.
- Internet access and a Google Gemini API key.
- Microphone access enabled in Windows, with the intended input device selected.

## Setup and run

1. Install the Node.js dependencies:

   ```powershell
   npm install
   ```

2. Create a `.env` file in the project root:

   ```text
   GEMINI_API_KEY=your_gemini_api_key
   ```

   Keep the key private; `.env` is ignored by Git.

3. Start Nirfaa from the project directory:

   ```powershell
   node nirfaa.js
   ```

   You can also run `start_nirfaa.vbs` to launch it hidden. Use the terminal command when troubleshooting so you can see errors and transcription output.

4. Say **“Hey Nirfaa, you up?”**, wait for the greeting, then give a separate command. For example, **“Open Notepad.”** Say **“go to sleep”** to return to standby.

## Project files

| File | Purpose |
| --- | --- |
| `nirfaa.js` | Main loop, wake/standby behavior, Gemini chat, and tool dispatch |
| `voice.js` | Microphone recording orchestration, Gemini transcription, and Windows TTS |
| `test.ps1` | Records a WAV microphone clip and reports recording errors |
| `os_actions.js` | Opens targets and implements desktop actions |
| `bridge.js` | Calls the C helper for file search |
| `core.c` / `core.exe` | C file-search helper |
| `start_nirfaa.vbs` | Hidden Windows launcher |

## Recent improvements

- Improved microphone error reporting and corrected the transcription request to use the Gemini speech-to-text API and its expected configuration format.
- Added the assistant name to transcription vocabulary to improve wake-word recognition.
- Aligned the chat model with the available fallback model after Gemini 3.6 returned temporary 503 errors.
- Made application launching use Windows app/path handling, return promptly, and report failures instead of silently claiming success.
- Made the launcher use its own folder and removed an automatic file-open test that ran when the C helper was imported.

## Notes

- Audio is recorded in four-second clips and sent to Gemini for transcription; recognition pauses while each clip is transcribed. This is not continuous streaming, so speech during that pause may be missed.
- The temporary `input.wav` is replaced on each listening cycle.
- Voice clips and recognized commands are sent to Google Gemini. The `runShell` action can execute Windows shell commands, so use the assistant only on a trusted machine and protect the API key.
