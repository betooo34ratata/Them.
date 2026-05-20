import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;

console.log(`Starting server...`);
console.log(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to check for API key
const checkApiKey = (res: any) => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing!");
    res.status(500).json({ error: "Configurarea AI lipsește pe server (API Key missing)." });
    return false;
  }
  return true;
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

app.get("/api/debug-ai", async (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  const maskedKey = key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : "too short or empty";
  
  try {
    console.log(`[Diagnostic] Încearcă apel de test cu cheia ${maskedKey}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "say 'Lumi AI Diagnostic: OK'"
    });
    
    const text = response.text || "";
    res.json({
      status: "success",
      maskedKey,
      keyLength: key.length,
      response: text,
      env: process.env.NODE_ENV
    });
  } catch (error: any) {
    console.error("[Diagnostic] EROARE:", error);
    res.json({
      status: "error",
      maskedKey,
      keyLength: key.length,
      errorMessage: error.message || String(error),
      errorStatus: error.status || error.error?.code || "unknown",
      errorStack: error.stack || "",
      env: process.env.NODE_ENV
    });
  }
});

async function generateContentWithRetry(params: any, totalRetries = 10) {
  // Modelele ordonate după fiabilitate și viteză în AI Studio
  const fallbackModels = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite"
  ];
  
  // Începem cu modelul solicitat + restul listei fără duplicate
  const uniqueModels = [...new Set([params.model, ...fallbackModels])].filter(Boolean);
  
  let lastError: any = null;
  let globalAttempts = 0;

  for (const currentModel of uniqueModels) {
    if (globalAttempts >= totalRetries) break;

    // Încercăm modelul de maxim 2 ori (în caz că e un spike temporar de 503/429)
    for (let i = 0; i < 2; i++) {
      if (globalAttempts >= totalRetries) break;
      globalAttempts++;
      
      try {
        params.model = currentModel;
        console.log(`[AI] # ${globalAttempts}: Apel ${currentModel}...`);
        
        let response;
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents: Array.isArray(params.contents) ? params.contents : [params.contents],
            config: params.config
          });
        } catch (innerError: any) {
          // În caz că primim o eroare din cauza unei scheme complexe de răspuns, reîncercăm fără schemă
          if (params.config?.responseSchema) {
            console.log(`[AI] Schema complexă a eșuat pe ${currentModel}. Reîncercăm FĂRĂ schema (conversie simplă în format JSON)...`);
            const fallbackConfig = { ...params.config };
            delete fallbackConfig.responseSchema;
            
            response = await ai.models.generateContent({
              model: currentModel,
              contents: Array.isArray(params.contents) ? params.contents : [params.contents],
              config: fallbackConfig
            });
          } else {
            throw innerError;
          }
        }
        
        if (!response) {
            throw new Error("Răspuns vid de la SDK");
        }

        const responseText = response.text || "";
        console.log(`[AI] SUCCES pe ${currentModel}. Text length: ${responseText?.length || 0}`);
        
        // Return a normalized object that has a .text property as a string
        return { ...response, text: responseText };
      } catch (error: any) {
        lastError = error;
        const status = error.status || (error.error?.code) || 0;
        const errorMsg = (error.message || error.stack || JSON.stringify(error)).toLowerCase();
        
        console.error(`[AI] FAIL ${currentModel}: [Status ${status}] ${errorMsg.substring(0, 500)}`);

        // 404/403 -> Model indisponibil tehnic sau regional
        if (status === 404 || status === 403 || errorMsg.includes("not found") || errorMsg.includes("not supported") || errorMsg.includes("permission")) {
          console.log(`[AI] -> ${currentModel} indisponibil (404/403). Următorul model.`);
          break; 
        }

        // 429 -> Quota
        if (status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("exhausted")) {
          if (errorMsg.includes("limit: 0")) {
             console.log(`[AI] -> Quota ZERO pe ${currentModel}. Sarim imediat.`);
             break;
          }

          const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/);
          if (retryMatch && i === 0) {
            const waitMs = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
            if (waitMs < 3000) { // Redus timpul de așteptare pentru a nu bloca UX-ul
              console.log(`[AI] -> Spike scurt (429). Aștept ${waitMs}ms...`);
              await new Promise(r => setTimeout(r, waitMs));
              continue;
            }
          }
          console.log(`[AI] -> Quota plină pe ${currentModel}. Trecem la fallback.`);
          break; 
        }

        // 503/500 -> Server busy
        if (status === 503 || status === 500 || errorMsg.includes("demand") || errorMsg.includes("overloaded")) {
          if (i === 0) {
            const delay = 300 + Math.random() * 700; // Redus delay-ul
            console.log(`[AI] -> Server busy. Backoff de ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          break;
        }
        
        break;
      }
    }
  }
  
  const finalMsg = lastError?.message || `${lastError}` || "Lumi AI este momentan suprasolicitată de numărul imens de elevi!";
  throw new Error(finalMsg);
}

app.post("/api/analyze-homework", async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { content, subject, isCode, attemptNumber, imageData } = req.body;
    
    const numberedAttempt = Number(attemptNumber) || 1;
    let attemptInstructions = "";
    
    if (numberedAttempt < 3) {
      attemptInstructions = `
      1. Check if the solution is completely correct.
      2. If completely correct, the "analysis" field should just be "Corect! Felicitări." and "hasErrors" should be false.
      3. If there are any errors or mistakes, the "analysis" field MUST be EXACTLY: "Nu-i bine problema, mai încearcă încă o dată." and "hasErrors" MUST be true.
      4. Do NOT write any other text, comments, or explanations if there are errors. Just output exactly: "Nu-i bine problema, mai încearcă încă o dată."
      `;
    } else {
      attemptInstructions = `
      1. Check if the solution is correct. If correct, the "analysis" field can simply be "Corect! Felicitări." and "hasErrors" should be false.
      2. Since this is attempt #${numberedAttempt} (which is 3 or more), if there are any errors, you MUST provide a detailed academic analysis in Romanian explaining clearly exactly where the student went wrong and what the correct answer/solution is. Set "hasErrors" to true.
      3. Be extremely supportive and thorough, explaining the logic step-by-step.
      `;
    }

    const prompt = `
      Analyze the following homework for the subject "${subject}" (written in Romanian).
      This is attempt number ${numberedAttempt} for this student.
      ${isCode ? "The content is source code." : "The content is text."}
      ${imageData ? "An image of the homework/exercise is also provided for visual analysis." : ""}
      
      Homework content:
      """
      ${content}
      """
      
      EVALUATION INSTRUCTIONS:
      ${attemptInstructions}

      GENERAL INSTRUCTIONS:
      - Assess the difficulty level (Easy, Medium, High).
      - Suggested points: 1-15 based on complexity.
      
      Return the result in JSON format matching this exact design structure but with actual boolean/string/number values:
      {
        "analysis": "Markdown formatted feedback in Romanian language",
        "hasErrors": true,
        "difficulty": "Easy",
        "suggestedPoints": 50
      }
    `;

    console.log(`[AI] ROBUST PROMPT (numberedAttempt: ${numberedAttempt}):`, prompt);

    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data.split(',')[1] || imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            hasErrors: { type: Type.BOOLEAN },
            difficulty: { type: Type.STRING },
            suggestedPoints: { type: Type.NUMBER }
          },
          required: ["analysis", "hasErrors", "difficulty", "suggestedPoints"]
        }
      },
    });

    const text = response.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch (parseError) {
      console.error("Parse Error in homework:", text);
      res.status(500).json({ error: "Răspuns invalid de la Lumi AI (JSON parse fail)." });
    }
  } catch (error: any) {
    console.error("Gemini Route Error Homework:", error.message || error);
    res.status(500).json({
      analysis: "Lumi AI este momentan suprasolicitată. Vă rugăm să reîncercați în câteva minute.",
      hasErrors: false,
      difficulty: "Medium",
      suggestedPoints: 100
    });
  }
});

app.post("/api/generate-quiz", async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { subject, topic } = req.body;
    
    const prompt = `
      You are an expert educator. Generate a high-quality multiple-choice quiz about "${topic}" for the high school subject "${subject}".
      Provide exactly 5 challenging but fair questions.
      
      Return ONLY a JSON object with this exact structure:
      {
        "title": "A creative title for the quiz",
        "questions": [
          {
            "question": "The question text here?",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctAnswer": 0
          }
        ]
      }
      
      Ensure all correctAnswer values are valid indices (0-3) for the options array.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.INTEGER }
                },
                required: ["question", "options", "correctAnswer"]
              }
            }
          },
          required: ["title", "questions"]
        }
      },
    });

    const text = response.text || "{}";
    try {
      res.json(JSON.parse(text));
    } catch (parseError) {
      console.error("Parse Error in quiz:", text);
      res.status(500).json({ error: "Răspuns invalid de la Lumi AI (JSON parse fail)." });
    }
  } catch (error: any) {
    console.error("Gemini Route Error Quiz:", error.message || error);
    const msg = error.message || String(error);
    let errorMessage = "Lumi AI este momentan suprasolicitată. Reveniți în câteva minute.";
    
    if (msg.includes("API_KEY") || msg.includes("API key") || msg.includes("api_key") || msg.includes("key")) {
      errorMessage = "Cheia API Gemini configurată pe server are o problemă sau este invalidă (API Key error).";
    } else if (msg.includes("quota") || msg.includes("Quota") || msg.includes("limit") || msg.includes("429")) {
      errorMessage = "S-a atins limita de apeluri/utilizări (Quota/Rate limit reached). Vă rugăm să reîncercați peste câteva minute.";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: msg
    });
  }
});

app.post("/api/analyze-school", async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { schoolCode, studentsCount, teachersCount, classesCount, totalPoints, topStudents } = req.body;
    
    const prompt = `
      Ești consilierul de elită Lumi AI pentru directorul instituției de învățământ cu codul școlar "${schoolCode}".
      Generează un raport strategic complex de audit academic și managerial de sfârșit de ciclu / trimestru în limba română.
      
      DATE STATISTICE COLECTATE PENTRU AUDIT:
      - Cod Școală: ${schoolCode}
      - Total Elevi Înrolați: ${studentsCount}
      - Corp Profesoral: ${teachersCount} profesori activi în platformă
      - Nuclee de Studiu (Clase Active): ${classesCount} clase configurate
      - Punctaj Total Merit acumulat de elevi: ${totalPoints} puncte merit
      - Top Elevi Performeri:
        ${topStudents ? JSON.stringify(topStudents) : "Nicio înregistrare disponibilă"}

      GENEREAZĂ RAPORTUL STRUCTURAT ÎN URMĂTOARELE SECȚIUNI MARKDOWN:
      1. 📊 INFORMARE STRATEGICĂ - O privire de ansamblu pozitivă dar riguroasă despre implicarea profesorilor și elevilor.
      2. 🎯 DIAGNOSTIC ACADEMIC ȘI DE ACTIVITATE - O interpretare a raportului dintre punctele de merit (${totalPoints}) și numărul de elevi. Oferă un coeficient de productivitate academică.
      3. 🚀 SARCINI ȘI RECOMANDĂRI ADMINISTRATIVE PENTRU DIRECTOR - Ce măsuri specifice trebuie luate pentru a extinde performanța (ex: promovarea de noi activități, training pentru cadrele didactice).
      4. 💡 IDEI DE RECOMPENSE ȘI INIȚIATIVE EXTRAȘCOLARE - bazate pe volumul de puncte acumulat.

      Raportul trebuie să fie foarte academic, dar extrem de motivant, scris pe un ton solemn de mare prestanță educațională. Folosește formatting frumos cu bold, liste bullet și tabele dacă este necesar.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    res.json({ analysis: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Route Error School Analyze:", error.message || error);
    res.status(500).json({ 
      error: "Sistemul Lumi AI de Audit este momentan suprasolicitat. Rezultatele nu au putut fi generate în timp real."
    });
  }
});

app.post("/api/analyze-teacher", async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { teacherName, subject, classesCount, studentCount } = req.body;
    
    const prompt = `
      As a school director, generate a performance analysis for teacher ${teacherName} who teaches ${subject}.
      Context:
      - Classes managed: ${classesCount}
      - Total students: ${studentCount}
      
      Provide a professional summary, identifying potential strengths and areas for mentorship.
      Format: Markdown.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    res.json({ analysis: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Route Error Teacher:", error.message || error);
    res.status(500).json({ 
      error: "Lumi AI este momentan suprasolicitată. Reveniți în câteva minute."
    });
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Ruta API negăsită: ${req.method} ${req.url}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}
