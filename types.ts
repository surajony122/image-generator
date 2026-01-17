
export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_45 = '4:5',
  STORY = '9:16',
  LANDSCAPE = '16:9',
}

export type Level = 1 | 2 | 3 | 4 | 5;
export type GrainLevel = 0 | 1 | 2 | 3;

export interface UserBrief {
  // Scene Spec
  productType: string;
  userPrompt: string;
  platform: string;
  themeLocation: string;
  backgroundStyle: string;
  propsAllowed: 'none' | 'minimal' | 'moderate';
  propsList: string;
  modelUsage: 'none' | 'hands only' | 'full model';
  modelDetails: string;
  poseAction: string;
  
  // Technical & Quality Controls
  premiumLevel: Level;
  realismLevel: Level;
  detailLevel: Level;
  bgCleanLevel: Level;
  dofLevel: Level;
  contrastLevel: Level;
  grainLevel: GrainLevel;
  sharpnessLevel: Level;
  lightingStyle: string;
  lensLook: string;
  aspectRatio: AspectRatio;
  outputSize: 'standard' | 'high' | 'ultra';
}

export interface ImageData {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  resultUrl: string | null;
  statusMessage: string;
}
