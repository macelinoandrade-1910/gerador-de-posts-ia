import { generateWithGemini } from './geminiService';
import { generateWithNanoBanana } from './nanoBananaService';
import { generateWithReplicate } from './replicateService';

export enum ImageProvider {
  Gemini = 'Gemini',
  NanoBanana = 'NanoBanana',
  Replicate = 'Replicate',
}

export async function generateImage(provider: ImageProvider, prompt: string, refs: string[]) {
  switch (provider) {
    case ImageProvider.NanoBanana:
      return await generateWithNanoBanana(prompt, refs);
    case ImageProvider.Replicate:
      return await generateWithReplicate(prompt, refs);
    case ImageProvider.Gemini:
    default:
      return await generateWithGemini(prompt, refs);
  }
}
