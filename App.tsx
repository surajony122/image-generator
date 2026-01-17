
import { D2CState, ImageData, AspectRatio, ShotConfig, AIAnalysisResult, Resolution } from './types';
import { analyzeProductContext, generateD2CImage } from './geminiService';

/**
 * D2C PREMIUM PHOTOSHOOT STUDIO - VANILLA JS CORE
 */

let state: D2CState = {
  currentPage: 'login',
  projectTitle: 'Untilted Project',
  productImages: [],
  detailImages: [],
  referenceImages: [],
  modelSheet: [],
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
  shots: [{ id: Date.now().toString(), pose: 'Elegant standing', shotType: 'mid shot', angle: 'eye-level', editPrompt: '' }],
  analysis: null,
  isAnalyzing: false,
  isBatchGenerating: false,
  history: JSON.parse(localStorage.getItem('d2c_history') || '[]'),
  results: [],
  aspectRatio: AspectRatio.SQUARE,
  hasCustomKey: false
};

// Utilities
const $ = (id: string) => document.getElementById(id);
const saveHistory = () => localStorage.setItem('d2c_history', JSON.stringify(state.history));

// Global Window interface for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

export function initApp() {
  checkApiKeyStatus();
  render();
}

async function checkApiKeyStatus() {
    if (window.aistudio) {
        state.hasCustomKey = await window.aistudio.hasSelectedApiKey();
    }
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
  } else if (state.currentPage === 'history') {
    root.innerHTML = renderHistoryPage();
  }

  attachEventListeners();
}

// --- PAGES ---

function renderLoginPage() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-black p-4">
      <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-10 space-y-8 shadow-2xl">
        <div class="text-center space-y-2">
          <div class="text-white text-3xl font-black uppercase tracking-tighter serif text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">D2C STUDIO</div>
          <div class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Premium Commercial Engine</div>
        </div>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Studio Key</label>
            <input type="password" value="demo-key" class="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-white transition-all outline-none" placeholder="••••••••">
          </div>
          <button id="login-btn" class="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 transition-all shadow-xl shadow-white/5">
            Enter Studio
          </button>
        </div>
        <div class="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Secure Production Environment</div>
      </div>
    </div>
  `;
}

function renderDashboardPage() {
  return `
    <div class="min-h-screen bg-black">
      <nav class="border-b border-zinc-900 p-6 flex justify-between items-center bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div class="text-white text-lg font-black uppercase tracking-tighter serif">D2C STUDIO</div>
        <div class="flex gap-6 text-[10px] font-black uppercase tracking-widest">
          <button id="nav-gen" class="text-white">Studio</button>
          <button id="nav-hist" class="text-zinc-500 hover:text-white">Archive</button>
          <button id="nav-logout" class="text-zinc-500 hover:text-red-500">Exit</button>
        </div>
      </nav>
      <main class="max-w-6xl mx-auto py-16 px-6">
        <div class="flex justify-between items-end mb-12">
          <div class="space-y-2">
            <h2 class="text-4xl font-black uppercase tracking-tighter">Production Vault</h2>
            <p class="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Manage your commercial pipelines</p>
          </div>
          <button id="new-project-btn" class="bg-white text-black px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] shadow-lg shadow-white/10 hover:scale-105 transition-all">
            + New Production
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          ${state.history.length ? state.history.map((proj: any) => `
            <div class="group bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 hover:border-zinc-700 transition-all cursor-pointer">
              <div class="aspect-square bg-zinc-950 rounded-[2rem] mb-6 overflow-hidden border border-zinc-900 flex items-center justify-center">
                 ${proj.previewUrl ? `<img src="${proj.previewUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `<div class="text-zinc-800 font-black text-4xl">?</div>`}
              </div>
              <h3 class="text-lg font-black uppercase tracking-tight text-white mb-2">${proj.title}</h3>
              <p class="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">${proj.date}</p>
            </div>
          `).join('') : `
            <div class="col-span-full py-32 text-center space-y-6 opacity-20">
               <div class="text-6xl grayscale">📦</div>
               <p class="text-[10px] font-black uppercase tracking-[0.4em]">Vault is currently empty</p>
            </div>
          `}
        </div>
      </main>
    </div>
  `;
}

function renderGeneratorPage() {
  const analysisHtml = state.analysis ? `
    <div class="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
      <div class="flex justify-between items-center">
        <span class="text-[9px] font-black text-white uppercase tracking-widest">AI Content DNA</span>
        <button id="apply-suggestions" class="bg-white text-black px-3 py-1 rounded-full text-[8px] font-black uppercase hover:bg-zinc-200 transition-all">Sync Global Specs</button>
      </div>
      
      <div class="grid grid-cols-2 gap-4 text-[10px]">
        <div><span class="text-zinc-500 font-bold uppercase block mb-1">Detected Class</span><span class="text-white font-black uppercase">${state.analysis.category}</span></div>
        <div><span class="text-zinc-500 font-bold uppercase block mb-1">Micro-Texture</span><span class="text-white font-black uppercase">${state.analysis.attributes.material}</span></div>
      </div>

      <!-- Location Suggestions -->
      <div class="space-y-2">
         <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Suggested Environments</span>
         <div class="flex flex-wrap gap-2">
            ${state.analysis.locationSuggestions.map(loc => `
                <button class="pick-location-btn bg-zinc-800/50 hover:bg-white hover:text-black border border-white/5 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all" data-name="${loc.name}" title="${loc.description}">
                    ${loc.name}
                </button>
            `).join('')}
         </div>
      </div>

      <div class="space-y-3 pt-4 border-t border-white/5">
        <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Pose Suggestions & Editable Briefs</span>
        <div class="space-y-4">
            ${state.analysis.poseSuggestions.map((s, idx) => `
                <div class="p-4 bg-zinc-900/80 rounded-2xl border border-white/5 space-y-3 shadow-xl">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black text-white uppercase">${s.poseName}</span>
                        <div class="flex gap-2">
                            <button class="add-pose-suggestion text-[8px] font-black bg-white text-black px-2.5 py-1 rounded-full hover:bg-zinc-200 transition-all" data-idx="${idx}">+ Add</button>
                        </div>
                    </div>
                    <textarea class="edit-suggestion-prompt w-full bg-black/40 border border-white/5 rounded-xl p-2 text-[9px] text-zinc-400 font-medium italic leading-relaxed h-16 outline-none focus:border-white transition-all resize-none" data-idx="${idx}">${s.creativePrompt}</textarea>
                </div>
            `).join('')}
        </div>
      </div>
    </div>
  ` : (state.isAnalyzing ? `
    <div class="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 animate-pulse">
      <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Analyzing Master Assets...</span>
    </div>
  ` : `
    <div id="run-analysis" class="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/10 transition-all group shadow-inner">
      <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">Run Creative Analysis Engine</span>
    </div>
  `);

  return `
    <div class="min-h-screen bg-black">
      <nav class="border-b border-zinc-900 p-6 flex justify-between items-center bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div class="flex items-center gap-4">
           <button id="nav-dash" class="text-zinc-500 hover:text-white transition-colors">← Vault</button>
           <div class="h-4 w-px bg-zinc-800"></div>
           <h1 class="text-white text-sm font-black uppercase tracking-widest">${state.projectTitle}</h1>
        </div>
        <div class="flex gap-4">
            ${state.results.length > 0 ? `
              <button id="download-all-btn" class="bg-zinc-800 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">
                Batch Export
              </button>
            ` : ''}
            <button id="batch-generate-btn" ${state.isBatchGenerating ? 'disabled' : ''} class="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-xl shadow-white/5 hover:bg-zinc-200 transition-all">
              ${state.isBatchGenerating ? 'Processing RAW...' : 'Execute Shoot'}
            </button>
        </div>
      </nav>

      <main class="max-w-[1800px] mx-auto p-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
        <!-- Sidebar Controls -->
        <div class="xl:col-span-4 space-y-8">
          
          <!-- Session Spec Deck -->
          <section class="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
              <div class="flex items-center justify-between">
                <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Hardware Profile</h2>
                <span class="text-[10px] font-black text-white px-2 py-0.5 bg-zinc-800 rounded uppercase tracking-widest">${state.quality.resolution}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button class="quality-btn p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase ${state.quality.resolution === '1K' ? 'border-white text-white shadow-lg shadow-white/5' : 'text-zinc-600'}" data-res="1K">1K RAW</button>
                <button class="quality-btn p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase ${state.quality.resolution === '2K' ? 'border-white text-white shadow-lg shadow-white/5' : 'text-zinc-600'}" data-res="2K">2K RAW</button>
                <button class="quality-btn p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase ${state.quality.resolution === '4K' ? 'border-white text-white shadow-lg shadow-white/5' : 'text-zinc-600'}" data-res="4K">4K RAW</button>
              </div>
              ${state.quality.resolution !== '1K' && !state.hasCustomKey ? `
                <div class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2">
                    <p class="text-[9px] text-blue-400 font-bold uppercase tracking-widest leading-relaxed">Pro Resolution requires active studio credentials.</p>
                    <button id="select-key-btn" class="w-full py-2 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Select Key</button>
                </div>
              ` : ''}

              <!-- Camera Setup -->
              <div class="space-y-4 pt-4 border-t border-zinc-800/50">
                <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Camera Architecture</label>
                <div class="grid grid-cols-2 gap-2">
                   <select id="camera-type-select" class="bg-black/50 border border-zinc-800 p-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:border-white transition-all">
                      <option value="DSLR (Canon R5)" ${state.quality.cameraType.includes('DSLR') ? 'selected' : ''}>DSLR (Clean)</option>
                      <option value="iPhone 15 Pro" ${state.quality.cameraType.includes('iPhone') ? 'selected' : ''}>Mobile (iPhone)</option>
                      <option value="Film (35mm Portra)" ${state.quality.cameraType.includes('Film') ? 'selected' : ''}>Vintage Film</option>
                      <option value="Studio Medium Format" ${state.quality.cameraType.includes('Medium') ? 'selected' : ''}>Medium Format</option>
                   </select>
                   <select id="lens-select" class="bg-black/50 border border-zinc-800 p-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:border-white transition-all">
                      <option value="85mm Prime" ${state.quality.lens === '85mm Prime' ? 'selected' : ''}>85mm Portrait</option>
                      <option value="50mm Prime" ${state.quality.lens === '50mm Prime' ? 'selected' : ''}>50mm Natural</option>
                      <option value="35mm Wide" ${state.quality.lens === '35mm Wide' ? 'selected' : ''}>35mm Lifestyle</option>
                      <option value="100mm Macro" ${state.quality.lens === '100mm Macro' ? 'selected' : ''}>100mm Macro</option>
                   </select>
                </div>
              </div>
          </section>

          <!-- Asset Deck -->
          <section class="space-y-6 relative bg-zinc-900/20 p-6 rounded-[2.5rem] border border-zinc-800/50">
            <div class="flex justify-between items-center">
                <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Truth Assets</h2>
                <div class="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                    <div class="w-1.5 h-1.5 ${state.consistency.productDetails ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'} rounded-full"></div>
                    <span class="text-[8px] font-black text-zinc-400 uppercase tracking-widest">${state.consistency.productDetails ? 'FIDELITY LOCKED' : 'FREE MODE'}</span>
                </div>
            </div>
            
            <div class="space-y-6">
              <!-- Master Product Images -->
              <div class="space-y-2">
                <label class="text-[9px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                    <span>Master Views</span>
                    <span class="text-[7px] text-zinc-800 uppercase">Blueprints</span>
                </label>
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <label class="shrink-0 w-24 h-24 bg-white/5 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all group">
                    <span class="text-zinc-500 group-hover:text-white transition-colors">+</span>
                    <input type="file" multiple class="hidden image-input" data-type="product">
                  </label>
                  ${state.productImages.map(img => `
                    <div class="relative shrink-0 w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group shadow-xl ring-1 ring-white/5">
                      <img src="${img.previewUrl}" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button class="bg-black/70 p-2 rounded-full remove-image text-white hover:bg-red-500 transition-colors" data-type="product" data-id="${img.id}">×</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Micro-Detail Anchors -->
              <div class="space-y-2">
                <label class="text-[9px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                    <span>Micro-Detail Anchors</span>
                    <span class="text-[7px] text-blue-500/50 uppercase">Technical Truth</span>
                </label>
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <label class="shrink-0 w-24 h-24 bg-blue-500/5 border border-dashed border-blue-500/20 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-blue-500/10 transition-all group">
                    <span class="text-blue-500 group-hover:scale-110 transition-transform">+</span>
                    <input type="file" multiple class="hidden image-input" data-type="detail">
                  </label>
                  ${state.detailImages.map(img => `
                    <div class="relative shrink-0 w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border border-blue-500/20 group shadow-xl ring-1 ring-blue-500/10">
                      <img src="${img.previewUrl}" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button class="bg-black/70 p-2 rounded-full remove-image text-white hover:bg-red-500 transition-colors" data-type="detail" data-id="${img.id}">×</button>
                      </div>
                      <div class="absolute bottom-1 right-1 bg-blue-500 text-white text-[6px] px-1.5 py-0.5 rounded-sm font-black uppercase">MACRO</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            ${analysisHtml}
          </section>

          <!-- Creative Controls -->
          <div class="flex border-b border-zinc-900 mb-6 bg-zinc-900/20 rounded-t-3xl">
              <button id="tab-studio" class="flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest ${$('panel-studio') && !$('panel-studio')!.classList.contains('hidden') ? 'text-white border-b-2 border-white' : 'text-zinc-500'}">Production Brief</button>
              <button id="tab-model" class="flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Identity Deck</button>
          </div>

          <div id="panel-studio" class="space-y-6 bg-zinc-900/10 p-2 rounded-b-3xl border-x border-b border-zinc-900/50">
              <!-- Scene Directive -->
              <section class="space-y-6">
                 <div class="space-y-2">
                   <div class="flex justify-between items-center">
                       <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Global Production Brief</label>
                   </div>
                   <textarea id="custom-prompt" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-xs h-24 focus:border-white outline-none resize-none leading-relaxed text-zinc-300" placeholder="Describe environmental details, lighting character, or props...">${state.customPrompt}</textarea>
                 </div>

                 <div class="space-y-2">
                   <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Constraint Filter (Negative)</label>
                   <textarea id="negative-prompt" class="w-full bg-red-500/5 border border-zinc-800 rounded-2xl p-4 text-xs h-24 focus:border-red-500/50 outline-none resize-none leading-relaxed text-red-200/40" placeholder="List items or styles the AI must explicitly avoid...">${state.negativePrompt}</textarea>
                 </div>
                 
                 <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                       <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Studio Location</label>
                       <input id="location-input" type="text" value="${state.location}" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-[10px] font-bold focus:border-white outline-none text-white" placeholder="Pick a suggestion above...">
                    </div>
                    <div class="space-y-1.5">
                       <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500">Brand Aesthetic</label>
                       <select id="vibe-select" class="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-[10px] font-bold outline-none text-white transition-all cursor-pointer">
                          <option ${state.brandVibe === 'Luxury' ? 'selected' : ''}>Luxury</option>
                          <option ${state.brandVibe === 'Minimal' ? 'selected' : ''}>Minimal</option>
                          <option ${state.brandVibe === 'Street' ? 'selected' : ''}>Street</option>
                          <option ${state.brandVibe === 'Festive' ? 'selected' : ''}>Festive</option>
                       </select>
                    </div>
                 </div>
              </section>

              <!-- Locks -->
              <section class="space-y-4 pt-6 border-t border-zinc-900">
                 <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Accuracy Protocols</span>
                    <div class="flex gap-4">
                       <label class="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" id="lock-details" ${state.consistency.productDetails ? 'checked' : ''} class="w-3 h-3 accent-white">
                          <span class="text-[8px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">Design Logic</span>
                       </label>
                       <label class="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" id="lock-bg" ${state.consistency.background ? 'checked' : ''} class="w-3 h-3 accent-white">
                          <span class="text-[8px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">Set Geometry</span>
                       </label>
                    </div>
                 </div>
              </section>
          </div>

          <div id="panel-model" class="hidden space-y-6 bg-zinc-900/10 p-6 rounded-b-3xl border-x border-b border-zinc-900/50">
              <div class="space-y-4">
                <label class="text-[9px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                    <span>Identity Truth Deck</span>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="lock-model" ${state.consistency.model ? 'checked' : ''} class="w-2.5 h-2.5 accent-white">
                        <span class="text-[7px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-500 uppercase">Enforce Subject Identity</span>
                    </label>
                </label>
                <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <label class="shrink-0 w-24 h-24 bg-white/5 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                    <span class="text-zinc-500 text-lg font-light">+</span>
                    <input type="file" multiple class="hidden image-input" data-type="model">
                  </label>
                  ${state.modelSheet.map(img => `
                    <div class="relative shrink-0 w-24 h-24 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group shadow-xl ring-1 ring-white/5">
                      <img src="${img.previewUrl}" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button class="bg-black/70 p-2 rounded-full remove-image text-white hover:bg-red-500 transition-colors" data-id="${img.id}">×</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
          </div>
        </div>

        <!-- Studio Monitoring -->
        <div class="xl:col-span-8 space-y-10">
          
          <!-- Photography Queue -->
          <div class="bg-zinc-900/40 border border-zinc-800 rounded-[3.5rem] p-10 space-y-10 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
             <div class="flex justify-between items-center relative z-10">
                <div class="flex items-center gap-4">
                    <h3 class="text-2xl font-black uppercase tracking-tighter">Photography Queue</h3>
                    <div class="h-6 w-px bg-zinc-800"></div>
                    <span class="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/20"></div>
                        Ready for Capture
                    </span>
                </div>
                <button id="add-shot-btn" class="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white hover:text-black px-6 py-3 rounded-full transition-all border border-white/5 shadow-xl">+ New Capture Slot</button>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10" id="shot-list">
                ${state.shots.map((shot, idx) => `
                  <div class="p-8 bg-black/40 border border-zinc-800 rounded-[2.5rem] space-y-6 relative group hover:border-zinc-700 transition-all shadow-inner ring-1 ring-white/5">
                    <button class="absolute top-6 right-6 text-zinc-700 hover:text-red-500 remove-shot text-2xl" data-id="${shot.id}">×</button>
                    
                    <div class="flex items-center gap-4">
                       <span class="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[11px] font-black text-zinc-500 group-hover:text-white transition-colors">${idx+1}</span>
                       <input class="flex-1 bg-transparent border-b border-zinc-800 py-2 text-[13px] font-bold focus:border-white outline-none shot-pose text-white transition-all" data-id="${shot.id}" value="${shot.pose}" placeholder="Subject Action (e.g. Walking elegantly)...">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                       <div class="space-y-1.5">
                          <label class="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Framing</label>
                          <select class="w-full bg-zinc-900 text-[10px] p-3 rounded-xl font-black uppercase border border-white/5 shot-type text-zinc-300 outline-none focus:border-white transition-all cursor-pointer" data-id="${shot.id}">
                             <option value="mid shot" ${shot.shotType === 'mid shot' ? 'selected' : ''}>Mid Shot</option>
                             <option value="full shot" ${shot.shotType === 'full shot' ? 'selected' : ''}>Full Shot</option>
                             <option value="close-up" ${shot.shotType === 'close-up' ? 'selected' : ''}>Close-up</option>
                             <option value="macro detail" ${shot.shotType === 'macro detail' ? 'selected' : ''}>Macro Detail</option>
                             <option value="lifestyle" ${shot.shotType === 'lifestyle' ? 'selected' : ''}>Lifestyle</option>
                          </select>
                       </div>
                       <div class="space-y-1.5">
                          <label class="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Angle</label>
                          <select class="w-full bg-zinc-900 text-[10px] p-3 rounded-xl font-black uppercase border border-white/5 shot-angle text-zinc-300 outline-none focus:border-white transition-all cursor-pointer" data-id="${shot.id}">
                             <option value="eye-level" ${shot.angle === 'eye-level' ? 'selected' : ''}>Eye Level</option>
                             <option value="low" ${shot.angle === 'low' ? 'selected' : ''}>Low Angle</option>
                             <option value="top-down" ${shot.angle === 'top-down' ? 'selected' : ''}>Top Down</option>
                          </select>
                       </div>
                    </div>

                    <div class="space-y-3">
                        <div class="flex items-center gap-2 bg-zinc-950/50 rounded-xl px-4 py-2 border border-zinc-800/50 focus-within:border-white transition-all">
                            <span class="text-[9px] font-black text-zinc-600 uppercase">Area:</span>
                            <input class="flex-1 bg-transparent text-[11px] font-bold shot-area text-zinc-300 outline-none" data-id="${shot.id}" value="${shot.sceneArea || ''}" placeholder="e.g. Heritage Balcony">
                        </div>
                        
                        <div class="space-y-1.5">
                           <label class="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Pose Brief</label>
                           <textarea class="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-[10px] text-zinc-400 font-medium italic h-20 outline-none focus:border-white transition-all resize-none shot-brief" data-id="${shot.id}" placeholder="Specific creative brief for this shot...">${shot.editPrompt || ''}</textarea>
                        </div>
                    </div>
                  </div>
                `).join('')}
             </div>
          </div>

          <!-- Master Monitoring Bay -->
          <div class="space-y-8">
             <div class="flex items-center gap-4">
                <div class="w-2 h-8 bg-white rounded-full"></div>
                <h3 class="text-3xl font-black uppercase tracking-tighter">Master Monitor</h3>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8" id="results-grid">
                ${state.results.length === 0 && !state.isBatchGenerating ? `
                  <div class="col-span-full py-48 text-center opacity-20 border-2 border-dashed border-zinc-800 rounded-[3.5rem] bg-zinc-900/10 ring-1 ring-white/5">
                     <div class="text-7xl mb-8 grayscale opacity-50">📷</div>
                     <p class="text-[12px] font-black uppercase tracking-[0.5em] text-zinc-500">Bay Currently Idle. Awaiting Batch Command.</p>
                  </div>
                ` : ''}

                ${state.results.map(res => `
                  <div class="group relative bg-zinc-900 rounded-[3rem] border border-zinc-800 overflow-hidden shadow-2xl ring-1 ring-white/5 transition-all hover:scale-[1.03] duration-500">
                    <img src="${res.url}" class="w-full aspect-[3/4] object-cover">
                    <div class="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-all p-10 flex flex-col justify-end gap-6 duration-500">
                       <div class="space-y-3">
                          <div class="flex items-center justify-between">
                            <p class="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span class="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/20 animate-pulse"></span>
                                Master Captured
                            </p>
                            <span class="text-[9px] font-black text-white/30 uppercase tracking-widest">${state.quality.resolution} RAW</span>
                          </div>
                          <p class="text-[10px] text-zinc-400 font-medium uppercase leading-relaxed line-clamp-2 italic">"${res.promptUsed}"</p>
                       </div>
                       <div class="grid grid-cols-2 gap-3">
                          <button class="bg-white text-black py-4 rounded-2xl text-[10px] font-black uppercase download-img hover:bg-zinc-200 transition-colors shadow-2xl" data-url="${res.url}">Export RAW</button>
                          <button class="bg-zinc-800 text-white py-4 rounded-2xl text-[10px] font-black uppercase edit-result hover:bg-zinc-700 transition-colors" data-id="${res.id}">Refine</button>
                          <button class="bg-zinc-800 text-white py-4 rounded-2xl text-[10px] font-black uppercase duplicate-result hover:bg-zinc-700 transition-colors" data-id="${res.id}">Duplicate</button>
                          <button class="bg-zinc-800 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase delete-result hover:bg-red-500/10 transition-colors" data-id="${res.id}">Purge</button>
                       </div>
                    </div>
                  </div>
                `).join('')}

                ${state.isBatchGenerating ? `
                   <div class="col-span-full py-32 text-center space-y-10 bg-zinc-900/20 border border-white/5 rounded-[4rem] shadow-inner ring-1 ring-white/5">
                      <div class="w-24 h-24 border-[8px] border-white/5 border-t-white rounded-full animate-spin mx-auto shadow-2xl ring-4 ring-white/5"></div>
                      <div class="space-y-3">
                        <p class="text-xl font-black uppercase tracking-[0.6em] animate-pulse text-white">Developing Multi-Shot RAW Session</p>
                        <p class="text-[11px] font-black uppercase tracking-widest text-zinc-500">Locking Micro-Details and Material Truth...</p>
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

function renderHistoryPage() {
  return `<div class="p-10 text-center flex flex-col items-center justify-center min-h-screen space-y-8">
    <div class="text-6xl">🗂️</div>
    <div class="text-zinc-500 font-black uppercase tracking-widest">Archive indexing in progress...</div>
    <button id="nav-dash" class="text-white border border-white/10 bg-zinc-900 px-8 py-4 rounded-full font-black uppercase text-[10px] hover:bg-white hover:text-black transition-all">Back to Studio</button>
  </div>`;
}

// --- EVENT HANDLING ---

function attachEventListeners() {
  // Navigation
  if ($('login-btn')) ($('login-btn') as HTMLElement).onclick = () => { state.currentPage = 'dashboard'; render(); };
  if ($('nav-dash')) ($('nav-dash') as HTMLElement).onclick = () => { state.currentPage = 'dashboard'; render(); };
  if ($('nav-gen')) ($('nav-gen') as HTMLElement).onclick = () => { state.currentPage = 'generator'; render(); };
  if ($('nav-hist')) ($('nav-hist') as HTMLElement).onclick = () => { state.currentPage = 'history'; render(); };
  if ($('nav-logout')) ($('nav-logout') as HTMLElement).onclick = () => { state.currentPage = 'login'; render(); };
  if ($('new-project-btn')) ($('new-project-btn') as HTMLElement).onclick = () => { 
    state.currentPage = 'generator'; 
    state.results = [];
    state.productImages = [];
    state.detailImages = [];
    state.modelSheet = [];
    state.analysis = null;
    state.shots = [{ id: Date.now().toString(), pose: 'Elegant standing', shotType: 'mid shot', angle: 'eye-level', editPrompt: '' }];
    render(); 
  };

  // Tabs
  if ($('tab-studio')) ($('tab-studio') as HTMLElement).onclick = () => {
      $('panel-studio')!.classList.remove('hidden');
      $('panel-model')!.classList.add('hidden');
      $('tab-studio')!.classList.add('text-white', 'border-b-2', 'border-white');
      $('tab-studio')!.classList.remove('text-zinc-500');
      $('tab-model')!.classList.remove('text-white', 'border-b-2', 'border-white');
      $('tab-model')!.classList.add('text-zinc-500');
  };
  if ($('tab-model')) ($('tab-model') as HTMLElement).onclick = () => {
      $('panel-studio')!.classList.add('hidden');
      $('panel-model')!.classList.remove('hidden');
      $('tab-model')!.classList.add('text-white', 'border-b-2', 'border-white');
      $('tab-model')!.classList.remove('text-zinc-500');
      $('tab-studio')!.classList.remove('text-white', 'border-b-2', 'border-white');
      $('tab-studio')!.classList.add('text-zinc-500');
  };

  // Pick Location
  document.querySelectorAll('.pick-location-btn').forEach(btn => {
      (btn as HTMLElement).onclick = (e: any) => {
          state.location = e.target.dataset.name;
          render();
      };
  });

  // Edit Suggestion Prompts (Auto Sync)
  document.querySelectorAll('.edit-suggestion-prompt').forEach(area => {
    (area as HTMLElement).oninput = (e: any) => {
        if (!state.analysis) return;
        const idx = parseInt(e.target.dataset.idx);
        state.analysis.poseSuggestions[idx].creativePrompt = e.target.value;
    };
  });

  // Pose Suggestions Add
  document.querySelectorAll('.add-pose-suggestion').forEach(btn => {
      (btn as HTMLElement).onclick = (e: any) => {
          if (!state.analysis) return;
          const idx = parseInt(e.target.dataset.idx);
          const suggestion = state.analysis.poseSuggestions[idx];
          state.shots.push({
              id: Math.random().toString(),
              pose: suggestion.poseName,
              shotType: suggestion.recommendedShotType as any || 'mid shot',
              angle: 'eye-level',
              editPrompt: suggestion.creativePrompt
          });
          render();
      };
  });

  // Quality & Camera Buttons
  document.querySelectorAll('.quality-btn').forEach(btn => {
      (btn as HTMLElement).onclick = async (e: any) => {
          const res = e.target.dataset.res as Resolution;
          if (res !== '1K') {
              const hasKey = window.aistudio ? await window.aistudio.hasSelectedApiKey() : true;
              if (!hasKey && window.aistudio) {
                  await window.aistudio.openSelectKey();
                  state.hasCustomKey = true;
              } else if (window.aistudio) {
                  state.hasCustomKey = true;
              }
          }
          state.quality.resolution = res;
          render();
      };
  });

  if ($('camera-type-select')) ($('camera-type-select') as HTMLSelectElement).onchange = (e: any) => {
      state.quality.cameraType = e.target.value;
  };
  if ($('lens-select')) ($('lens-select') as HTMLSelectElement).onchange = (e: any) => {
      state.quality.lens = e.target.value;
  };

  if ($('select-key-btn')) ($('select-key-btn') as HTMLElement).onclick = async () => {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        state.hasCustomKey = true;
        render();
      }
  };

  // Uploads
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
          else if (type === 'detail') state.detailImages.push(img);
          else if (type === 'model') state.modelSheet.push(img);
          render();
        };
        reader.readAsDataURL(file);
      });
    });
  });

  // Remove Image
  document.querySelectorAll('.remove-image').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const { type, id } = (e.target as HTMLElement).dataset;
      if (type === 'product') state.productImages = state.productImages.filter(i => i.id !== id);
      else if (type === 'detail') state.detailImages = state.detailImages.filter(i => i.id !== id);
      else if (type === 'model') state.modelSheet = state.modelSheet.filter(i => i.id !== id);
      render();
    };
  });

  // AI Analysis
  if ($('run-analysis')) ($('run-analysis') as HTMLElement).onclick = async () => {
    if (!state.productImages.length) return;
    state.isAnalyzing = true;
    render();
    try {
      state.analysis = await analyzeProductContext(state.productImages);
      state.isAnalyzing = false;
      render();
    } catch (e) {
      state.isAnalyzing = false;
      render();
    }
  };

  if ($('apply-suggestions')) ($('apply-suggestions') as HTMLElement).onclick = () => {
    if (!state.analysis) return;
    state.brandVibe = state.analysis.recommendedMood;
    state.location = state.analysis.recommendedLocations[0];
    state.customPrompt = `Analysis Summary: Category ${state.analysis.category} with ${state.analysis.attributes.material} textures. Dominant Colors: ${state.analysis.attributes.colors.join(', ')}.`;
    render();
  };

  // Batch Generation
  if ($('batch-generate-btn')) ($('batch-generate-btn') as HTMLElement).onclick = handleBatchGenerate;

  // Shot Builder
  if ($('add-shot-btn')) ($('add-shot-btn') as HTMLElement).onclick = () => {
    state.shots.push({ id: Date.now().toString(), pose: 'New pose...', shotType: 'mid shot', angle: 'eye-level', editPrompt: '' });
    render();
  };

  document.querySelectorAll('.remove-shot').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      state.shots = state.shots.filter(s => s.id !== (e.target as HTMLElement).dataset.id);
      render();
    };
  });

  // Sync inputs to state
  if ($('custom-prompt')) ($('custom-prompt') as HTMLElement).oninput = (e: any) => state.customPrompt = e.target.value;
  if ($('negative-prompt')) ($('negative-prompt') as HTMLElement).oninput = (e: any) => state.negativePrompt = e.target.value;
  if ($('location-input')) ($('location-input') as HTMLElement).oninput = (e: any) => state.location = e.target.value;
  if ($('vibe-select')) ($('vibe-select') as HTMLElement).onchange = (e: any) => state.brandVibe = e.target.value;
  
  if ($('lock-details')) ($('lock-details') as HTMLInputElement).onchange = (e: any) => {
      state.consistency.productDetails = e.target.checked;
      render();
  };
  if ($('lock-bg')) ($('lock-bg') as HTMLInputElement).onchange = (e: any) => {
      state.consistency.background = e.target.checked;
      render();
  };
  if ($('lock-model')) ($('lock-model') as HTMLInputElement).onchange = (e: any) => {
      state.consistency.model = e.target.checked;
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

  document.querySelectorAll('.shot-area').forEach(input => {
    (input as HTMLElement).oninput = (e: any) => {
      const shot = state.shots.find(s => s.id === (e.target as HTMLElement).dataset.id);
      if (shot) shot.sceneArea = (e.target as HTMLInputElement).value;
    };
  });

  document.querySelectorAll('.shot-brief').forEach(area => {
    (area as HTMLElement).oninput = (e: any) => {
        const shot = state.shots.find(s => s.id === (e.target as HTMLElement).dataset.id);
        if (shot) shot.editPrompt = (e.target as HTMLTextAreaElement).value;
    };
  });

  // Result Card Actions
  document.querySelectorAll('.download-img').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const a = document.createElement('a');
      a.href = (e.target as HTMLElement).dataset.url!;
      a.download = `d2c_raw_export_${Date.now()}.jpg`;
      a.click();
    };
  });

  if ($('download-all-btn')) ($('download-all-btn') as HTMLElement).onclick = () => {
      state.results.forEach((res, i) => {
          setTimeout(() => {
              const a = document.createElement('a');
              a.href = res.url;
              a.download = `d2c_batch_master_${i + 1}.jpg`;
              a.click();
          }, i * 300);
      });
  };

  document.querySelectorAll('.edit-result').forEach(btn => {
    (btn as HTMLElement).onclick = async (e: any) => {
      const id = (e.target as HTMLElement).dataset.id;
      const refinement = prompt("Enter specific retouching/generation refinement directive:");
      if (refinement) {
        const shot = state.shots.find(s => s.id === id);
        if (shot) {
          shot.editPrompt = refinement;
          state.isBatchGenerating = true;
          render();
          try {
            const url = await generateD2CImage({
              shot,
              productImages: state.productImages,
              detailImages: state.detailImages,
              referenceImages: state.referenceImages,
              modelSheet: state.modelSheet,
              customPrompt: state.customPrompt,
              negativePrompt: state.negativePrompt,
              location: state.location,
              brandVibe: state.brandVibe,
              consistency: state.consistency,
              quality: state.quality,
              aspectRatio: state.aspectRatio
            });
            const resIndex = state.results.findIndex(r => r.id === id);
            if (resIndex !== -1) state.results[resIndex].url = url;
          } catch (error: any) {
              if (error.message === 'API_KEY_EXPIRED_OR_INVALID') {
                  state.hasCustomKey = false;
                  if (window.aistudio) {
                    await window.aistudio.openSelectKey();
                    state.hasCustomKey = true;
                  }
              } else {
                  alert("Studio Error: " + error.message);
              }
          } finally {
            state.isBatchGenerating = false;
            render();
          }
        }
      }
    };
  });

  document.querySelectorAll('.duplicate-result').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const id = (e.target as HTMLElement).dataset.id;
      const originalShot = state.shots.find(s => s.id === id);
      if (originalShot) {
          state.shots.push({
              ...originalShot,
              id: Date.now().toString()
          });
          render();
      }
    };
  });

  document.querySelectorAll('.delete-result').forEach(btn => {
    (btn as HTMLElement).onclick = (e: any) => {
      const id = (e.target as HTMLElement).dataset.id;
      state.results = state.results.filter(r => r.id !== id);
      render();
    };
  });
}

async function handleBatchGenerate() {
  if (state.isBatchGenerating) return;
  state.isBatchGenerating = true;
  state.results = [];
  render();

  try {
    for (const shot of state.shots) {
      const url = await generateD2CImage({
        shot,
        productImages: state.productImages,
        detailImages: state.detailImages,
        referenceImages: state.referenceImages,
        modelSheet: state.modelSheet,
        customPrompt: state.customPrompt,
        negativePrompt: state.negativePrompt,
        location: state.location,
        brandVibe: state.brandVibe,
        consistency: state.consistency,
        quality: state.quality,
        aspectRatio: state.aspectRatio
      });
      state.results.push({
        id: shot.id,
        url: url,
        promptUsed: `Pose: ${shot.pose} | Location: ${state.location}`
      });
      render(); // Progressive rendering for active feedback
    }
    
    // Auto save to history
    if (state.results.length) {
      state.history.unshift({
        id: Date.now().toString(),
        title: state.projectTitle || "Batch Capture",
        date: new Date().toLocaleDateString(),
        previewUrl: state.results[0].url
      });
      saveHistory();
    }
  } catch (error: any) {
      if (error.message === 'API_KEY_EXPIRED_OR_INVALID') {
          state.hasCustomKey = false;
          if (window.aistudio) {
            await window.aistudio.openSelectKey();
            state.hasCustomKey = true;
          }
      } else {
          alert("Production Interrupted: " + error.message);
      }
  } finally {
    state.isBatchGenerating = false;
    render();
  }
}
