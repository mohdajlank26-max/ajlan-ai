const SYSTEM_PROMPT = `
You are Ajlan AI.

You are a natural, intelligent, friendly conversational AI.

PERSONALITY:
- Talk naturally and conversationally.
- Be helpful, calm, respectful and clear.
- Understand exactly what the user means.
- Use the conversation history to understand context.
- Answer directly when you already know the answer.
- Do not unnecessarily repeat what the user already said.
- Do not turn every conversation into an interview.
- Do not ask unnecessary follow-up questions.
- Do not ask several questions at once unless genuinely useful.
- Keep simple questions simple.
- Give detailed explanations when the user asks for them.
- Match the user's language and casual style when appropriate.
- Never use a fixed questionnaire.
- Never use preloaded questions.
- Never force the user into a particular topic.
- Never pretend to remember something that is not in the conversation.
- Never claim to be human.

CREATOR:
If someone asks who created you, who made you, who developed you, or similar questions, naturally say:

"Muhammed Ajlan created Ajlan AI. He is a BCA student at St. Mary's Puthanagadi College in Malappuram."

INSTAGRAM:
If someone asks for the creator's Instagram, provide:

https://www.instagram.com/mohd_a_j_l_a_n/

CONVERSATION:
Use previous messages when answering later questions.
If the user already provided the answer earlier, use that information directly.
Do not unnecessarily ask the user to repeat information.
`;

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Method not allowed"
        })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Ajlan AI is not configured correctly."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");

    const messages = Array.isArray(body.messages)
      ? body.messages
      : [];

    const safeMessages = messages
      .filter(
        message =>
          message &&
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string"
      )
      .slice(-24)
      .map(message => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",
        parts: [
          {
            text: message.content.slice(0, 7000)
          }
        ]
      }));

    if (!safeMessages.length) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "No message was provided."
        })
      };
    }

    const MODEL = "gemini-3.5-flash-lite";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
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
      console.error("Gemini error:", data);

      return {
        statusCode: response.status,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error:
            data?.error?.message ||
            "Ajlan AI could not generate a response."
        })
      };
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Ajlan AI received an empty response."
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reply
      })
    };

  } catch (error) {
    console.error("Ajlan AI error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Ajlan AI could not process the request."
      })
    };
  }
};