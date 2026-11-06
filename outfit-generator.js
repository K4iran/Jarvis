import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const readField = (id, fallback = '') => { const field = $(id); return field && typeof field.value === 'string' ? field.value.trim() : fallback; };
const stage = $('stage');
const sceneCanvas = $('scene');
const generateButton = $('generateButton');
const generateLabel = generateButton.querySelector('.generate-label');
const statusNode = $('generationStatus');
const engineStatus = $('engineStatus');
const savedKey = 'zero.outfit.saved.v1';
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const paletteByStyle = {
  'Streetwear': { top:'#A9B9C7', bottom:'#293847', shoes:'#E7EDF0', outerwear:'#526B7F', accent:'#66D7FF' },
  'Minimal': { top:'#D6D8D5', bottom:'#444B50', shoes:'#EAECE8', outerwear:'#9AA7A8', accent:'#8FDDF2' },
  'Sport': { top:'#426B91', bottom:'#202D3E', shoes:'#E9F1F7', outerwear:'#274D72', accent:'#64D9FF' },
  'Smart casual': { top:'#B8B5A9', bottom:'#343D47', shoes:'#C9C1B3', outerwear:'#6C7E83', accent:'#87D5E8' },
  'Vintage': { top:'#A96E58', bottom:'#3A4148', shoes:'#D8CDBD', outerwear:'#596A59', accent:'#D6A77A' },
  'Techwear': { top:'#4C5667', bottom:'#171F2B', shoes:'#697E8E', outerwear:'#263B52', accent:'#53CFFF' }
};

let selectedStyle = 'Streetwear';
let lookHistory = [];
let savedLooks = loadSavedLooks();
let activeLookIndex = 0;
let ideaDeck = [];
const avatarConfigKey='zero.avatar.config.v1';
let avatarConfig=(()=>{try{const saved=JSON.parse(localStorage.getItem(avatarConfigKey)||'{}');const legacy=['#82e6ff','#9c9cff','#8cebd1','#f0f4ff'];return {...{hair:'short',tone:'#bd9278'},...saved,tone:legacy.includes(String(saved.tone||'').toLowerCase())?'#bd9278':(saved.tone||'#bd9278')}}catch(error){return {hair:'short',tone:'#bd9278'}}})();
let autoTimer = 0;
let isGenerating = false;
let avatarRoot = null;
let clothingGroup = null;
let avatarWidthFactor = 1;
let renderer = null;
let scene = null;
let camera = null;
let renderFrame = 0;
let pointerX = 0;
let pointerDown = false;
let dragged = false;
let lastPointerX = 0;
let toastTimer = 0;
let transitionApplyTimer = 0;
let transitionEndTimer = 0;
let customAvatarName = '';

function validHex(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

function loadSavedLooks() {
  try {
    const value = JSON.parse(localStorage.getItem(savedKey) || '[]');
    return Array.isArray(value) ? value.filter(item => item && item.title && Array.isArray(item.items)).slice(0,12) : [];
  } catch (error) {
    return [];
  }
}

function saveSavedLooks() {
  try { localStorage.setItem(savedKey, JSON.stringify(savedLooks.slice(0,12))); } catch (error) {}
}

function showToast(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}

function setStatus(message) {
  statusNode.textContent = String(message || '').toUpperCase();
}

function defaultLook() {
  const p = paletteByStyle[selectedStyle];
  return {
    title:'EVERYDAY STREETWEAR',
    vibe:'A clean starting point with a balanced, understated finish.',
    style:selectedStyle,
    palette:{top:p.top,bottom:p.bottom,shoes:p.shoes,outerwear:p.outerwear,accent:p.accent},
    items:[
      {slot:'TOP',name:'Baggy heavyweight hoodie',detail:'Oversized fit · structured fleece',color:p.top},
      {slot:'BOTTOM',name:'Baggy fleece joggers',detail:'Relaxed leg · gathered hem',color:p.bottom},
      {slot:'FOOTWEAR',name:'Minimal everyday trainers',detail:'Low-profile finish',color:p.shoes},
      {slot:'LAYER',name:'Oversized zip-up hoodie',detail:'Optional layer · tonal contrast',color:p.outerwear}
    ],
    styling_note:'A calm base palette gives the outfit room to breathe. The outer layer adds depth without making the look feel busy.'
  };
}

function normaliseLook(data, originalText) {
  const defaults = defaultLook();
  const palette = data && data.palette ? data.palette : {};
  const rawItems = Array.isArray(data && data.items) ? data.items : [];
  const itemFor = slot => rawItems.find(item => String(item.slot || '').toLowerCase().includes(slot.toLowerCase()));
  const normalItem = (slot, key, fallbackName, fallbackDetail) => {
    const found = itemFor(slot);
    return {
      slot:slot.toUpperCase(),
      name:String((found && found.name) || (data && data[key]) || fallbackName).slice(0,90),
      detail:String((found && found.detail) || fallbackDetail).slice(0,110),
      color:validHex((found && found.color) || palette[key], defaults.palette[key] || defaults.palette.top)
    };
  };
  const items = [
    normalItem('top','top','Coordinated top','Main piece · selected palette'),
    normalItem('bottom','bottom','Relaxed trousers','Balanced lower half'),
    normalItem('footwear','shoes','Everyday footwear','Finishing detail')
  ];
  const outerwear = itemFor('layer') || itemFor('outerwear');
  if (outerwear || (palette.outerwear && String(data.style || '').toLowerCase() !== 'sport')) {
    items.push({
      slot:'LAYER',
      name:String((outerwear && outerwear.name) || 'Lightweight outer layer').slice(0,90),
      detail:String((outerwear && outerwear.detail) || 'Adds depth and a second texture').slice(0,110),
      color:validHex((outerwear && outerwear.color) || palette.outerwear,defaults.palette.outerwear)
    });
  }
  const accessories = itemFor('accessor');
  if (accessories) items.push({
    slot:'DETAIL',
    name:String(accessories.name || 'Finishing detail').slice(0,90),
    detail:String(accessories.detail || 'A subtle final touch').slice(0,110),
    color:validHex(accessories.color || palette.accent,defaults.palette.accent)
  });
  return {
    title:String((data && data.title) || 'NEW CONFIGURATION').slice(0,36).toUpperCase(),
    vibe:String((data && data.vibe) || data?.style || 'A coordinated look').slice(0,110),
    style:String((data && data.style) || selectedStyle).slice(0,40),
    palette:{
      top:validHex(palette.top,defaults.palette.top),
      bottom:validHex(palette.bottom,defaults.palette.bottom),
      shoes:validHex(palette.shoes,defaults.palette.shoes),
      outerwear:validHex(palette.outerwear,defaults.palette.outerwear),
      accent:validHex(palette.accent,defaults.palette.accent)
    },
    items,
    styling_note:String((data && (data.styling_note || data.note)) || originalText || 'The pieces share a consistent palette and a clear visual direction.').slice(0,300)
  };
}

function parseLookReply(reply) {
  const text = String(reply || '').trim();
  const candidates = [];
  const fenced = text.match(/\x60{3}(?:json)?\s*([\s\S]*?)\x60{3}/i);
  if (fenced) candidates.push(fenced[1].trim());
  for (let start=0;start<text.length;start++) {
    if (text[start] !== '{') continue;
    let depth=0, quoted=false, escaped=false;
    for (let i=start;i<text.length;i++) {
      const char=text[i];
      if (quoted) {
        if (escaped) escaped=false;
        else if (char==='\\') escaped=true;
        else if (char==='"') quoted=false;
        continue;
      }
      if (char==='"') quoted=true;
      else if (char==='{') depth++;
      else if (char==='}' && --depth===0) {
        candidates.push(text.slice(start,i+1));
        break;
      }
    }
  }
  for (const candidate of candidates) {
    try {
      const parsed=JSON.parse(candidate);
      if (parsed && typeof parsed==='object' && (Array.isArray(parsed.items) || parsed.palette)) {
        return normaliseLook(parsed,text);
      }
    } catch (error) {}
  }
  throw new Error('Z.E.R.O. replied, but its outfit response was not valid structured data.');
}

function fallbackLook(variant = 0) {
  const base = paletteByStyle[selectedStyle] || paletteByStyle.Streetwear;
  const brief = readField('outfitBrief');
  const text = brief.toLowerCase();
  const mood = readField('colourMood','Balanced');
  const modifier = mood === 'Monochrome' ? {top:'#B8C0C7',bottom:'#242D39',shoes:'#DCE4EA',outerwear:'#66727D',accent:'#A9D8E8'}
    : mood === 'Earth tones' ? {top:'#B5A48D',bottom:'#444039',shoes:'#D6C8B4',outerwear:'#696B50',accent:'#C69B72'}
    : mood === 'Cool tones' ? {top:'#789BB8',bottom:'#263A54',shoes:'#DCEBF3',outerwear:'#435E7D',accent:'#69D9FF'}
    : mood === 'Warm neutrals' ? {top:'#D0BBA5',bottom:'#65574B',shoes:'#E8DBCB',outerwear:'#A27D60',accent:'#D0A77D'}
    : mood === 'One accent colour' ? {top:base.top,bottom:base.bottom,shoes:base.shoes,outerwear:base.outerwear,accent:'#63D8FF'}
    : {...base};

  const colourMap = {
    black:'#252B32',white:'#E8ECEF',grey:'#89939C',gray:'#89939C',
    navy:'#263C59',blue:'#477DA8',red:'#A94C50',green:'#557B68',
    beige:'#C8B89F',brown:'#765B48',cream:'#E5DCCB',purple:'#77658D'
  };
  const colourFor = pattern => {
    for (const colour of Object.keys(colourMap)) {
      const word = '\\b' + colour + '\\b';
      if (new RegExp(word + '\\s+(?:' + pattern + ')').test(text) ||
          new RegExp('(?:' + pattern + ')\\s+' + word).test(text)) return colourMap[colour];
    }
    return null;
  };
  modifier.top = colourFor('hoodie|shirt|tee|t-shirt|jersey|sweater|jumper|top') || modifier.top;
  modifier.bottom = colourFor('trousers|pants|cargo|jeans|denim|shorts|joggers') || modifier.bottom;
  modifier.shoes = colourFor('shoes|trainers|sneakers|boots') || modifier.shoes;
  modifier.outerwear = colourFor('jacket|coat|overshirt|puffer|bomber') || modifier.outerwear;
  if (!/(hoodie|shirt|tee|t-shirt|jersey|sweater|jumper|top|trousers|pants|cargo|jeans|denim|shorts|joggers|shoes|trainers|sneakers|boots|jacket|coat|overshirt|puffer|bomber)/.test(text)) {
    const firstColour = Object.keys(colourMap).find(colour=>new RegExp('\\b'+colour+'\\b').test(text));
    if (firstColour) modifier.top = colourMap[firstColour];
  }

  const topName = /hoodie|hooded/.test(text) ? 'Relaxed heavyweight hoodie'
    : /jersey|basketball|sportswear|athletic/.test(text) ? 'Technical performance jersey'
    : /shirt|tee|t-shirt/.test(text) ? 'Relaxed cotton graphic-free T-shirt'
    : /knit|sweater|jumper/.test(text) ? 'Textured relaxed knit sweater'
    : selectedStyle==='Smart casual' ? 'Structured relaxed-fit shirt'
    : 'Textured relaxed-fit top';
  const bottomName = /cargo|utility/.test(text) ? 'Relaxed utility cargo trousers'
    : /jean|denim/.test(text) ? 'Relaxed straight-leg denim jeans'
    : /shorts/.test(text) ? 'Relaxed athletic shorts'
    : /track|jogger|sweatpant/.test(text) ? 'Relaxed tapered track trousers'
    : 'Relaxed straight-leg trousers';
  const shoeName = /basketball|court|high.top/.test(text) ? 'High-top court sneakers'
    : /boot/.test(text) ? 'Minimal leather boots'
    : /runner|running/.test(text) ? 'Technical running sneakers'
    : 'Minimal everyday sneakers';
  const layerName = /puffer/.test(text) ? 'Lightweight insulated puffer jacket'
    : /bomber/.test(text) ? 'Clean bomber jacket'
    : /denim jacket/.test(text) ? 'Relaxed denim jacket'
    : /coat/.test(text) ? 'Structured long coat'
    : /jacket|layer|overshirt/.test(text) ? 'Relaxed lightweight jacket'
    : 'Textured overshirt';

  const look = normaliseLook({
    title:brief ? brief.slice(0,32) : selectedStyle + ' / ' + readField('occasion','Everyday'),
    vibe:brief || selectedStyle + ' styling for ' + readField('occasion','Everyday').toLowerCase(),
    style:selectedStyle,
    palette:modifier,
    items:[
      {slot:'TOP',name:topName,detail:'Selected to match your outfit brief',color:modifier.top},
      {slot:'BOTTOM',name:bottomName,detail:'A relaxed silhouette with balanced proportions',color:modifier.bottom},
      {slot:'FOOTWEAR',name:shoeName,detail:'Finishes the look without overpowering it',color:modifier.shoes},
      {slot:'LAYER',name:layerName,detail:'Adds texture and depth to the outfit',color:modifier.outerwear}
    ],
    styling_note:'Your description has been translated into a coordinated outfit with matching colours, silhouettes and finishing details.'
  });
  const palettes = [
    null,
    {top:'#35424F',bottom:'#171D25',shoes:'#DDE5E9',outerwear:'#667A88',accent:'#64D9FF'},
    {top:'#B5A48D',bottom:'#45413B',shoes:'#E4D9C9',outerwear:'#6B705B',accent:'#D1A47A'}
  ];
  if (variant > 0) {
    const palette = palettes[variant % palettes.length];
    look.palette = {...look.palette,...palette};
    look.items.forEach(item=>{
      const slot = item.slot==='TOP'?'top':item.slot==='BOTTOM'?'bottom':item.slot==='FOOTWEAR'?'shoes':item.slot==='LAYER'?'outerwear':null;
      if (slot && palette[slot]) item.color = palette[slot];
    });
    const tops = ['Relaxed heavyweight crewneck','Structured boxy overshirt','Textured relaxed-fit hoodie'];
    const bottoms = ['Wide straight-leg trousers','Relaxed utility cargos','Clean tapered denim'];
    look.items.find(item=>item.slot==='TOP').name = tops[variant % tops.length];
    look.items.find(item=>item.slot==='BOTTOM').name = bottoms[variant % bottoms.length];
    look.title = (brief ? brief.slice(0,20) : selectedStyle).toUpperCase() + ' / OPTION ' + (variant+1);
  }
  return look;
}
function buildGenerationPrompt() {
  const brief = readField('outfitBrief','Create a fresh, cohesive outfit in this style direction.') || 'Create a fresh, cohesive outfit in this style direction.';
  return [
    'You are the styling engine inside Z.E.R.O. Outfit Lab. Create one practical, cohesive outfit and respond with ONLY one valid JSON object. Do not use Markdown, fences or commentary.',
    'User brief: ' + brief,
    'Style direction: ' + selectedStyle,
    'Occasion: ' + readField('occasion','Everyday'),
    'Season: ' + readField('season','Current season'),
    'Colour mood: ' + readField('colourMood','Balanced'),
    'Return exactly this shape: {"title":"short look name","vibe":"one short sentence","style":"style label","palette":{"top":"#RRGGBB","bottom":"#RRGGBB","shoes":"#RRGGBB","outerwear":"#RRGGBB","accent":"#RRGGBB"},"items":[{"slot":"TOP","name":"garment name","detail":"short texture or styling detail","color":"#RRGGBB"},{"slot":"BOTTOM","name":"garment name","detail":"short texture or styling detail","color":"#RRGGBB"},{"slot":"FOOTWEAR","name":"footwear name","detail":"short detail","color":"#RRGGBB"},{"slot":"LAYER","name":"outer layer name","detail":"short detail","color":"#RRGGBB"},{"slot":"ACCESSORY","name":"optional accessory","detail":"short detail","color":"#RRGGBB"}],"styling_note":"one or two useful sentences"}.',
    'Use original, brand-neutral garment descriptions. Include the layer and accessory only when they genuinely improve the outfit. Never discuss or judge the avatar’s body, proportions, attractiveness or weight. Do not add prices, shopping links or logos.'
  ].join('\n');
}

async function generateOutfit() {
  if (isGenerating) return;
  isGenerating = true;
  generateButton.disabled = true;
  generateLabel.textContent = 'COMPOSING IDEAS';
  setStatus('COMPOSING THREE OUTFIT IDEAS');
  stage.classList.remove('transitioning');
  try {
    ideaDeck = [fallbackLook(0),fallbackLook(1),fallbackLook(2)];
    lookHistory = [...ideaDeck,...lookHistory].slice(0,12);
    activeLookIndex = 0;
    transitionToLook(()=>{
      applyLook(ideaDeck[0]);
      renderIdeas();
      renderHistory();
      engineStatus.textContent = 'LOCAL STYLING ACTIVE';
      setStatus('THREE IDEAS READY / LOCAL STYLE MODE');
    });
  } catch (error) {
    console.error('Local outfit composition failed.',error);
    setStatus('COULD NOT COMPOSE THESE IDEAS');
    showToast('The outfit ideas could not be composed. Try a shorter description.');
  } finally {
    setTimeout(()=>{
      isGenerating=false;
      generateButton.disabled=false;
      generateLabel.textContent='GENERATE IDEAS';
    },reducedMotion?0:880);
  }
}
function createMaterial(color, emissive, opacity) {
  return new THREE.MeshStandardMaterial({
    color:color,
    emissive:emissive || color,
    emissiveIntensity:0.035,
    metalness:0.035,
    roughness:0.84,
    side:THREE.DoubleSide,
    transparent:false,
    opacity:1,
    depthWrite:true
  });
}

function addCapsule(parent, radius, length, position, material, rotationZ) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,5,10),material);
  mesh.position.set(position[0],position[1],position[2] || 0);
  mesh.rotation.z = rotationZ || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, material, scale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,24,18),material);
  mesh.position.set(position[0],position[1],position[2] || 0);
  if (scale) mesh.scale.set(scale[0],scale[1],scale[2]);
  parent.add(mesh);
  return mesh;
}

function addBox(parent, size, position, material, bevel) {
  const geometry = new THREE.BoxGeometry(size[0],size[1],size[2]);
  const mesh = new THREE.Mesh(geometry,material);
  mesh.position.set(position[0],position[1],position[2] || 0);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createDefaultAvatar() {
  avatarRoot = new THREE.Group();
  avatarRoot.position.y = 0.375;
  avatarRoot.name = 'ZERO solid 3D fashion avatar';
  const body = new THREE.Group();
  avatarRoot.add(body);
  const skin = new THREE.Color(avatarConfig.tone || '#bd9278');
  const skinMaterial = new THREE.MeshStandardMaterial({color:skin,roughness:0.82,metalness:0.0});
  const addEllipsoid=(name,position,scale,material=skinMaterial)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
    mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);body.add(mesh);return mesh;
  };
  const addSegment=(name,start,end,rTop,rBottom)=>{
    const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);
    const direction=new THREE.Vector3().subVectors(b,a);
    const length=direction.length();
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,length,24,2,false),skinMaterial);
    mesh.name=name;mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    body.add(mesh);
    return mesh;
  };
  // Head, jaw and neck are distinct but overlap to form a continuous silhouette.
  addEllipsoid('Head',[0,2.78,0],[0.145,0.19,0.145]);
  addEllipsoid('Jaw',[0,2.665,0.018],[0.119,0.105,0.125]);
  addEllipsoid('Neck',[0,2.48,0],[0.075,0.16,0.078]);
  // Anatomical torso profile: broad upper chest, narrower waist, natural pelvis.
  const torsoProfile=[
    new THREE.Vector2(0.13,-0.48),new THREE.Vector2(0.205,-0.44),new THREE.Vector2(0.235,-0.34),
    new THREE.Vector2(0.205,-0.20),new THREE.Vector2(0.19,-0.04),new THREE.Vector2(0.235,0.12),
    new THREE.Vector2(0.315,0.31),new THREE.Vector2(0.34,0.42),new THREE.Vector2(0.27,0.49),
    new THREE.Vector2(0.12,0.52),new THREE.Vector2(0,0.52)
  ];
  const torso=new THREE.Mesh(new THREE.LatheGeometry(torsoProfile,48),skinMaterial);
  torso.name='Continuous chest and abdomen';torso.position.y=1.99;body.add(torso);
  addEllipsoid('Pelvis',[0,1.49,0],[0.255,0.19,0.16]);
  addEllipsoid('Shoulder left',[-0.305,2.30,0],[0.13,0.13,0.14]);
  addEllipsoid('Shoulder right',[0.305,2.30,0],[0.13,0.13,0.14]);
  // Arms have tapered upper arms, elbows and forearms rather than uniform tubes.
  for(const side of [-1,1]){
    const sx=side;
    addSegment('Upper arm', [sx*0.34,2.28,0],[sx*0.43,1.82,0],0.105,0.082);
    addEllipsoid('Elbow',[sx*0.43,1.82,0],[0.083,0.09,0.082]);
    addSegment('Forearm',[sx*0.43,1.82,0],[sx*0.47,1.29,0.015],0.079,0.052);
    addEllipsoid('Palm',[sx*0.475,1.17,0.035],[0.073,0.105,0.045]);
    for(let finger=0;finger<4;finger++){
      const spread=(finger-1.5)*0.027;
      addSegment('Finger',[sx*(0.475+spread),1.13,0.045],[sx*(0.475+spread*1.22),1.035+(finger===1||finger===2?0.015:0),0.05],0.014,0.011);
    }
    addSegment('Thumb',[sx*0.42,1.19,0.04],[sx*0.385,1.105,0.05],0.022,0.014);
    // Legs: substantial thighs, shaped knees, tapered calves and feet.
    addSegment('Thigh',[sx*0.135,1.48,0],[sx*0.155,0.79,0],0.145,0.092);
    addEllipsoid('Kneecap',[sx*0.155,0.77,0.055],[0.094,0.105,0.105]);
    addSegment('Calf',[sx*0.155,0.75,0],[sx*0.17,0.18,-0.005],0.087,0.052);
    addEllipsoid('Ankle',[sx*0.17,0.17,0],[0.06,0.09,0.065]);
    addEllipsoid('Foot',[sx*0.17,0.075,0.105],[0.082,0.075,0.19]);
  }
  if(avatarConfig.hair!=='none'){
    const hair=new THREE.MeshStandardMaterial({color:0x241d1a,roughness:0.88});
    addEllipsoid('Hair cap',[0,2.91,-0.012],[avatarConfig.hair==='textured'?0.16:0.15,0.075,0.15],hair);
    if(avatarConfig.hair==='long'){
      addEllipsoid('Long hair back',[0,2.72,-0.105],[0.13,0.22,0.08],hair);
      for(const side of [-1,1])addEllipsoid('Long hair side',[side*0.13,2.73,-0.015],[0.045,0.2,0.055],hair);
    }
    if(avatarConfig.hair==='textured'){
      for(let i=0;i<7;i++)addEllipsoid('Hair texture',[-0.12+i*0.04,2.96,0.015],[0.035,0.045,0.04],hair);
    }
  }
  scene.add(avatarRoot);
  avatarWidthFactor=1;
  clothingGroup=new THREE.Group();
  clothingGroup.name='Generated outfit layers';
  avatarRoot.add(clothingGroup);
  return avatarRoot;
}
function removeAvatar() {
  if (avatarRoot) {
    scene.remove(avatarRoot);
    const geometries = new Set();
    const materials = new Set();
    avatarRoot.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
          if (material) materials.add(material);
        });
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
  avatarRoot = null;
  clothingGroup = null;
}

function applyGarments(look) {
  if (!avatarRoot || !clothingGroup) return;
  while (clothingGroup.children.length) {
    const child = clothingGroup.children[0];
    clothingGroup.remove(child);
    child.traverse(object => {
      if (object.geometry && object.geometry.dispose) object.geometry.dispose();
      if (object.material && object.material.dispose) object.material.dispose();
    });
  }

  const bySlot = slot => look.items.find(item => item.slot === slot);
  const top = bySlot('TOP');
  const bottom = bySlot('BOTTOM');
  const shoes = bySlot('FOOTWEAR');
  const layer = bySlot('LAYER');
  const topName = String(top && top.name || '').toLowerCase();
  const bottomName = String(bottom && bottom.name || '').toLowerCase();
  const layerName = String(layer && layer.name || '').toLowerCase();
  const accent = look.palette.accent;
  const width = avatarWidthFactor;
  const topMaterial = createMaterial(new THREE.Color(top ? top.color : look.palette.top),0x091c2c,0.97);
  const bottomMaterial = createMaterial(new THREE.Color(bottom ? bottom.color : look.palette.bottom),0x081521,0.98);
  const shoeMaterial = createMaterial(new THREE.Color(shoes ? shoes.color : look.palette.shoes),0x07111d,1);
  const layerMaterial = createMaterial(new THREE.Color(layer ? layer.color : look.palette.outerwear),0x0a2435,0.88);
  const detailMaterial = new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:0.72,depthWrite:false});
  clothingGroup.scale.set(width,1,width);

  const isHoodie = /hoodie|hooded/.test(topName);
  const isJersey = /jersey|performance|training|sport/.test(topName);
  const isKnit = /knit|sweater|jumper/.test(topName);
  const isCargo = /cargo|utility/.test(bottomName);
  const isDenim = /denim|jean/.test(bottomName);
  const isShorts = /shorts/.test(bottomName);
  const isTight = /tight|skinny|slim/.test(bottomName);
  const isBaggy = /baggy|wide|loose|cargo|jogger/.test(bottomName);

  // Top silhouette and sleeves.
  const torsoRadius = isHoodie || isKnit ? 0.325 : (isJersey ? 0.285 : 0.305);
  const torsoLength = isHoodie || isKnit ? 0.4 : 0.36;
  const topBody = addCapsule(clothingGroup,torsoRadius,torsoLength,[0,2.03,0],topMaterial,0);
  topBody.scale.set(isHoodie ? 1.13 : 1.08,isHoodie ? 1.04 : 1.02,1);
  const sleeveRadius = isHoodie || isKnit ? 0.135 : 0.12;
  const sleeveLength = isJersey ? 0.25 : 0.42;
  addCapsule(clothingGroup,sleeveRadius,sleeveLength,[-0.37,2.13,0],topMaterial,-0.12);
  addCapsule(clothingGroup,sleeveRadius,sleeveLength,[0.37,2.13,0],topMaterial,0.12);

  if (isHoodie) {
    const hood = addSphere(clothingGroup,0.19,[0,2.39,-0.075],topMaterial,[0.9,0.86,0.62]);
    hood.rotation.x = -0.12;
    addBox(clothingGroup,[0.39,0.17,0.035],[0,1.84,0.29],topMaterial);
    addCapsule(clothingGroup,0.012,0.14,[-0.075,2.0,0.31],detailMaterial,0);
    addCapsule(clothingGroup,0.012,0.14,[0.075,2.0,0.31],detailMaterial,0);
  } else if (isJersey) {
    addBox(clothingGroup,[0.34,0.045,0.025],[0,2.25,0.294],detailMaterial);
    addBox(clothingGroup,[0.34,0.045,0.025],[0,1.88,0.294],detailMaterial);
  } else if (isKnit) {
    addBox(clothingGroup,[0.58,0.055,0.035],[0,1.82,0.27],detailMaterial);
  }

  // Trousers adapt to the requested cut instead of reusing one narrow shape.
  if (isShorts) {
    const shortsL = addCapsule(clothingGroup,0.19,0.28,[-0.155,1.31,0],bottomMaterial,-0.02);
    const shortsR = addCapsule(clothingGroup,0.19,0.28,[0.155,1.31,0],bottomMaterial,0.02);
    shortsL.scale.set(1.05,1,1);
    shortsR.scale.set(1.05,1,1);
  } else {
    const legRadius = isBaggy ? 0.205 : (isTight ? 0.132 : (isDenim ? 0.155 : 0.16));
    const legL = addCapsule(clothingGroup,legRadius,0.56,[-0.155,1.04,0],bottomMaterial,-0.01);
    const legR = addCapsule(clothingGroup,legRadius,0.56,[0.155,1.04,0],bottomMaterial,0.01);
    legL.scale.set(isBaggy ? 1.12 : 1.02,1.08,0.98);
    legR.scale.set(isBaggy ? 1.12 : 1.02,1.08,0.98);
    addCapsule(clothingGroup,isBaggy ? 0.16 : (isTight ? 0.105 : 0.13),0.48,[-0.16,0.48,0],bottomMaterial,0);
    addCapsule(clothingGroup,isBaggy ? 0.16 : (isTight ? 0.105 : 0.13),0.48,[0.16,0.48,0],bottomMaterial,0);
    if (isCargo) {
      addBox(clothingGroup,[0.13,0.23,0.065],[-0.255,1.12,0.145],bottomMaterial);
      addBox(clothingGroup,[0.13,0.23,0.065],[0.255,1.12,0.145],bottomMaterial);
      addBox(clothingGroup,[0.11,0.025,0.075],[-0.255,1.23,0.183],detailMaterial);
      addBox(clothingGroup,[0.11,0.025,0.075],[0.255,1.23,0.183],detailMaterial);
    }
    if (isDenim) {
      addBox(clothingGroup,[0.012,0.65,0.012],[-0.155,1.03,0.17],detailMaterial);
      addBox(clothingGroup,[0.012,0.65,0.012],[0.155,1.03,0.17],detailMaterial);
    }
  }

  // Distinct footwear volume, with a visible sole and small upper detail.
  [-0.16,0.16].forEach(x=>{
    const shoe=addBox(clothingGroup,[0.25,0.14,0.4],[x,0.13,0.055],shoeMaterial);
    shoe.scale.set(1,1,1);
    addBox(clothingGroup,[0.252,0.025,0.402],[x,0.065,0.055],detailMaterial);
    addBox(clothingGroup,[0.13,0.012,0.08],[x,0.205,0.13],detailMaterial);
  });

  if (layer) {
    const openLayer = /coat|jacket|bomber|puffer|overshirt/.test(layerName);
    if (openLayer) {
      const outer = addCapsule(clothingGroup,0.33,0.42,[0,2.04,-0.018],layerMaterial,0);
      outer.scale.set(1.1,1.04,0.99);
      addCapsule(clothingGroup,0.14,0.43,[-0.39,2.12,0],layerMaterial,-0.12);
      addCapsule(clothingGroup,0.14,0.43,[0.39,2.12,0],layerMaterial,0.12);
      addBox(clothingGroup,[0.018,0.56,0.035],[0,2.03,0.29],detailMaterial);
      addBox(clothingGroup,[0.15,0.09,0.035],[-0.19,2.27,0.27],layerMaterial);
      addBox(clothingGroup,[0.15,0.09,0.035],[0.19,2.27,0.27],layerMaterial);
    } else {
      const outer = addCapsule(clothingGroup,0.326,0.4,[0,2.04,-0.015],layerMaterial,0);
      outer.scale.set(1.05,1.02,0.98);
      addCapsule(clothingGroup,0.139,0.42,[-0.385,2.12,0],layerMaterial,-0.12);
      addCapsule(clothingGroup,0.139,0.42,[0.385,2.12,0],layerMaterial,0.12);
    }
  }

  clothingGroup.traverse(object => {
    if (object.isMesh) object.renderOrder = 3;
  });
}
function setupScene() {
  const small = window.innerWidth < 720 || (navigator.hardwareConcurrency || 4) <= 4;
  // Restore the renderer initialisation used by the last working Outfit Lab build.
  // Let Three.js acquire the WebGL2 context itself instead of pre-creating it on the canvas.
  renderer = new THREE.WebGLRenderer({canvas:sceneCanvas,alpha:false,antialias:!small,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,small ? 1.35 : 1.8));
  renderer.setClearColor(0x070b12,1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene = new THREE.Scene();
  const roomWhite = new THREE.Color(0x070b12);
  scene.background = roomWhite;
  scene.fog = new THREE.Fog(roomWhite,28,58);

  camera = new THREE.PerspectiveCamera(40,1,0.1,100);
  camera.position.set(0,2.72,8.8);
  camera.zoom = 1;
  camera.lookAt(0,1.5,0);
  camera.updateProjectionMatrix();

  scene.add(new THREE.HemisphereLight(0xffffff,0xc7d0d7,1.75));
  const key = new THREE.DirectionalLight(0xffffff,2.35);
  key.position.set(-3.4,6,4.8);
  scene.add(key);
  const fill = new THREE.PointLight(0xc5eaff,0.72,12);
  fill.position.set(3,2.2,2.5);
  scene.add(fill);
  const rim = new THREE.PointLight(0x8bdfff,1.05,13);
  rim.position.set(-2.8,3,-3.5);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40,40),
    new THREE.MeshStandardMaterial({color:0x0b1420,roughness:0.92,metalness:0.04})
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);
  const floorInlay = new THREE.MeshBasicMaterial({color:0x4dbfe9,transparent:true,opacity:0.26,depthWrite:false});
  for(let x=-12;x<=12;x+=4){
    const seam=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.004,34),floorInlay);
    seam.position.set(x,0.006,-5);
    scene.add(seam);
  }
  for(let z=-20;z<=12;z+=4){
    const seam=new THREE.Mesh(new THREE.BoxGeometry(28,0.004,0.012),floorInlay);
    seam.position.set(0,0.006,z);
    scene.add(seam);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({color:0x0c1724,roughness:0.96,metalness:0.015,side:THREE.DoubleSide});
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30,16),wallMaterial);
  backWall.position.set(0,8,-19);
  scene.add(backWall);

  const sideWallMaterial = new THREE.MeshStandardMaterial({color:0x09131f,roughness:0.98,metalness:0,side:THREE.DoubleSide});
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(42,16),sideWallMaterial);
  leftWall.position.set(-15,8,2);
  leftWall.rotation.y = Math.PI/2;
  scene.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(42,16),new THREE.MeshStandardMaterial({color:0x0e1b29,roughness:0.98,metalness:0,side:THREE.DoubleSide}));
  rightWall.position.set(15,8,2);
  rightWall.rotation.y = -Math.PI/2;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30,42),new THREE.MeshStandardMaterial({color:0x0a1420,roughness:0.96,metalness:0,side:THREE.DoubleSide}));
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0,16,2);
  scene.add(ceiling);

  const finMaterial = new THREE.MeshStandardMaterial({color:0x263f54,roughness:0.58,metalness:0.12,emissive:0x8fc9e5,emissiveIntensity:0.12});
  [-10,-7.5,7.5,10].forEach(x=>{
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055,11,0.16),finMaterial);
    fin.position.set(x,5.7,-18.75);
    scene.add(fin);
  });
  const ceilingLightMaterial = new THREE.MeshBasicMaterial({color:0xb8eaff,transparent:true,opacity:0.72});
  [-5.5,0,5.5].forEach(x=>{
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.025,22),ceilingLightMaterial);
    strip.position.set(x,15.94,-5);
    scene.add(strip);
  });

  const platformMaterial = new THREE.MeshStandardMaterial({color:0x15283a,roughness:0.3,metalness:0.2,emissive:0x123d5d,emissiveIntensity:0.12});
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.62,0.22,64),platformMaterial);
  platform.position.y = 0.31;
  scene.add(platform);

  const platformTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.44,1.44,0.018,64),
    new THREE.MeshStandardMaterial({color:0x1a3348,roughness:0.24,metalness:0.12,emissive:0x1b5e85,emissiveIntensity:0.055})
  );
  platformTop.position.y = 0.43;
  scene.add(platformTop);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72,64),
    new THREE.MeshBasicMaterial({color:0x73818a,transparent:true,opacity:0.12,depthWrite:false})
  );
  contactShadow.rotation.x = -Math.PI/2;
  contactShadow.position.set(0,0.444,0);
  contactShadow.scale.set(0.76,0.3,1);
  scene.add(contactShadow);

  function ring(radius,tube,color,opacity,y) {
    const material = new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,96),material);
    mesh.rotation.x = Math.PI/2;
    mesh.position.y = y;
    scene.add(mesh);
    return mesh;
  }
  ring(1.51,0.018,0x3dbdff,0.72,0.365);
  ring(1.43,0.008,0x7be4ff,0.62,0.448);
  ring(1.29,0.004,0xb5f1ff,0.38,0.455);
  const underglow = new THREE.Mesh(new THREE.CircleGeometry(1.42,64),new THREE.MeshBasicMaterial({color:0x36aeea,transparent:true,opacity:0.095,depthWrite:false}));
  underglow.rotation.x = -Math.PI/2;
  underglow.position.y = 0.455;
  scene.add(underglow);
  const platformLight = new THREE.PointLight(0x48c9ff,1.25,5.5);
  platformLight.position.set(0,0.72,0);
  scene.add(platformLight);

  createDefaultAvatar();
  applyGarments(defaultLook());

  const resize = () => {
    const width = Math.max(1,Math.round(window.innerWidth || stage.clientWidth || 1));
    const height = Math.max(1,Math.round(window.innerHeight || stage.clientHeight || 1));
    renderer.setSize(width,height,false);
    camera.aspect = width/height;
    camera.zoom = 1;
    camera.position.set(0,2.72,8.8);
    camera.lookAt(0,1.5,0);
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(stage);
  window.addEventListener('resize',resize,{passive:true});
  if (window.visualViewport) window.visualViewport.addEventListener('resize',resize,{passive:true});
  window.addEventListener('focusout',()=>window.setTimeout(resize,180),{passive:true});
  resize();
  return {observer,resize};
}

function updateLookDetails(look) {
  // The visual outfit breakdown panel was intentionally removed from the showroom.
  // Keep this update optional so outfit application never depends on hidden UI.
  const title = $('lookTitle');
  const vibe = $('lookVibe');
  const note = $('stylingNote');
  const count = $('lookCount');
  const list = $('garmentList');
  if (title) title.textContent = look.title;
  if (vibe) vibe.textContent = look.vibe;
  if (note) note.textContent = look.styling_note;
  if (count) count.textContent = String(look.items.length).padStart(2,'0') + ' ITEMS';
  if (!list) return;
  list.replaceChildren();
  look.items.forEach(item=>{
    const row = document.createElement('div');row.className='garment-row';
    const swatch = document.createElement('span');swatch.className='garment-swatch';swatch.style.background=item.color;
    const copy = document.createElement('span');copy.className='garment-copy';
    const name = document.createElement('strong');name.textContent=item.name;
    const detail = document.createElement('small');detail.textContent=item.detail;
    copy.append(name,detail);
    const slot = document.createElement('span');slot.className='garment-slot';slot.textContent=item.slot;
    row.append(swatch,copy,slot);list.appendChild(row);
  });
}

function applyLook(look) {
  if (avatarRoot) applyGarments(look);
  syncWardrobeControls(look);
  updateLookDetails(look);
  $('stageTitle').textContent = customAvatarName ? 'CUSTOM AVATAR / GLB' : 'SOLID 3D AVATAR';
}

function renderHistory() {
  const strip=$('lookStrip');
  strip.replaceChildren();
  const entries=lookHistory.map((look,index)=>({look,index,saved:false})).concat(
    savedLooks.filter(saved=>!lookHistory.some(recent=>recent.title===saved.title)).map(look=>({look,saved:true}))
  );
  if(!entries.length){
    const empty=document.createElement('div');empty.className='empty-strip';empty.textContent='YOUR PREVIOUS LOOKS WILL APPEAR HERE';strip.appendChild(empty);
  } else entries.forEach(entry=>{
    const look=entry.look,button=document.createElement('button');
    button.type='button';button.className='look-card'+(!entry.saved&&entry.index===activeLookIndex?' active':'');
    const avatar=document.createElement('span');avatar.className='mini-avatar';
    avatar.style.setProperty('--mini-top',look.palette.top);avatar.style.setProperty('--mini-bottom',look.palette.bottom);
    const info=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');
    title.textContent=look.title;meta.textContent=(entry.saved?'SAVED · ':'')+look.style;
    info.append(title,meta);button.append(avatar,info);
    button.addEventListener('click',()=>{
      if(!entry.saved){selectHistoryLook(entry.index);closeHistory();return;}
      lookHistory.unshift(JSON.parse(JSON.stringify(look)));lookHistory=lookHistory.slice(0,12);activeLookIndex=0;selectHistoryLook(0);closeHistory();
    });
    strip.appendChild(button);
  });
  $('historyCount').textContent=String(activeLookIndex+1).padStart(2,'0')+' / '+String(Math.max(1,lookHistory.length)).padStart(2,'0');
}
function renderIdeas() {
  const strip=$('ideaStrip');strip.replaceChildren();
  ideaDeck.forEach((look,index)=>{
    const button=document.createElement('button');button.type='button';
    button.className='idea-card'+(index===0?' active':'');
    const swatch=document.createElement('span');swatch.className='idea-swatch';
    [look.palette.top,look.palette.bottom,look.palette.shoes,look.palette.outerwear].forEach(color=>{
      const chip=document.createElement('i');chip.style.background=color;swatch.appendChild(chip);
    });
    const title=document.createElement('strong');title.textContent=look.title;
    const meta=document.createElement('small');meta.textContent='CONCEPT 0'+(index+1)+' · '+look.style.toUpperCase();
    button.append(swatch,title,meta);
    button.addEventListener('click',()=>{
      activeLookIndex=lookHistory.findIndex(item=>item===look);
      if(activeLookIndex<0){lookHistory.unshift(look);activeLookIndex=0;}
      document.querySelectorAll('.idea-card').forEach((card,i)=>card.classList.toggle('active',i===index));
      transitionToLook(()=>applyLook(look));renderHistory();
    });
    strip.appendChild(button);
  });
  $('ideaCount').textContent=String(ideaDeck.length).padStart(2,'0')+' IDEAS';
}
function openHistory(){const modal=$('historyModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');renderHistory();}
function closeHistory(){const modal=$('historyModal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
function openAvatarStudio(){const modal=$('avatarModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');}
function closeAvatarStudio(){const modal=$('avatarModal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}

function transitionToLook(apply) {
  clearTimeout(transitionApplyTimer);
  clearTimeout(transitionEndTimer);
  stage.classList.remove('transitioning');
  if (reducedMotion) {
    apply();
    return;
  }
  requestAnimationFrame(()=>{
    stage.classList.add('transitioning');
    transitionApplyTimer = setTimeout(apply,260);
    transitionEndTimer = setTimeout(()=>stage.classList.remove('transitioning'),820);
  });
}

function selectHistoryLook(index) {
  if (!lookHistory.length) return;
  activeLookIndex = (index + lookHistory.length) % lookHistory.length;
  transitionToLook(()=>{
    applyLook(lookHistory[activeLookIndex]);
    renderHistory();
  });
}

function stepHistory(direction) {
  if (lookHistory.length < 2) return;
  selectHistoryLook(activeLookIndex + direction);
}

function toggleAutoplay() {
  const button = $('autoplayLooks');
  const active = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed',String(!active));
  clearInterval(autoTimer);
  autoTimer = 0;
  if (!active) {
    autoTimer = setInterval(()=>stepHistory(1),5000);
    showToast('Automatic look preview enabled.');
  } else showToast('Automatic look preview paused.');
}

function renderSavedLooks() {
  renderHistory();
}

function saveCurrentLook() {
  if (!lookHistory.length) return;
  const look = lookHistory[activeLookIndex];
  savedLooks = [JSON.parse(JSON.stringify(look)),...savedLooks.filter(item=>item.title!==look.title)].slice(0,12);
  saveSavedLooks();
  renderHistory();
  showToast('Look saved on this device.');
  $('saveLook').innerHTML = '<span>✓</span> SAVED';
  setTimeout(()=>{$('saveLook').innerHTML='<span>＋</span> SAVE LOOK';},1500);
}

function copyCurrentLook() {
  if (!lookHistory.length) return;
  const look = lookHistory[activeLookIndex];
  const text = 'Z.E.R.O. OUTFIT LAB — ' + look.title + '\n' + look.vibe + '\n' + look.items.map(item=>item.slot + ': ' + item.name + ' — ' + item.detail).join('\n') + '\n\n' + look.styling_note;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(()=>showToast('Outfit brief copied.')).catch(()=>showToast('Clipboard access is unavailable in this browser.'));
  } else showToast('Clipboard access is unavailable in this browser.');
}

function updateGarmentSelection() {
  const look=JSON.parse(JSON.stringify(lookHistory[activeLookIndex]||defaultLook()));
  const top=$('garmentTop')?.value||'Baggy heavyweight hoodie';
  const bottom=$('garmentBottom')?.value||'Baggy fleece joggers';
  const layer=$('garmentLayer')?.value||'';
  const footwear=$('garmentShoes')?.value||'Minimal everyday trainers';
  const palette=look.palette||paletteByStyle[selectedStyle];
  const topItem=look.items.find(item=>item.slot==='TOP'),bottomItem=look.items.find(item=>item.slot==='BOTTOM');
  if(topItem){topItem.name=top;topItem.detail='Selected garment · solid 3D fabric';}
  if(bottomItem){bottomItem.name=bottom;bottomItem.detail='Selected cut · solid 3D fabric';}
  const shoeItem=look.items.find(item=>item.slot==='FOOTWEAR');if(shoeItem){shoeItem.name=footwear;shoeItem.detail='Selected footwear · solid 3D construction';}
  const layerIndex=look.items.findIndex(item=>item.slot==='LAYER');
  if(layer){const item={slot:'LAYER',name:layer,detail:'Selected outer layer · solid 3D fabric',color:palette.outerwear};if(layerIndex>=0)look.items[layerIndex]=item;else look.items.push(item);}
  else if(layerIndex>=0)look.items.splice(layerIndex,1);
  look.title='CUSTOM WARDROBE';look.vibe='Individually selected garments fitted to the solid 3D avatar.';
  lookHistory[activeLookIndex]=look;transitionToLook(()=>applyLook(look));renderHistory();
}
function syncWardrobeControls(look) {
  const top=look.items.find(item=>item.slot==='TOP'),bottom=look.items.find(item=>item.slot==='BOTTOM'),layer=look.items.find(item=>item.slot==='LAYER');
  const sync=(id,value)=>{const node=$(id);if(!node)return;const option=[...node.options].find(item=>item.value.toLowerCase()===String(value||'').toLowerCase());if(option)node.value=option.value;};
  const shoes=look.items.find(item=>item.slot==='FOOTWEAR');
  sync('garmentTop',top&&top.name);sync('garmentBottom',bottom&&bottom.name);sync('garmentLayer',layer&&layer.name);sync('garmentShoes',shoes&&shoes.name);
}
function setStyle(style) {
  selectedStyle = style;
  document.querySelectorAll('.style-chip').forEach(button=>button.classList.toggle('active',button.dataset.style===style));
}

async function loadCustomAvatar(file) {
  // External gallery/file imports are intentionally replaced by the in-app avatar studio.
  if(file) showToast('Choose your avatar inside the Custom Avatar studio.');
}
function resetAvatar() {
  if(!renderer||!scene)return;
  removeAvatar();customAvatarName='';
  avatarConfig={hair:'short',tone:'#bd9278'};
  try{localStorage.setItem(avatarConfigKey,JSON.stringify(avatarConfig));}catch(error){}
  createDefaultAvatar();
  applyGarments(lookHistory[activeLookIndex]||defaultLook());
  $('stageTitle').textContent='SOLID 3D AVATAR';
  showToast('Solid 3D avatar restored.');
}
function applyAvatarConfig(){
  try{localStorage.setItem(avatarConfigKey,JSON.stringify(avatarConfig));}catch(error){}
  document.querySelectorAll('[data-hair]').forEach(button=>button.classList.toggle('active',button.dataset.hair===avatarConfig.hair));
  document.querySelectorAll('[data-tone]').forEach(button=>button.classList.toggle('active',button.dataset.tone===avatarConfig.tone));
  removeAvatar();customAvatarName='';createDefaultAvatar();
  applyGarments(lookHistory[activeLookIndex]||defaultLook());
  $('stageTitle').textContent='CUSTOM SOLID 3D AVATAR';
  closeAvatarStudio();showToast('Your avatar has been updated.');
}
function initTransitionTiles() {
  const host = $('transitionTiles');
  if (!host || host.childElementCount) return;
  const columns = 10;
  const rows = 9;
  for (let row=0;row<rows;row++) {
    for (let column=0;column<columns;column++) {
      const tile = document.createElement('span');
      tile.style.setProperty('--dx',((column-(columns-1)/2)*17)+'px');
      tile.style.setProperty('--dy',((row-(rows-1)/2)*15)+'px');
      tile.style.setProperty('--delay',(Math.random()*0.16).toFixed(3)+'s');
      host.appendChild(tile);
    }
  }
}

function bindEvents() {
  document.querySelectorAll('.style-chip').forEach(button=>button.addEventListener('click',()=>setStyle(button.dataset.style)));
  generateButton.addEventListener('click',generateOutfit);
  $('openHistory').addEventListener('click',openHistory);
  $('closeHistory').addEventListener('click',closeHistory);
  $('historyModal').addEventListener('click',event=>{if(event.target===$('historyModal'))closeHistory();});
  $('customAvatarButton').addEventListener('click',openAvatarStudio);
  $('closeAvatar').addEventListener('click',closeAvatarStudio);
  $('avatarModal').addEventListener('click',event=>{if(event.target===$('avatarModal'))closeAvatarStudio();});
  document.querySelectorAll('[data-hair]').forEach(button=>button.addEventListener('click',()=>{avatarConfig.hair=button.dataset.hair;document.querySelectorAll('[data-hair]').forEach(item=>item.classList.toggle('active',item===button));}));
  document.querySelectorAll('[data-tone]').forEach(button=>button.addEventListener('click',()=>{avatarConfig.tone=button.dataset.tone;document.querySelectorAll('[data-tone]').forEach(item=>item.classList.toggle('active',item===button));}));
  $('applyAvatar').addEventListener('click',applyAvatarConfig);
  $('resetAvatar').addEventListener('click',resetAvatar);
  ['garmentTop','garmentBottom','garmentLayer','garmentShoes'].forEach(id=>$(id)?.addEventListener('change',updateGarmentSelection));
  $('backButton').addEventListener('click',()=>window.parent.postMessage({type:'ZERO_OUTFIT_CLOSE'},window.location.origin));
  window.addEventListener('keydown',event=>{
    if (event.key === 'Escape') {closeHistory();closeAvatarStudio();window.parent.postMessage({type:'ZERO_OUTFIT_CLOSE'},window.location.origin);}
    if (event.key === 'ArrowLeft' && !/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)) stepHistory(-1);
    if (event.key === 'ArrowRight' && !/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)) stepHistory(1);
  });
  window.addEventListener('message',event=>{
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const data = event.data || {};
    if (data.type === 'ZERO_OUTFIT_PROMPT') {
      $('outfitBrief').value = String(data.prompt || '').slice(0,700);
      if (data.generate) generateOutfit();
    }
  });
  sceneCanvas.addEventListener('pointerdown',event=>{
    pointerDown = true;dragged=false;lastPointerX=event.clientX;sceneCanvas.setPointerCapture(event.pointerId);
  });
  sceneCanvas.addEventListener('pointermove',event=>{
    if (!pointerDown || !avatarRoot) return;
    const dx = event.clientX-lastPointerX;
    if (Math.abs(dx)>1) dragged=true;
    avatarRoot.rotation.y += dx*0.008;
    lastPointerX = event.clientX;
  });
  const release = ()=>{pointerDown=false;};
  sceneCanvas.addEventListener('pointerup',release);
  sceneCanvas.addEventListener('pointercancel',release);
}

function animate() {
  renderFrame = requestAnimationFrame(animate);
  const time = performance.now()*0.001;
  if (avatarRoot && !pointerDown && !reducedMotion) avatarRoot.rotation.y += 0.0018;
  if (renderer && scene && camera) {
    renderer.render(scene,camera);
    if (!stage.classList.contains('three-rendered')) stage.classList.add('three-rendered');
  }
}

function init() {
  initTransitionTiles();
  bindEvents();
  try {
    setupScene();
    stage.classList.add('scene-ready');
    if (!lookHistory.length) lookHistory = [defaultLook()];
    applyLook(lookHistory[0]);
    ideaDeck=[lookHistory[0],fallbackLook(1),fallbackLook(2)];
    renderIdeas();
    renderHistory();
    renderSavedLooks();
    engineStatus.textContent = 'LOCAL STYLING MODE';
    setStatus('READY WHEN YOU ARE');
    animate();
  } catch (error) {
    console.error('Outfit Lab scene failed to initialise.',error);
    engineStatus.textContent = 'COMPATIBILITY VIEW';
    setStatus(error && error.message ? error.message.slice(0,110) : '3D PREVIEW UNAVAILABLE · TRY CHROME');
    stage.classList.add('scene-unavailable');
  }
}

window.addEventListener('pagehide',()=>{
  if (renderFrame) cancelAnimationFrame(renderFrame);
  clearInterval(autoTimer);
  clearTimeout(toastTimer);
  if (renderer) renderer.dispose();
});
init();
