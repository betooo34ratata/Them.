async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.analysis || errorData.error || `Server error: ${response.status}`);
        }
        
        // If it's a 502/503/504 or HTML (server starting), retry
        if (response.status >= 500 || !contentType || !contentType.includes("application/json")) {
          if (i === retries) throw new Error("Serverul AI este momentan indisponibil. Vă rugăm să reîncercați peste un minut.");
          const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`Server error: ${response.status}`);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        if (i === retries) throw new Error("Răspuns invalid de la server. Vă rugăm să reîncercați.");
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      return await response.json();
    } catch (error: any) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function analyzeHomework(content: string, subject: string, isCode: boolean, attemptNumber: number, imageData?: { data: string, mimeType: string }) {
  try {
    return await fetchWithRetry("/api/analyze-homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, subject, isCode, attemptNumber, imageData }),
    });
  } catch (error: any) {
    console.error("Analyze Homework Error:", error);
    return {
      analysis: error.message || "Eroare la conectarea cu Lumi AI.",
      hasErrors: false,
      difficulty: "Medium",
      suggestedPoints: 100
    };
  }
}

export async function generateQuiz(subject: string, topic: string) {
  try {
    return await fetchWithRetry("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, topic }),
    });
  } catch (error: any) {
    console.error("Generate Quiz Error:", error);
    throw error;
  }
}

export async function analyzeTeacher(teacherName: string, subject: string, classesCount: number, studentCount: number) {
  try {
    return await fetchWithRetry("/api/analyze-teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherName, subject, classesCount, studentCount }),
    });
  } catch (error: any) {
    console.error("Analyze Teacher Error:", error);
    throw error;
  }
}
