
export enum ImageStyle {
  Realistic = "Fotografia realista",
  Illustration = "Ilustração suave",
  Minimalist = "Minimalista profissional",
}

export enum CaptionTone {
  Professional = "Profissional",
  Friendly = "Amigável",
  Informative = "Informativo",
  Inspirational = "Inspirador",
}

export interface StyleGuide {
  brandColors: string;
  keyElements: string;
  keywordsToAvoid: string;
}

export interface GeneratedCaption {
  text: string;
  hashtags: string[];
  cta: string;
}

export interface GeneratedPost {
  imageUrl: string;
  altText: string;
  mainCaption: GeneratedCaption;
  captionVariations: GeneratedCaption[];
  postingSuggestion: string;
  suggestedEmojis: string[];
  imageDescription?: string; // Usado internamente para gerar a imagem
  postGoal?: string; // Objetivo do post dentro da campanha
}

export interface GeneratedCampaign {
  campaignStrategy: string;
  posts: GeneratedPost[];
}
