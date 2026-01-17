
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
          { text: "Analyze these product images for a professional commercial photoshoot. Identify category, materials, and branding. Suggest mood and lighting. Crucially, provide a list of 'locationSuggestions' (name and short description) that would look premium. Also, for each suggested pose, provide a 'creativePrompt' that describes a stunning scene setup and a 'recommendedShotType'. Return strictly as JSON." },
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
          locationSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "description"]
            }
          },
          recommendedLocations: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedSceneAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedShots: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedPoses: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedDetailShots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                focus: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["focus", "description"]
            }
          },
          poseSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                poseName: { type: Type.STRING },
                creativePrompt: { type: Type.STRING },
                recommendedShotType: { type: Type.STRING }
              },
              required: ["poseName", "creativePrompt", "recommendedShotType"]
            }
          }
        },
        required: ["category", "attributes", "recommendedMood", "recommendedLighting", "locationSuggestions", "recommendedLocations", "recommendedSceneAreas", "recommendedShots", "recommendedPoses", "suggestedDetailShots", "poseSuggestions"]
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
    referenceImages: ImageData[],
    modelSheet: ImageData[],
    customPrompt: string,
    negativePrompt: string,
    location: string,
    brandVibe: string,
    consistency: { background: boolean, model: boolean, productDetails: boolean },
    quality: { premium: number, realism: number, texture: number, dof: number, lens: string, cameraType: string, lighting: string, resolution: Resolution },
    aspectRatio: AspectRatio
  }
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = params.quality.resolution === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

  const productLockPrompt = params.consistency.productDetails 
    ? `CRITICAL FIDELITY OVERRIDE: 
       - [PRODUCT_IMAGES] and [DETAIL_IMAGES] are technical blueprints. Replicate branding exactly.
       - The micro-details in [DETAIL_IMAGES] (textures, metal grain, logo edges) MUST appear in the final output.
       - PROHIBITED: Do not alter the product's fundamental design elements or pattern layout.`
    : `Maintain the product's general aesthetic based on the provided references.`;

  const prompt = `
    ROLE: Elite Commercial Product Photographer.
    SYSTEM DIRECTIVE: Capture a high-end commercial masterwork. 
    ${productLockPrompt}
    
    HARDWARE CONFIG:
    - Camera Type: ${params.quality.cameraType}
    - Lens Profile: ${params.quality.lens}
    - Lighting Setup: ${params.quality.lighting}
    - Bokeh/Depth: Level ${params.quality.dof}/5 depth of field.
    
    SCENE & SUBJECT:
    - Subject Pose/Action: ${params.shot.pose}
    - Environmental Setting: ${params.location} (${params.shot.sceneArea || 'Central Area'})
    - Creative Style: ${params.brandVibe}
    
    COMPOSITIONAL BRIEF:
    Framing: ${params.shot.shotType}. Angle: ${params.shot.angle}.
    ${params.customPrompt ? `Global Scene Directive: ${params.customPrompt}` : ''}
    ${params.shot.editPrompt ? `Pose-Specific Creative Brief: ${params.shot.editPrompt}` : ''}
    
    STRICT NEGATIVE CONSTRAINTS:
    ${params.negativePrompt || 'No watermarks, no blurry branding, no AI artifacts, no design drift, no extra limbs.'}
    
    ${params.consistency.background ? 'Environment must strictly match previously established set designs.' : ''}
    ${params.consistency.model ? 'If a model is featured, strictly preserve the character identity from the [MODEL_SHEET].' : ''}
  `;

  const parts: any[] = [{ text: prompt }];
  
  params.productImages.forEach(img => parts.push({ inlineData: { data: img.base64.split(',')[1], mimeType: img.mimeType } }));
  params.detailImages.forEach(img => parts.push({ inlineData: { data: img.base64.split(',')[1], mimeType: img.mimeType } }));
  params.modelSheet.forEach(img => parts.push({ inlineData: { data: img.base64.split(',')[1], mimeType: img.mimeType } }));

  try {
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
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_EXPIRED_OR_INVALID");
    }
    throw error;
  }

  throw new Error("Generation failed - no image returned.");
};
