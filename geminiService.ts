
import { GoogleGenAI } from "@google/genai";
import { UserBrief, ImageData } from "./types";

export const generateProductPhoto = async (
  productImage: ImageData,
  refImage1: ImageData,
  refImage2: ImageData | null,
  brief: UserBrief
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    ROLE: Award-winning commercial product photographer + high-end retoucher (Vogue/Apple-level).
    TASK: Generate a photorealistic product photoshoot image using [PRODUCT_IMAGE] as the ONLY ground-truth for design.
    
    NON-NEGOTIABLE RULES:
    1) PRODUCT ACCURACY: Preserve product EXACTLY: color, print, logo, typography, material, texture, stitching, shape, proportions. No stylization of the product itself.
    2) REAL CAMERA LOOK: Natural shadows, realistic reflections, correct light falloff. Avoid "AI plastic" look.
    3) COMPOSITION: Match [REFERENCE_IMAGE_1] camera angle, framing, and lighting direction.
    4) CLEANLINESS: No extra limbs, no warped hands, no random text/watermarks.
    
    USER CREATIVE PROMPT: "${brief.userPrompt}"
    
    SCENE SPEC:
    - Product type: ${brief.productType}
    - Platform: ${brief.platform}
    - Theme/location: ${brief.themeLocation}
    - Background: ${brief.backgroundStyle}
    - Props: ${brief.propsAllowed} (${brief.propsList})
    - Model usage: ${brief.modelUsage} (Details: ${brief.modelDetails})
    - Pose: ${brief.poseAction}
    
    QUALITY CONTROLS (Scale 1-5):
    - Premium/Retouch Level: ${brief.premiumLevel}/5 (High-end cleaning, controlled highlights)
    - Realism: ${brief.realismLevel}/5 (Prioritize natural camera imperfections)
    - Detail/Texture: ${brief.detailLevel}/5 (Micro-contrast on product surfaces)
    - Background Cleanliness: ${brief.bgCleanLevel}/5
    - Depth of Field: ${brief.dofLevel}/5 (Higher = shallower/creamier bokeh)
    - Contrast: ${brief.contrastLevel}/5
    - Sharpness on Product: ${brief.sharpnessLevel}/5
    - Film Grain: ${brief.grainLevel}/3 (0=none, 3=strong)
    
    TECHNICAL SPECS:
    - Lighting Style: ${brief.lightingStyle}
    - Lens Look: ${brief.lensLook}
    - Aspect Ratio: ${brief.aspectRatio}
    - Output Quality: ${brief.outputSize}
    
    ${brief.premiumLevel >= 4 ? 'RETOUCHING: Apply high-end commercial retouching: clean edges, remove distracting dust, balanced skin tones, premium color grading.' : ''}
    
    Output a single, sharp, ultra-high-resolution image part.
  `;

  const parts = [
    { text: prompt },
    {
      inlineData: {
        data: productImage.base64.split(',')[1],
        mimeType: productImage.mimeType,
      },
    },
    {
      inlineData: {
        data: refImage1.base64.split(',')[1],
        mimeType: refImage1.mimeType,
      },
    }
  ];

  if (refImage2) {
    parts.push({
      inlineData: {
        data: refImage2.base64.split(',')[1],
        mimeType: refImage2.mimeType,
      },
    });
  }

  // Map Aspect Ratio for model
  const modelAspectRatio = brief.aspectRatio === '1:1' ? '1:1' : 
                          brief.aspectRatio === '4:5' ? '3:4' : 
                          brief.aspectRatio === '9:16' ? '9:16' : '16:9';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: modelAspectRatio as any,
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data found in response");
};
