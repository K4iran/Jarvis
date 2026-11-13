import * as THREE from 'three';

const MUSIC_KEY = 'zero.music.v1';
const DISCOVERY_KEY = 'zero.skill-tree.discovery.v1';
const MUSIC_SERVICES = {
  spotify: { name: 'Spotify', url: 'https://open.spotify.com/' },
  apple: { name: 'Apple Music', url: 'https://music.apple.com/' },
  youtube: { name: 'YouTube Music', url: 'https://music.youtube.com/' },
  soundcloud: { name: 'SoundCloud', url: 'https://soundcloud.com/' },
  custom: { name: 'Custom link', url: '' }
};

const categories = [
  {
    id: 'games', name: 'Games', color: '#A978FF', icon: 'gamepad',
    position: [7.8, 2.8, 2.8],
    skills: [
      {
        id: 'hangman', name: 'Hangman', status: 'Active', icon: 'hangman',
        description: 'Guess a hidden word by voice, touch or keyboard. Difficulty adapts between rounds.',
        activation: '“Hey ZERO, let’s play Hangman.”',
        launch: 'hangman'
      },
      {
        id: 'sudoku', name: 'Sudoku', status: 'Active', icon: 'grid',
        description: 'Solve number puzzles at Easy, Medium or Hard, with row, column and box guidance.',
        activation: '“Hey ZERO, let’s play Sudoku.”',
        launch: 'sudoku'
      },
      {
        id: 'more-games', name: 'More Games', status: 'Coming Soon', icon: 'gamepad',
        description: 'More game modes will appear here as they become available.',
        activation: 'A voice command will be shown here when the next game is released.'
      }
    ]
  },
  {
    id: 'productivity', name: 'Productivity', color: '#65CFFF', icon: 'calendar',
    position: [-7.8, 3.2, 2.2],
    skills: [
      {
        id: 'google-calendar', name: 'Google Calendar', status: 'Available', icon: 'calendar',
        description: 'View upcoming events and create entries through your authorised Google account.',
        activation: '“Hey ZERO, open my calendar.”',
        launch: 'calendar'
      },
      {
        id: 'weather', name: 'Weather', status: 'Active', icon: 'weather',
        description: 'Check a city’s current conditions and hourly forecast.',
        activation: '“Hey ZERO, what’s the weather in Istanbul?”',
        launch: 'weather'
      },
      {
        id: 'happy-news', name: 'Happy News', status: 'Active', icon: 'heart',
        description: 'A short briefing of recent uplifting stories.',
        activation: '“Hey ZERO, show me happy news.”',
        launch: 'happy-news'
      },
      {
        id: 'task-lists', name: 'Task Lists', status: 'Coming Soon', icon: 'tasks',
        description: 'Keep simple task lists and checklists for everyday plans.',
        activation: 'A voice command will be shown here when task lists are released.'
      }
    ]
  },
  {
    id: 'intelligence', name: 'Intelligence', color: '#FF6478', icon: 'neural',
    position: [1.2, -5.8, -7.2],
    skills: [
      {
        id: 'ai-conversation', name: 'AI Conversation', status: 'Active', icon: 'spark',
        description: 'Talk with ZERO, ask questions and explore ideas.',
        activation: '“Hey ZERO, explain…” followed by your question.',
        launch: 'conversation'
      },
      {
        id: 'command-understanding', name: 'Command Understanding', status: 'Active', icon: 'network',
        description: 'Routes supported requests to features such as Hangman, audio controls and Calendar.',
        activation: '“Hey ZERO, play rain sounds.” or “Hey ZERO, show my calendar.”',
        launch: 'conversation'
      }
    ]
  },
  {
    id: 'voice', name: 'Voice & Communication', color: '#31E889', icon: 'voice',
    position: [-7.0, -3.8, -6.2],
    skills: [
      {
        id: 'speech-recognition', name: 'Speech Recognition', status: 'Active', icon: 'microphone',
        description: 'Turns speech into text when browser support and microphone permission are available.',
        activation: 'Tap the microphone and speak a command beginning with “Hey ZERO”.',
        launch: 'voice'
      },
      {
        id: 'voice-responses', name: 'Voice Responses', status: 'Active', icon: 'sound',
        description: 'Hear ZERO’s replies when voice mode is enabled.',
        activation: 'Activate the voice interface, then speak naturally.',
        launch: 'voice'
      }
    ]
  },
  {
    id: 'audio', name: 'Audio & Atmosphere', color: '#8B83FF', icon: 'sound',
    position: [0.2, 6.5, 7.4],
    skills: [
      { id: 'nature-sounds', name: 'Nature Sounds', status: 'Active', icon: 'sound',
        description: 'Play rain, forest ambience or flowing water on request, and stop or switch sounds by voice.',
        activation: '“Hey ZERO, play rain sounds.”', launch: 'audio' },
      { id: 'frequencies', name: 'Frequencies', status: 'Active', icon: 'wave',
        description: 'Play a selected pure tone by frequency, or ask ZERO to stop it.',
        activation: '“Hey ZERO, play 432 hertz.”', launch: 'audio' }
    ]
  },
  {
    id: 'personalisation', name: 'Personalisation', color: '#FFC15C', icon: 'sliders',
    position: [7.2, -3.8, -6.4],
    skills: [
      {
        id: 'preferences', name: 'Preferences', status: 'Active', icon: 'sliders',
        description: 'Adjust interface preferences saved in this browser.',
        activation: '“Hey ZERO, open settings.”',
        launch: 'settings'
      },
      {
        id: 'personal-memory', name: 'Personal Memory', status: 'Active', icon: 'memory',
        description: 'Save, recall and remove details stored in this browser.',
        activation: '“Hey ZERO, remember that…” or “Hey ZERO, what do you remember?”',
        launch: 'memory'
      }
    ]
  }
];

let musicConfig = loadMusicConfig();
let styleAdded = false;
let navButton = null;
let overlay = null;
let panel = null;
let panelHideTimer = 0;
let toast = null;
let renderer = null;
let scene = null;
let camera = null;
let perspectiveCamera = null;
let flatCamera = null;
let flatView = false;
let savedOrbitRotation = 0;
const FLAT_VIEW_HEIGHT = 15.8;
let worldRoot = null;
let zeroGroup = null;
let zeroPickMesh = null;
let categoryOrbit = null;
let categoryNodes = [];
let pickMeshes = [];
let activeCategory = null;
let activeSkill = null;
let viewMode = 'root';
let cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraRadius = 21;
let cameraYaw = 0.08;
let cameraPitch = 0.1;
let cameraTween = null;
let pointerMap = new Map();
let dragStart = null;
let pinchDistance = 0;
let dragMoved = false;
let lastFrame = 0;
let renderFrame = 0;
let zeroFade = 1;
let zeroFadeTarget = 1;
let rootRevealStarted = false;
let revealJobs = [];
let unlockEffects = [];
let launchFromTree = false;
let returnTimer = 0;
let treeOpen = false;
let treeCloseTimer = 0;
let discovery = loadDiscovery();


function addStylesheet() {
  if (styleAdded || document.querySelector('link[data-zero-skill-css]')) return;
  styleAdded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './skill-tree.css?v=planetary-pass-1';
  link.dataset.zeroSkillCss = 'true';
  document.head.appendChild(link);
}

function loadMusicConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null');
    if (saved && MUSIC_SERVICES[saved.service]) {
      return {
        service: saved.service,
        customUrl: typeof saved.customUrl === 'string' ? saved.customUrl : ''
      };
    }
  } catch (error) {
    console.warn('ZERO music preferences could not be read.', error);
  }
  return { service: 'spotify', customUrl: '' };
}

function saveMusicConfig(next) {
  const service = MUSIC_SERVICES[next.service] ? next.service : 'spotify';
  let customUrl = '';
  if (service === 'custom') {
    try {
      const parsed = new URL(String(next.customUrl || '').trim());
      if (parsed.protocol !== 'https:') throw new Error('Use a secure https:// music link.');
      customUrl = parsed.href;
    } catch (error) {
      return { ok: false, message: error.message || 'Enter a valid https:// music link.' };
    }
  }
  musicConfig = { service: service, customUrl: customUrl };
  try {
    localStorage.setItem(MUSIC_KEY, JSON.stringify(musicConfig));
    return { ok: true, message: 'Music preference saved on this device.' };
  } catch (error) {
    return { ok: false, message: 'Browser storage is unavailable, so this preference could not be saved.' };
  }
}

function musicDestination() {
  const service = MUSIC_SERVICES[musicConfig.service] || MUSIC_SERVICES.spotify;
  if (musicConfig.service === 'custom') {
    try {
      const custom = new URL(musicConfig.customUrl);
      return custom.protocol === 'https:' ? custom.href : service.url;
    } catch (error) {
      return service.url || 'https://open.spotify.com/';
    }
  }

  return service.url;
}

function launchMusicService() {
  const destination = musicDestination();
  let parsed;
  try {
    parsed = new URL(destination);
    if (parsed.protocol !== 'https:') throw new Error('Invalid music URL');
  } catch (error) {
    showToast('The saved music link is invalid. Choose a service in Settings.');
    return;
  }

  const isAndroid = /Android/i.test(navigator.userAgent || '');
  if (isAndroid) {
    const fallback = new URL('./music-fallback.html', window.location.href);
    fallback.searchParams.set('service', (MUSIC_SERVICES[musicConfig.service] || MUSIC_SERVICES.custom).name);
    fallback.searchParams.set('url', parsed.href);
    const path = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    const intentUrl = 'intent://' + path + '#Intent;scheme=https;S.browser_fallback_url=' +
      encodeURIComponent(fallback.href) + ';end';
    const opened = window.open(intentUrl, '_blank');
    if (!opened) window.location.assign(fallback.href);
    return;
  }

  const opened = window.open(parsed.href, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(parsed.href);
}

function serviceOptions(selected) {
  return Object.keys(MUSIC_SERVICES).map(function (key) {
    return '<option value="' + key + '"' + (key === selected ? ' selected' : '') + '>' +
      MUSIC_SERVICES[key].name + '</option>';
  }).join('');
}

function makeMusicSettings(parent, mode) {
  const section = document.createElement('section');
  section.className = 'zero-music-settings';
  section.dataset.zeroMusicSettings = mode;
  section.innerHTML =
    '<h3>Preferred music service</h3>' +
    '<p>Choose what opens when you tap the Music branch. You can also change this in Settings.</p>' +
    '<label>Music service<select data-zero-music-service>' + serviceOptions(musicConfig.service) + '</select></label>' +
    '<label data-zero-custom-wrap' + (musicConfig.service === 'custom' ? '' : ' hidden') + '>Custom music URL' +
    '<input type="url" inputmode="url" autocomplete="url" placeholder="https://…" data-zero-music-custom></label>' +
    '<button type="button" data-zero-music-save>Save preference</button>' +
    '<div class="zero-music-feedback" aria-live="polite" data-zero-music-feedback></div>';
  parent.appendChild(section);

  const select = section.querySelector('[data-zero-music-service]');
  const customWrap = section.querySelector('[data-zero-custom-wrap]');
  const customInput = section.querySelector('[data-zero-music-custom]');
  const feedback = section.querySelector('[data-zero-music-feedback]');
  if (customInput) customInput.value = musicConfig.customUrl || '';
  select.addEventListener('change', function () {
    customWrap.hidden = select.value !== 'custom';
    feedback.textContent = '';
  });
  section.querySelector('[data-zero-music-save]').addEventListener('click', function () {
    const result = saveMusicConfig({ service: select.value, customUrl: customInput.value });
    feedback.textContent = result.message;
    if (result.ok) {
      customWrap.hidden = musicConfig.service !== 'custom';
      select.value = musicConfig.service;
    }
  });
}

function mountSettingsMusic() {
  const host = document.getElementById('ob');
  if (!host || !host.isConnected || host.querySelector('[data-zero-music-settings="settings"]')) return;
  const settingsTitle = document.getElementById('ot');
  if (!settingsTitle || !/settings/i.test(settingsTitle.textContent || '')) return;
  makeMusicSettings(host, 'settings');
}

function setupMusicPreferences() {
  const settingsHost = document.getElementById('ob');
  if (settingsHost) {
    new MutationObserver(mountSettingsMusic).observe(settingsHost, { childList: true, subtree: true });
    mountSettingsMusic();
  }

}

function loadDiscovery() {
  const categoryIds = categories.map(function (category) { return category.id; });
  const skillIds = categories.flatMap(function (category) {
    return category.skills.map(function (skill) { return skill.id; });
  });
  try {
    const raw = JSON.parse(localStorage.getItem(DISCOVERY_KEY) || 'null');
    if (!raw || raw.version !== 1) {
      const first = {
        version: 1,
        knownCategories: categoryIds.slice(),
        knownSkills: skillIds.slice(),
        pendingCategories: [],
        pendingSkills: ['google-calendar'],
        playedCategories: [],
        playedSkills: []
      };
      localStorage.setItem(DISCOVERY_KEY, JSON.stringify(first));
      return first;
    }
    const state = {
      version: 1,
      knownCategories: Array.isArray(raw.knownCategories) ? raw.knownCategories : [],
      knownSkills: Array.isArray(raw.knownSkills) ? raw.knownSkills : [],
      pendingCategories: Array.isArray(raw.pendingCategories) ? raw.pendingCategories : [],
      pendingSkills: Array.isArray(raw.pendingSkills) ? raw.pendingSkills : [],
      playedCategories: Array.isArray(raw.playedCategories) ? raw.playedCategories : [],
      playedSkills: Array.isArray(raw.playedSkills) ? raw.playedSkills : []
    };
    categoryIds.forEach(function (id) {
      if (!state.knownCategories.includes(id)) state.pendingCategories.push(id);
    });
    categories.forEach(function (category) {
      const containsNewSkill=category.skills.some(function (skill) {
        return !state.knownSkills.includes(skill.id);
      });
      if (containsNewSkill) state.pendingCategories.push(category.id);
    });
    skillIds.forEach(function (id) {
      if (!state.knownSkills.includes(id)) state.pendingSkills.push(id);
    });
    // Calendar was added to existing installations after the original discovery state
    // had already marked all built-in skills as known. Give it one targeted first-view
    // unlock effect without resetting any other skill's animation history.
    if (!state.playedSkills.includes('google-calendar') &&
        !state.pendingSkills.includes('google-calendar')) {
      state.pendingSkills.push('google-calendar');
    }
    state.pendingCategories = Array.from(new Set(state.pendingCategories));
    state.pendingSkills = Array.from(new Set(state.pendingSkills));
    state.knownCategories = Array.from(new Set(state.knownCategories.concat(categoryIds)));
    state.knownSkills = Array.from(new Set(state.knownSkills.concat(skillIds)));
    localStorage.setItem(DISCOVERY_KEY, JSON.stringify(state));
    return state;
  } catch (error) {
    return {
      version: 1, knownCategories: categoryIds, knownSkills: skillIds,
      pendingCategories: [], pendingSkills: [], playedCategories: [], playedSkills: []
    };
  }
}

function saveDiscovery() {
  try { localStorage.setItem(DISCOVERY_KEY, JSON.stringify(discovery)); } catch (error) {
    console.warn('ZERO skill discovery state could not be saved.', error);
  }
}

function markSkillExplored(skill) {
  if (!skill) return;
  discovery.pendingSkills = discovery.pendingSkills.filter(function (id) { return id !== skill.id; });
  discovery.pendingCategories = discovery.pendingCategories.filter(function (id) {
    if (id !== skill.categoryId) return true;
    // A newly added category is considered explored once one of its new skills is opened.
    return false;
  });
  saveDiscovery();
  refreshNewBadges();
}

function isCategoryNew(category) {
  return discovery.pendingCategories.includes(category.id);
}

function isSkillNew(skill) {
  return discovery.pendingSkills.includes(skill.id);
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () { toast.classList.remove('visible'); }, 2500);
}

function addNavAndOverlay() {
  const nav = document.querySelector('#bar .tabs');
  if (nav && !document.getElementById('skillTreeTab')) {
    navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.className = 'tab';
    navButton.id = 'skillTreeTab';
    navButton.innerHTML = '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v6M12 10 6 16M12 10l6 6"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="6" cy="17.5" r="1.5"/><circle cx="18" cy="17.5" r="1.5"/></svg><span class="sr-only">Skill Tree</span>';
    navButton.title = 'Skill Tree';
    navButton.setAttribute('aria-pressed', 'false');
    navButton.setAttribute('aria-label', 'Open ZERO Skill Tree');
    nav.insertBefore(navButton, document.getElementById('dataTab') || null);
    navButton.addEventListener('click', openSkillTree);
  } else {
    navButton = document.getElementById('skillTreeTab');
    if (navButton) navButton.addEventListener('click', openSkillTree);
  }

  // Enforce the requested physical DOM order after Skill Tree has been inserted:
  // Home, Skill Tree, Visuals & Stats, mode controls, then Settings.
  const bar = document.getElementById('bar');
  const settingsGroup = bar && bar.querySelector('.br');
  const rightGroup = bar && bar.querySelector('.rt');
  if (bar && settingsGroup && rightGroup) {
    const status = rightGroup.querySelector('.stat');
    const modes = rightGroup.querySelector('.mode-actions');
    if (status && modes) rightGroup.insertBefore(status, modes);
    bar.appendChild(settingsGroup);
  }

  overlay = document.createElement('section');
  overlay.id = 'zeroSkillTree';
  overlay.hidden = true;
  overlay.setAttribute('aria-label', 'ZERO three-dimensional Skill Tree');
  overlay.innerHTML =
    '<canvas id="zeroSkillCanvas" aria-label="Interactive three-dimensional ZERO Skill Tree. Drag to look around and select a planet."></canvas>' +
    '<div class="st-vignette" aria-hidden="true"></div>' +
    '<div class="st-topline"><div class="st-brand"><strong>Z.E.R.O. Skill Tree</strong></div>' +
    '<div class="st-toolbar"><span class="st-hint" id="zeroTreeHint">Drag to look · zoom out to return</span>' +
    '<button type="button" class="st-tool-button st-back-button" id="zeroTreeBack" hidden>BACK</button>' +
    '<button type="button" class="st-tool-button st-view-toggle" id="zeroViewToggle" aria-pressed="false">2D VIEW</button>' +
    '<button type="button" class="st-tool-button st-zoom-button" id="zeroZoomOut" aria-label="Zoom out">−</button>' +
    '<button type="button" class="st-tool-button st-zoom-button" id="zeroZoomIn" aria-label="Zoom in">+</button></div></div>' +
    '<section id="zeroSkillPanel" class="st-skill-panel" hidden aria-live="polite"></section>' +
    '<div id="zeroSkillToast" class="st-toast" role="status" aria-live="polite"></div>';
  document.body.appendChild(overlay);
  panel = overlay.querySelector('#zeroSkillPanel');
  toast = overlay.querySelector('#zeroSkillToast');
}

function makeLabelSprite(text, color, fontSize, tracking) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = fontSize || 30;  const width = Math.max(220, text.length * (font * 0.72) + 70);
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(font * 2.3);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 ' + font + 'px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color || '#ffffff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = color || '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(Math.max(1.25, text.length * 0.15), 0.34, 1);
  sprite.userData.baseScale = sprite.scale.clone();
  return sprite;
}

function addLine(group, points, color, opacity) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(function (point) {
    return new THREE.Vector3(point[0], point[1], point[2]);
  }));
  const material = new THREE.LineBasicMaterial({
    color: color, transparent: true, opacity: opacity == null ? 0.8 : opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  group.add(line);
  return line;
}

function addIcon(group, type, color, scale) {
  const root = new THREE.Group();
  root.scale.setScalar(scale || 0.8);
  const solid = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
  const glow = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45 });
  const sphere = function (x, y, z, r, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material || solid);
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const bar = function (x, y, z, w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material || solid);
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const ring = function (x, y, z, r, tube, material, arc) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 32, arc || Math.PI * 2), material || solid);
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };

  if (type === 'gamepad' || type === 'hangman') {
    if (type === 'gamepad') {
      bar(0, 0, 0, 1.15, 0.44, 0.12, glow);
      bar(-0.3, 0, 0.09, 0.12, 0.48, 0.12);
      bar(-0.3, 0, 0.09, 0.38, 0.12, 0.12);
      sphere(0.32, 0.08, 0.1, 0.075);
      sphere(0.46, -0.08, 0.1, 0.075);
      sphere(-0.05, 0.18, 0.1, 0.045);
    } else {
      addLine(root, [[-0.55,-0.45,0],[0.55,-0.45,0],[-0.42,-0.45,0],[-0.42,0.62,0],[0.34,0.62,0],[0.34,0.37,0]], color, 1);
      sphere(0.34, 0.18, 0, 0.14, glow);
      addLine(root, [[0.34,0.04,0],[0.34,-0.3,0],[-0.02,-0.08,0],[0.34,-0.12,0],[0.66,-0.08,0],[0.34,-0.3,0],[0.05,-0.58,0],[0.34,-0.3,0],[0.63,-0.58,0]], color, 0.95);
    }
  } else if (type === 'calendar') {
    bar(0, 0, 0, 0.92, 0.78, 0.12, glow);
    bar(-0.25, 0.53, 0.08, 0.08, 0.28, 0.1);
    bar(0.25, 0.53, 0.08, 0.08, 0.28, 0.1);
    bar(0, 0.23, 0.09, 0.88, 0.08, 0.08);
    [[-0.25,-0.05],[0,-0.05],[0.25,-0.05],[-0.25,-0.3],[0,-0.3],[0.25,-0.3]].forEach(function (p) {
      bar(p[0], p[1], 0.1, 0.11, 0.1, 0.08, solid);
    });
  } else if (type === 'grid') {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.08), (row + col) % 2 ? solid : glow);
      cell.position.set((col - 1) * 0.31, (1 - row) * 0.31, 0.08);
      root.add(cell);
    }
  } else if (type === 'tasks' || type === 'sliders') {
    if (type === 'tasks') {
      [-0.34,0,0.34].forEach(function (y) {
        bar(-0.35, y, 0, 0.18, 0.18, 0.1, glow);
        addLine(root, [[-0.42,y,0.08],[-0.36,y-0.07,0.08],[-0.26,y+0.08,0.08]], color, 1);
        bar(0.2, y, 0, 0.45, 0.055, 0.07, solid);
      });
    } else {
      [-0.35,0,0.35].forEach(function (y, index) {
        bar(0, y, 0, 1.05, 0.045, 0.06, glow);
        sphere([-0.25,0.28,-0.05][index], y, 0.08, 0.11, solid);
      });
    }
  } else if (type === 'neural' || type === 'network' || type === 'spark' || type === 'memory') {
    const pts = type === 'memory'
      ? [[-0.32,0.08,0],[0.32,0.08,0],[-0.2,0.35,0.06],[0.2,0.35,0.06],[0,-0.18,0.08],[0,0.02,0.22]]
      : [[0,0,0.12],[-0.38,0.28,0],[-0.4,-0.24,0],[0.4,0.26,0],[0.42,-0.22,0],[0,0.5,-0.08],[0,-0.48,-0.08]];
    pts.forEach(function (p, index) {
      sphere(p[0],p[1],p[2],index===0?0.13:0.075,index===0?glow:solid);
      if (index > 0) addLine(root, [[0,0,0.12],p], color, 0.68);    });
    addLine(root, type === 'memory'
      ? [pts[1],pts[3],pts[5],pts[4],pts[2]]
      : [pts[1],pts[5],pts[3],pts[6],pts[2]], color, 0.45);
    if (type === 'spark') {
      addLine(root, [[0,0.64,0],[0,0.9,0]], color, 1);
      addLine(root, [[-0.13,0.77,0],[0.13,0.77,0]], color, 1);
    }
  } else if (type === 'weather') {
    sphere(-0.22,0.2,0.02,0.22,glow);
    ring(-0.22,0.2,0.04,0.34,0.035,solid);
    [[-0.22,0.67],[-0.22,-0.27],[0.25,0.2],[-0.69,0.2],[0.12,0.53],[0.12,-0.13]].forEach(function (p) {
      addLine(root, [[p[0]*0.72,p[1]*0.72,0.02],[p[0],p[1],0.02]], color, 0.9);
    });
    sphere(0.19,-0.22,0.12,0.2,solid);
    sphere(0.43,-0.13,0.12,0.24,glow);
    sphere(0.65,-0.22,0.12,0.18,solid);
    bar(0.42,-0.34,0.1,0.62,0.08,0.08,glow);
  } else if (type === 'microphone') {
    const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.42,4,10), glow);
    capsule.position.z = 0.08; root.add(capsule);
    ring(0, -0.12, 0.08, 0.36, 0.045, solid, Math.PI);
    addLine(root, [[0,-0.46,0],[0,-0.68,0],[-0.28,-0.68,0],[0.28,-0.68,0]], color, 0.95);
  } else if (type === 'voice' || type === 'sound') {
    sphere(-0.42,0,0,0.1,solid);
    [0.28,0.52,0.76].forEach(function (r,index) {
      const arc=ring(0,0,0,r,0.035, index===0?solid:glow, Math.PI*1.25);
      arc.rotation.z = -Math.PI * 0.62;
    });
  }
  group.add(root);
  return root;
}

function addCategoryAura(group, radius, color, categoryId) {
  if (!categoryId) return null;
  const aura = new THREE.Group();
  const tint = new THREE.Color(color);
  const mat = (opacity) => new THREE.MeshBasicMaterial({ color:tint, transparent:true, opacity:opacity, blending:THREE.AdditiveBlending, depthWrite:false });
  const ring = (r, tube, arc) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 64, arc || Math.PI * 2), mat(0.58));
  const dot = (r, material) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), material || mat(0.82));
  aura.position.z = 0;
  aura.userData.effectType = categoryId;
  if (categoryId === 'voice') {
    [0.0, 0.22, 0.44].forEach((offset, i) => {
      const wave = ring(radius * (1.32 + i * 0.19), Math.max(0.012, radius * 0.018), Math.PI * 1.42);
      wave.rotation.set(0.45 + i * 0.42, 0.2, -0.72 + offset);
      aura.add(wave);
    });
    aura.userData.waveRings = aura.children;
  } else if (categoryId === 'games') {
    const orbit = new THREE.Group();
    orbit.rotation.set(0.72, 0.2, 0.35);
    const orbitLine = ring(radius * 1.48, radius * 0.012);
    orbit.add(orbitLine);
    for (let i = 0; i < 4; i++) {
      const marker = dot(radius * 0.075);
      const a = i * Math.PI / 2;
      marker.position.set(Math.cos(a) * radius * 1.48, Math.sin(a) * radius * 1.48, 0);
      orbit.add(marker);
    }
    aura.add(orbit); aura.userData.orbit = orbit;
  } else if (categoryId === 'productivity') {
    const dial = new THREE.Group();
    dial.rotation.set(0.6, 0.3, 0.2);
    dial.add(ring(radius * 1.42, radius * 0.014));
    for (let i = 0; i < 12; i++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.025, radius * (i % 3 === 0 ? 0.16 : 0.09), radius * 0.018), mat(i % 3 === 0 ? 0.82 : 0.42));
      const a = i * Math.PI / 6;
      tick.position.set(Math.cos(a) * radius * 1.42, Math.sin(a) * radius * 1.42, 0);
      tick.rotation.z = a - Math.PI / 2;
      dial.add(tick);
    }
    const hand = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.035, radius * 0.62, radius * 0.025), mat(0.9));
    hand.position.y = radius * 0.31; dial.add(hand);
    aura.add(dial); aura.userData.dial = dial; aura.userData.hand = hand;
  } else if (categoryId === 'intelligence') {
    const network = new THREE.Group();
    const nodes = [];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const p = new THREE.Vector3(Math.cos(a) * radius * 1.43, Math.sin(a) * radius * 1.43, (i % 2 ? 1 : -1) * radius * 0.16);
      nodes.push(p);
      const n = dot(radius * (i === 0 ? 0.085 : 0.06)); n.position.copy(p); network.add(n);
    }
    for (let i = 0; i < nodes.length; i++) {
      const j = (i + 2) % nodes.length;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[j]]), new THREE.LineBasicMaterial({ color:tint, transparent:true, opacity:0.38, blending:THREE.AdditiveBlending, depthWrite:false }));
      network.add(line);
    }
    aura.add(network); aura.userData.network = network;
  } else if (categoryId === 'personalisation') {
    const controls = new THREE.Group();
    controls.rotation.set(0.55, 0.3, -0.3);
    for (let i = 0; i < 3; i++) {
      const y = (i - 1) * radius * 0.34;
      const track = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.012, radius * 0.012, radius * 1.35, 8), mat(0.45));
      track.rotation.z = Math.PI / 2; track.position.y = y; controls.add(track);
      const knob = dot(radius * 0.09);
      knob.position.set((i - 1) * radius * 0.31, y, radius * 0.05);
      controls.add(knob);
    }
    aura.add(controls); aura.userData.controls = controls;
  }
  group.add(aura);
  return aura;
}
function addHolographicLock(group, radius) {
  const lock = new THREE.Group();
  const glow = '#b9d9e8';
  const material = new THREE.MeshBasicMaterial({ color:glow, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false });
  const softMaterial = new THREE.MeshBasicMaterial({ color:'#829baa', transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false });
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(radius*0.205,radius*0.045,8,36,Math.PI),material);
  shackle.position.set(0,radius*0.13,radius*0.98); lock.add(shackle);
  const body = new THREE.Mesh(new THREE.BoxGeometry(radius*0.62,radius*0.49,radius*0.13),softMaterial);
  body.position.set(0,-radius*0.12,radius*1.02); lock.add(body);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:glow,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending}));
  outline.position.copy(body.position); lock.add(outline);
  const keyHead = new THREE.Mesh(new THREE.CircleGeometry(radius*0.055,20),material);
  keyHead.position.set(0,-radius*0.075,radius*1.105); lock.add(keyHead);
  const keyStem = new THREE.Mesh(new THREE.BoxGeometry(radius*0.045,radius*0.12,radius*0.012),material);
  keyStem.position.set(0,-radius*0.19,radius*1.11); lock.add(keyStem);
  [-1,1].forEach(function(side){
    for(let i=0;i<5;i++){
      const angle=(i/4)*0.92+0.18;
      const link=new THREE.Mesh(new THREE.TorusGeometry(radius*0.075,radius*0.022,6,16),i%2?material:softMaterial);
      link.position.set(side*Math.sin(angle)*radius*0.82,(0.42-i*0.15)*radius,radius*(0.82+0.16*Math.cos(angle)));
      link.rotation.set(0.55*side,side*(0.55+i*0.18),0.72*side); link.scale.set(1,0.78,1); lock.add(link);
    }
  });
  lock.renderOrder=9; group.add(lock); return lock;
}
function makePlanetTexture(type, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(baseColor);
  const hex = '#' + base.getHexString();
  const rand = (function(seed) {
    let value = seed >>> 0;
    return function() {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  })(type.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 17));

  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (type === 'sun') {
    const halfCanvas=document.createElement('canvas');
    halfCanvas.width=512;halfCanvas.height=512;
    const sunCtx=halfCanvas.getContext('2d');
    const glow=sunCtx.createLinearGradient(0,0,0,512);
    glow.addColorStop(0,'#fff4a0');glow.addColorStop(.28,'#ffc044');
    glow.addColorStop(.62,'#f58a24');glow.addColorStop(1,'#a93212');
    sunCtx.fillStyle=glow;sunCtx.fillRect(0,0,512,512);
    for(let i=0;i<1500;i++){
      const x=rand()*512,y=rand()*512,rx=1.2+rand()*7,ry=.8+rand()*3.5;
      sunCtx.beginPath();sunCtx.ellipse(x,y,rx,ry,(rand()-.5)*.5,0,Math.PI*2);
      sunCtx.fillStyle=rand()>.48?'rgba(255,247,190,'+(.07+rand()*.17)+')':'rgba(133,35,8,'+(.035+rand()*.11)+')';
      sunCtx.fill();
    }
    for(let i=0;i<190;i++){
      const x=rand()*512,y=rand()*512,rx=4+rand()*26,ry=2+rand()*9;
      sunCtx.save();sunCtx.translate(x,y);sunCtx.rotate((rand()-.5)*.9);
      sunCtx.beginPath();sunCtx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
      sunCtx.fillStyle=rand()>.5?'rgba(255,246,174,.17)':'rgba(115,30,8,.14)';
      sunCtx.fill();sunCtx.restore();
    }
    for(let i=0;i<14;i++){
      const x=12+rand()*488,y=18+rand()*476,r=3+rand()*8;
      const spot=sunCtx.createRadialGradient(x-r*.2,y-r*.2,1,x,y,r);
      spot.addColorStop(0,'rgba(91,25,9,.52)');spot.addColorStop(.55,'rgba(139,39,10,.27)');spot.addColorStop(1,'rgba(139,39,10,0)');
      sunCtx.fillStyle=spot;sunCtx.beginPath();sunCtx.arc(x,y,r,0,Math.PI*2);sunCtx.fill();
    }
    ctx.drawImage(halfCanvas,0,0);ctx.drawImage(halfCanvas,512,0);
  } else if (type === 'earth') {
    const ocean = ctx.createLinearGradient(0, 0, 0, 512);
    ocean.addColorStop(0, '#164a86'); ocean.addColorStop(0.48, '#1475ae'); ocean.addColorStop(1, '#092c60');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 34; i++) {
      const x = rand() * 1024, y = rand() * 512;
      ctx.save(); ctx.translate(x, y); ctx.rotate((rand() - 0.5) * 1.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 18 + rand() * 82, 9 + rand() * 43, 0, 0, Math.PI * 2);
      ctx.fillStyle = ['#4e783f', '#78934c', '#b0a06a', '#315c38'][Math.floor(rand() * 4)];
      ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 130; i++) {
      ctx.beginPath(); ctx.ellipse(rand() * 1024, rand() * 512, 12 + rand() * 55, 2 + rand() * 8, (rand() - .5) * .5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,250,255,' + (0.08 + rand() * 0.22) + ')'; ctx.fill();
    }
  } else if (type === 'venus') {
    const cloud = ctx.createLinearGradient(0, 0, 0, 512);
    cloud.addColorStop(0, '#f8d58a'); cloud.addColorStop(.3, '#d99a49'); cloud.addColorStop(.62, '#f2c477'); cloud.addColorStop(1, '#9b592b');
    ctx.fillStyle = cloud; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 110; i++) {
      const y = rand() * 512;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) ctx.lineTo(x, y + Math.sin(x * .012 + i) * (5 + rand() * 13));
      ctx.lineTo(1024, y + 18); ctx.lineTo(0, y + 18); ctx.closePath();
      ctx.fillStyle = rand() > .5 ? 'rgba(255,230,170,.13)' : 'rgba(105,54,20,.10)'; ctx.fill();
    }
  } else if (type === 'saturn') {
    const bands = ['#d9bd87', '#b68e5c', '#ead5a5', '#9f754d', '#d7b982'];
    for (let y = 0; y < 512; y += 3) {
      const wave = Math.sin(y * .035) * 8 + Math.sin(y * .11) * 3;
      ctx.fillStyle = bands[Math.floor((y + wave) / 30) % bands.length];
      ctx.fillRect(0, y, 1024, 3);
    }
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = 'rgba(110,75,43,' + (0.025 + rand() * .08) + ')';
      ctx.fillRect(rand() * 1024, rand() * 512, 30 + rand() * 150, 2 + rand() * 7);
    }
  } else if (type === 'mars') {
    const terrain = ctx.createLinearGradient(0, 0, 0, 512);
    terrain.addColorStop(0, '#d58a60'); terrain.addColorStop(.5, '#9f4c31'); terrain.addColorStop(1, '#57291f');
    ctx.fillStyle = terrain; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 150; i++) {
      const x = rand() * 1024, y = rand() * 512, r = 2 + rand() * 17;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(55,27,21,' + (0.08 + rand() * .2) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(x - r * .2, y - r * .2, r * .62, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(240,174,126,.18)'; ctx.lineWidth = 2; ctx.stroke();
    }
  } else if (type === 'neptune') {
    const blue = ctx.createLinearGradient(0, 0, 0, 512);
    blue.addColorStop(0, '#4d8ce0'); blue.addColorStop(.5, '#1452a8'); blue.addColorStop(1, '#082c70');
    ctx.fillStyle = blue; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 70; i++) {
      const y = rand() * 512;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 24) ctx.lineTo(x, y + Math.sin(x * .014 + i) * 5);
      ctx.strokeStyle = 'rgba(185,220,255,' + (0.04 + rand() * .12) + ')'; ctx.lineWidth = 2 + rand() * 7; ctx.stroke();
    }
  } else {
    const moon = ctx.createLinearGradient(0, 0, 1024, 512);
    moon.addColorStop(0, '#b5c0cb'); moon.addColorStop(.5, hex); moon.addColorStop(1, '#26364b');
    ctx.fillStyle = moon; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 95; i++) {
      const x = rand() * 1024, y = rand() * 512, r = 2 + rand() * 15;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,18,30,' + (0.08 + rand() * .16) + ')'; ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function planetTypeForNode(nodeMeta, isCenter) {
  if (isCenter) return 'sun';
  if (!nodeMeta) return 'moon';
  if (nodeMeta.kind === 'category') {
    return ({
      productivity: 'earth',
      games: 'mars',
      intelligence: 'venus',
      voice: 'neptune',
      personalisation: 'saturn'
    })[nodeMeta.id] || 'moon';
  }
  return 'moon';
}

function createOrbVisual(group, radius, color, icon, label, isCenter, locked) {
  const nodeMeta = group.userData.node;
  const nodeKind = nodeMeta && nodeMeta.kind;
  const isCategory = nodeKind === 'category';
  const planetType = planetTypeForNode(nodeMeta, isCenter);
  const visualColor = locked ? '#687787' : color;
  const colorValue = new THREE.Color(visualColor);
  const texture = makePlanetTexture(planetType, visualColor);
  const rings = [];

  if (isCenter) {
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.34, 48, 36),
      new THREE.MeshBasicMaterial({ color: '#ff9b32', transparent: true, opacity: .16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(corona);
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 48),
      new THREE.MeshBasicMaterial({ map: texture, color: '#fff1bd' })
    );
    group.add(sun);
    const flare = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.075, 48, 36),
      new THREE.MeshBasicMaterial({ color: '#ffb54a', transparent: true, opacity: .12, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(flare);
    const sunlight = new THREE.PointLight('#ffb45c', 3.8, 34, 1.7);
    group.add(sunlight);
    [1, -1].forEach(function(side) {
      const wordmark = makeLabelSprite('Z.E.R.O.', '#fff2c8', 34);
      wordmark.material.opacity = 1;
      wordmark.material.depthTest = true;
      wordmark.material.depthWrite = false;
      wordmark.scale.set(radius * 1.05, radius * .25, 1);
      wordmark.position.set(0, 0, side * radius * 1.04);
      wordmark.renderOrder = 8;
      group.add(wordmark);
    });
    const coronaRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.27, radius * .012, 8, 96),
      new THREE.MeshBasicMaterial({ color: '#ffb64b', transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    coronaRing.rotation.set(.6, .2, .25);
    group.add(coronaRing);
    rings.push(coronaRing);
  } else {
    const planetMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      color: locked ? '#7d8790' : '#ffffff',
      roughness: .91,
      metalness: .015,
      bumpMap: texture,
      bumpScale: planetType === 'earth' ? .055 : .025
    });
    if (locked) {
      planetMaterial.color.set('#68717a');
      planetMaterial.emissive = new THREE.Color('#18232e');
      planetMaterial.emissiveIntensity = .22;
    }
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), planetMaterial);
    sphere.rotation.set(.18, .35, .08);
    group.add(sphere);

    const atmosphereColor = isCategory ? colorValue : new THREE.Color('#9eb8d0');
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.055, 48, 32),
      new THREE.MeshBasicMaterial({
        color: atmosphereColor,
        transparent: true,
        opacity: locked ? .035 : (isCategory ? .095 : .045),
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(atmosphere);

    if (planetType === 'saturn') {
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: '#d7c19a',
        roughness: .82,
        metalness: .05,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: locked ? .28 : .88
      });
      const saturnRing = new THREE.Mesh(new THREE.RingGeometry(radius * 1.28, radius * 2.02, 96), ringMaterial);
      saturnRing.rotation.set(1.18, .12, .18);
      saturnRing.scale.y = .48;
      group.add(saturnRing);
      rings.push(saturnRing);
      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.08, radius * 1.3, 96),
        new THREE.MeshStandardMaterial({ color: '#a88c65', roughness: .9, side: THREE.DoubleSide, transparent: true, opacity: locked ? .2 : .68 })
      );
      innerRing.rotation.copy(saturnRing.rotation);
      innerRing.scale.copy(saturnRing.scale);
      group.add(innerRing);
      rings.push(innerRing);
    }

    if (isCategory) {
      const categoryHalo = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (planetType === 'saturn' ? 2.12 : 1.28), radius * .012, 8, 96),
        new THREE.MeshBasicMaterial({ color: colorValue, transparent: true, opacity: locked ? .12 : .48, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      categoryHalo.rotation.set(.72, .24, .1);
      group.add(categoryHalo);
      rings.push(categoryHalo);
      // A small category glyph remains as a readable identity cue, not as the planet's surface.
      if (!locked && icon) {
        const marker = addIcon(group, icon, color, radius * .28);
        marker.position.set(0, radius * 1.34, radius * .18);
        marker.scale.setScalar(.32);
      }
    } else if (locked) {
      addHolographicLock(group, radius);
    }
  }

  if (label) {
    const labelSprite = makeLabelSprite(label, isCenter ? '#fff1cf' : '#e9f6ff', 28);
    labelSprite.position.set(0, -radius * (planetType === 'saturn' ? 2.05 : 1.72), 0);
    group.add(labelSprite);
    group.userData.labelSprite = labelSprite;
  }

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (planetType === 'saturn' ? 2.12 : 1.38), 24, 18),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: .001, depthWrite: false, color: '#ffffff' })
  );
  hit.userData.pickTarget = nodeMeta || null;
  hit.userData.nodeGroup = group;
  group.add(hit);
  group.userData.hitMesh = hit;
  group.userData.rings = rings;
  group.userData.categoryAura = null;
  group.userData.particles = null;
  group.userData.strayOrbit = null;
  group.userData.shell = group.children.find(child => child.isMesh && child.geometry && child.geometry.type === 'SphereGeometry') || null;

  return { shell: group.userData.shell, wire: null, core: null, rings: rings, particles: null, hit: hit };
}

function createNebula(color, x, y, z, scale, opacity) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128,128,4,128,128,124);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.28, color.replace('1)', '0.32)'));
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,256,256);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, opacity: opacity, depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sprite.position.set(x,y,z);
  sprite.scale.set(scale,scale,1);
  worldRoot.add(sprite);
}

function makeStarfield() {
  const count = 1700;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color('#c8e7ff'),new THREE.Color('#83baff'),new THREE.Color('#d9d1ff')];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 125;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 85;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 125 - 14;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  worldRoot.add(new THREE.Points(geometry,new THREE.PointsMaterial({
    size:0.075,vertexColors:true,transparent:true,opacity:0.62,depthWrite:false,
    blending:THREE.AdditiveBlending,sizeAttenuation:true
  })));
}

function disposeWorld() {
  if (!worldRoot || !scene) return;
  scene.remove(worldRoot);
  worldRoot.traverse(function (object) {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(function (material) {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
  worldRoot = null;
  categoryNodes = [];
  pickMeshes = [];
  unlockEffects = [];
  revealJobs = [];
}

function buildWorld() {
  disposeWorld();
  worldRoot = new THREE.Group();
  scene.add(worldRoot);

  const ambient = new THREE.AmbientLight('#83a7d5',0.58);
  const keyLight = new THREE.PointLight('#65bfff',28,60);
  keyLight.position.set(-5,6,8);
  const violetLight = new THREE.PointLight('#7659da',18,50);
  violetLight.position.set(7,-4,-9);
  worldRoot.add(ambient,keyLight,violetLight);

  makeStarfield();
  createNebula('rgba(49,110,205,1)',-13,7,-28,38,0.22);
  createNebula('rgba(108,63,188,1)',15,-7,-34,43,0.16);
  createNebula('rgba(34,154,190,1)',2,13,-39,30,0.12);

  zeroGroup = new THREE.Group();
  worldRoot.add(zeroGroup);
  const zeroNode = { id:'zero', name:'Z.E.R.O.', kind:'zero', group:zeroGroup };
  zeroGroup.userData.node = zeroNode;
  const zeroVisual = createOrbVisual(zeroGroup,1.42,'#59caff','zero',null,true);
  zeroPickMesh = zeroVisual.hit;
  zeroPickMesh.userData.pickTarget = zeroNode;
  const zeroLabel = makeLabelSprite('Z.E.R.O.','#e8f8ff',38);
  zeroLabel.position.set(0,-2.2,0);
  zeroLabel.scale.set(2.4,0.48,1);
  zeroGroup.add(zeroLabel);
  zeroNode.visual = zeroVisual;
  pickMeshes.push(zeroPickMesh);

  categoryOrbit = new THREE.Group();
  worldRoot.add(categoryOrbit);
  categoryNodes = [];

  categories.forEach(function (category) {
    const node = {
      id:category.id,name:category.name,kind:'category',category:category,      color:category.color,position:category.position.slice(),group:new THREE.Group(),
      skills:[],newBadge:null,branch:null
    };
    node.group.userData.node = node;
    node.group.position.set(category.position[0],category.position[1],category.position[2]);
    categoryOrbit.add(node.group);
    const visual = createOrbVisual(node.group,0.76,category.color,category.icon,category.name,false);
    node.visual = visual;
    visual.categoryAura = node.group.userData.categoryAura;
    node.mesh = visual.hit;
    node.mesh.userData.pickTarget = node;
    pickMeshes.push(node.mesh);
    node.nameSprite = node.group.userData.labelSprite;
    node.nameSprite.material.opacity = 0;
    node.newBadge = makeLabelSprite('New','#ffe08a',20);
    node.newBadge.scale.set(0.62,0.22,1);
    node.newBadge.position.set(0.9,1.1,0.1);
    node.group.add(node.newBadge);

    const start = new THREE.Vector3(0,0,0);
    const end = new THREE.Vector3(0,0,0);
    node.group.updateMatrixWorld(true);
    node.group.getWorldPosition(end);
    const endLocal = new THREE.Vector3(category.position[0],category.position[1],category.position[2]);
    const direction = endLocal.clone().normalize();
    const mid = direction.clone().multiplyScalar(3.3);
    mid.y += 0.55;
    const curve = new THREE.QuadraticBezierCurve3(start,new THREE.Vector3(mid.x,mid.y,mid.z),endLocal.clone());
    const branchGlow = new THREE.Mesh(
      new THREE.TubeGeometry(curve,36,0.052,7,false),
      new THREE.MeshBasicMaterial({color:category.color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})
    );
    const branch = new THREE.Mesh(
      new THREE.TubeGeometry(curve,36,0.016,6,false),
      new THREE.MeshBasicMaterial({color:category.color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})
    );
    categoryOrbit.add(branchGlow,branch);
    node.branchGlow = branchGlow;
    node.branch = branch;
    node.skillsGroup = new THREE.Group();
    node.skillsGroup.visible = false;
    node.group.add(node.skillsGroup);
    node.skillBranches = [];

    category.skills.forEach(function (skill, index) {
      skill.categoryId = category.id;
      const shade = skillColors(category.color,index);
      const child = {
        id:skill.id,name:skill.name,kind:'skill',categoryId:category.id,
        category:category,skill:skill,color:shade,group:new THREE.Group(),
        radius:0.49,index:index,newBadge:null,mesh:null
      };
      child.group.userData.node = child;
      const layouts = [
        [-2.35,1.42,0.8],[2.45,0.8,-0.5],[-1.55,-1.85,-0.8],[1.75,-1.9,1.0]
      ];
      const pos = layouts[index % layouts.length];
      child.position = new THREE.Vector3(pos[0],pos[1],pos[2]);
      child.originalPosition = child.position.clone();
      child.group.position.copy(child.position);
      child.group.scale.setScalar(0);
      node.skillsGroup.add(child.group);
      const isLocked = /^(locked|coming soon)$/i.test(String(skill.status || '').trim());
      child.visual = createOrbVisual(child.group,child.radius,isLocked ? '#9aaab5' : shade,skill.icon,skill.name,false,isLocked);
      child.mesh = child.visual.hit;
      child.mesh.userData.pickTarget = child;
      pickMeshes.push(child.mesh);
      child.nameSprite = child.group.userData.labelSprite;
      child.nameSprite.material.opacity = 0;
      child.newBadge = makeLabelSprite('NEW','#ffe08a',18);
      child.newBadge.scale.set(0.52,0.19,1);
      child.newBadge.position.set(0.58,0.72,0.1);
      child.group.add(child.newBadge);

      const branchCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0,0,0),
        child.position.clone().multiplyScalar(0.48).add(new THREE.Vector3(0,0.35,0)),
        child.position.clone()
      );
      const skillBranchGlow = new THREE.Mesh(
        new THREE.TubeGeometry(branchCurve,22,0.04,7,false),
        new THREE.MeshBasicMaterial({color:shade,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})
      );
      const skillBranch = new THREE.Mesh(
        new THREE.TubeGeometry(branchCurve,22,0.012,6,false),
        new THREE.MeshBasicMaterial({color:shade,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})
      );
      node.skillsGroup.add(skillBranchGlow,skillBranch);
      node.skillBranches.push({line:skillBranch,glow:skillBranchGlow,skillNode:child});
      node.skills.push(child);
    });

    categoryNodes.push(node);
  });

  refreshNewBadges();
}

function skillColors(baseColor,index) {
  const color = new THREE.Color(baseColor);
  if (index % 2 === 0) color.lerp(new THREE.Color('#ffffff'),0.22);
  else color.lerp(new THREE.Color('#233b62'),0.24);
  return '#' + color.getHexString();
}
function refreshNewBadges() {
  categoryNodes.forEach(function (category) {
    if (category.newBadge) category.newBadge.material.opacity = isCategoryNew(category.category) ? 0.95 : 0;
    category.skills.forEach(function (skill) {
      if (skill.newBadge) skill.newBadge.material.opacity = isSkillNew(skill.skill) ? 0.98 : 0;
    });
  });
}

function revealCategoryBranches() {
  if (!categoryNodes.length) return;
  categoryNodes.forEach(function (node,index) {
    node.group.scale.setScalar(0);
    revealJobs.push({
      type:'category',node:node,start:performance.now()+350+index*205,
      duration:900,from:0,to:1
    });
    revealJobs.push({
      type:'branch',node:node,start:performance.now()+360+index*205,
      duration:850,from:0,to:0.62
    });
  });
  rootRevealStarted = true;
}

function revealSkillBranches(category) {
  category.skillsGroup.visible = true;
  category.skillsGroup.scale.setScalar(1);
  if (category.skillsGroup.userData.revealed) {
    category.skills.forEach(function (skill,index) {
      skill.group.scale.setScalar(1);
      category.skillBranches[index].line.material.opacity = 0.62;
      if (category.skillBranches[index].glow) category.skillBranches[index].glow.material.opacity = 0.16;
    });
    return;
  }
  category.skillsGroup.userData.revealed = true;
  category.skills.forEach(function (skill,index) {
    skill.group.scale.setScalar(0);
    const line = category.skillBranches[index].line;
    line.material.opacity = 0;
    revealJobs.push({
      type:'skill',node:skill,start:performance.now()+300+index*230,
      duration:800,from:0,to:1
    });
    revealJobs.push({
      type:'skillBranch',node:skill,line:line,glow:category.skillBranches[index].glow,start:performance.now()+300+index*230,
      duration:780,from:0,to:0.62
    });
  });
}

function makeUnlockEffect(node, category) {
  if (!node || !category) return;
  const group = category.skillsGroup;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(node.radius * 1.5,0.025,7,56),
    new THREE.MeshBasicMaterial({color:node.color,transparent:true,opacity:0.95,depthWrite:false,blending:THREE.AdditiveBlending})
  );
  ring.position.copy(node.position);
  ring.rotation.x = 0.6;
  group.add(ring);

  const sparkCount = 110;
  const positions = new Float32Array(sparkCount * 3);
  const velocities = [];
  for (let i=0;i<sparkCount;i++) {
    const dir = new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
    const start = node.position.clone().add(dir.clone().multiplyScalar(1.15+Math.random()*0.8));
    positions[i*3]=start.x;positions[i*3+1]=start.y;positions[i*3+2]=start.z;
    velocities.push(dir);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const points = new THREE.Points(geometry,new THREE.PointsMaterial({
    color:node.color,size:0.045,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending
  }));
  group.add(points);
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.09,10,8),
    new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:1,blending:THREE.AdditiveBlending})
  );
  group.add(pulse);

  unlockEffects.push({
    node:node,category:category,ring:ring,points:points,geometry:geometry,
    positions:positions,velocities:velocities,pulse:pulse,age:0,duration:2.25,
    pathStart:new THREE.Vector3(0,0,0),pathEnd:node.position.clone()
  });
}

function animateUnlockEffects(dt) {
  for (let i=unlockEffects.length-1;i>=0;i--) {
    const effect=unlockEffects[i];
    effect.age+=dt;
    const t=Math.min(1,effect.age/effect.duration);
    const eased=1-Math.pow(1-t,2.2);
    effect.ring.scale.setScalar(0.35+eased*1.75);
    effect.ring.material.opacity=Math.max(0,0.95*(1-t));
    effect.pulse.position.lerpVectors(effect.pathStart,effect.pathEnd,eased);
    effect.pulse.material.opacity=Math.max(0,1-t*1.3);
    for(let j=0;j<effect.velocities.length;j++){
      const k=j*3;
      const dir=effect.velocities[j];
      const convergence=1-t;
      effect.positions[k]=effect.node.position.x+dir.x*(1.15+0.65*convergence)*(1-t*0.55);
      effect.positions[k+1]=effect.node.position.y+dir.y*(1.15+0.65*convergence)*(1-t*0.55);
      effect.positions[k+2]=effect.node.position.z+dir.z*(1.15+0.65*convergence)*(1-t*0.55);
    }
    effect.geometry.attributes.position.needsUpdate=true;
    effect.points.material.opacity=Math.max(0,1-t);
    if(t>=1){
      effect.category.skillsGroup.remove(effect.ring,effect.points,effect.pulse);
      effect.ring.geometry.dispose();effect.ring.material.dispose();
      effect.geometry.dispose();effect.points.material.dispose();
      effect.pulse.geometry.dispose();effect.pulse.material.dispose();
      unlockEffects.splice(i,1);
    }
  }
}

function playPendingUnlocks(category) {
  if (!category) return;
  const current = category.category;

  // Dedicated versioned first-visit animation for Calendar. This deliberately uses
  // its own migration flag so an earlier cached build cannot consume the animation
  // before the updated effect is visible to the user.
  if (current.id === 'productivity' && !discovery.calendarUnlockV2Played) {
    const calendarNode = category.skills.find(function (node) {
      return node.skill && node.skill.id === 'google-calendar';
    });
    if (calendarNode) makeUnlockEffect(calendarNode,category);
    discovery.calendarUnlockV2Played = true;
    discovery.pendingSkills = discovery.pendingSkills.filter(function (id) {
      return id !== 'google-calendar';
    });
    if (!discovery.playedSkills.includes('google-calendar')) {
      discovery.playedSkills.push('google-calendar');
    }
  }

  if (discovery.pendingCategories.includes(current.id) && !discovery.playedCategories.includes(current.id)) {
    discovery.playedCategories.push(current.id);
    makeUnlockEffect({position:new THREE.Vector3(0,0,0),radius:0.76,color:current.color},category);
  }
  category.skills.forEach(function (node) {
    const skill = node.skill;
    if (isSkillNew(skill) && !discovery.playedSkills.includes(skill.id)) {
      discovery.playedSkills.push(skill.id);
      makeUnlockEffect(node,category);
    }
  });
  saveDiscovery();
}

function cameraTo(target,radius,duration,onComplete,targetYaw,targetPitch) {
  cameraTween = {
    fromTarget:cameraTarget.clone(),toTarget:target.clone(),
    fromRadius:cameraRadius,toRadius:radius,
    fromYaw:cameraYaw,toYaw:typeof targetYaw==='number'?targetYaw:cameraYaw,
    fromPitch:cameraPitch,toPitch:typeof targetPitch==='number'?targetPitch:cameraPitch,
    start:performance.now(),duration:duration || 1000,onComplete:onComplete || null
  };
}

function worldPosition(group) {
  const position = new THREE.Vector3();
  group.getWorldPosition(position);
  return position;
}

function flatIsNarrow() {
  const width=overlay ? overlay.clientWidth : window.innerWidth;
  const height=overlay ? overlay.clientHeight : window.innerHeight;
  return width < 680 || width / Math.max(1,height) < 0.72;
}

function replaceTube(mesh,start,end,radius,segments,bend) {
  if (!mesh) return;
  const middle=start.clone().lerp(end,0.5);
  middle.y += bend || 0;
  const curve=new THREE.QuadraticBezierCurve3(start.clone(),middle,end.clone());
  const previous=mesh.geometry;
  mesh.geometry=new THREE.TubeGeometry(curve,segments,radius,5,false);
  if(previous)previous.dispose();
}

function rebuildRootBranch(node) {
  if (!node || !node.branch) return;
  let start,end,bend;
  if (flatView) {
    start=new THREE.Vector3(0,(flatIsNarrow()?5.0:4.8)-0.95,0);
    end=node.group.position.clone();
    bend=0.18;
  } else {
    start=new THREE.Vector3(0,0,0);
    end=new THREE.Vector3(node.position[0],node.position[1],node.position[2]);
    const direction=end.clone().normalize();
    const middle=direction.multiplyScalar(3.3);
    middle.y+=0.55;
    const curve=new THREE.QuadraticBezierCurve3(start,middle,end.clone());
    const previous=node.branch.geometry;
    node.branch.geometry=new THREE.TubeGeometry(curve,36,0.016,6,false);
    if(previous)previous.dispose();
    if(node.branchGlow){
      const oldGlow=node.branchGlow.geometry;
      node.branchGlow.geometry=new THREE.TubeGeometry(curve,36,0.052,7,false);
      if(oldGlow)oldGlow.dispose();
    }
    return;
  }
  replaceTube(node.branch,start,end,0.016,36,bend);
  if(node.branchGlow)replaceTube(node.branchGlow,start,end,0.052,36,bend);
}

function rebuildSkillBranches(category) {
  if (!category) return;
  category.skillBranches.forEach(function (entry) {
    const end=entry.skillNode.position.clone();
    const middle=end.clone().multiplyScalar(0.48);
    if (flatView) middle.y-=0.12;
    else middle.y+=0.35;
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0),middle,end);
    const previous=entry.line.geometry;
    entry.line.geometry=new THREE.TubeGeometry(curve,22,0.012,6,false);
    if(previous)previous.dispose();
    if(entry.glow){
      const oldGlow=entry.glow.geometry;
      entry.glow.geometry=new THREE.TubeGeometry(curve,22,0.04,7,false);
      if(oldGlow)oldGlow.dispose();
    }
  });
}

function applyFlatRootLayout() {
  if (!flatView || !categoryOrbit) return;
  const narrow=flatIsNarrow();
  const columns=narrow?2:3;
  const xGap=narrow?2.6:5.8;
  const yGap=narrow?3.0:3.4;
  const topY=narrow?1.8:1.2;
  zeroGroup.position.set(0,narrow?5.0:4.8,0);
  categoryOrbit.rotation.set(0,0,0);
  categoryNodes.forEach(function (node,index) {
    const row=Math.floor(index/columns);
    const rowStart=row*columns;
    const inRow=Math.min(columns,categoryNodes.length-rowStart);
    const column=index-rowStart;
    const x=(column-(inRow-1)/2)*xGap;
    const y=topY-row*yGap;
    node.group.position.set(x,y,0);
    node.group.rotation.set(0,0,0);
    if (node.nameSprite && node.nameSprite.userData.baseScale) {
      const base=node.nameSprite.userData.baseScale;
      node.nameSprite.scale.set(narrow?Math.min(base.x,2.25):base.x,base.y,base.z);
    }
    rebuildRootBranch(node);
  });
}

function applyFlatCategoryLayout(category) {
  if (!flatView || !category) return;
  const narrow=flatIsNarrow();
  zeroGroup.position.set(0,flatIsNarrow()?5.0:4.8,0);
  categoryOrbit.rotation.set(0,0,0);
  category.group.position.set(0,3.3,0);
  category.group.rotation.set(0,0,0);
  rebuildRootBranch(category);
  const columns=category.skills.length>1?2:1;
  const xGap=narrow?2.55:3.6;
  const yGap=2.8;
  const topY=-2.4;
  category.skills.forEach(function (skill,index) {
    const row=Math.floor(index/columns);
    const rowStart=row*columns;
    const inRow=Math.min(columns,category.skills.length-rowStart);
    const column=index-rowStart;
    const x=(column-(inRow-1)/2)*xGap;
    const y=topY-row*yGap;
    skill.position.set(x,y,0);
    skill.group.position.copy(skill.position);
    skill.group.rotation.set(0,0,0);
    if (skill.nameSprite && skill.nameSprite.userData.baseScale) {
      const base=skill.nameSprite.userData.baseScale;
      skill.nameSprite.scale.set(narrow?Math.min(base.x,2.0):base.x,base.y,base.z);
    }
  });
  rebuildSkillBranches(category);
}

function applyFlatLayoutForCurrentView() {
  if (!flatView) return;
  if (viewMode==='root') applyFlatRootLayout();
  else if (activeCategory) applyFlatCategoryLayout(activeCategory);
  if (activeSkill && viewMode==='skill') positionPanel(activeSkill);
}

function updateViewToolbar() {
  const toggle=document.getElementById('zeroViewToggle');
  const hint=document.getElementById('zeroTreeHint');
  if(toggle) {
    toggle.textContent=flatView?'3D VIEW':'2D VIEW';
    toggle.setAttribute('aria-pressed',flatView?'true':'false');
  }
  if(hint)hint.textContent=flatView?'DRAG TO PAN · PINCH / WHEEL TO ZOOM':'DRAG TO LOOK · ZOOM OUT TO RETURN';
  const back=document.getElementById('zeroTreeBack');
  if(back) {
    back.hidden=viewMode==='root';
    back.textContent=viewMode==='skill'?'BACK TO SKILLS':'ALL CATEGORIES';
  }
}

function setFlatViewMode(enabled) {
  enabled=!!enabled;
  if (enabled===flatView || !renderer) return;
  cameraTween=null;
  if (enabled) {
    savedOrbitRotation=categoryOrbit ? categoryOrbit.rotation.y : 0;
    if (!flatCamera) flatCamera=new THREE.OrthographicCamera(-8,8,8,-8,0.1,300);
    camera=flatCamera;
    flatView=true;
    cameraYaw=0;
    cameraPitch=0;
    applyFlatLayoutForCurrentView();
    if (viewMode==='root') {
      cameraTarget.set(0,0,0);cameraRadius=FLAT_VIEW_HEIGHT;
    } else if (viewMode==='category' && activeCategory) {
      cameraTarget.set(0,0,0);cameraRadius=9.3;
    } else if (viewMode==='skill' && activeSkill) {
      cameraTarget.copy(worldPosition(activeSkill.group));cameraRadius=6.0;
    }
  } else {
    flatView=false;
    camera=perspectiveCamera;
    zeroGroup.position.set(0,0,0);
    categoryOrbit.rotation.set(0,savedOrbitRotation,0);
    categoryNodes.forEach(function (node) {
      node.group.position.set(node.position[0],node.position[1],node.position[2]);
      if (node.nameSprite && node.nameSprite.userData.baseScale) node.nameSprite.scale.copy(node.nameSprite.userData.baseScale);
      node.skills.forEach(function (skill) {
        skill.position.copy(skill.originalPosition);
        skill.group.position.copy(skill.originalPosition);
        if (skill.nameSprite && skill.nameSprite.userData.baseScale) skill.nameSprite.scale.copy(skill.nameSprite.userData.baseScale);
      });
      rebuildRootBranch(node);
      rebuildSkillBranches(node);
    });
    if (viewMode==='root') {
      cameraTarget.set(0,0,0);cameraRadius=21;cameraYaw=0.08;cameraPitch=0.1;
    } else if (viewMode==='category' && activeCategory) {
      const focus=worldPosition(activeCategory.group);
      cameraTarget.copy(focus);cameraRadius=8.7;
      cameraYaw=Math.atan2(focus.x,focus.z);
      cameraPitch=Math.atan2(focus.y,Math.max(0.01,Math.hypot(focus.x,focus.z)))*0.55;
    } else if (viewMode==='skill' && activeSkill) {
      cameraTarget.copy(worldPosition(activeSkill.group));cameraRadius=5.25;cameraYaw=0.08;cameraPitch=0.1;
    }
  }
  resizeRenderer();
  updateViewToolbar();
}

function zoomSkillTree(direction) {
  if (!camera || cameraTween) return;
  const step=flatView?0.9:1.25;
  cameraRadius=Math.max(flatView?3.4:4.3,Math.min(28,cameraRadius+(direction<0?step:-step)));
  updateCamera(0);
  maybeHandleZoomThreshold();
}

function enterCategory(category) {
  if (!category) return;
  viewMode='category';
  activeCategory=category;
  activeSkill=null;
  updateViewToolbar();
  hideSkillPanel();
  categoryNodes.forEach(function (node) {
    node.group.visible = node === category;
    node.branch.visible = node === category;
    if (node !== category) node.skillsGroup.visible = false;
  });
  category.skillsGroup.visible = true;
  category.group.scale.setScalar(1);
  zeroFadeTarget=0.12;
  if (flatView) {
    applyFlatCategoryLayout(category);
    cameraTo(new THREE.Vector3(0,0,0),9.3,850,function () {
      revealSkillBranches(category);
      playPendingUnlocks(category);
    },0,0);
    return;
  }
  const focus = worldPosition(category.group);  const facingYaw=Math.atan2(focus.x,focus.z);
  const facingPitch=Math.atan2(focus.y,Math.max(0.01,Math.hypot(focus.x,focus.z)))*0.55;
  cameraTo(focus,8.7,1150,function () {
    revealSkillBranches(category);
    playPendingUnlocks(category);
  },facingYaw,facingPitch);
}

function returnToRoot(animate) {
  viewMode='root';
  activeCategory=null;
  activeSkill=null;
  updateViewToolbar();
  hideSkillPanel();
  categoryNodes.forEach(function (node) {
    node.group.visible=true;
    node.branch.visible=true;
    node.skillsGroup.visible=false;
    node.group.scale.setScalar(1);
  });
  zeroFadeTarget=1;
  if (flatView) {
    applyFlatRootLayout();
    if (animate !== false) cameraTo(new THREE.Vector3(0,0,0),FLAT_VIEW_HEIGHT,750,null,0,0);
    else {
      cameraTarget.set(0,0,0);cameraRadius=FLAT_VIEW_HEIGHT;cameraTween=null;cameraYaw=0;cameraPitch=0;
    }
  } else {
    categoryOrbit.rotation.y += 0.001;
    if (animate !== false) cameraTo(new THREE.Vector3(0,0,0),21,1100,null,0.08,0.1);
    else {
      cameraTarget.set(0,0,0);cameraRadius=21;cameraTween=null;cameraYaw=0.08;cameraPitch=0.1;
    }
  }
  refreshNewBadges();
}

function selectSkill(skillNode) {
  if (!skillNode || !activeCategory) return;
  markSkillExplored(skillNode.skill);
  viewMode='skill';
  activeSkill=skillNode;
  updateViewToolbar();
  zeroFadeTarget=0;
  hideSkillPanel();
  const destination=worldPosition(skillNode.group);
  cameraTo(destination,flatView?6.0:5.25,1250,function () {
    showSkillPanel(skillNode);
  });
}

function updateCamera(dt) {
  if (cameraTween) {
    const tween=cameraTween;
    const raw=Math.min(1,(performance.now()-tween.start)/tween.duration);
    const eased=raw<0.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
    cameraTarget.lerpVectors(tween.fromTarget,tween.toTarget,eased);
    cameraRadius=tween.fromRadius+(tween.toRadius-tween.fromRadius)*eased;
    cameraYaw=tween.fromYaw+(tween.toYaw-tween.fromYaw)*eased;
    cameraPitch=tween.fromPitch+(tween.toPitch-tween.fromPitch)*eased;
    if(raw>=1){
      cameraTarget.copy(tween.toTarget);
      cameraRadius=tween.toRadius;
      cameraYaw=tween.toYaw;
      cameraPitch=tween.toPitch;
      cameraTween=null;
      if(tween.onComplete)tween.onComplete();
    }
  }
  if (flatView && camera && camera.isOrthographicCamera) {
    camera.position.set(cameraTarget.x,cameraTarget.y,45);
    camera.up.set(0,1,0);
    camera.lookAt(cameraTarget.x,cameraTarget.y,0);
    camera.zoom=FLAT_VIEW_HEIGHT/Math.max(3.4,cameraRadius);
    camera.updateProjectionMatrix();
  } else {
    camera.position.set(
      cameraTarget.x+cameraRadius*Math.sin(cameraYaw)*Math.cos(cameraPitch),
      cameraTarget.y+cameraRadius*Math.sin(cameraPitch),
      cameraTarget.z+cameraRadius*Math.cos(cameraYaw)*Math.cos(cameraPitch)
    );
    camera.lookAt(cameraTarget);
  }
  zeroFade += (zeroFadeTarget-zeroFade)*Math.min(1,dt*1.6);
  if(zeroGroup){
    zeroGroup.scale.setScalar(0.05+zeroFade*0.95);
    zeroGroup.visible=zeroFade>0.025;
    zeroGroup.traverse(function (object) {
      if (object.material && object.userData.zeroOpacity == null) object.userData.zeroOpacity=object.material.opacity;
      if (object.material && object.userData.zeroOpacity != null) object.material.opacity=object.userData.zeroOpacity*zeroFade;
    });
  }
}

function updateLabels() {
  const cameraPos=camera.position;
  categoryNodes.forEach(function (category) {
    if (!category.group.visible) return;
    const categoryPoint=worldPosition(category.group);
    const categoryDistance=cameraPos.distanceTo(categoryPoint);
    const categoryLabel=category.nameSprite;
    if(categoryLabel) {
      if (flatView) categoryLabel.material.opacity=(viewMode==='root'||category===activeCategory)?0.96:0;
      else categoryLabel.material.opacity=(viewMode==='root' ? (categoryDistance<14?0.94:0) : (category===activeCategory?0.88:0));
    }
    if(category.newBadge)category.newBadge.visible=isCategoryNew(category.category);
    category.skills.forEach(function (skill) {
      if (!skill.group.visible) return;
      const point=worldPosition(skill.group);
      const distance=cameraPos.distanceTo(point);
      const show=flatView ? true : (viewMode==='skill'&&skill===activeSkill ? true : distance<10.5);
      if(skill.nameSprite)skill.nameSprite.material.opacity=show?0.96:0;
      if(skill.newBadge)skill.newBadge.visible=isSkillNew(skill.skill);
    });
  });
  if(activeSkill && panel && !panel.hidden)positionPanel(activeSkill);
}

function positionPanel(skillNode) {
  const world=worldPosition(skillNode.group);
  const projected=world.project(camera);
  const width=overlay.clientWidth;
  const height=overlay.clientHeight;
  const panelWidth=Math.min(420,Math.max(280,width-32));
  const panelHeight=Math.min(470,Math.max(280,height-112));
  let x=(projected.x*0.5+0.5)*width+58;
  let y=(-projected.y*0.5+0.5)*height-112;
  if(x+panelWidth>width-14)x=(projected.x*0.5+0.5)*width-panelWidth-58;
  x=Math.max(14,Math.min(width-panelWidth-14,x));
  y=Math.max(76,Math.min(height-panelHeight-16,y));
  panel.style.left=x+'px';
  panel.style.top=y+'px';
}

function showSkillPanel(skillNode) {
  const skill=skillNode.skill;
  const status=skill.status.toLowerCase();
  const launchLabel={
    hangman:'LAUNCH HANGMAN',
    sudoku:'LAUNCH SUDOKU',
    calendar:'OPEN GOOGLE CALENDAR',
    conversation:'TRY A CONVERSATION',
    voice:'ACTIVATE VOICE INTERFACE',
    settings:'OPEN SETTINGS',
    audio:'OPEN AUDIO CONTROLS',
    memory:'OPEN MEMORY COMMANDS',
    weather:'OPEN WEATHER',
  }[skill.launch];
  panel.innerHTML =
    '<button type="button" class="st-panel-close" data-zero-panel-close aria-label="Close skill details">×</button>' +
    '<div class="st-panel-kicker">' + escapeHtml(skillNode.category.name) + ' / CAPABILITY</div>' +
    '<h2 class="st-panel-title">' + escapeHtml(skill.name) + '</h2>' +
    '<span class="st-panel-status" data-status="' + escapeHtml(status) + '">' + escapeHtml(skill.status) + '</span>' +
    '<p class="st-panel-description">' + escapeHtml(skill.description) + '</p>' +
    '<span class="st-panel-label">VOICE ACTIVATION</span>' +
    '<div class="st-activation">' + escapeHtml(skill.activation) + '</div>' +
    (launchLabel ? '<button type="button" class="st-launch" data-zero-launch="' + escapeHtml(skill.id) + '">' + launchLabel + '</button>' : '');
  clearTimeout(panelHideTimer);
  panel.hidden=false;
  panel.classList.remove('is-visible');
  positionPanel(skillNode);
  requestAnimationFrame(function(){
    if(panel && !panel.hidden) panel.classList.add('is-visible');
  });
}

function hideSkillPanel() {
  if (!panel) return;
  clearTimeout(panelHideTimer);
  panel.classList.remove('is-visible');
  panelHideTimer=window.setTimeout(function(){
    if(!panel.classList.contains('is-visible')){
      panel.hidden=true;
      panel.innerHTML='';
    }
  },280);
}

function closePanelToCategory() {
  if (!activeCategory) return;
  viewMode='category';
  activeSkill=null;
  updateViewToolbar();
  zeroFadeTarget=0.12;
  hideSkillPanel();
  cameraTo(flatView?new THREE.Vector3(0,0,0):worldPosition(activeCategory.group),flatView?9.3:8.7,850, null, flatView?0:undefined, flatView?0:undefined);
}

function launchSkill(skillNode) {
  const skill=skillNode.skill;
  if (!skill || skill.status === 'Coming Soon') return;
  markSkillExplored(skill);
  hideSkillPanel();

  if (skill.launch === 'hangman') {
    launchFromTree=true;
    overlay.hidden=true;
    treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    const game=document.getElementById('hangmanGame');
    const exitButton=document.getElementById('hmExit');
    if (game) game.classList.add('tree-hangman-mode');
    if (exitButton) exitButton.textContent='BACK TO SKILL TREE';
    if (typeof window.run === 'function') {
      window.run('play Hangman');
    } else if (typeof window.startHangmanRound === 'function') {
      window.startHangmanRound();    } else {
      launchFromTree=false;
      overlay.hidden=false;
      showToast('Hangman is not available right now.');
    }
    return;
  }

  if (skill.launch === 'sudoku') {
    launchFromTree=true;
    overlay.hidden=true;
    treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    if (window.ZeroExtraFeatures && typeof window.ZeroExtraFeatures.openSudoku === 'function') {
      window.ZeroExtraFeatures.openSudoku('easy');
    } else {
      launchFromTree=false;
      overlay.hidden=false;
      showToast('Sudoku is not available right now.');
    }
    return;
  }

  if (skill.launch === 'weather') {
    launchFromTree=true;
    overlay.hidden=true;
    treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    if (window.ZeroExtraFeatures && typeof window.ZeroExtraFeatures.openWeather === 'function') {
      window.ZeroExtraFeatures.openWeather();
    } else {
      launchFromTree=false;
      overlay.hidden=false;
      treeOpen=true;
      if (navButton) navButton.setAttribute('aria-pressed','true');
      showToast('Weather is not available right now.');
    }
    return;
  }

  if (skill.launch === 'happy-news') {
    launchFromTree=true;
    overlay.hidden=true;
    treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    if (window.ZeroExtraFeatures && typeof window.ZeroExtraFeatures.openHappyNews === 'function') {
      window.ZeroExtraFeatures.openHappyNews();
    } else {
      launchFromTree=false;
      overlay.hidden=false;
      treeOpen=true;
      if (navButton) navButton.setAttribute('aria-pressed','true');
      showToast('Happy News is not available right now.');
    }
    return;
  }

  if (skill.launch === 'calendar') {
    // Keep the Skill Tree action on the same launch path as voice commands.
    if (typeof window.zeroOpenGoogleCalendarApp === 'function') {
      window.zeroOpenGoogleCalendarApp();
    } else {
      window.location.href = 'https://calendar.google.com/calendar/u/0/r';
    }
    return;
  }

  if (skill.launch === 'audio') {
    if (window.ZeroAudio && typeof window.ZeroAudio.open === 'function') window.ZeroAudio.open();
    else showToast('Audio controls are not available right now.');
    return;
  }

  if (skill.launch === 'settings') {
    overlay.hidden=true;treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    const gear=document.getElementById('gear');
    if (gear) gear.click();
    return;
  }

  if (skill.launch === 'voice') {
    overlay.hidden=true;treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    const mic=document.getElementById('mic');
    if (mic) mic.click();
    return;
  }

  if (skill.launch === 'conversation' || skill.launch === 'memory') {
    overlay.hidden=true;treeOpen=false;
    if (navButton) navButton.setAttribute('aria-pressed','false');
    const keyboard=document.getElementById('kb');
    if (keyboard) keyboard.click();
    setTimeout(function () {
      const input=document.getElementById('ci');
      if(input)input.focus();
    },80);
  }
}

function showSkillTree() {
  if (!overlay) return;
  clearTimeout(treeCloseTimer);
  overlay.hidden=false;
  overlay.classList.remove('st-closing');
  document.body.classList.add('zero-skill-tree-open');
  treeOpen=true;
  zeroFadeTarget=1;
  requestAnimationFrame(function(){ if(treeOpen)overlay.classList.add('st-open'); });
  if (navButton) navButton.setAttribute('aria-pressed','true');
  resizeRenderer();
  if (activeSkill && viewMode==='skill') showSkillPanel(activeSkill);
  startRenderLoop();
}

window.__zeroReturnToSkillTree = function () {
  if (!launchFromTree) return;
  launchFromTree = false;
  showSkillTree();
};

function openSkillTree() {
  if (!overlay) return;
  clearTimeout(treeCloseTimer);
  overlay.classList.remove('st-closing','st-open');
  document.body.classList.add('zero-skill-tree-open');
  returnToRoot(false);
  categoryOrbit && (categoryOrbit.rotation.y=0);
  revealJobs=[];
  if (zeroGroup) {
    zeroGroup.scale.setScalar(0.05);
    zeroFade=0.04;zeroFadeTarget=1;
  }
  overlay.hidden=false;
  treeOpen=true;
  requestAnimationFrame(function(){if(treeOpen)overlay.classList.add('st-open')});
  if (navButton) navButton.setAttribute('aria-pressed','true');
  resizeRenderer();
  cameraRadius=flatView?FLAT_VIEW_HEIGHT:21;
  cameraTarget.set(0,0,0);
  cameraTween=null;
  cameraYaw=flatView?0:0.08;
  cameraPitch=flatView?0:0.1;
  if(flatView)applyFlatRootLayout();
  updateViewToolbar();
  rootRevealStarted=false;
  categoryNodes.forEach(function (node) {
    node.group.scale.setScalar(0);
    node.branch.material.opacity=0;
    node.group.visible=true;
    node.skillsGroup.visible=false;
  });
  setTimeout(function () {
    if (treeOpen && !rootRevealStarted) revealCategoryBranches();
  },650);
  startRenderLoop();
}

function closeSkillTree() {
  if (!overlay || !treeOpen) return;
  treeOpen=false;
  zeroFadeTarget=0;
  document.body.classList.remove('zero-skill-tree-open');
  overlay.classList.remove('st-open');
  overlay.classList.add('st-closing');
  hideSkillPanel();
  if (navButton) navButton.setAttribute('aria-pressed','false');
  clearTimeout(treeCloseTimer);
  treeCloseTimer=setTimeout(function(){
    if(treeOpen)return;
    overlay.hidden=true;
    overlay.classList.remove('st-closing');
  },820);
}

function handleZoomOut() {
  if (viewMode === 'skill') {
    closePanelToCategory();
    cameraRadius=8.7;
    return;
  }
  if (viewMode === 'category') {
    returnToRoot(true);
    return;
  }
  if (viewMode === 'root') closeSkillTree();
}

function raycastNode(clientX,clientY) {
  const rect=renderer.domElement.getBoundingClientRect();
  const pointer=new THREE.Vector2(
    ((clientX-rect.left)/rect.width)*2-1,
    -((clientY-rect.top)/rect.height)*2+1
  );
  const raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(pickMeshes,false);
  const isPickable=function(node){
    if(!node)return false;
    if(node.kind==='zero')return true;
    if(node.kind==='category')return viewMode==='root'&&node.group.visible;
    if(node.kind==='skill')return viewMode==='category'&&activeCategory&&node.categoryId===activeCategory.id&&
      activeCategory.skillsGroup.visible&&node.group.visible&&node.group.scale.x>0.05;
    return false;
  };
  const selected=hits.find(function(hit){return isPickable(hit.object.userData.pickTarget)});
  if(!selected)return;
  const node=selected.object.userData.pickTarget;
  if(node.kind==='zero'){
    if(viewMode==='root')closeSkillTree();
    else returnToRoot(true);
    return;
  }
  if(node.kind==='category'){
    if(viewMode==='root')enterCategory(node);
    else if(viewMode==='skill'&&node===activeCategory)closePanelToCategory();
    return;
  }
  if(node.kind==='skill'&&viewMode==='category')selectSkill(node);
}

function pointerHandlers() {
  const canvas=renderer.domElement;
  const viewToggle=document.getElementById('zeroViewToggle');
  const zoomOutButton=document.getElementById('zeroZoomOut');
  const zoomInButton=document.getElementById('zeroZoomIn');
  const backButton=document.getElementById('zeroTreeBack');
  if(viewToggle)viewToggle.addEventListener('click',function(){setFlatViewMode(!flatView);});
  if(zoomOutButton)zoomOutButton.addEventListener('click',function(){zoomSkillTree(1);});
  if(backButton)backButton.addEventListener('click',function(){
    if(viewMode==='skill')closePanelToCategory();
    else if(viewMode==='category')returnToRoot(true);
  });
  if(zoomInButton)zoomInButton.addEventListener('click',function(){zoomSkillTree(-1);});
  canvas.addEventListener('pointerdown',function (event) {
    canvas.setPointerCapture(event.pointerId);
    pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
    dragMoved=false;
    if(pointerMap.size===1)dragStart={x:event.clientX,y:event.clientY};
    if(pointerMap.size===2){
      const values=Array.from(pointerMap.values());
      pinchDistance=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);
      dragMoved=true;
    }
  });
  canvas.addEventListener('pointermove',function (event) {
    if(!pointerMap.has(event.pointerId))return;
    const previous=pointerMap.get(event.pointerId);
    pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointerMap.size>=2){
      const values=Array.from(pointerMap.values());
      const distance=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);
      const delta=distance-pinchDistance;
      if(Math.abs(delta)>0.5){
        cameraRadius=Math.max(4.3,Math.min(28,cameraRadius+(flatView?-delta*0.035:delta*0.035)));
        pinchDistance=distance;
        maybeHandleZoomThreshold();
      }
      return;
    }
    const dx=event.clientX-previous.x;
    const dy=event.clientY-previous.y;
    if(dragStart && (Math.abs(event.clientX-dragStart.x)>5||Math.abs(event.clientY-dragStart.y)>5))dragMoved=true;
    if(dragMoved){
      if(flatView) {
        const scale=cameraRadius/Math.max(1,overlay.clientHeight);
        cameraTarget.x-=dx*scale;
        cameraTarget.y+=dy*scale;
      } else {
        cameraYaw-=dx*0.006;
        cameraPitch=Math.max(-1.25,Math.min(1.25,cameraPitch+dy*0.005));
      }
    }
  });
  const pointerEnd=function (event) {
    if(!pointerMap.has(event.pointerId))return;
    const wasSingle=pointerMap.size===1;
    const shouldClick=wasSingle&&!dragMoved;
    pointerMap.delete(event.pointerId);
    try{canvas.releasePointerCapture(event.pointerId)}catch(error){}
    if(shouldClick)raycastNode(event.clientX,event.clientY);
    if(pointerMap.size===1){
      const remaining=Array.from(pointerMap.values())[0];
      dragStart={x:remaining.x,y:remaining.y};
      dragMoved=true;
    } else if(pointerMap.size===0){
      dragStart=null;
      dragMoved=false;
    }
  };
  canvas.addEventListener('pointerup',pointerEnd);
  canvas.addEventListener('pointercancel',pointerEnd);
  canvas.addEventListener('wheel',function(event){
    event.preventDefault();
    cameraRadius=Math.max(4.3,Math.min(28,cameraRadius+event.deltaY*0.012));
    maybeHandleZoomThreshold();
  },{passive:false});
  canvas.addEventListener('contextmenu',function(event){event.preventDefault()});
}
function maybeHandleZoomThreshold() {
  if(cameraTween || flatView)return;
  if(viewMode==='skill'&&cameraRadius>8.6)handleZoomOut();
  else if(viewMode==='category'&&cameraRadius>13.8)handleZoomOut();
  else if(viewMode==='root'&&cameraRadius>25.5)handleZoomOut();
}

function updateRevealJobs(now) {
  for(let i=revealJobs.length-1;i>=0;i--){
    const job=revealJobs[i];
    if(now<job.start)continue;
    const raw=Math.min(1,(now-job.start)/job.duration);
    const eased=1-Math.pow(1-raw,3);
    if(job.type==='zero')job.node.scale.setScalar(job.from+(job.to-job.from)*eased);
    else if(job.type==='category')job.node.group.scale.setScalar(job.from+(job.to-job.from)*eased);
    else if(job.type==='branch'){
      const value=job.from+(job.to-job.from)*eased;
      job.node.branch.material.opacity=value;
      if(job.node.branchGlow)job.node.branchGlow.material.opacity=value*0.26;
    }
    else if(job.type==='skill')job.node.group.scale.setScalar(job.from+(job.to-job.from)*eased);
    else if(job.type==='skillBranch'){
      const value=job.from+(job.to-job.from)*eased;
      job.line.material.opacity=value;
      if(job.glow)job.glow.material.opacity=value*0.26;
    }
    if(raw>=1)revealJobs.splice(i,1);
  }
}

function animate(now) {
  if(!renderer||!scene||!camera||!overlay||overlay.hidden||document.hidden){
    renderFrame=0;
    return;
  }
  renderFrame=requestAnimationFrame(animate);
  const dt=Math.min(0.05,(now-lastFrame)/1000||0);
  lastFrame=now;
  if(!flatView&&viewMode==='root'&&categoryOrbit)categoryOrbit.rotation.y+=dt*0.025;
  if(zeroGroup){
    zeroGroup.rotation.y+=dt*0.15;
    zeroGroup.rotation.x=Math.sin(now*0.00018)*0.08;
    const rings=zeroGroup.userData.rings||[];
    rings.forEach(function(ring,index){ring.rotation.z+=dt*(index%2?-.16:.12)});
  }
  categoryNodes.forEach(function (category) {
    if(category.group.visible){
      if(!flatView)category.group.rotation.y+=dt*0.08;
      if(category.group.userData.strayOrbit){category.group.userData.strayOrbit.rotation.y+=dt*0.42;category.group.userData.strayOrbit.rotation.x+=dt*0.17;category.group.userData.strayOrbit.position.y=Math.sin(now*.0014+category.position[0])*.035;}
      const aura = category.visual && category.visual.categoryAura;
      if (aura) {
        const t = now * 0.001;
        if (aura.userData.effectType === 'voice') {
          (aura.userData.waveRings || []).forEach((wave, i) => {
            wave.rotation.z += dt * (i % 2 ? -0.22 : 0.18);
            const pulse = 1 + Math.sin(t * 2.1 - i * 0.85) * 0.045;
            wave.scale.setScalar(pulse);
            wave.material.opacity = 0.34 + (Math.sin(t * 2.1 - i * 0.85) + 1) * 0.13;
          });
        } else if (aura.userData.orbit) {
          aura.userData.orbit.rotation.z += dt * 0.42;
          aura.userData.orbit.rotation.x += dt * 0.08;
        } else if (aura.userData.dial) {
          aura.userData.dial.rotation.z += dt * 0.22;
          aura.userData.hand.rotation.z = Math.sin(t * 0.8) * 0.55;
        } else if (aura.userData.network) {
          aura.userData.network.rotation.y += dt * 0.24;
          aura.userData.network.rotation.z -= dt * 0.16;
          aura.userData.network.scale.setScalar(1 + Math.sin(t * 1.7) * 0.025);
        } else if (aura.userData.controls) {
          aura.userData.controls.rotation.z += dt * 0.1;
          aura.userData.controls.children.forEach((part, i) => {
            if (part.geometry && part.geometry.type === 'IcosahedronGeometry') {
              part.position.x = Math.sin(t * 1.1 + Math.floor(i / 2) * 1.8) * 0.22;
            }
          });
        }
      }
      category.skills.forEach(function (skill,index) {
        if(skill.group.visible){
          if(!flatView)skill.group.rotation.y+=dt*(index%2?-.1:.12);
          if(skill.group.userData.strayOrbit){skill.group.userData.strayOrbit.rotation.y+=dt*(index%2?-.52:.46);skill.group.userData.strayOrbit.rotation.z+=dt*.14;skill.group.userData.strayOrbit.position.y=Math.sin(now*.0018+index)*.028;}
          const rings=skill.group.userData.rings||[];
          rings.forEach(function(ring,ringIndex){ring.rotation.z+=dt*(ringIndex%2?-.14:.11)});
        }
      });
    }
  });
  updateRevealJobs(now);
  updateCamera(dt);
  animateUnlockEffects(dt);
  updateLabels();
  renderer.render(scene,camera);
}

function startRenderLoop() {
  if (!renderFrame && treeOpen) {
    lastFrame=performance.now();
    renderFrame=requestAnimationFrame(animate);
  }
}

function resizeRenderer() {
  if (!renderer || !camera || !overlay) return;
  const width=Math.max(1,overlay.clientWidth || window.innerWidth || 1);
  const height=Math.max(1,overlay.clientHeight || window.innerHeight || 1);
  const aspect=width/height;
  if(camera.isOrthographicCamera) {
    const visibleHeight=FLAT_VIEW_HEIGHT;
    const visibleWidth=visibleHeight*aspect;
    camera.left=-visibleWidth/2;
    camera.right=visibleWidth/2;
    camera.top=visibleHeight/2;
    camera.bottom=-visibleHeight/2;
    camera.zoom=FLAT_VIEW_HEIGHT/Math.max(3.4,cameraRadius);
  } else {
    camera.aspect=aspect;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(width,height,false);
  if(flatView)applyFlatLayoutForCurrentView();
}

function initRenderer() {
  const canvas=document.getElementById('zeroSkillCanvas');
  let failedStage='creating the WebGL renderer';
  try{
    renderer=new THREE.WebGLRenderer({
      canvas:canvas,alpha:true,antialias:true,powerPreference:'high-performance'
    });
    failedStage='configuring the renderer';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(46,1,0.1,300);
    perspectiveCamera=camera;
    resizeRenderer();
    camera.position.set(0,2,21);
    failedStage='building the 3D scene';
    buildWorld();
    failedStage='connecting the 3D controls';
    pointerHandlers();
    window.addEventListener('resize',resizeRenderer);
  }catch(error){
    console.error('ZERO Skill Tree initialisation failed during '+failedStage+':',error);
    const notice=document.createElement('p');
    notice.className='st-no-webgl';
    notice.textContent='3D view failed while '+failedStage+'. '+(error&&error.message?error.message:String(error));
    overlay.appendChild(notice);
  }
}

function setupPanelEvents() {
  panel.addEventListener('click',function(event){
    if(event.target.closest('[data-zero-panel-close]')){
      closePanelToCategory();
      return;
    }
    const launch=event.target.closest('[data-zero-launch]');
    if(launch&&activeSkill)launchSkill(activeSkill);
  });
}

function setupHangmanReturn() {
  const game=document.getElementById('hangmanGame');
  const exitButton=document.getElementById('hmExit');
  if(!game||!exitButton)return;
  const originalLabel=exitButton.textContent;
  function restoreTree() {
    if(!launchFromTree)return;
    clearTimeout(returnTimer);
    returnTimer=setTimeout(function(){
      if(game.classList.contains('on'))return;
      game.classList.remove('tree-hangman-mode');
      exitButton.textContent=originalLabel;
      launchFromTree=false;
      showSkillTree();
    },485);
  }
  document.addEventListener('click',function(event){
    if(event.target.closest('#hmExit')&&launchFromTree)restoreTree();
  },true);
  new MutationObserver(restoreTree).observe(game,{attributes:true,attributeFilter:['class','hidden']});
}

function setupKeyboard() {
  document.addEventListener('keydown',function(event){
    if(!treeOpen||event.key!=='Escape')return;
    event.preventDefault();
    if(viewMode==='skill')closePanelToCategory();
    else if(viewMode==='category')returnToRoot(true);
    else closeSkillTree();
  });
}

function registerSkill(categoryId,skill) {
  const category=categories.find(function (entry) { return entry.id===categoryId; });
  if(!category||!skill||!skill.id||category.skills.some(function (entry) { return entry.id===skill.id; }))return false;
  const safeSkill=Object.assign({
    status:'Coming Soon',icon:'spark',
    description:'This capability has been added to ZERO and will be described here.',
    activation:'A voice activation phrase will appear here when it is available.'
  },skill);
  category.skills.push(safeSkill);
  discovery.knownSkills.push(safeSkill.id);
  discovery.pendingSkills.push(safeSkill.id);
  if (!discovery.pendingCategories.includes(category.id)) discovery.pendingCategories.push(category.id);
  saveDiscovery();
  if(renderer&&treeOpen){
    const previousCategory=activeCategory&&activeCategory.id;
    buildWorld();
    returnToRoot(false);
    if(previousCategory){
      const newCategory=categoryNodes.find(function (entry) { return entry.id===previousCategory; });
      if(newCategory)enterCategory(newCategory);
      else revealCategoryBranches();
    } else revealCategoryBranches();
    startRenderLoop();
  }
  return true;
}

function registerCategory(category) {
  if(!category||!category.id||categories.some(function (entry) { return entry.id===category.id; }))return false;
  const next=Object.assign({
    color:'#9aafff',icon:'neural',position:[0,0,-8],skills:[]
  },category);
  next.skills=Array.isArray(next.skills)?next.skills:[];
  categories.push(next);
  discovery.knownCategories.push(next.id);
  discovery.pendingCategories.push(next.id);
  next.skills.forEach(function(skill){
    skill.categoryId=next.id;
    discovery.knownSkills.push(skill.id);
    discovery.pendingSkills.push(skill.id);
  });
  saveDiscovery();
  if(renderer&&treeOpen){
    buildWorld();
    returnToRoot(false);
    revealCategoryBranches();
  }
  return true;
}

const ZERO_AUDIO_SOUNDS={
 rain:['https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain%20(1).ogg','https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain.ogg'],
 forest:['https://commons.wikimedia.org/wiki/Special:Redirect/file/20090610%200%20ambience.ogg','https://commons.wikimedia.org/wiki/Special:Redirect/file/Birds%20forest.ogg'],
 water:['https://commons.wikimedia.org/wiki/Special:Redirect/file/Water%20flowing%20pouring%20trickling.ogg','https://commons.wikimedia.org/wiki/Special:Redirect/file/Flowing-water-100019.ogg']
};
let zeroAudioPlayers={},zeroAudioContext=null,zeroAudioOscillator=null,zeroAudioGain=null,zeroAudioPanel=null;
function zeroAudioStop(key){
 const keys=key?[key]:Object.keys(zeroAudioPlayers);
 keys.forEach(function(k){const a=zeroAudioPlayers[k];if(a){try{a.pause();a.currentTime=0}catch(e){}}});
 if(!key&&zeroAudioOscillator){const o=zeroAudioOscillator,g=zeroAudioGain;zeroAudioOscillator=null;zeroAudioGain=null;try{const n=zeroAudioContext.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(g.gain.value,n);g.gain.linearRampToValueAtTime(0,n+.4);o.stop(n+.45)}catch(e){}}
}
async function zeroAudioPlaySound(key){
 if(!ZERO_AUDIO_SOUNDS[key])return false;
 let a=zeroAudioPlayers[key];if(!a){a=new Audio();a.loop=true;a.preload='none';zeroAudioPlayers[key]=a}
 for(const src of ZERO_AUDIO_SOUNDS[key]){try{a.pause();a.src=src;a.load();await a.play();return true}catch(e){}}
 return false;
}
function zeroAudioPlayFrequency(hz){
 const f=Number(hz),AC=window.AudioContext||window.webkitAudioContext;
 if(!Number.isFinite(f)||f<20||f>20000||!AC)return false;
 zeroAudioStop();
 try{
  if(!zeroAudioContext)zeroAudioContext=new AC();
  if(zeroAudioContext.state==='suspended')zeroAudioContext.resume();
  const o=zeroAudioContext.createOscillator(),g=zeroAudioContext.createGain();
  o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,zeroAudioContext.currentTime);g.gain.linearRampToValueAtTime(.035,zeroAudioContext.currentTime+1);
  o.connect(g);g.connect(zeroAudioContext.destination);o.start();zeroAudioOscillator=o;zeroAudioGain=g;
  o.onended=function(){if(zeroAudioOscillator===o){zeroAudioOscillator=null;zeroAudioGain=null}};
  return true;
 }catch(e){return false}
}
function zeroAudioOpen(){
 if(!zeroAudioPanel){
  zeroAudioPanel=document.createElement('section');zeroAudioPanel.id='zeroAudioPanel';zeroAudioPanel.setAttribute('role','dialog');zeroAudioPanel.setAttribute('aria-modal','true');
  zeroAudioPanel.innerHTML='<div class="zero-audio-card"><button type="button" class="zero-audio-close" aria-label="Close">×</button><p class="zero-audio-kicker">Z.E.R.O. / AUDIO</p><h2>Audio & Atmosphere</h2><div class="zero-audio-group"><h3>Nature sounds</h3><div class="zero-audio-actions"><button data-sound="rain">Rain</button><button data-sound="forest">Forest</button><button data-sound="water">Flowing water</button></div></div><div class="zero-audio-group"><h3>Frequencies</h3><div class="zero-audio-actions"><button data-frequency="432">432 Hz</button><button data-frequency="528">528 Hz</button><button data-frequency="639">639 Hz</button></div></div><button type="button" class="zero-audio-stop">Stop audio</button></div>';
  document.body.appendChild(zeroAudioPanel);
  zeroAudioPanel.addEventListener('click',async function(e){
   if(e.target===zeroAudioPanel||e.target.closest('.zero-audio-close')){zeroAudioPanel.classList.remove('is-open');return}
   const s=e.target.closest('[data-sound]');if(s){const ok=await zeroAudioPlaySound(s.dataset.sound);if(!ok)showToast('That sound could not be played right now.');return}
   const f=e.target.closest('[data-frequency]');if(f){if(!zeroAudioPlayFrequency(f.dataset.frequency))showToast('The frequency could not be started.');return}
   if(e.target.closest('.zero-audio-stop'))zeroAudioStop();
  });
 }
 zeroAudioPanel.classList.add('is-open');
}
window.ZeroAudio={
 open:zeroAudioOpen,stop:zeroAudioStop,playSound:zeroAudioPlaySound,playFrequency:zeroAudioPlayFrequency,
 handleCommand:async function(raw,respond){
  const q=String(raw||'').toLowerCase();
  if(/\b(?:stop|turn off|pause)\s+(?:all\s+)?(?:audio|sounds|rain|forest|water|frequency|tone)\b/.test(q)||/\bstop (?:playing|the sound)\b/.test(q)){zeroAudioStop();await respond('Audio stopped.');return true}
  const s=(q.match(/\b(rain|forest|water)\b/)||[])[1];
  if(s&&/\b(?:play|start|turn on|put on)\b/.test(q)){const ok=await zeroAudioPlaySound(s);await respond(ok?'Playing '+s+'.':'I could not play that sound right now.');return true}
  const f=q.match(/\b(?:play|start|generate|put on)\s+(?:a\s+)?(\d{2,5})\s*(?:hz|hertz)\b/)||q.match(/\b(\d{2,5})\s*(?:hz|hertz)\b/);
  if(f){const ok=zeroAudioPlayFrequency(f[1]);await respond(ok?'Playing '+Number(f[1])+' hertz.':'I could not start that frequency.');return true}
  return false;
 }
};
  if(!document.getElementById('zero-audio-style')){
    const st=document.createElement('style');st.id='zero-audio-style';
    st.textContent='#zeroAudioPanel{position:fixed;inset:0;z-index:100;display:none;place-items:center;padding:18px;background:rgba(2,7,16,.76);backdrop-filter:blur(14px);color:#edf7ff}#zeroAudioPanel.is-open{display:grid}#zeroAudioPanel .zero-audio-card{position:relative;width:min(100%,480px);padding:28px;border-radius:22px;background:rgba(12,22,38,.96);box-shadow:0 24px 90px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.08)}#zeroAudioPanel h2{font-size:25px;font-weight:400;margin:6px 0 24px}#zeroAudioPanel h3{font-size:13px;font-weight:500;color:#a9bfd5;margin:0 0 10px}#zeroAudioPanel .zero-audio-kicker{font:10px ui-monospace,monospace;letter-spacing:.18em;color:#aaa0ff}#zeroAudioPanel .zero-audio-group{margin:18px 0}#zeroAudioPanel .zero-audio-actions{display:flex;gap:8px;flex-wrap:wrap}#zeroAudioPanel button{border:0;border-radius:12px;background:rgba(160,178,210,.12);color:#eaf4ff;padding:11px 15px;font:inherit;cursor:pointer}#zeroAudioPanel .zero-audio-close{position:absolute;right:16px;top:16px;font-size:22px;background:transparent;padding:3px 8px}#zeroAudioPanel .zero-audio-stop{margin-top:8px;background:rgba(151,121,255,.2)}';
    document.head.appendChild(st);
  }
function initialize() {
  addStylesheet();
  addNavAndOverlay();
  setupMusicPreferences();
  setupPanelEvents();
  setupHangmanReturn();
  setupKeyboard();
  initRenderer();
  updateViewToolbar();
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&treeOpen)startRenderLoop();
  });
  window.ZERO_SKILL_TREE = {
    open:openSkillTree,
    close:closeSkillTree,
    registerSkill:registerSkill,
    registerCategory:registerCategory,
    getMusicPreference:function(){return Object.assign({},musicConfig);},
    setMusicPreference:function(service,customUrl){return saveMusicConfig({service:service,customUrl:customUrl});}
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();