import { IssueRecord } from "../types";

const getApiKey = () => {
  if (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return null;
};

const callOpenAI = async (messages: { role: string, content: string }[], jsonMode: boolean = false): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Missing OpenAI API Key");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", 
        messages: messages,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API Error:", errText);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;

  } catch (e) {
    console.error("OpenAI Network Error:", e);
    return null;
  }
};

export const askGemini = async (prompt: string): Promise<string> => {
  const result = await callOpenAI([{ role: "user", content: prompt }]);
  return result || "Unable to generate response. Please check API key.";
};

export const generateDashboardInsights = async (history: IssueRecord[]): Promise<string> => {
  const simplifiedHistory = history.slice(0, 50).map(h => ({
    item: h.itemName,
    qty: h.quantity,
    machine: h.machineName,
    loc: h.locationId,
    date: h.timestamp.split('T')[0]
  }));

  const prompt = `Analyze this warehouse issue log data: ${JSON.stringify(simplifiedHistory)}.
  Provide 3 concise, actionable operational insights or patterns you detect (e.g., high consumption machines, frequent items).
  Format as a bulleted list. Keep it professional.`;

  const result = await callOpenAI([{ role: "user", content: prompt }]);
  return result || "No insights generated.";
};

export const generateIssueEmail = async (input: IssueRecord | IssueRecord[]): Promise<{ subject: string; body: string }> => {

  const records = Array.isArray(input) ? input : [input];
  if (records.length === 0) return { subject: "Error", body: "No records provided" };

  const firstRecord = records[0];
  const isMultiLine = records.length > 1;

  const fallbackSubject = `Issue Alert: ${isMultiLine ? 'Multiple Items' : firstRecord.itemName}`;
  const fallbackBody = `New issue recorded.\n\nMachine: ${firstRecord.machineName}\nLocation: ${firstRecord.locationId}\n\nItems:\n${records.map(r => `- ${r.itemName} (${r.quantity})`).join('\n')}`;

  const itemsDescription = records.map(r => `${r.itemName} (Qty: ${r.quantity})`).join(", ");

  const prompt = `Draft a professional email notification for a warehouse material issue slip.
      
  Context:
  - Location: ${firstRecord.locationId}
  - Machine: ${firstRecord.machineName}
  - Date: ${firstRecord.timestamp}
  - Items Issued: ${itemsDescription}

  Return the response in Valid JSON format with "subject" and "body" keys.
  The body should be plain text, ready to send.`;

  const result = await callOpenAI([{ role: "user", content: prompt }], true);

  if (!result) return { subject: fallbackSubject, body: fallbackBody };

  try {
    return JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse OpenAI JSON:", e);
    return { subject: fallbackSubject, body: fallbackBody };
  }
};
