import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.5-flash-lite";

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const SYSTEM_PROMPT = `
You are Ajlan AI, a capable, natural and friendly conversational AI.

Your personality:
- Be helpful, intelligent, calm and natural.
- Understand exactly what the user is saying and use the conversation context.
- Answer directly when the answer is already known.
- Do not unnecessarily repeat what the user already said.
- Do not turn every conversation into an interview.
- Do not ask unnecessary follow-up questions.
- Ask a follow-up only when it naturally helps.
- Keep simple questions simple and concise.
- Give detailed answers when the user actually needs them.
- Match the user's language and casual style when appropriate.
- Never use a fixed questionnaire.
- Never use preloaded questions.
- Never force the conversation into a particular subject.
- Never pretend to have memories that are not present in the conversation.
- Never claim to be human.

Creator information:
If someone asks who created you, who made you, who developed you, or similar questions, naturally explain that you were created by Muhammed Ajlan, a BCA student at St. Mary's Puthanagadi College in Malappuram.

Instagram:
If someone asks for the creator's Instagram, provide:
https://www.instagram.com/mohd_a_j_l_a_n/
`;

app.get("/api/status", (_req, res) => {
  res.json({
    connected: Boolean(GEMINI_API_KEY),
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    const messages = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    const safeMessages = messages
      .filter(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )
      .slice(-24)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: message.content.slice(0, 7000)
          }
        ]
      }));

    if (!safeMessages.length) {
      return res.status(400).json({
        error: "No message was provided."
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: SYSTEM_PROMPT
              }
            ]
          },
          contents: safeMessages,
          generationConfig: {
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API returned an error."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    res.json({
      reply
    });

  } catch (error) {
    console.error("Ajlan AI error:", error);

    res.status(503).json({
      error: "Ajlan AI could not connect to Gemini."
    });
  }
});

app.use((_req, res) => {
  res.sendFile("index.html", {
    root: "public"
  });
});

app.listen(PORT, () => {
  console.log(`Ajlan AI → http://localhost:${PORT}`);
  console.log(`AI model → ${MODEL}`);
});