export const generateWithGemini = async (prompt: string, refs?: string[]) => {
  console.log("🔹 Gemini mock ativo:", prompt, refs);
  return `https://via.placeholder.com/512x512.png?text=Gemini:+${encodeURIComponent(prompt)}`;
};
