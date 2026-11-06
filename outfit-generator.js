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

function fallbackLook() {
  const base = paletteByStyle[selectedStyle] || paletteByStyle.Streetwear;
  const brief = $('outfitBrief').value.trim();
  const text = brief.toLowerCase();
  const mood = $('colourMood').value;
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
  Object.keys(colourMap).forEach(colour=>{
    if(new RegExp('\\b'+colour+'\\b').test(text)){
      if(/trouser|pant|cargo|jean|denim|short/.test(text)) modifier.bottom=colourMap[colour];
      else if(/shoe|trainer|sneaker|boot/.test(text)) modifier.shoes=colourMap[colour];
      else if(/jacket|coat|overshirt|layer/.test(text)) modifier.outerwear=colourMap[colour];
      else modifier.top=colourMap[colour];
    }
  });

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

  return normaliseLook({
    title:brief ? brief.slice(0,32) : selectedStyle + ' / ' + $('occasion').value,
    vibe:brief || selectedStyle + ' styling for ' + $('occasion').value.toLowerCase(),
    style:selectedStyle,
    palette:modifier,
    items:[
      {slot:'TOP',name:topName,detail:'Selected to match your outfit brief',color:modifier.top},
      {slot:'BOTTOM',name:bottomName,detail:'A relaxed silhouette with balanced proportions',color:modifier.bottom},
      {slot:'FOOTWEAR',name:shoeName,detail:'Finishes the look without overpowering it',color:modifier.shoes},
      {slot:'LAYER',name:layerName,detail:'Adds texture and depth to the outfit',color:modifier.outerwear}
    ],
    styling_note:'A locally composed outfit based on your description. The AI styling connection can provide more specific combinations when available.'
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
  setStatus('CONNECTING TO Z.E.R.O. STYLING');
  stage.classList.remove('transitioning');
  let look;
  let engine = 'ZERO AI';
  let aiError = null;
  try {
    if (!window.parent || typeof window.parent.__zeroGenerateOutfit !== 'function') {
      throw new Error('The Z.E.R.O. outfit connection is unavailable.');
    }
    let timeoutId;
    const timeout = new Promise((resolve,reject)=>{ timeoutId=window.setTimeout(()=>reject(new Error('The outfit AI took too long to respond. Please try again.')),35000); });
    let reply;
    try { reply = await Promise.race([window.parent.__zeroGenerateOutfit(buildGenerationPrompt()),timeout]); }
    finally { clearTimeout(timeoutId); }
    look = parseLookReply(reply);
  } catch (error) {
    aiError = error;
    console.error('AI outfit generation failed; composing a local look instead.',error);
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
    if (engine === 'ZERO AI') {
      setStatus('OUTFIT GENERATED / ZERO AI');
    } else {
      setStatus('LOCAL OUTFIT SHOWN / AI CONNECTION FAILED');
      showToast(aiError && aiError.message ? aiError.message.slice(0,110) : 'AI unavailable. A local outfit was composed.');
    }
  });
  setTimeout(() => {
    isGenerating = false;
    generateButton.disabled = false;
    generateLabel.textContent = 'GENERATE OUTFIT';
  }, reducedMotion ? 0 : 880);
}

function createMaterial(color, emissive, opacity) {
  return new THREE.MeshPhysicalMaterial({
    color:color,
    emissive:emissive || color,
    emissiveIntensity:0.42,
    metalness:0.22,
    roughness:0.3,
    clearcoat:0.58,
    clearcoatRoughness:0.28,
    transparent:true,
    opacity:Math.min(opacity,0.36),
    side:THREE.DoubleSide,
    depthWrite:false
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

function createAvatarParticles() {
  if (!avatarRoot) return;
  const previous = avatarRoot.getObjectByName('Holographic particle skin');
  if (previous) {
    avatarRoot.remove(previous);
    if (previous.geometry) previous.geometry.dispose();
    if (previous.material) previous.material.dispose();
  }

  avatarRoot.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(avatarRoot.matrixWorld).invert();
  const meshes = [];
  let totalTriangleCount = 0;
  avatarRoot.traverse(object => {
    if (!object.isMesh || !object.geometry) return;
    object.visible = true;
    meshes.push(object);
    const position = object.geometry.getAttribute('position');
    const index = object.geometry.index;
    totalTriangleCount += index ? Math.floor(index.count / 3) : Math.floor((position ? position.count : 0) / 3);
  });

  if (!meshes.length || !totalTriangleCount) return;
  const triangleStride = Math.max(1,Math.ceil(totalTriangleCount / 18000));
  const triangles = [];
  const cumulativeAreas = [];
  let totalArea = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const na = new THREE.Vector3();
  const nb = new THREE.Vector3();
  const nc = new THREE.Vector3();

  meshes.forEach(mesh => {
    const source = mesh.geometry;
    if (!source.getAttribute('normal')) source.computeVertexNormals();
    const positions = source.getAttribute('position');
    const normals = source.getAttribute('normal');
    const index = source.index;
    const triangleCount = index ? Math.floor(index.count / 3) : Math.floor(positions.count / 3);
    const relativeMatrix = new THREE.Matrix4().copy(rootInverse).multiply(mesh.matrixWorld);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(relativeMatrix);
    const sourceMaterial = Array.isArray(mesh.material)
      ? mesh.material.find(material => material && material.color)
      : mesh.material;
    const color = sourceMaterial && sourceMaterial.color
      ? sourceMaterial.color
      : new THREE.Color(0x78dcff);
    const colorValues = [color.r,color.g,color.b];

    for (let triangle=0;triangle<triangleCount;triangle+=triangleStride) {
      const offset = triangle*3;
      const ia = index ? index.getX(offset) : offset;
      const ib = index ? index.getX(offset+1) : offset+1;
      const ic = index ? index.getX(offset+2) : offset+2;
      a.fromBufferAttribute(positions,ia).applyMatrix4(relativeMatrix);
      b.fromBufferAttribute(positions,ib).applyMatrix4(relativeMatrix);
      c.fromBufferAttribute(positions,ic).applyMatrix4(relativeMatrix);
      ab.subVectors(b,a);
      ac.subVectors(c,a);
      const area = ab.cross(ac).length()*0.5;
      if (area < 0.000001) continue;

      na.fromBufferAttribute(normals,ia).applyMatrix3(normalMatrix).normalize();
      nb.fromBufferAttribute(normals,ib).applyMatrix3(normalMatrix).normalize();
      nc.fromBufferAttribute(normals,ic).applyMatrix3(normalMatrix).normalize();
      triangles.push({
        a:[a.x,a.y,a.z],b:[b.x,b.y,b.z],c:[c.x,c.y,c.z],
        na:[na.x,na.y,na.z],nb:[nb.x,nb.y,nb.z],nc:[nc.x,nc.y,nc.z],
        color:colorValues,area
      });
      totalArea += area;
      cumulativeAreas.push(totalArea);
    }
  });

  if (!triangles.length || totalArea <= 0) return;
  const isSmallDevice = window.innerWidth < 720 || (navigator.hardwareConcurrency || 4) <= 4;
  const particleCount = isSmallDevice ? 18500 : 36000;
  const positions = new Float32Array(particleCount*3);
  const normals = new Float32Array(particleCount*3);
  const colors = new Float32Array(particleCount*3);
  const sizes = new Float32Array(particleCount);
  const alphas = new Float32Array(particleCount);

  for (let i=0;i<particleCount;i++) {
    const target = Math.random()*totalArea;
    let low = 0, high = cumulativeAreas.length-1;
    while (low < high) {
      const middle = (low+high)>>1;
      if (cumulativeAreas[middle] < target) low = middle+1;
      else high = middle;
    }
    const triangle = triangles[low];
    const root = Math.sqrt(Math.random());
    const wa = 1-root;
    const wb = root*(1-Math.random());
    const wc = 1-wa-wb;
    const base = i*3;
    for (let axis=0;axis<3;axis++) {
      positions[base+axis] = triangle.a[axis]*wa + triangle.b[axis]*wb + triangle.c[axis]*wc;
      normals[base+axis] = triangle.na[axis]*wa + triangle.nb[axis]*wb + triangle.nc[axis]*wc;
      colors[base+axis] = triangle.color[axis];
    }
    const normalLength = Math.hypot(normals[base],normals[base+1],normals[base+2]) || 1;
    normals[base] /= normalLength;
    normals[base+1] /= normalLength;
    normals[base+2] /= normalLength;
    sizes[i] = isSmallDevice ? 0.95 + Math.random()*0.55 : 1.1 + Math.random()*0.8;
    alphas[i] = 0.82 + Math.random()*0.16;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aNormal',new THREE.BufferAttribute(normals,3));
  geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  geometry.setAttribute('aAlpha',new THREE.BufferAttribute(alphas,1));

  const material = new THREE.ShaderMaterial({
    transparent:true,
    depthWrite:true,
    depthTest:true,
    blending:THREE.NormalBlending,
    uniforms:{
      uPixelRatio:{value:Math.min(window.devicePixelRatio || 1,1.8)},
      uLightDirection:{value:new THREE.Vector3(-0.42,0.78,0.46).normalize()}
    },
    vertexShader:
      'attribute vec3 aNormal;\n' +
      'attribute vec3 aColor;\n' +
      'attribute float aSize;\n' +
      'attribute float aAlpha;\n' +
      'uniform float uPixelRatio;\n' +
      'uniform vec3 uLightDirection;\n' +
      'varying vec3 vNormal;\n' +
      'varying vec3 vColor;\n' +
      'varying vec3 vViewPosition;\n' +
      'varying vec3 vLightDirection;\n' +
      'varying float vAlpha;\n' +
      'void main(){\n' +
      '  vec4 viewPosition = modelViewMatrix * vec4(position,1.0);\n' +
      '  gl_Position = projectionMatrix * viewPosition;\n' +
      '  gl_PointSize = aSize * uPixelRatio * (6.0 / max(1.0,-viewPosition.z));\n' +
      '  vNormal = normalize(normalMatrix * aNormal);\n' +
      '  vColor = aColor;\n' +
      '  vViewPosition = -viewPosition.xyz;\n' +
      '  vLightDirection = normalize(mat3(viewMatrix) * uLightDirection);\n' +
      '  vAlpha = aAlpha;\n' +
      '}\n',
    fragmentShader:
      'varying vec3 vNormal;\n' +
      'varying vec3 vColor;\n' +
      'varying vec3 vViewPosition;\n' +
      'varying vec3 vLightDirection;\n' +
      'varying float vAlpha;\n' +
      'void main(){\n' +
      '  float distanceFromCentre = length(gl_PointCoord - vec2(0.5));\n' +
      '  float particleShape = 1.0 - smoothstep(0.27,0.5,distanceFromCentre);\n' +
      '  if(particleShape < 0.025) discard;\n' +
      '  vec3 N = normalize(vNormal);\n' +
      '  vec3 L = normalize(vLightDirection);\n' +
      '  vec3 V = normalize(vViewPosition);\n' +
      '  vec3 H = normalize(L + V);\n' +
      '  float diffuse = max(dot(N,L),0.0);\n' +
      '  float wrappedLight = max((dot(N,L)+0.34)/1.34,0.0);\n' +
      '  float specular = pow(max(dot(N,H),0.0),28.0)*0.24;\n' +
      '  float rim = pow(1.0-max(dot(N,V),0.0),2.1)*0.2;\n' +
      '  vec3 lighting = vColor*(0.56 + wrappedLight*0.62 + diffuse*0.1);\n' +
      '  lighting += vec3(0.56,0.84,1.0)*(specular + rim);\n' +
      '  float alpha = particleShape*vAlpha*0.94;\n' +
      '  gl_FragColor = vec4(lighting,alpha);\n' +
      '}\n'
  });

  const particles = new THREE.Points(geometry,material);
  particles.name = 'Holographic particle skin';
  particles.frustumCulled = false;
  particles.renderOrder = 5;
  avatarRoot.add(particles);

  // The meshes are now sampling sources only; the visible avatar is particles alone.
  meshes.forEach(mesh => { mesh.visible = false; });
}

function createDefaultAvatar() {
  avatarRoot = new THREE.Group();
  avatarRoot.position.y = 0.375;
  avatarRoot.name = 'ZERO holographic mannequin';
  const body = new THREE.Group();
  body.name = 'Holographic body';
  avatarRoot.add(body);
  const hologram = new THREE.MeshPhysicalMaterial({
    color:0x8bdfff,emissive:0x0b6b9e,emissiveIntensity:0.62,metalness:0.12,roughness:0.3,
    transparent:true,opacity:0.16,clearcoat:0.5,side:THREE.DoubleSide,depthWrite:false
  });
  const addBody = mesh => body.add(mesh);
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
  clothingGroup.traverse(object => {
    if (object.isMesh) object.renderOrder = 3;
  });
  createAvatarParticles();
}

function setupScene() {
  const small = window.innerWidth < 720 || (navigator.hardwareConcurrency || 4) <= 4;
  renderer = new THREE.WebGLRenderer({canvas:sceneCanvas,alpha:false,antialias:!small,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,small ? 1.35 : 1.8));
  renderer.setClearColor(0xf1f3f5,1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene = new THREE.Scene();
  const roomWhite = new THREE.Color(0xf1f3f5);
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
    new THREE.MeshStandardMaterial({color:0xf4f6f7,roughness:0.92,metalness:0})
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({color:0xe9edf0,roughness:0.96,metalness:0.015,side:THREE.DoubleSide});
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30,16),wallMaterial);
  backWall.position.set(0,8,-19);
  scene.add(backWall);

  const sideWallMaterial = new THREE.MeshStandardMaterial({color:0xe5eaee,roughness:0.98,metalness:0,side:THREE.DoubleSide});
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(42,16),sideWallMaterial);
  leftWall.position.set(-15,8,2);
  leftWall.rotation.y = Math.PI/2;
  scene.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(42,16),new THREE.MeshStandardMaterial({color:0xf7f8f9,roughness:0.98,metalness:0,side:THREE.DoubleSide}));
  rightWall.position.set(15,8,2);
  rightWall.rotation.y = -Math.PI/2;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30,42),new THREE.MeshStandardMaterial({color:0xf8f9fa,roughness:0.96,metalness:0,side:THREE.DoubleSide}));
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0,16,2);
  scene.add(ceiling);

  const finMaterial = new THREE.MeshStandardMaterial({color:0xdce5ea,roughness:0.58,metalness:0.12,emissive:0x8fc9e5,emissiveIntensity:0.12});
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

  const platformMaterial = new THREE.MeshStandardMaterial({color:0xe2eaf0,roughness:0.3,metalness:0.2,emissive:0x123d5d,emissiveIntensity:0.12});
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.62,0.22,64),platformMaterial);
  platform.position.y = 0.31;
  scene.add(platform);

  const platformTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.44,1.44,0.018,64),
    new THREE.MeshStandardMaterial({color:0xfafcfd,roughness:0.24,metalness:0.12,emissive:0x1b5e85,emissiveIntensity:0.055})
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
  showToast('Particle avatar restored.');
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
