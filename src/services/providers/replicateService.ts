export const generateWithReplicate = async (prompt: string, refs?: string[]) => {
  console.log("🔁 Replicate mock ativo:", prompt, refs);
  return `https://via.placeholder.com/512x512.png?text=Replicate:+${encodeURIComponent(prompt)}`;
};
