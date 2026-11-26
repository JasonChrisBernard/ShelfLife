import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const testGroq = async () => {
  try {
    console.log(
      "Groq key loaded:",
      Boolean(process.env.GROQ_API_KEY)
    );

    const completion =
      await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are ShelfLife, a helpful food management assistant.",
          },
          {
            role: "user",
            content:
              "Give me one short idea for using bread before it expires.",
          },
        ],

        model:
          process.env.GROQ_MODEL ||
          "openai/gpt-oss-120b",
      });

    console.log("\nShelfLife AI:");
    console.log(
      completion.choices[0]?.message?.content
    );
  } catch (error) {
    console.error(
      "Groq error:",
      error.message
    );
  }
};

testGroq();