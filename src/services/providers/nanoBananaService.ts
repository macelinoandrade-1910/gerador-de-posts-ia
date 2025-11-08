export const generateWithNanoBanana = async (prompt: string, refs?: string[]) => {
  console.log("🍌 NanoBanana mock ativo:", prompt, refs);
  return `https://via.placeholder.com/512x512.png?text=NanoBanana:+${encodeURIComponent(prompt)}`;
};
