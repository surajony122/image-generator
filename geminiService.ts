
import { GoogleGenAI, Type } from "@google/genai";
import { ImageData, AIAnalysisResult, ShotConfig, AspectRatio, Resolution } from "./types";

export const analyzeProductContext = async (productImages: ImageData[]): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts = productImages.map(img => ({
    inlineData: { data: img.base64.split(',')[1], mimeType: img.mimeType }
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Act as a technical product specialist and set designer. Analyze these product images. Extract a 'Technical Blueprint'. Identify: 1. Exact Material (e.g. 1000D Cordura, Brushed Titanium). 2. Micro-textures. 3. Branding Typography and Placement. 4. Primary and Secondary Colors. Suggest 3 'environmentCategories' with 'suggestedBackgroundPrompt'. Also suggest 6-8 'poseSuggestions' contextually for the set. Return strictly as JSON." },
          ...parts
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          attributes: {
            type: Type.OBJECT,
            properties: {
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              material: { type: Type.STRING },
              textures: { type: Type.ARRAY, items: { type: Type.STRING } },
              logoPresent: { type: Type.BOOLEAN },
              patternDetails: { type: Type.STRING }
            },
            required: ["colors", "material", "textures", "logoPresent", "patternDetails"]
          },
          recommendedMood: { type: Type.STRING },
          recommendedLighting: { type: Type.STRING },
          environmentCategories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                placeName: { type: Type.STRING },
                areas: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                suggestedBackgroundPrompt: { type: Type.STRING }
              },
              required: ["placeName", "areas", "description", "suggestedBackgroundPrompt"]
            }
          },
          poseSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                poseName: { type: Type.STRING },
                creativePrompt: { type: Type.STRING },
                recommendedShotType: { type: Type.STRING },
                contextEnvironment: { type: Type.STRING }
              },
              required: ["poseName", "creativePrompt", "recommendedShotType", "contextEnvironment"]
            }
          }
        },
        required: ["category", "attributes", "recommendedMood", "recommendedLighting", "environmentCategories", "poseSuggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateD2CImage = async (
  params: {
    shot: ShotConfig,
    productImages: ImageData[],
    detailImages: ImageData[],
    referenceModelImage: ImageData | null,
    masterBackgroundAnchor: string | null,
    globalBackgroundPrompt: string,
    location: string,
    brandVibe: string,
    consistency: { background: boolean, model: boolean, productDetails: boolean },
    quality: { premium: number, realism: number, texture: number, dof: number, lens: string, cameraType: string, lighting: string, resolution: Resolution },
    aspectRatio: AspectRatio,
    negativePrompt: string,
    technicalAttributes?: any
  }
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = params.quality.resolution === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

  // Digital Twin Protocol: Absolute Product Fidelity
  const productLockPrompt = `
    DIGITAL TWIN REPLICATION PROTOCOL:
    - This is a high-stakes commercial photoshoot. The product is a PHYSICAL ASSET and must be rendered with 100% technical fidelity.
    - MATERIAL FIDELITY: ${params.technicalAttributes?.material || 'Match original materials'} with exact specular highlights and micro-textures.
    - COLOR TEMPERATURE: Match the exact color palette of [PRODUCT_IMAGES]. Zero hue drift.
    - BRANDING INTEGRITY: Maintain exact logo typography, kerning, and placement. No AI halluncinations on labels.
    - LIGHTING & SHADOWS: The product must react to the set lighting with realistic contact shadows and ambient occlusion that matches the product's geometry.
  `;

  const modelInstruction = params.referenceModelImage 
    ? `STRICT MODEL IDENTITY: Strictly use the person in [MODEL_REFERENCE]. Facial geometry, skin sub-surface scattering, and features must be identical to the reference.`
    : `Generate an elite high-fashion model fitting ${params.brandVibe}.`;

  const backgroundProtocol = params.masterBackgroundAnchor
    ? `ENVIRONMENT ANCHOR PROTOCOL: 
       - Lock the architectural set shown in [SET_REFERENCE]. 
       - Do not deviate from the lighting direction, floor texture, or background objects established in the first shot.`
    : `SET DESIGN: ${params.globalBackgroundPrompt || 'A high-end commercial studio.'} Place: ${params.location}. Establish master studio lighting.`;

  const prompt = `
    ROLE: World-Class Commercial Product Photographer.
    TASK: Execute high-fidelity RAW capture for a luxury campaign.
    
    ${productLockPrompt}
    ${modelInstruction}
    ${backgroundProtocol}
    
    HARDWARE CONFIG: ${params.quality.lens} | ${params.quality.cameraType} | ${params.quality.lighting} | DOF Level ${params.quality.dof}/5.
    
    SHOT SPECIFICATION:
    - Activity: ${params.shot.pose}.
    - Composition: ${params.shot.shotType}.
    - Angle: ${params.shot.angle}.
    - Creative Directive: ${params.shot.editPrompt || ''}
    
    NEGATIVE CONSTRAINTS: ${params.negativePrompt || 'distorted product, modified logo, changed materials, color drift, blurred textures, extra limbs, warped face, low resolution.'}
  `;

  const parts: any[] = [{ text: prompt }];
  params.productImages.forEach(img => parts.push({ inlineData: { data: img.base64.split(',')[1], mimeType: img.mimeType } }));
  
  if (params.referenceModelImage) {
      parts.push({ inlineData: { data: params.referenceModelImage.base64.split(',')[1], mimeType: params.referenceModelImage.mimeType } });
  }
  
  if (params.masterBackgroundAnchor) {
      parts.push({ 
        inlineData: { 
          data: params.masterBackgroundAnchor.split(',')[1], 
          mimeType: 'image/png'
        } 
      });
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: params.aspectRatio.replace(':', ':') as any,
        imageSize: modelName === 'gemini-3-pro-image-preview' ? params.quality.resolution : undefined
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Generation failed.");
};
