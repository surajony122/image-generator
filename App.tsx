
import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Briefcase, Sparkles, AlertCircle, RefreshCw, ChevronRight, X, Settings, Sliders, Layout, Monitor, Users } from 'lucide-react';
import { UserBrief, ImageData, AspectRatio, GenerationState, Level, GrainLevel } from './types';
import { generateProductPhoto } from './geminiService';

const STATUS_MESSAGES = [
  "Studio setup in progress...",
  "Calibrating high-end lens optics...",
  "Positioning softbox arrays...",
  "Capturing RAW data...",
  "Applying Vogue-level retouching...",
  "Color grading for premium output..."
];

export default function App() {
  const [productImage, setProductImage] = useState<ImageData | null>(null);
  const [refImage1, setRefImage1] = useState<ImageData | null>(null);
  const [refImage2, setRefImage2] = useState<ImageData | null>(null);
  
  const [activeTab, setActiveTab] = useState<'brief' | 'technical' | 'retouch'>('brief');

  const [brief, setBrief] = useState<UserBrief>({
    productType: '',
    userPrompt: '',
    platform: 'Meta Ads',
    themeLocation: '',
    backgroundStyle: 'Minimal Luxury',
    propsAllowed: 'minimal',
    propsList: '',
    modelUsage: 'none',
    modelDetails: '',
    poseAction: '',
    premiumLevel: 5,
    realismLevel: 5,
    detailLevel: 5,
    bgCleanLevel: 4,
    dofLevel: 4,
    contrastLevel: 3,
    grainLevel: 1,
    sharpnessLevel: 5,
    lightingStyle: 'Soft Studio',
    lensLook: 'DSLR 50mm',
    aspectRatio: AspectRatio.SQUARE,
    outputSize: 'high',
  });

  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    resultUrl: null,
    statusMessage: STATUS_MESSAGES[0],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (data: ImageData | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter({
          base64: reader.result as string,
          mimeType: file.type,
          previewUrl: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startGeneration = async () => {
    if (!productImage || !refImage1) {
      setGenState(prev => ({ ...prev, error: "Please upload both a Product Image and at least one Reference Image." }));
      return;
    }

    setGenState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: null, 
      resultUrl: null,
      statusMessage: STATUS_MESSAGES[0]
    }));

    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % STATUS_MESSAGES.length;
      setGenState(prev => ({ ...prev, statusMessage: STATUS_MESSAGES[msgIndex] }));
    }, 4000);

    try {
      const result = await generateProductPhoto(productImage, refImage1, refImage2, brief);
      setGenState(prev => ({ ...prev, resultUrl: result, isGenerating: false }));
    } catch (err: any) {
      setGenState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    } finally {
      clearInterval(interval);
    }
  };

  const Slider = ({ label, value, min = 1, max = 5, onChange }: { label: string, value: number, min?: number, max?: number, onChange: (v: number) => void }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
        <span className="text-[10px] font-bold text-white bg-white/10 px-1.5 rounded">{value}</span>
      </div>
      <input 
        type="range" min={min} max={max} step="1" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 pb-20">
      <header className="border-b border-white/10 py-6 px-4 md:px-8 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-white text-black p-2 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <Camera size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase flex items-center gap-2">
            Pro-Shot <span className="text-gray-500 font-light">Commercial</span>
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">
          <span>Award-Winning Quality</span>
          <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
          <span>DPI Optimized</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Controls Column */}
        <div className="xl:col-span-5 space-y-10">
          
          {/* Section 1: Asset Lab */}
          <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-gray-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Asset Laboratory</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Source Product (The Truth)</label>
                <div className={`relative border-2 border-dashed rounded-2xl transition-all h-52 overflow-hidden group ${productImage ? 'border-white/40 bg-white/[0.03]' : 'border-white/10 hover:border-white/20'}`}>
                  {productImage ? (
                    <>
                      <img src={productImage.previewUrl} className="w-full h-full object-contain p-4" alt="Product" />
                      <button onClick={() => setProductImage(null)} className="absolute top-3 right-3 bg-black/70 p-2 rounded-full hover:bg-black text-white"><X size={14} /></button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <ImageIcon className="text-gray-700 mb-2" size={24} />
                      <span className="text-[10px] font-bold text-gray-600">DROP PRODUCT PHOTO</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setProductImage)} />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Primary Reference (Style)</label>
                  <div className={`relative border-2 border-dashed rounded-xl h-36 overflow-hidden group ${refImage1 ? 'border-white/40' : 'border-white/10 hover:border-white/20'}`}>
                    {refImage1 ? (
                      <>
                        <img src={refImage1.previewUrl} className="w-full h-full object-cover" alt="Ref 1" />
                        <button onClick={() => setRefImage1(null)} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white"><X size={12} /></button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                        <span className="text-[9px] font-bold text-gray-600">COMPOSITION REF</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setRefImage1)} />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Secondary Ref (Mood)</label>
                  <div className={`relative border-2 border-dashed rounded-xl h-36 overflow-hidden group ${refImage2 ? 'border-white/40' : 'border-white/10 hover:border-white/20'}`}>
                    {refImage2 ? (
                      <>
                        <img src={refImage2.previewUrl} className="w-full h-full object-cover" alt="Ref 2" />
                        <button onClick={() => setRefImage2(null)} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white"><X size={12} /></button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                        <span className="text-[9px] font-bold text-gray-600">LOCATION REF</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setRefImage2)} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Command Center */}
          <section className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
            <div className="flex border-b border-white/5">
              {[
                { id: 'brief', icon: Briefcase, label: 'Brief' },
                { id: 'technical', icon: Layout, label: 'Specs' },
                { id: 'retouch', icon: Sliders, label: 'Retouch' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <tab.icon size={16} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
                  {activeTab === tab.id && <div className="h-0.5 w-4 bg-white mt-1"></div>}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[400px]">
              {activeTab === 'brief' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Free Creative Prompt</label>
                    <textarea 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-white/30 h-24 resize-none"
                      placeholder="e.g. A luxury watch resting on a volcanic rock, water droplets on the glass, cinematic lighting..."
                      value={brief.userPrompt}
                      onChange={(e) => setBrief({...brief, userPrompt: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Product Type</label>
                      <input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.productType} onChange={(e) => setBrief({...brief, productType: e.target.value})} placeholder="e.g. Chronograph" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Platform</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.platform} onChange={(e) => setBrief({...brief, platform: e.target.value})}>
                        <option>Meta Ads</option>
                        <option>Website Banner</option>
                        <option>Amazon Listing</option>
                        <option>Catalog Print</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Model Usage</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.modelUsage} onChange={(e) => setBrief({...brief, modelUsage: e.target.value as any})}>
                        <option value="none">None</option>
                        <option value="hands only">Hands Only</option>
                        <option value="full model">Full Model</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Props Allowed</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.propsAllowed} onChange={(e) => setBrief({...brief, propsAllowed: e.target.value as any})}>
                        <option value="none">None</option>
                        <option value="minimal">Minimal</option>
                        <option value="moderate">Moderate</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'technical' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lighting Style</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.lightingStyle} onChange={(e) => setBrief({...brief, lightingStyle: e.target.value})}>
                        <option>Soft Studio</option>
                        <option>Hard Studio High-Contrast</option>
                        <option>Window Daylight</option>
                        <option>Golden Hour Natural</option>
                        <option>Night Neon</option>
                        <option>Warm Festive</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lens Look</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm" value={brief.lensLook} onChange={(e) => setBrief({...brief, lensLook: e.target.value})}>
                        <option>iPhone Natural</option>
                        <option>DSLR 35mm</option>
                        <option>DSLR 50mm</option>
                        <option>DSLR 85mm Portrait</option>
                        <option>Macro Close-up</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.values(AspectRatio).map((ratio) => (
                        <button key={ratio} onClick={() => setBrief({...brief, aspectRatio: ratio})} className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${brief.aspectRatio === ratio ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}>
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Output Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['standard', 'high', 'ultra'].map((size) => (
                        <button key={size} onClick={() => setBrief({...brief, outputSize: size as any})} className={`py-2 text-[10px] font-bold rounded-lg border uppercase transition-all ${brief.outputSize === size ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'retouch' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <Slider label="Premium Level" value={brief.premiumLevel} onChange={(v) => setBrief({...brief, premiumLevel: v as Level})} />
                  <Slider label="Realism / Naturalness" value={brief.realismLevel} onChange={(v) => setBrief({...brief, realismLevel: v as Level})} />
                  <Slider label="Detail / Texture Pop" value={brief.detailLevel} onChange={(v) => setBrief({...brief, detailLevel: v as Level})} />
                  <Slider label="Depth of Field (Bokeh)" value={brief.dofLevel} onChange={(v) => setBrief({...brief, dofLevel: v as Level})} />
                  <Slider label="Contrast / Punch" value={brief.contrastLevel} onChange={(v) => setBrief({...brief, contrastLevel: v as Level})} />
                  <Slider label="Sharpness on Hero" value={brief.sharpnessLevel} onChange={(v) => setBrief({...brief, sharpnessLevel: v as Level})} />
                  <Slider label="Film Grain" value={brief.grainLevel} min={0} max={3} onChange={(v) => setBrief({...brief, grainLevel: v as GrainLevel})} />
                </div>
              )}
            </div>
          </section>

          <button 
            onClick={startGeneration}
            disabled={genState.isGenerating || !productImage || !refImage1}
            className="w-full py-6 bg-white text-black rounded-3xl font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
          >
            {genState.isGenerating ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Processing RAW...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Release Shutter
              </>
            )}
          </button>

          {genState.error && (
            <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl flex items-center gap-3 text-red-200 text-[10px] uppercase font-bold tracking-widest">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p>{genState.error}</p>
            </div>
          )}
        </div>

        {/* Studio View Column */}
        <div className="xl:col-span-7">
          <div className="sticky top-28 bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden min-h-[700px] flex flex-col items-center justify-center p-6 shadow-2xl">
            {!genState.resultUrl && !genState.isGenerating && (
              <div className="text-center space-y-8 max-w-sm px-4">
                <div className="mx-auto w-24 h-24 bg-white/[0.03] rounded-full flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
                  <Monitor size={48} className="text-gray-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter mb-3 uppercase">Commercial Output</h3>
                  <p className="text-gray-500 text-xs leading-relaxed uppercase tracking-widest font-medium">
                    Your premium render will appear here. Our AI Photographer uses advanced lens physics to ensure product accuracy and bokeh quality.
                  </p>
                </div>
                <div className="pt-6 grid grid-cols-3 gap-6 text-[9px] font-bold text-gray-700 uppercase tracking-widest">
                  <div className="space-y-2"><Camera size={14} className="mx-auto"/><span>DSLR Optics</span></div>
                  <div className="space-y-2"><Sparkles size={14} className="mx-auto"/><span>Retouched</span></div>
                  <div className="space-y-2"><Users size={14} className="mx-auto"/><span>Pro Grade</span></div>
                </div>
              </div>
            )}

            {genState.isGenerating && (
              <div className="text-center space-y-10">
                <div className="relative w-40 h-40 mx-auto">
                  <div className="absolute inset-0 border-[6px] border-white/5 rounded-full"></div>
                  <div className="absolute inset-0 border-[6px] border-t-white rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                      <Camera size={32} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-2xl font-bold uppercase tracking-tighter text-white">{genState.statusMessage}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-white w-1/2 animate-[progress_2s_infinite]"></div>
                    </span>
                    <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase">Vogue-Standard Processing</p>
                  </div>
                </div>
              </div>
            )}

            {genState.resultUrl && !genState.isGenerating && (
              <div className="w-full h-full flex flex-col animate-in zoom-in duration-500">
                <div className="flex items-center justify-between mb-6 px-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-widest">Master Shot</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">{brief.productType || 'Product'}_Final.jpg</span>
                  </div>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = genState.resultUrl!;
                      link.download = `${brief.productType || 'shoot'}_result.jpg`;
                      link.click();
                    }}
                    className="group text-xs font-bold uppercase flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Export 300DPI <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="flex-1 bg-black/40 rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/5 relative group cursor-crosshair">
                  <img 
                    src={genState.resultUrl} 
                    className="w-full h-full object-contain" 
                    alt="Generation result" 
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Camera Settings</p>
                         <p className="text-xs font-bold text-white uppercase">{brief.lensLook} | f/1.8 | ISO 100</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Post Process</p>
                         <p className="text-xs font-bold text-white uppercase">Premium Retouch v{brief.premiumLevel}.0</p>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <footer className="mt-32 border-t border-white/5 pt-16 pb-20 px-4 max-w-7xl mx-auto text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex justify-center gap-4">
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Camera size={14}/></div>
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Sliders size={14}/></div>
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center"><Layout size={14}/></div>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.4em] font-medium">Built for High-Growth E-commerce & Luxury Brands</p>
          <div className="flex justify-center gap-12 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
             <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
             <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
             <span className="hover:text-white cursor-pointer transition-colors">Enterprise</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
