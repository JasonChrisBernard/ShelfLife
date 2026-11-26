import Groq from 'groq-sdk';

export async function askGroq(messages) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  if (!Array.isArray(messages)) throw new TypeError('Expected an array of messages');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20000, maxRetries: 1 });
  const result = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3,
  });
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no text');
  return text;
}
