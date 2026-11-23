require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const osActions = require("./os_actions");
const { speak, listen } = require("./voice");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const tools = [
  {
    functionDeclarations: [
      {
        name: "searchFiles",
        description: "Search for files or folders on the laptop using the C engine.",
        parameters: {
          type: "OBJECT",
          properties: {
            directory: { type: "STRING", description: 'Starting folder, e.g., "." or "C:/Users"' },
            query: { type: "STRING", description: "Filename or keyword to search for" },
          },
          required: ["directory", "query"],
        },
      },
      {
        name: "openTarget",
        description: 'Open any file, folder, website URL, or application (e.g., "notepad", "chrome", "C:/file.pdf").',
        parameters: {
          type: "OBJECT",
          properties: {
            targetPath: { type: "STRING", description: "App name, URL, or file path to open" },
          },
          required: ["targetPath"],
        },
      },
      {
        name: "closeApp",
        description: 'Close or kill a running application by name (e.g., "chrome", "notepad", "spotify").',
        parameters: {
          type: "OBJECT",
          properties: {
            appName: { type: "STRING", description: "Name of the application process to close" },
          },
          required: ["appName"],
        },
      },
      {
        name: "typeText",
        description: "Type text directly onto the screen wherever the keyboard cursor is currently focused.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING", description: "The exact text to type out" },
          },
          required: ["text"],
        },
      },
      {
        name: "runShell",
        description: "Execute any Windows terminal/CMD command for full system control (volume, battery, system info, scripts).",
        parameters: {
          type: "OBJECT",
          properties: {
            command: { type: "STRING", description: "Windows command to execute" },
          },
          required: ["command"],
        },
      },
    ],
  },
];
const chat = ai.chats.create({
  model: "gemini-3.5-flash-lite",
  config: {
    systemInstruction: `
            You are Nirfaa, a loyal, witty, and sharp personal AI assistant living inside the user's laptop.
            - You have full control over his laptop via your tools. Execute commands swiftly without asking unnecessary permission but have to ask before deleting something.
            - When he talks to you casually or vents (e.g., "I am frustrated buddy"), DO NOT call any tools. Respond like a genuine, warm, grounded best friend.
            - Keep your responses concise, natural, and conversational (1-3 sentences max) because your words are spoken out loud via voice synthesis.
        `,
    tools: tools, //
    temperature: 0.7,
  },
});
async function executeToolCall(call) {
  const { name, args } = call;
  console.log(`[Action] ${name}:`, args);

  if (name === "searchFiles") return await osActions.searchFiles(args.directory, args.query);
  if (name === "openTarget") return await osActions.openTarget(args.targetPath);
  if (name === "closeApp") return await osActions.closeApp(args.appName);
  if (name === "typeText") return await osActions.typeText(args.text);
  if (name === "runShell") return await osActions.runShell(args.command);
  return "Unknown action.";
}
async function startNirfaa() {
  let isAwake = false;
  console.log('Nirfaa is running in standby mode. Say "Hey Nirfaa, you up?" to wake her.');

  while (true) {
    const heard = await listen();
    if (!heard) continue;

    const lower = heard.toLowerCase();
    console.log(`[Heard]: "${heard}"`);
    if (!isAwake) {
      if (lower.includes("nirfaa") || lower.includes("you up")) {
        isAwake = true;
        const greeting = "Always up for you. What do we need to get done?";
        console.log(`[Nirfaa]: ${greeting}`);
        await speak(greeting);
      }
      continue;
    }
    if (lower.includes("go to sleep") || lower.includes("standby")) {
      isAwake = false;
      const bye = "Going on standby. Just call my name when you need me.";
      console.log(`[Nirfaa]: ${bye}`);
      await speak(bye);
      continue;
    }
    try {
      let response = await chat.sendMessage({ message: heard });

      // If Gemini wants to run an OS tool, execute it and feed the result back
      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        const toolOutput = await executeToolCall(call);

        response = await chat.sendMessage({
          message: [
            {
              functionResponse: {
                name: call.name,
                response: { result: toolOutput },
              },
            },
          ],
        });
      }
      if (response.text) {
        console.log(`[Nirfaa]: ${response.text}`);
        await speak(response.text);
      }
    } catch (err) {
      console.error("[Brain Error]:", err.message);
      await speak("Sorry, my brain hit a quick snag. Say that again?");
    }
  }
}

startNirfaa();
