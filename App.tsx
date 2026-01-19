
import { D2CState, ImageData, AspectRatio, ShotConfig, AIAnalysisResult, Resolution } from './types';
import { analyzeProductContext, generateD2CImage } from './geminiService';

/**
 * D2C PREMIUM PHOTOSHOOT STUDIO - VANILLA JS CORE
 */

const initialState: D2CState = {
  currentPage: 'login',
  projectTitle: 'Untilted Project',
  productImages: [],
  detailImages: [],
  referenceImages: [],
  modelSheet: [],
  referenceModelImage: null,
  masterBackgroundAnchor: null,
  globalBackgroundPrompt: '',
  customPrompt: '',
  negativePrompt: '',
  location: '',
  brandVibe: 'Luxury',
  consistency: { background: true, model: true, productDetails: true },
  quality: { 
    premium: 5, 
    realism: 5, 
    texture: 5, 
    dof: 4, 
    lens: '85mm Prime',
    cameraType: 'DSLR (Canon R5)',
    lighting: 'Soft Window', 
    resolution: '1K' 
  },
  shots: [{ id: Date.now().toString(), pose: 'Elegant standing', shotType: 'mid shot', angle: 'eye-level', editPrompt: '', sceneArea: '' }],
  analysis: null,
  isAnalyzing: false,
  isBatchGenerating: false,
  history: JSON.parse(localStorage.getItem('d2c_history') || '[]'),
  results: [],
  aspectRatio: AspectRatio.SQUARE,
  hasCustomKey: false
};

let state: D2CState = { ...initialState };

const $ = (id: string) => document.getElementById(id);

export function initApp() {
  render();
}

function render() {
  const root = $('root');
  if (!root) return;

  if (state.currentPage === 'login') {
    root.innerHTML = renderLoginPage();
  } else if (state.currentPage === 'dashboard') {
    root.innerHTML = renderDashboardPage();
  } else if (state.currentPage === 'generator') {
    root.innerHTML = renderGeneratorPage();
  }

  attachEventListeners();
}

function renderLoginPage() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-black p-4 text-zinc-100">
      <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 space-y-8 shadow-2xl relative overflow-hidden text-center">
        <div class="text-white text-4xl font-black uppercase tracking-tighter serif">D2C STUDIO</div>
        <p class="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Commercial Photoshoot Engine</p>
        <button id="login-btn" class="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-all shadow-2xl">
          Enter Production
        </button>
      </div>
    </div>
  `;
}

function renderDashboardPage() {
  return `
    <div class="min-h-screen bg-black text-zinc-100 p-12">
      <div class="max-w-6xl mx-auto flex justify-between items-end mb-20">
        <h2 class="text-5xl font-black uppercase tracking-tighter serif text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Photoshoot Vault</h2>
        <button id="new-project-btn" class="bg-white text-black px-10 py-4 rounded-full font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 transition-all">
          + New Shoot
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        ${state.history.length ? state.history.map((proj: any) => `
          <div class="group bg-zinc-900/40 border border-zinc-800 rounded-[3rem] p-7 hover:border-zinc-700 transition-all cursor-pointer shadow-2xl">
             <div class="aspect-square bg-zinc-950 rounded-[2.2rem] mb-6 overflow-hidden flex items-center justify-center">
                ${proj.previewUrl ? `<img src="${proj.previewUrl}" class="w-full h-full object-cover">` : `<span class="text-zinc-800 text-6xl font-black">?</span>`}
             </div>
             <h3 class="text-xl font-black uppercase tracking-tight text-white">${proj.title}</h3>
          </div>
        `).join('') : `
          <div class="col-span-full py-40 text-center opacity-20">
             <p class="text-[12px] font-black uppercase tracking-[0.5em]">No production history found</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderGeneratorPage() {
  const activePlace = state.location || "None Selected";
  const filteredPoses = state.analysis?.poseSuggestions.filter(p => 
      !state.location || 
      p.contextEnvironment.toLowerCase().includes(state.location.toLowerCase()) || 
      state.location.toLowerCase().includes(p.contextEnvironment.toLowerCase())
  ) || state.analysis?.poseSuggestions || [];

  return `
    <div class="min-h-screen bg-[#050505] text-zinc-100 pb-40">
      <!-- Top Nav -->
      <nav class="border-b border-white/5 p-6 flex justify-between items-center bg-black/90 backdrop-blur-2xl sticky top-0 z-50">
        <div class="flex items-center gap-5">
           <button id="nav-dash" class="text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">← Vault</button>
           <h1 class="text-white text-sm font-black uppercase tracking-widest border-l border-white/10 pl-5">${state.projectTitle}</h1>
        </div>
        <div class="flex items-center gap-4">
            <button id="reset-studio-btn" class="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all">Reset Studio</button>
            <button id="batch-generate-btn" ${state.isBatchGenerating ? 'disabled' : ''} class="bg-white text-black px-12 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
              ${state.isBatchGenerating ? 'Replicating Details...' : 'Execute Shoot'}
            </button>
        </div>
      </nav>

      <main class="max-w-[1800px] mx-auto p-12 grid grid-cols-1 xl:grid-cols-12 gap-12">
        
        <!-- Left Column: Parameters -->
        <div class="xl:col-span-4 space-y-10">
          
          <!-- STEP 1: SET SELECTION -->
          <section class="bg-zinc-900/60 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl">
             <div class="flex justify-between items-center">
                <h3 class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Step 1: Background & DNA</h3>
                <div class="flex gap-2">
                    ${state.masterBackgroundAnchor ? '<span class="text-[8px] bg-green-500/20 text-green-500 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Set Locked</span>' : ''}
                    <span class="text-[8px] bg-blue-500/20 text-blue-500 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Digital Twin Active</span>
                </div>
             </div>
             
             <div id="analysis-container" class="space-y-4">
                ${state.isAnalyzing ? `
                    <div class="py-10 text-center space-y-4">
                        <div class="w-8 h-8 border-2 border-white/5 border-t-white rounded-full animate-spin mx-auto"></div>
                        <div class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mapping Product DNA...</div>
                    </div>
                ` : state.analysis ? `
                    <div class="space-y-6">
                        <!-- Detected Attributes -->
                        <div class="p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl space-y-3">
                           <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest">Detected Product DNA</span>
                           <div class="grid grid-cols-2 gap-3">
                              <div class="space-y-1">
                                 <span class="text-[7px] text-zinc-600 font-black uppercase">Material</span>
                                 <p class="text-[10px] font-bold text-zinc-300 truncate">${state.analysis.attributes.material}</p>
                              </div>
                              <div class="space-y-1">
                                 <span class="text-[7px] text-zinc-600 font-black uppercase">Colors</span>
                                 <p class="text-[10px] font-bold text-zinc-300 truncate">${state.analysis.attributes.colors.join(', ')}</p>
                              </div>
                           </div>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-[9px] font-black text-zinc-500 uppercase px-1">Suggested Brand Environments</span>
                        </div>
                        <div class="grid grid-cols-1 gap-4">
                            ${state.analysis.environmentCategories.map((cat, idx) => `
                               <div class="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-3 cursor-pointer hover:border-white/20 transition-all pick-set-btn group relative ${state.location === cat.placeName ? 'border-white/40 ring-1 ring-white/10' : ''}" data-idx="${idx}">
                                  <div class="flex justify-between items-center">
                                     <span class="text-[11px] font-black text-white uppercase group-hover:text-white transition-colors">${cat.placeName}</span>
                                     <div class="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center ${state.location === cat.placeName ? 'bg-white border-white' : ''}">
                                        ${state.location === cat.placeName ? '<div class="w-2.5 h-2.5 bg-black rounded-full"></div>' : ''}
                                     </div>
                                  </div>
                                  <p class="text-[9px] text-zinc-500 font-medium italic line-clamp-2 leading-relaxed">${cat.description}</p>
                               </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                   <button id="run-analysis" class="w-full py-16 border border-dashed border-white/10 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all group">
                      <div class="text-2xl mb-4 group-hover:scale-110 transition-transform">🎭</div>
                      Analyze Product & Extract DNA
                   </button>
                `}

                <div class="space-y-2 pt-6 border-t border-white/5">
                   <div class="flex justify-between items-center px-1">
                      <label class="text-[8px] font-black text-zinc-500 uppercase">Universal Set Creative Brief</label>
                   </div>
                   <textarea id="global-bg-input" class="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-[11px] text-zinc-300 font-medium italic h-44 outline-none focus:border-white transition-all resize-none shadow-inner leading-relaxed" placeholder="Detailed background description...">${state.globalBackgroundPrompt}</textarea>
                </div>
             </div>
          </section>

          <!-- STUDIO CONTROLS -->
          <section class="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-10 space-y-8 shadow-2xl">
              <div class="space-y-4">
                 <label class="text-[8px] font-black uppercase text-zinc-500">Camera Engine</label>
                 <div class="grid grid-cols-3 gap-2">
                    ${['1K', '2K', '4K'].map(res => `
                       <button class="quality-btn p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black uppercase transition-all ${state.quality.resolution === res ? 'border-white text-white shadow-lg bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}" data-res="${res}">${res} RAW</button>
                    `).join('')}
                 </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                 <div class="space-y-1.5">
                    <label class="text-[7px] font-black text-zinc-600 uppercase">Optics</label>
                    <select id="lens-select" class="w-full bg-black/60 border border-zinc-800 p-3 rounded-xl text-[10px] font-black uppercase text-white outline-none">
                        <option value="85mm Prime G-Master">85mm Prime</option>
                        <option value="50mm Prime Art">50mm Prime</option>
                        <option value="35mm Wide">35mm Wide</option>
                    </select>
                 </div>
                 <div class="space-y-1.5">
                    <label class="text-[7px] font-black text-zinc-600 uppercase">Body</label>
                    <select id="camera-select" class="w-full bg-black/60 border border-zinc-800 p-3 rounded-xl text-[10px] font-black uppercase text-white outline-none">
                        <option value="DSLR Pro (Canon R5)">DSLR Pro</option>
                        <option value="Medium Format">Medium Format</option>
                    </select>
                 </div>
              </div>
          </section>

          <!-- ASSET MONITOR -->
          <section class="bg-zinc-900/20 border border-white/5 p-10 rounded-[3rem] space-y-10 shadow-inner">
             <div class="space-y-4">
                <span class="text-[10px] font-black uppercase text-zinc-500 px-1">Product reference</span>
                <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  <label class="shrink-0 w-24 h-24 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                    <span class="text-zinc-600 text-3xl font-light">+</span>
                    <input type="file" multiple class="hidden image-input" data-type="product">
                  </label>
                  ${state.productImages.map(img => `
                    <div class="relative shrink-0 w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group shadow-xl">
                      <img src="${img.previewUrl}" class="w-full h-full object-cover">
                      <button class="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full remove-image text-white scale-75 opacity-0 group-hover:opacity-100 transition-all" data-type="product" data-id="${img.id}">×</button>
                    </div>
                  `).join('')}
                </div>
             </div>
             
             <div class="space-y-4 pt-6 border-t border-white/5">
                <span class="text-[10px] font-black uppercase text-zinc-500 px-1">Subject Identity</span>
                <div class="flex items-center gap-5">
                  ${!state.referenceModelImage ? `
                    <label class="shrink-0 w-24 h-24 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                        <span class="text-zinc-600 text-3xl font-light">+</span>
                        <input type="file" class="hidden image-input" data-type="ref-model">
                    </label>
                    <p class="text-[9px] text-zinc-600 font-medium uppercase leading-relaxed italic">Upload model DNA to match identity across all poses.</p>
                  ` : `
                    <div class="relative shrink-0 w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-xl ring-2 ring-white/10">
                      <img src="${state.referenceModelImage.previewUrl}" class="w-full h-full object-cover">
                      <button class="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full remove-image text-white scale-75" data-type="ref-model">×</button>
                    </div>
                    <div class="flex-1 space-y-1">
                        <p class="text-[10px] text-white font-black uppercase tracking-tight">Identity Locked</p>
                        <p class="text-[8px] text-zinc-700 uppercase">Synchronizing Facial Truth</p>
                    </div>
                  `}
                </div>
             </div>
          </section>
        </div>

        <!-- Right Column: Generation Pipeline -->
        <div class="xl:col-span-8 space-y-12">
          
          <div class="bg-zinc-900/40 border border-white/5 rounded-[4rem] p-12 space-y-12 shadow-2xl relative overflow-hidden">
             <div class="absolute -top-40 -right-40 w-96 h-96 bg-white/5 blur-[120px] rounded-full"></div>
             
             <div class="flex justify-between items-center relative z-10">
                <div class="space-y-1">
                    <h3 class="text-4xl font-black uppercase tracking-tighter serif text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">Activity Pipeline</h3>
                    <p class="text-[11px] text-zinc-500 font-black uppercase tracking-[0.2em]">Step 2: Multiple Poses, Zero-Deviation Protocol</p>
                </div>
                <button id="add-shot-btn" class="bg-white/5 hover:bg-white hover:text-black px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border border-white/5 shadow-xl">+ Manual Pose</button>
             </div>

             <!-- Multi-Pose Suggestions -->
             ${state.analysis ? `
                <div class="space-y-5 pt-8 border-t border-white/5 relative z-10">
                   <div class="flex justify-between items-center px-1">
                      <span class="text-[10px] font-black uppercase text-zinc-500">Pose Library for ${activePlace}</span>
                      <span class="text-[8px] font-black text-zinc-700 uppercase">Universal Background Consistent</span>
                   </div>
                   <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      ${filteredPoses.map((s, idx) => `
                        <div class="shrink-0 w-72 p-7 bg-black/50 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl hover:border-white/20 transition-all cursor-pointer add-pose-suggestion group" data-idx="${state.analysis!.poseSuggestions.indexOf(s)}">
                           <div class="flex justify-between items-start">
                              <span class="text-[11px] font-black text-white uppercase group-hover:text-white transition-colors">${s.poseName}</span>
                              <div class="text-[10px] text-zinc-700 group-hover:text-white font-black transition-colors">+</div>
                           </div>
                           <p class="text-[10px] text-zinc-500 font-medium italic line-clamp-2 leading-relaxed">${s.creativePrompt}</p>
                           <div class="text-[8px] font-black text-zinc-700 uppercase tracking-widest pt-2">${s.recommendedShotType}</div>
                        </div>
                      `).join('')}
                   </div>
                </div>
             ` : ''}
             
             <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10" id="shot-list">
                ${state.shots.map((shot, idx) => `
                  <div class="p-10 bg-black/80 border border-white/5 rounded-[3.5rem] space-y-8 relative group hover:border-white/10 transition-all shadow-inner ring-1 ring-white/5">
                    <button class="absolute top-10 right-10 text-zinc-800 hover:text-red-500 remove-shot text-3xl font-light transition-colors" data-id="${shot.id}">×</button>
                    
                    <div class="flex items-center gap-6">
                       <span class="w-12 h-12 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center text-sm font-black text-zinc-500 group-hover:text-white transition-colors">${idx+1}</span>
                       <div class="flex-1 space-y-1.5">
                          <label class="text-[7px] font-black text-zinc-600 uppercase">Subject Action & Interaction</label>
                          <input class="w-full bg-transparent border-b border-zinc-800 py-2 text-base font-bold focus:border-white outline-none shot-pose text-white transition-all" data-id="${shot.id}" value="${shot.pose}" placeholder="Describe pose activity...">
                       </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                       <div class="space-y-2">
                          <label class="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Composition</label>
                          <select class="w-full bg-zinc-950 text-[10px] p-4 rounded-2xl font-black uppercase border border-white/5 shot-type text-zinc-400 outline-none focus:border-white">
                             <option value="mid shot" ${shot.shotType === 'mid shot' ? 'selected' : ''}>Mid Shot</option>
                             <option value="full shot" ${shot.shotType === 'full shot' ? 'selected' : ''}>Full Shot</option>
                             <option value="close-up" ${shot.shotType === 'close-up' ? 'selected' : ''}>Close-up</option>
                             <option value="lifestyle" ${shot.shotType === 'lifestyle' ? 'selected' : ''}>Lifestyle</option>
                          </select>
                       </div>
                       <div class="space-y-2">
                          <label class="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Angle</label>
                          <select class="w-full bg-zinc-950 text-[10px] p-4 rounded-2xl font-black uppercase border border-white/5 shot-angle text-zinc-400 outline-none focus:border-white">
                             <option value="eye-level" ${shot.angle === 'eye-level' ? 'selected' : ''}>Eye Level</option>
                             <option value="low" ${shot.angle === 'low' ? 'selected' : ''}>Low Angle</option>
                             <option value="top-down" ${shot.angle === 'top-down' ? 'selected' : ''}>Top Down</option>
                          </select>
                       </div>
                    </div>
                  </div>
                `).join('')}
             </div>
          </div>

          <!-- Production Monitor -->
          <div class="space-y-12">
             <div class="flex items-center gap-6">
                <div class="w-4 h-12 bg-white rounded-full"></div>
                <h3 class="text-5xl font-black uppercase tracking-tighter serif">Live Monitor</h3>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 gap-10" id="results-grid">
                ${state.results.length === 0 && !state.isBatchGenerating ? `
                  <div class="col-span-full py-64 text-center opacity-10 border-8 border-dashed border-zinc-800 rounded-[5rem] bg-zinc-900/10 shadow-inner">
                     <p class="text-3xl font-black uppercase tracking-[0.6em] text-zinc-600">No Captures Yet</p>
                  </div>
                ` : ''}

                ${state.results.map((res, i) => `
                  <div class="group relative bg-zinc-900 rounded-[4.5rem] border border-zinc-800 overflow-hidden shadow-2xl transition-all hover:scale-[1.05] duration-700">
                    <img src="${res.url}" class="w-full aspect-[3/4] object-cover">
                    <div class="absolute top-10 left-10">
                        <span class="bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-white/10 shadow-2xl">Shot ${i+1} ${i === 0 ? '(SET ANCHOR)' : ''}</span>
                    </div>
                    <div class="absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-all p-12 flex flex-col justify-end gap-10 duration-500 backdrop-blur-md">
                       <p class="text-[12px] text-zinc-400 font-medium uppercase line-clamp-3 leading-relaxed italic">"${res.promptUsed}"</p>
                       <button class="bg-white text-black py-5 rounded-[2.5rem] text-[12px] font-black uppercase download-img shadow-2xl hover:bg-zinc-200 transition-all" data-url="${res.url}">Export RAW</button>
                    </div>
                  </div>
                `).join('')}

                ${state.isBatchGenerating ? `
                   <div class="col-span-full py-48 text-center space-y-16 bg-zinc-900/20 border border-white/5 rounded-[6rem] shadow-inner ring-1 ring-white/10">
                      <div class="w-32 h-32 border-[12px] border-white/5 border-t-white rounded-full animate-spin mx-auto shadow-2xl shadow-white/10"></div>
                      <div class="space-y-4">
                        <p class="text-3xl font-black uppercase tracking-[0.8em] animate-pulse text-white">
                            ${state.masterBackgroundAnchor ? 'Consistent Digital Twin Replication' : 'Developing Set Anchor'}
                        </p>
                        <p class="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Maintaining 1:1 product DNA, architectural and lighting truth</p>
                      </div>
                   </div>
                ` : ''}
             </div>
          </div>
        </div>
      </main>
    </div>
  `;
}

function attachEventListeners() {
  if ($('login-btn')) $('login-btn')!.onclick = () => { state.currentPage = 'dashboard'; render(); };
  if ($('nav-dash')) $('nav-dash')!.onclick = () => { state.currentPage = 'dashboard'; render(); };
  if ($('new-project-btn')) $('new-project-btn')!.onclick = () => { state.currentPage = 'generator'; render(); };
  
  if ($('reset-studio-btn')) {
      $('reset-studio-btn')!.onclick = () => {
          if (confirm("Reset current production? All captures and anchors will be cleared.")) {
              state = JSON.parse(JSON.stringify(initialState));
              state.history = JSON.parse(localStorage.getItem('d2c_history') || '[]');
              state.currentPage = 'generator';
              render();
          }
      };
  }

  if ($('global-bg-input')) {
    ($('global-bg-input') as HTMLTextAreaElement).oninput = (e: any) => {
        state.globalBackgroundPrompt = e.target.value;
    };
  }

  document.querySelectorAll('.pick-set-btn').forEach(btn => {
      (btn as HTMLElement).onclick = (e: any) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx || '0');
          const cat = state.analysis?.environmentCategories[idx];
          if (cat) {
              state.location = cat.placeName;
              state.globalBackgroundPrompt = cat.suggestedBackgroundPrompt;
              state.masterBackgroundAnchor = null; 
              state.results = [];
              render();
          }
      };
  });

  document.querySelectorAll('.add-pose-suggestion').forEach(btn => {
      (btn as HTMLElement).onclick = (e: any) => {
          if (!state.analysis) return;
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx || '0');
          const suggestion = state.analysis.poseSuggestions[idx];
          state.shots.push({
              id: Math.random().toString(),
              pose: suggestion.poseName,
              shotType: suggestion.recommendedShotType as any || 'mid shot',
              angle: 'eye-level',
              editPrompt: suggestion.creativePrompt,
              sceneArea: ''
          });
          render();
      };
  });

  document.querySelectorAll('.image-input').forEach(input => {
    input.addEventListener('change', (e: any) => {
      const type = (e.target as HTMLElement).dataset.type;
      const files = Array.from((e.target as HTMLInputElement).files || []);
      files.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (re) => {
          const img: ImageData = {
            id: Math.random().toString(),
            base64: re.target!.result as string,
            mimeType: file.type,
            previewUrl: URL.createObjectURL(file)
          };
          if (type === 'product') state.productImages.push(img);
          else if (type === 'ref-model') state.referenceModelImage = img;
          render();
        };
        reader.readAsDataURL(file);
      });
    });
  });

  document.querySelectorAll('.remove-image').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const { type, id } = (e.target as HTMLElement).dataset;
      if (type === 'product') state.productImages = state.productImages.filter(i => i.id !== id);
      else if (type === 'ref-model') state.referenceModelImage = null;
      render();
    };
  });

  if ($('run-analysis')) $('run-analysis')!.onclick = async () => {
    if (!state.productImages.length) return;
    state.isAnalyzing = true;
    render();
    try {
      state.analysis = await analyzeProductContext(state.productImages);
    } catch (e) { console.error(e); }
    state.isAnalyzing = false;
    render();
  };

  document.querySelectorAll('.shot-pose').forEach(input => {
    (input as HTMLElement).oninput = (e: any) => {
      const shot = state.shots.find(s => s.id === (e.target as HTMLElement).dataset.id);
      if (shot) shot.pose = (e.target as HTMLInputElement).value;
    };
  });

  document.querySelectorAll('.shot-type').forEach(sel => {
    (sel as HTMLElement).onchange = (e: any) => {
      const shot = state.shots.find(s => s.id === (e.target as HTMLElement).dataset.id);
      if (shot) shot.shotType = (e.target as HTMLSelectElement).value as any;
    };
  });

  if ($('batch-generate-btn')) $('batch-generate-btn')!.onclick = handleBatchGenerate;

  if ($('add-shot-btn')) $('add-shot-btn')!.onclick = () => {
    state.shots.push({ id: Date.now().toString(), pose: 'New pose...', shotType: 'mid shot', angle: 'eye-level' });
    render();
  };

  document.querySelectorAll('.remove-shot').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      state.shots = state.shots.filter(s => s.id !== (e.target as HTMLElement).dataset.id);
      render();
    };
  });

  document.querySelectorAll('.download-img').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const a = document.createElement('a');
      a.href = (e.target as HTMLElement).dataset.url!;
      a.download = `shot_${Date.now()}.jpg`;
      a.click();
    };
  });
}

async function handleBatchGenerate() {
  if (state.isBatchGenerating) return;
  state.isBatchGenerating = true;
  state.results = [];
  state.masterBackgroundAnchor = null; 
  render();

  try {
    for (let i = 0; i < state.shots.length; i++) {
      const shot = state.shots[i];
      const url = await generateD2CImage({
        shot,
        productImages: state.productImages,
        detailImages: state.detailImages,
        referenceModelImage: state.referenceModelImage,
        masterBackgroundAnchor: state.masterBackgroundAnchor,
        globalBackgroundPrompt: state.globalBackgroundPrompt,
        location: state.location,
        brandVibe: state.brandVibe,
        consistency: state.consistency,
        quality: state.quality,
        aspectRatio: state.aspectRatio,
        negativePrompt: state.negativePrompt,
        technicalAttributes: state.analysis?.attributes
      });
      
      if (i === 0) {
          state.masterBackgroundAnchor = url;
      }

      state.results.push({ id: shot.id, url, promptUsed: `${shot.pose}` });
      render();
    }
  } catch (error: any) {
      console.error(error);
      alert("Photography Session Error: " + error.message);
  } finally {
    state.isBatchGenerating = false;
    render();
  }
}
