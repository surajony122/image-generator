
export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_34 = '3:4',
  STORY = '9:16',
  LANDSCAPE = '16:9',
}

export type Level = 1 | 2 | 3 | 4 | 5;
export type Resolution = '1K' | '2K' | '4K';

export interface ShotConfig {
  id: string;
  pose: string;
  shotType: 'full shot' | 'mid shot' | 'close-up' | 'macro detail' | 'lifestyle' | 'walking';
  angle: 'eye-level' | 'low' | 'top-down' | 'side';
  sceneArea?: string;
  isGenerating?: boolean;
  resultUrl?: string;
  editPrompt?: string;
}

export interface EnvironmentCategory {
  placeName: string;
  areas: string[]; 
  description: string;
  suggestedBackgroundPrompt: string; // Specific prompt for this set
}

export interface AIAnalysisResult {
  category: string;
  attributes: {
    colors: string[];
    material: string;
    textures: string[];
    logoPresent: boolean;
    patternDetails: string;
  };
  recommendedMood: string;
  recommendedLighting: string;
  environmentCategories: EnvironmentCategory[];
  poseSuggestions: {
    poseName: string;
    creativePrompt: string;
    recommendedShotType: string;
    contextEnvironment: string; 
  }[];
}

export interface D2CState {
  currentPage: 'login' | 'dashboard' | 'generator' | 'history';
  projectTitle: string;
  productImages: ImageData[];
  detailImages: ImageData[];
  referenceImages: ImageData[];
  modelSheet: ImageData[];
  referenceModelImage: ImageData | null;
  masterBackgroundAnchor: string | null; // The visual anchor from the FIRST shot
  globalBackgroundPrompt: string; 
  customPrompt: string;
  negativePrompt: string;
  location: string;
  brandVibe: string;
  consistency: {
    background: boolean;
    model: boolean;
    productDetails: boolean;
  };
  quality: {
    premium: Level;
    realism: Level;
    texture: Level;
    dof: Level;
    lens: string;
    cameraType: string;
    lighting: string;
    resolution: Resolution;
  };
  shots: ShotConfig[];
  analysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  isBatchGenerating: boolean;
  history: any[];
  results: { id: string; url: string; promptUsed: string }[];
  aspectRatio: AspectRatio;
  hasCustomKey: boolean;
}

export interface ImageData {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
}
