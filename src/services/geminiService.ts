import { GoogleGenAI, Modality, Type } from "@google/genai";
import {
  CaptionTone,
  GeneratedPost,
  ImageStyle,
  StyleGuide,
  GeneratedCampaign,
} from "../types";

// Verifique se a chave da API está disponível. A variável de ambiente DEVE começar com VITE_
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("A chave da API VITE_GEMINI_API_KEY não foi encontrada. Verifique seu arquivo .env ou as configurações de ambiente.");
}

// Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey });

// Define the JSON schema for a single caption. This ensures the model returns data in a structured format.
const generatedCaptionSchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "O conteúdo principal de texto da legenda.",
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Uma lista de hashtags relevantes, sem o símbolo '#'.",
    },
    cta: {
      type: Type.STRING,
      description:
        "Uma chamada para ação (call-to-action) convincente para o post.",
    },
  },
  required: ["text", "hashtags", "cta"],
};

/**
 * Generates a complete social media post, including an image and multiple caption options,
 * based on user-provided descriptions and style guides.
 *
 * @param productDescription A description of the product or topic for the post.
 * @param imageStyle The desired visual style for the generated image.
 * @param captionTone The desired tone for the generated captions.
 * @param styleGuide A guide containing brand colors, key elements, and keywords to avoid.
 * @param referenceImages An array of base64-encoded strings of the reference images.
 * @returns A promise that resolves to a GeneratedPost object.
 */
export const generateSocialMediaPost = async (
  productDescription: string,
  imageStyle: ImageStyle,
  captionTone: CaptionTone,
  styleGuide: StyleGuide,
  referenceImages: string[]
): Promise<GeneratedPost> => {
  // 1. Generate the image using a multimodal prompt (text + reference images)
  const imagePrompt = `
    Análise Crítica de Imagem e Geração de Conteúdo para Redes Sociais.

    **Passo 1: Identificação do Sujeito Principal.**
    Primeiro, analise CUIDADOSAMENTE as imagens de referência fornecidas para identificar o produto, serviço ou sujeito principal (ex: um tipo de sanduíche, um item de vestuário, um serviço de consultoria). O post DEVE ser sobre este sujeito específico.

    **Passo 2: Geração da Nova Imagem.**
    Com base no sujeito identificado, gere uma imagem completamente nova para um post de rede social que combine o sujeito com a ideia do post. A nova imagem deve:
    - Apresentar CLARAMENTE o sujeito identificado no Passo 1 como o foco principal.
    - Refletir o contexto ou a mensagem do post: "${productDescription}".
    - Seguir o estilo visual: "${imageStyle}".
    - Aderir ao guia de estilo da marca:
        - Cores da marca: ${styleGuide.brandColors}.
        - Elementos-chave a incorporar: ${styleGuide.keyElements}.
        - Conceitos a evitar: ${styleGuide.keywordsToAvoid}.
    - **Regra Absoluta**: A imagem gerada não deve conter, sob nenhuma circunstância, qualquer tipo de texto, letra ou palavra. Deve ser puramente visual.
    - A imagem final deve ter qualidade profissional, ser atraente e em formato quadrado (1:1), ideal para Instagram. Não copie as imagens de referência; crie uma cena original que represente o produto dentro do contexto solicitado.
  `;

  // Construct the multimodal parts for the request
  const imageRequestParts: any[] = [{ text: imagePrompt }];
  for (const imageBase64 of referenceImages) {
    imageRequestParts.push({
      inlineData: {
        mimeType: "image/jpeg", // Assuming jpeg, can be made more dynamic
        data: imageBase64,
      },
    });
  }

  const imageResponse = await ai.models.generateContent({
    model: "models/nano-banana",
    contents: { parts: imageRequestParts },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  let imageUrl: string = "";
 if (!imageResponse.candidates || 
      imageResponse.candidates.length === 0 ||
      !imageResponse.candidates[0]?.content?.parts) {
    throw new Error("Resposta inválida da API de imagem");
  }
 
  for (const part of imageResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes =part.inlineData.data as string;
      imageUrl = `data:image/png;base64,${base64ImageBytes}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("A imagem não pôde ser gerada.");
  }

  // 2. Generate the text content (captions, alt text, etc.) using the cost-effective gemini-2.5-flash
  const textPrompt = `
    Você é um especialista em marketing de redes sociais. Com base na seguinte descrição de produto e guia de estilo, crie um conjunto completo de ativos de texto para um post no Instagram. O público-alvo são consumidores em geral.

    **Descrição do Produto/Tópico:**
    ${productDescription}

    **Estilo de Imagem Desejado:**
    ${imageStyle}

    **Tom da Legenda Desejado:**
    ${captionTone}

    **Guia de Estilo:**
    - Cores da Marca: ${styleGuide.brandColors}
    - Elementos-Chave: ${styleGuide.keyElements}
    - Palavras-chave a Evitar: ${styleGuide.keywordsToAvoid}

    Forneça a saída em formato JSON.
  `;

  const textResponse = await ai.models.generateContent({
    model: "models/nano-banana",
    contents: textPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          altText: {
            type: Type.STRING,
            description:
              "Um texto alternativo descritivo para a imagem gerada, com foco em acessibilidade.",
          },
          mainCaption: generatedCaptionSchema,
          captionVariations: {
            type: Type.ARRAY,
            description: "Duas variações de legenda alternativas.",
            items: generatedCaptionSchema,
          },
          postingSuggestion: {
            type: Type.STRING,
            description:
              "Uma breve sugestão sobre o melhor horário ou contexto para publicar este post.",
          },
          suggestedEmojis: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "Uma lista de 3 a 5 emojis relevantes para aprimorar o post.",
          },
        },
        required: [
          "altText",
          "mainCaption",
          "captionVariations",
          "postingSuggestion",
          "suggestedEmojis",
        ],
      },
    },
  });

  const textData = JSON.parse(textResponse.text as string);

  // 3. Combine image and text into a single post object
  const finalPost: GeneratedPost = {
    imageUrl,
    altText: textData.altText,
    mainCaption: textData.mainCaption,
    captionVariations: textData.captionVariations,
    postingSuggestion: textData.postingSuggestion,
    suggestedEmojis: textData.suggestedEmojis,
  };

  return finalPost;
};

/**
 * Generates a 3-post social media campaign.
 */
export const generateSocialMediaCampaign = async (
  productDescription: string,
  imageStyle: ImageStyle,
  captionTone: CaptionTone,
  styleGuide: StyleGuide,
  referenceImages: string[]
): Promise<GeneratedCampaign> => {
  // 1. Generate text content for all 3 posts in one call
  const textPrompt = `
    Você é um estrategista de marketing de redes sociais. Sua tarefa é criar uma mini-campanha de 3 posts para o Instagram.
    A campanha deve seguir uma narrativa lógica:
    1.  **Post 1 (Teaser/Conscientização):** Gerar curiosidade sobre o tópico.
    2.  **Post 2 (Detalhe/Consideração):** Fornecer mais informações e benefícios.
    3.  **Post 3 (Ação/Conversão):** Incentivar uma ação específica (compra, visita, etc.).

    **Tópico Central da Campanha:**
    ${productDescription}

    **Guia de Estilo Geral:**
    - Estilo Visual: ${imageStyle}
    - Tom da Legenda: ${captionTone}
    - Cores da Marca: ${styleGuide.brandColors}
    - Elementos-Chave: ${styleGuide.keyElements}
    - Palavras-chave a Evitar: ${styleGuide.keywordsToAvoid}

    Analise as imagens de referência para identificar o produto/serviço principal. Baseie toda a campanha nesse produto/serviço.

    Para cada um dos 3 posts, forneça:
    - O objetivo do post dentro da campanha.
    - Uma descrição detalhada para a IA de imagem gerar uma imagem (esta descrição deve ser única para cada post e seguir a estratégia).
    - Texto alternativo (alt text).
    - Uma legenda principal (com texto, hashtags, cta).
    - Duas variações de legenda.
    - Uma sugestão de postagem.
    - Emojis sugeridos.

    Forneça a saída como um único objeto JSON.
  `;

  const textResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: textPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          campaignStrategy: {
            type: Type.STRING,
            description:
              "Uma breve descrição da estratégia geral da campanha de 3 posts.",
          },
          posts: {
            type: Type.ARRAY,
            description: "Uma lista contendo exatamente 3 objetos de post.",
            items: {
              type: Type.OBJECT,
              properties: {
                postGoal: {
                  type: Type.STRING,
                  description: "O objetivo específico deste post na campanha (Ex: Gerar curiosidade).",
                },
                imageDescription: {
                  type: Type.STRING,
                  description:
                    "Uma descrição detalhada para a IA gerar a imagem deste post específico.",
                },
                altText: { type: Type.STRING },
                mainCaption: generatedCaptionSchema,
                captionVariations: {
                  type: Type.ARRAY,
                  items: generatedCaptionSchema,
                },
                postingSuggestion: { type: Type.STRING },
                suggestedEmojis: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                "postGoal",
                "imageDescription",
                "altText",
                "mainCaption",
                "captionVariations",
                "postingSuggestion",
                "suggestedEmojis",
              ],
            },
          },
        },
        required: ["campaignStrategy", "posts"],
      },
    },
  });

  const campaignData: GeneratedCampaign = JSON.parse(textResponse.text as string);

  // 2. Generate an image for each post description
  for (const post of campaignData.posts) {
    const imagePrompt = `
      Análise Crítica de Imagem e Geração de Conteúdo para Redes Sociais.

      **Passo 1: Identificação do Sujeito Principal.**
      Analise CUIDADOSAMENTE as imagens de referência para identificar o produto/serviço principal.

      **Passo 2: Geração da Nova Imagem.**
      Com base no sujeito identificado e na descrição a seguir, gere uma imagem para um post:
      **Descrição da Imagem a ser Gerada:** "${post.imageDescription}"

      **Requisitos da Imagem:**
      - Deve seguir o estilo visual: "${imageStyle}".
      - Deve aderir ao guia de estilo da marca: Cores (${styleGuide.brandColors}), Elementos (${styleGuide.keyElements}), Evitar (${styleGuide.keywordsToAvoid}).
      - **Regra Absoluta**: Não inclua NENHUM texto, letra ou palavra.
      - A imagem deve ser de qualidade profissional, atraente e em formato quadrado (1:1).
    `;

    const imageRequestParts: any[] = [{ text: imagePrompt }];
    for (const imageBase64 of referenceImages) {
      imageRequestParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: imageRequestParts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let imageUrl: string = "";
   if (!imageResponse.candidates || 
        imageResponse.candidates.length === 0 ||
        !imageResponse.candidates[0]?.content?.parts) {
      throw new Error("Resposta inválida da API de imagem");
    }
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes = part.inlineData.data as string;
        imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        break;
      }
    }

    if (!imageUrl) {
      // Fallback or error
      post.imageUrl = "https://via.placeholder.com/1080";
      console.error(
        `Falha ao gerar imagem para o post: ${post.postGoal}`
      );
    } else {
      post.imageUrl = imageUrl;
    }
  }

  return campaignData;
};
