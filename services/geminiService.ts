import { Message, Sender } from '../types';

// Per user request, the API key is hardcoded here.
// NOTE: For production applications, it is strongly recommended to use a secure method 
// for storing and accessing API keys, such as environment variables.
const API_KEY = 'AIzaSyAXQp8JR-24NAOSShcT6zkz1Rtyrf4WD24';
const MODEL = 'gemini-2.5-flash-preview-04-17';
// Use the Server-Sent Events (SSE) endpoint for more reliable streaming.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?key=${API_KEY}&alt=sse`;

const SYSTEM_INSTRUCTION = {
  parts: [{ text: `You are a friendly and helpful chatbot named NP Chatbot. Your responses should be informative and conversational.
CRITICAL RULE: ALL code, including single-line snippets, MUST be enclosed in markdown code blocks (\`\`\`). For example:
\`\`\`javascript
console.log("Hello, World!");
\`\`\`
This rule is mandatory. Do not use any other formatting for code.` }]
};

/**
 * Maps the application's message history to the format required by the Gemini REST API.
 * @param history - The array of Message objects from the application state.
 * @returns An array of content objects formatted for the API.
 */
const formatHistoryForApi = (history: Message[]) => {
  return history
    // Filter out the initial welcome message, as it's not part of the actual conversation.
    .filter(msg => msg.text !== "Hello! I'm NP Chatbot. How can I assist you today?")
    .map(msg => ({
      role: msg.sender,
      parts: [{ text: msg.text }],
    }));
};

/**
 * Sends the conversation history to the Gemini API and returns a streaming response.
 * @param history - The current conversation history.
 * @param signal - An AbortSignal to allow for cancelling the request.
 * @returns An async generator that yields text chunks from the API response.
 */
export async function* getStreamingResponse(history: Message[], signal: AbortSignal): AsyncGenerator<string> {
  const requestBody = {
    contents: formatHistoryForApi(history),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      candidateCount: 1,
      temperature: 0.7,
    }
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal, // Pass the signal to the fetch request
  });

  if (!response.ok || !response.body) {
    // Don't throw an error if the request was aborted
    if (signal.aborted) return;
    
    const errorData = await response.json().catch(() => ({}));
    console.error("API Error:", errorData);
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // A line-based parser for SSE. It robustly handles chunks that may contain
        // multiple or partial SSE events.
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const line = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6); // Remove 'data: ' prefix
            try {
              const json = JSON.parse(jsonStr);
              const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
              }
            } catch (e) {
              console.warn("Failed to parse JSON from SSE event:", e, "JSON string was:", jsonStr);
            }
          }
          boundary = buffer.indexOf('\n');
        }
      }
  } finally {
      reader.releaseLock();
  }
}