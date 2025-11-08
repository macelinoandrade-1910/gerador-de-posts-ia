
import React, { useState } from 'react';
import {
  ImageStyle,
  CaptionTone,
  StyleGuide,
  GeneratedPost,
  GeneratedCaption,
  GeneratedCampaign,
} from './types';
import { generateSocialMediaPost, generateSocialMediaCampaign } from './services/geminiService';

// Componente para um ícone de "copiar"
const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

// Card de Legenda com funcionalidades
const CaptionCard: React.FC<{ caption: GeneratedCaption; title: string; isMain?: boolean }> = ({ caption, title, isMain = false }) => {
  const fullCaptionText = `${caption.text}\n\n${caption.cta}\n\n${caption.hashtags.map(h => `#${h}`).join(' ')}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCaptionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`p-4 rounded-lg bg-white border border-slate-200 transition-shadow hover:shadow-md ${isMain ? 'bg-yellow-50 border-yellow-300' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-slate-700">{title}</h4>
        <button onClick={handleCopy} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-1 px-2 rounded-md transition-colors">
          <CopyIcon /> {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{caption.text}</p>
      <p className="text-sm text-slate-800 font-medium mt-2">
        <strong>CTA:</strong> {caption.cta}
      </p>
      <div className="mt-3 text-xs text-blue-600">
        {caption.hashtags.map((h) => `#${h}`).join(' ')}
      </div>
    </div>
  );
};

// Helper function to convert a File to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

const PostResult: React.FC<{ post: GeneratedPost }> = ({ post }) => (
    <div className="space-y-6">
        <div>
            {post.postGoal && (
                 <p className="text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-full py-1 px-3 inline-block mb-3">
                    🎯 Objetivo: {post.postGoal}
                </p>
            )}
            <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img src={post.imageUrl} alt={post.altText} className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">
                    <strong>Alt Text:</strong> {post.altText}
                </p>
                <a href={post.imageUrl} download={`post-gerado-${Date.now()}.png`} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-1 px-2 rounded-md transition-colors">Baixar Imagem</a>
            </div>
        </div>
        <div className="space-y-4">
            <CaptionCard caption={post.mainCaption} title="Legenda Principal" isMain />
            {post.captionVariations.map((caption, index) => (
                <CaptionCard key={index} caption={caption} title={`Variação ${index + 1}`} />
            ))}
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-2">
            <p><strong>💡 Sugestão para Postar:</strong> {post.postingSuggestion}</p>
            <p><strong>😃 Emojis Sugeridos:</strong> {post.suggestedEmojis.join(' ')}</p>
        </div>
    </div>
);


function App() {
  // State for form inputs
  const [productDescription, setProductDescription] = useState('');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [imageStyle, setImageStyle] = useState<ImageStyle>(ImageStyle.Realistic);
  const [captionTone, setCaptionTone] = useState<CaptionTone>(CaptionTone.Friendly);
  const [styleGuide, setStyleGuide] = useState<StyleGuide>({
    brandColors: '',
    keyElements: '',
    keywordsToAvoid: '',
  });
  const [generateCampaign, setGenerateCampaign] = useState(false);

  // State for API interaction and results
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleStyleGuideChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setStyleGuide({ ...styleGuide, [e.target.name]: e.target.value });
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setReferenceImages(Array.from(e.target.files));
    }
  };
  
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productDescription.trim()) {
            setError("Por favor, descreva seu produto ou tópico.");
            return;
        }
        if (referenceImages.length === 0) {
            setError("Por favor, envie pelo menos uma imagem de referência.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedPost(null);
        setGeneratedCampaign(null);
        setActiveTab(0);

        try {
            const imageBase64Promises = referenceImages.map(fileToBase64);
            const imageBase64Strings = await Promise.all(imageBase64Promises);
            
            if(generateCampaign) {
                const campaign = await generateSocialMediaCampaign(
                    productDescription,
                    imageStyle,
                    captionTone,
                    styleGuide,
                    imageBase64Strings
                );
                setGeneratedCampaign(campaign);
            } else {
                const post = await generateSocialMediaPost(
                    productDescription,
                    imageStyle,
                    captionTone,
                    styleGuide,
                    imageBase64Strings
                );
                setGeneratedPost(post);
            }

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
            setError(`Falha ao gerar o conteúdo: ${errorMessage}. Verifique o console para mais detalhes e tente novamente.`);
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Gerador de Posts com IA</h1>
          <p className="mt-2 text-lg text-slate-600 max-w-2xl mx-auto">
            Crie posts individuais ou campanhas completas para redes sociais em segundos. Descreva sua ideia e deixe a IA criar tudo para sua marca.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna do Formulário */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="productDescription" className="block text-sm font-semibold text-slate-700 mb-1">1. Descreva sua empresa, tom e objetivo</label>
                <textarea
                  id="productDescription"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Clínica infantil acolhedora, foco em inclusão, tom caloroso, público: pais de crianças pequenas."
                  rows={4}
                  required
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                  maxLength={300}
                />
              </div>

             <div>
                <label htmlFor="referenceImages" className="block text-sm font-semibold text-slate-700 mb-1">2. Envie imagens de referência</label>
                 <input 
                    type="file" 
                    id="referenceImages" 
                    multiple 
                    accept="image/png, image/jpeg" 
                    onChange={handleImageChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                 />
                 <p className="text-xs text-slate-500 mt-1">Envie fotos da sua empresa, produtos ou identidade visual.</p>
                 {referenceImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        {referenceImages.map((file, index) => (
                            <img key={index} src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="w-full h-20 object-cover rounded-md" />
                        ))}
                    </div>
                 )}
              </div>

              <div>
                <h2 className="block text-sm font-semibold text-slate-700 mb-2">3. Defina o Estilo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="imageStyle" className="block text-xs font-medium text-slate-600 mb-1">Estilo da Imagem</label>
                    <select id="imageStyle" value={imageStyle} onChange={(e) => setImageStyle(e.target.value as ImageStyle)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition bg-white">
                      {Object.values(ImageStyle).map((style) => <option key={style} value={style}>{style}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="captionTone" className="block text-xs font-medium text-slate-600 mb-1">Tom da Legenda</label>
                    <select id="captionTone" value={captionTone} onChange={(e) => setCaptionTone(e.target.value as CaptionTone)} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition bg-white">
                      {Object.values(CaptionTone).map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                 <h2 className="block text-sm font-semibold text-slate-700 mb-2">4. Guia de Estilo da Marca (Opcional)</h2>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="brandColors" className="block text-xs font-medium text-slate-600 mb-1">Cores Principais</label>
                        <input type="text" id="brandColors" name="brandColors" value={styleGuide.brandColors} onChange={handleStyleGuideChange} placeholder="Tons pastel, verde suave, amarelo claro" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
                    </div>
                     <div>
                        <label htmlFor="keyElements" className="block text-xs font-medium text-slate-600 mb-1">Elementos-Chave / Símbolos</label>
                        <input type="text" id="keyElements" name="keyElements" value={styleGuide.keyElements} onChange={handleStyleGuideChange} placeholder="Crianças brincando, ambiente seguro, luz natural" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
                    </div>
                     <div>
                        <label htmlFor="keywordsToAvoid" className="block text-xs font-medium text-slate-600 mb-1">Palavras-chave a Evitar</label>
                        <input type="text" id="keywordsToAvoid" name="keywordsToAvoid" value={styleGuide.keywordsToAvoid} onChange={handleStyleGuideChange} placeholder="Ambiente hospitalar, cores escuras, tristeza" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
                    </div>
                 </div>
              </div>

               <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={generateCampaign}
                        onChange={(e) => setGenerateCampaign(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-slate-700">✨ Gerar uma mini-campanha (3 posts)</span>
                </label>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-yellow-400 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 transition-all duration-300 ease-in-out disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center text-lg">
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Gerando...
                  </>
                ) : (generateCampaign ? 'Gerar Campanha' : 'Gerar Post Único')}
              </button>
            </form>
          </div>

          {/* Coluna dos Resultados */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-8 self-start">
            {isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                <svg className="animate-spin h-10 w-10 text-yellow-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-lg font-semibold text-slate-700">A IA está criando...</h3>
                <p className="text-slate-500">Isso pode levar alguns segundos.</p>
              </div>
            )}
            {error && <div className="flex items-center justify-center min-h-[500px] text-center p-4 bg-red-50 text-red-700 rounded-lg"><p>{error}</p></div>}
            
            {!isLoading && !error && !generatedPost && !generatedCampaign && (
                 <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                    <div className="text-5xl mb-4">🎨</div>
                    <h3 className="text-lg font-semibold text-slate-700">Seu conteúdo aparecerá aqui</h3>
                    <p className="text-slate-500 max-w-xs">Preencha o formulário e clique em "Gerar" para ver a mágica acontecer.</p>
                 </div>
            )}
            
            {generatedPost && <PostResult post={generatedPost} />}

            {generatedCampaign && (
              <div className="space-y-6">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Campanha Gerada</h2>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border"><strong>Estratégia:</strong> {generatedCampaign.campaignStrategy}</p>
                 </div>

                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        {generatedCampaign.posts.map((_, index) => (
                             <button key={index} onClick={() => setActiveTab(index)} className={`${
                                activeTab === index
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                Post {index + 1}
                            </button>
                        ))}
                    </nav>
                </div>

                <div>
                    <PostResult post={generatedCampaign.posts[activeTab]} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
