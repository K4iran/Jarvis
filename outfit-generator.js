import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
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
let autoTimer = 0;
let isGenerating = false;
let avatarRoot = null;
let reflectionRoot = null;
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
    title:'FIRST LIGHT',
    vibe:'A clean starting point with a balanced, understated finish.',
    style:selectedStyle,
    palette:{top:p.top,bottom:p.bottom,shoes:p.shoes,outerwear:p.outerwear,accent:p.accent},
    items:[
      {slot:'TOP',name:'Relaxed textured top',detail:'Soft structure · clean finish',color:p.top},
      {slot:'BOTTOM',name:'Relaxed straight-leg trousers',detail:'Easy movement · balanced shape',color:p.bottom},
      {slot:'FOOTWEAR',name:'Minimal everyday trainers',detail:'Low-profile finish',color:p.shoes},
      {slot:'LAYER',name:'Lightweight overshirt',detail:'Optional layer · tonal contrast',color:p.outerwear}
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
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The styling response was not structured JSON.');
  return normaliseLook(JSON.parse(text.slice(start,end+1)),text);
}

function fallbackLook() {
  const p = paletteByStyle[selectedStyle] || paletteByStyle.Streetwear;
  const brief = $('outfitBrief').value.trim();
  const mood = $('colourMood').value;
  const modifier = mood === 'Monochrome' ? {top:'#B8C0C7',bottom:'#242D39',shoes:'#DCE4EA',outerwear:'#66727D',accent:'#A9D8E8'}
    : mood === 'Earth tones' ? {top:'#B5A48D',bottom:'#444039',shoes:'#D6C8B4',outerwear:'#696B50',accent:'#C69B72'}
    : mood === 'Cool tones' ? {top:'#789BB8',bottom:'#263A54',shoes:'#DCEBF3',outerwear:'#435E7D',accent:'#69D9FF'}
    : mood === 'Warm neutrals' ? {top:'#D0BBA5',bottom:'#65574B',shoes:'#E8DBCB',outerwear:'#A27D60',accent:'#D0A77D'}
    : mood === 'One accent colour' ? {top:p.top,bottom:p.bottom,shoes:p.shoes,outerwear:p.outerwear,accent:'#63D8FF'}
    : p;
  return normaliseLook({
    title:selectedStyle + ' / ' + $('occasion').value,
    vibe:brief || selectedStyle + ' styling for ' + $('occasion').value.toLowerCase(),
    style:selectedStyle,
    palette:modifier,
    items:[
      {slot:'TOP',name:'Textured relaxed-fit top',detail:'A clean foundation piece',color:modifier.top},
      {slot:'BOTTOM',name:'Relaxed straight-leg trousers',detail:'Easy, balanced proportions',color:modifier.bottom},
      {slot:'FOOTWEAR',name:'Minimal everyday footwear',detail:'A quiet finishing detail',color:modifier.shoes},
      {slot:'LAYER',name:'Lightweight overshirt',detail:'Adds depth and texture',color:modifier.outerwear}
    ],
    styling_note:'A locally composed ' + selectedStyle.toLowerCase() + ' direction. ' + (brief ? 'Your brief is kept as the styling reference.' : 'Add a more detailed brief to steer the next variation.')
  });
}

function buildGenerationPrompt() {
  const brief = $('outfitBrief').value.trim() || 'Create a fresh, cohesive outfit in this style direction.';
  return [
    'You are the styling engine inside Z.E.R.O. Outfit Lab. Create one practical, cohesive outfit and respond with ONLY one valid JSON object. Do not use Markdown, fences or commentary.',
    'User brief: ' + brief,
    'Style direction: ' + selectedStyle,
    'Occasion: ' + $('occasion').value,
    'Season: ' + $('season').value,
    'Colour mood: ' + $('colourMood').value,
    'Return exactly this shape: {"title":"short look name","vibe":"one short sentence","style":"style label","palette":{"top":"#RRGGBB","bottom":"#RRGGBB","shoes":"#RRGGBB","outerwear":"#RRGGBB","accent":"#RRGGBB"},"items":[{"slot":"TOP","name":"garment name","detail":"short texture or styling detail","color":"#RRGGBB"},{"slot":"BOTTOM","name":"garment name","detail":"short texture or styling detail","color":"#RRGGBB"},{"slot":"FOOTWEAR","name":"footwear name","detail":"short detail","color":"#RRGGBB"},{"slot":"LAYER","name":"outer layer name","detail":"short detail","color":"#RRGGBB"},{"slot":"ACCESSORY","name":"optional accessory","detail":"short detail","color":"#RRGGBB"}],"styling_note":"one or two useful sentences"}.',
    'Use original, brand-neutral garment descriptions. Include the layer and accessory only when they genuinely improve the outfit. Never discuss or judge the avatar’s body, proportions, attractiveness or weight. Do not add prices, shopping links or logos.'
  ].join('\n');
}

async function generateOutfit() {
  if (isGenerating) return;
  isGenerating = true;
  generateButton.disabled = true;
  generateLabel.textContent = 'GENERATING';
  setStatus('ZERO IS COMPOSING YOUR LOOK');
  stage.classList.remove('transitioning');
  try {
    let look = null;
    let engine = 'ZERO AI';
    try {
      if (!window.parent || typeof window.parent.__zeroGenerateOutfit !== 'function') throw new Error('Z.E.R.O. chat bridge is unavailable.');
      const reply = await window.parent.__zeroGenerateOutfit(buildGenerationPrompt());
      look = parseLookReply(reply);
    } catch (error) {
      console.warn('AI outfit generation unavailable; using local style composition.',error);
      look = fallbackLook();
      engine = 'LOCAL STYLE MODE';
    }
    transitionToLook(() => {
      lookHistory.unshift(look);
      lookHistory = lookHistory.slice(0,12);
      activeLookIndex = 0;
      applyLook(look);
      renderHistory();
      engineStatus.textContent = engine === 'ZERO AI' ? 'ZERO AI CONNECTED' : 'LOCAL STYLING ACTIVE';
      setStatus(engine === 'ZERO AI' ? 'NEW LOOK GENERATED / ZERO AI' : 'NEW LOOK COMPOSED / LOCAL MODE');
    });
  } finally {
    setTimeout(() => {
      isGenerating = false;
      generateButton.disabled = false;
      generateLabel.textContent = 'GENERATE OUTFIT';
    }, reducedMotion ? 0 : 880);
  }
}

function createMaterial(color, emissive, opacity) {
  return new THREE.MeshPhysicalMaterial({
    color:color,
    emissive:emissive || color,
    emissiveIntensity:0.16,
    metalness:0.15,
    roughness:0.38,
    clearcoat:0.36,
    clearcoatRoughness:0.34,
    transparent:opacity < 1,
    opacity:opacity,
    side:THREE.DoubleSide,
    depthWrite:opacity >= 1
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
  avatarRoot.name = 'ZERO holographic mannequin';
  const body = new THREE.Group();
  body.name = 'Holographic body';
  avatarRoot.add(body);
  const hologram = new THREE.MeshPhysicalMaterial({
    color:0x8bdfff,emissive:0x075a91,emissiveIntensity:1.05,metalness:0.18,roughness:0.22,
    transparent:true,opacity:0.34,clearcoat:1,side:THREE.DoubleSide,depthWrite:false
  });
  const edgeMaterial = new THREE.LineBasicMaterial({color:0x80e6ff,transparent:true,opacity:0.48,depthWrite:false});
  const bodyPieces = [];
  const addBody = mesh => {
    body.add(mesh);
    bodyPieces.push(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,24),edgeMaterial);
    mesh.add(edges);
  };
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165,24,20),hologram);
  head.position.set(0,2.78,0);
  addBody(head);
  addBody(addCapsule(body,0.075,0.13,[0,2.59,0],hologram,0));
  addBody(addCapsule(body,0.29,0.36,[0,2.03,0],hologram,0));
  addBody(addCapsule(body,0.25,0.19,[0,1.54,0],hologram,0));
  addBody(addCapsule(body,0.145,0.48,[-0.155,1.07,0],hologram,-0.015));
  addBody(addCapsule(body,0.145,0.48,[0.155,1.07,0],hologram,0.015));
  addBody(addCapsule(body,0.115,0.48,[-0.16,0.49,0],hologram,0));
  addBody(addCapsule(body,0.115,0.48,[0.16,0.49,0],hologram,0));
  addBody(addCapsule(body,0.115,0.43,[-0.37,2.13,0],hologram,-0.12));
  addBody(addCapsule(body,0.105,0.40,[-0.43,1.66,0],hologram,-0.17));
  addBody(addCapsule(body,0.115,0.43,[0.37,2.13,0],hologram,0.12));
  addBody(addCapsule(body,0.105,0.40,[0.43,1.66,0],hologram,0.17));
  addBody(addSphere(body,0.085,[-0.45,1.39,0],hologram));
  addBody(addSphere(body,0.085,[0.45,1.39,0],hologram));
  scene.add(avatarRoot);
  avatarWidthFactor = 1;
  clothingGroup = new THREE.Group();
  clothingGroup.name = 'Generated outfit layers';
  avatarRoot.add(clothingGroup);
  return avatarRoot;
}

function removeAvatar() {
  if (avatarRoot) {
    scene.remove(avatarRoot);
    avatarRoot.traverse(object => {
      if (object.isMesh) {
        if (object.geometry && object.geometry.dispose) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => { if (material && material.dispose) material.dispose(); });
      }
    });
  }
  if (reflectionRoot) {
    scene.remove(reflectionRoot);
    reflectionRoot.traverse(object => {
      if (object.isMesh) {
        if (object.geometry && object.geometry.dispose) object.geometry.dispose();
        if (object.material && object.material.dispose) object.material.dispose();
      }
    });
  }
  avatarRoot = null;
  reflectionRoot = null;
  clothingGroup = null;
}

function createReflection() {
  if (!avatarRoot) return;
  if (reflectionRoot) scene.remove(reflectionRoot);
  reflectionRoot = avatarRoot.clone(true);
  reflectionRoot.name = 'Soft glass-floor reflection';
  reflectionRoot.scale.y = -1;
  reflectionRoot.position.y = 0.88 - avatarRoot.position.y;
  reflectionRoot.traverse(object => {
    if (!object.isMesh) return;
    object.material = new THREE.MeshBasicMaterial({
      color:0x4d9dc8,transparent:true,opacity:0.105,side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,depthWrite:false
    });
  });
  scene.add(reflectionRoot);
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
  const accent = look.palette.accent;
  const width = avatarWidthFactor;
  const topMaterial = createMaterial(new THREE.Color(top ? top.color : look.palette.top),0x091c2c,0.97);
  const bottomMaterial = createMaterial(new THREE.Color(bottom ? bottom.color : look.palette.bottom),0x081521,0.98);
  const shoeMaterial = createMaterial(new THREE.Color(shoes ? shoes.color : look.palette.shoes),0x07111d,1);
  const layerMaterial = createMaterial(new THREE.Color(layer ? layer.color : look.palette.outerwear),0x0a2435,0.88);
  const detailMaterial = new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:0.72,depthWrite:false});
  clothingGroup.scale.set(width,1,width);
  const topBody = addCapsule(clothingGroup,0.305,0.36,[0,2.03,0],topMaterial,0);
  topBody.scale.set(1.08,1.02,0.96);
  addCapsule(clothingGroup,0.125,0.40,[-0.37,2.13,0],topMaterial,-0.12);
  addCapsule(clothingGroup,0.125,0.40,[0.37,2.13,0],topMaterial,0.12);
  const legL = addCapsule(clothingGroup,0.16,0.54,[-0.155,1.04,0],bottomMaterial,-0.01);
  const legR = addCapsule(clothingGroup,0.16,0.54,[0.155,1.04,0],bottomMaterial,0.01);
  legL.scale.set(1.02,1.05,0.95);
  legR.scale.set(1.02,1.05,0.95);
  addCapsule(clothingGroup,0.13,0.48,[-0.16,0.48,0],bottomMaterial,0);
  addCapsule(clothingGroup,0.13,0.48,[0.16,0.48,0],bottomMaterial,0);
  addBox(clothingGroup,[0.24,0.13,0.39],[-0.16,0.13,0.055],shoeMaterial);
  addBox(clothingGroup,[0.24,0.13,0.39],[0.16,0.13,0.055],shoeMaterial);
  if (layer) {
    const outer = addCapsule(clothingGroup,0.326,0.40,[0,2.04,-0.015],layerMaterial,0);
    outer.scale.set(1.05,1.02,0.98);
    addCapsule(clothingGroup,0.139,0.42,[-0.385,2.12,0],layerMaterial,-0.12);
    addCapsule(clothingGroup,0.139,0.42,[0.385,2.12,0],layerMaterial,0.12);
  }
  const accentLine = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.008,5,36),detailMaterial);
  accentLine.rotation.x = Math.PI/2;
  accentLine.position.set(0,1.69,0);
  clothingGroup.add(accentLine);
  clothingGroup.traverse(object => {
    if (object.isMesh) object.renderOrder = 3;
  });
  createReflection();
}

function setupScene() {
  const small = window.innerWidth < 720 || (navigator.hardwareConcurrency || 4) <= 4;
  renderer = new THREE.WebGLRenderer({canvas:sceneCanvas,alpha:true,antialias:!small,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,small ? 1.35 : 1.8));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06111e,0.024);
  camera = new THREE.PerspectiveCamera(37,1,0.1,70);
  camera.position.set(0,2.48,7.3);
  camera.lookAt(0,1.47,0);

  scene.add(new THREE.HemisphereLight(0x9adfff,0x081321,1.25));
  const key = new THREE.DirectionalLight(0xc8efff,2.1);
  key.position.set(-3.4,5.5,4.8);scene.add(key);
  const fill = new THREE.PointLight(0x178cff,2.2,10);
  fill.position.set(2.6,1.1,1.5);scene.add(fill);
  const rim = new THREE.PointLight(0x4fe5ff,2.8,11);
  rim.position.set(-2.2,2.5,-2.6);scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshPhysicalMaterial({color:0x071421,metalness:0.68,roughness:0.18,transparent:true,opacity:0.28,clearcoat:1,clearcoatRoughness:0.08,side:THREE.DoubleSide,depthWrite:false}));
  floor.rotation.x = -Math.PI/2;floor.position.y = 0.015;floor.receiveShadow = true;scene.add(floor);
  const grid = new THREE.GridHelper(36,54,0x286082,0x15354b);
  grid.position.y = 0.022;
  grid.material.transparent = true;grid.material.opacity = 0.13;grid.material.depthWrite = false;scene.add(grid);

  const wallMat = new THREE.MeshPhysicalMaterial({color:0x6baac4,metalness:0.28,roughness:0.16,transparent:true,opacity:0.075,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(18,8),wallMat);
  wall.position.set(0,3.6,-4.8);scene.add(wall);
  const wallEdge = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry),new THREE.LineBasicMaterial({color:0x7ccdec,transparent:true,opacity:0.32}));
  wall.add(wallEdge);
  [-1,1].forEach(side=>{
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(7,7),wallMat.clone());
    pane.position.set(side*4.1,3.35,0.1);pane.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(pane);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(pane.geometry),new THREE.LineBasicMaterial({color:0x65badd,transparent:true,opacity:0.24}));
    pane.add(edge);
  });

  const platformMaterial = new THREE.MeshPhysicalMaterial({color:0x092238,metalness:0.72,roughness:0.18,transparent:true,opacity:0.84,clearcoat:1,emissive:0x04182a,emissiveIntensity:0.9});
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.62,0.22,8,1),platformMaterial);
  platform.position.y=0.31;platform.receiveShadow=true;scene.add(platform);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.44,1.44,0.018,64),new THREE.MeshPhysicalMaterial({color:0x173d56,metalness:0.65,roughness:0.13,transparent:true,opacity:0.62,clearcoat:1,clearcoatRoughness:0.06}));
  top.position.y=0.43;scene.add(top);

  function ring(radius,tube,color,opacity,y) {
    const material = new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,96),material);
    mesh.rotation.x=Math.PI/2;mesh.position.y=y;scene.add(mesh);return mesh;
  }
  ring(1.48,0.018,0x58cfff,0.92,0.365);
  ring(1.62,0.012,0x1e8dff,0.52,0.31);
  ring(1.32,0.006,0x8feaff,0.36,0.448);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.62,64),new THREE.MeshBasicMaterial({color:0x1677c4,transparent:true,opacity:0.055,blending:THREE.AdditiveBlending,depthWrite:false}));
  glowDisc.rotation.x=-Math.PI/2;glowDisc.position.y=0.442;scene.add(glowDisc);

  createDefaultAvatar();
  applyGarments(defaultLook());
  const resize = () => {
    const width = Math.max(1,stage.clientWidth);
    const height = Math.max(1,stage.clientHeight);
    renderer.setSize(width,height,false);
    camera.aspect = width/height;camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(stage);
  window.addEventListener('resize',resize,{passive:true});
  resize();
  return {observer,resize};
}

function updateLookDetails(look) {
  $('lookTitle').textContent = look.title;
  $('lookVibe').textContent = look.vibe;
  $('stylingNote').textContent = look.styling_note;
  $('lookCount').textContent = String(look.items.length).padStart(2,'0') + ' ITEMS';
  const list = $('garmentList');
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
  updateLookDetails(look);
  $('stageTitle').textContent = customAvatarName ? 'CUSTOM AVATAR / GLB' : 'HOLOGRAPHIC AVATAR';
}

function renderHistory() {
  const strip = $('lookStrip');
  strip.replaceChildren();
  const recentEntries = lookHistory.map((look,index)=>({look,index,saved:false}));
  const savedEntries = savedLooks
    .filter(saved=>!lookHistory.some(recent=>recent.title===saved.title))
    .map(look=>({look,saved:true}));
  const entries = recentEntries.concat(savedEntries);
  if (!entries.length) {
    const empty = document.createElement('div');empty.className='empty-strip';empty.textContent='GENERATED LOOKS WILL APPEAR HERE';strip.appendChild(empty);
  } else {
    entries.forEach(entry=>{
      const look = entry.look;
      const button = document.createElement('button');
      button.type='button';
      button.className='look-card'+(!entry.saved && entry.index===activeLookIndex?' active':'');
      const avatar = document.createElement('span');avatar.className='mini-avatar';
      avatar.style.setProperty('--mini-top',look.palette.top);avatar.style.setProperty('--mini-bottom',look.palette.bottom);
      const info = document.createElement('span');
      const title = document.createElement('strong');title.textContent=look.title;
      const meta = document.createElement('small');meta.textContent=(entry.saved?'SAVED · ':'')+look.style;
      info.append(title,meta);button.append(avatar,info);
      button.addEventListener('click',()=>{
        if (!entry.saved) {
          selectHistoryLook(entry.index);
          return;
        }
        lookHistory.unshift(JSON.parse(JSON.stringify(look)));
        lookHistory = lookHistory.slice(0,12);
        activeLookIndex = 0;
        selectHistoryLook(0);
      });
      strip.appendChild(button);
    });
  }
  $('historyCount').textContent = String(activeLookIndex+1).padStart(2,'0') + ' / ' + String(Math.max(1,lookHistory.length)).padStart(2,'0');
  $('previousLook').disabled = lookHistory.length < 2;
  $('nextLook').disabled = lookHistory.length < 2;
}

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

function setStyle(style) {
  selectedStyle = style;
  document.querySelectorAll('.style-chip').forEach(button=>button.classList.toggle('active',button.dataset.style===style));
}

async function loadCustomAvatar(file) {
  if (!file) return;
  if (file.size > 50*1024*1024) { showToast('Please choose a GLB file under 50 MB.');return; }
  if (!file.name.toLowerCase().endsWith('.glb')) { showToast('Custom avatars currently need to be a single-file .glb model.');return; }
  setStatus('LOADING CUSTOM AVATAR');
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(url,gltf=>{
    URL.revokeObjectURL(url);
    removeAvatar();
    avatarRoot = new THREE.Group();
    avatarRoot.position.y = 0.44;
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const normalScale = 3.05 / Math.max(0.1,size.y);
    model.scale.setScalar(normalScale);
    model.position.set(-center.x*normalScale,-bounds.min.y*normalScale,-center.z*normalScale);
    const hologram = new THREE.MeshPhysicalMaterial({color:0x8bdfff,emissive:0x075a91,emissiveIntensity:0.82,metalness:0.2,roughness:0.22,transparent:true,opacity:0.42,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
    model.traverse(object=>{
      if (!object.isMesh) return;
      object.material = hologram.clone();
      object.castShadow = true;
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry,25),new THREE.LineBasicMaterial({color:0x7be4ff,transparent:true,opacity:0.24,depthWrite:false}));
      object.add(lines);
    });
    avatarRoot.add(model);
    scene.add(avatarRoot);
    avatarWidthFactor = clamp((size.x*normalScale)/0.82,0.72,1.45);
    clothingGroup = new THREE.Group();
    clothingGroup.name = 'Generated outfit preview layers';
    avatarRoot.add(clothingGroup);
    customAvatarName = file.name.replace(/\.glb$/i,'');
    $('stageTitle').textContent = 'CUSTOM AVATAR / GLB';
    applyGarments(lookHistory[activeLookIndex] || defaultLook());
    setStatus('CUSTOM AVATAR LOADED / SESSION ONLY');
    showToast('Custom avatar loaded. Outfit layers are a visual styling preview.');
  },undefined,error=>{
    URL.revokeObjectURL(url);
    console.error('Custom avatar failed to load.',error);
    setStatus('CUSTOM AVATAR COULD NOT BE LOADED');
    showToast('That GLB could not be opened. Try exporting it again as a single-file GLB.');
  });
}

function resetAvatar() {
  if (!renderer || !scene) return;
  removeAvatar();
  customAvatarName = '';
  createDefaultAvatar();
  const current = lookHistory[activeLookIndex] || defaultLook();
  applyGarments(current);
  $('stageTitle').textContent = 'HOLOGRAPHIC AVATAR';
  $('avatarFile').value = '';
  showToast('Holographic mannequin restored.');
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
  $('previousLook').addEventListener('click',()=>stepHistory(-1));
  $('nextLook').addEventListener('click',()=>stepHistory(1));
  $('autoplayLooks').addEventListener('click',toggleAutoplay);
  $('saveLook').addEventListener('click',saveCurrentLook);
  $('copyLook').addEventListener('click',copyCurrentLook);
  $('avatarFile').addEventListener('change',event=>loadCustomAvatar(event.target.files && event.target.files[0]));
  $('resetAvatar').addEventListener('click',resetAvatar);
  $('backButton').addEventListener('click',()=>window.parent.postMessage({type:'ZERO_OUTFIT_CLOSE'},window.location.origin));
  window.addEventListener('keydown',event=>{
    if (event.key === 'Escape') window.parent.postMessage({type:'ZERO_OUTFIT_CLOSE'},window.location.origin);
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
  if (reflectionRoot && avatarRoot) reflectionRoot.rotation.y = avatarRoot.rotation.y;
  if (renderer && scene && camera) renderer.render(scene,camera);
}

function init() {
  initTransitionTiles();
  bindEvents();
  try {
    setupScene();
    if (!lookHistory.length) lookHistory = [defaultLook()];
    applyLook(lookHistory[0]);
    renderHistory();
    renderSavedLooks();
    engineStatus.textContent = typeof window.parent.__zeroGenerateOutfit === 'function' ? 'ZERO AI CONNECTED' : 'LOCAL STYLING MODE';
    setStatus('READY WHEN YOU ARE');
    animate();
  } catch (error) {
    console.error('Outfit Lab scene failed to initialise.',error);
    engineStatus.textContent = '2D FALLBACK';
    setStatus('3D PREVIEW UNAVAILABLE ON THIS DEVICE');
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
