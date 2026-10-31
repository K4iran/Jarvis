import * as THREE from "three";

const PROFILES = {
  idle:       { radius: 28, speed: 0.20, brightness: 0.50, size: 0.35, links: 0.15, electrons: false },
  listening:  { radius: 22, speed: 0.30, brightness: 0.65, size: 0.40, links: 0.82, electrons: false },
  thinking:   { radius: 16, speed: 0.50, brightness: 0.70, size: 0.30, links: 1.00, electrons: true },
  speaking:   { radius: 18, speed: 0.20, brightness: 0.70, size: 0.40, links: 0.80, electrons: false },
  compacting: { radius: 12, speed: 0.08, brightness: 0.28, size: 0.28, links: 0.00, electrons: false }
};

export function createOrb(canvas, options = {}) {
  const THREE_NS = THREE;
  const count = Math.max(300, options.particleCount || 2000);
  const maxLines = Math.max(100, options.maxLines || 8000);
  const linkDistance = options.lineDistance || 8;
  const scene = new THREE_NS.Scene();
  const transparent = options.transparent === true;
  scene.background = transparent ? null : new THREE_NS.Color(options.backgroundColor ?? 0x050508);
  const camera = new THREE_NS.PerspectiveCamera(50, 1, 0.1, 400);
  camera.position.z = 90;
  const renderer = new THREE_NS.WebGLRenderer({ canvas, antialias: true, alpha: transparent });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2));
  renderer.setClearColor(options.backgroundColor ?? 0x050508, transparent ? 0 : 1);

  const positions = new Float32Array(count * 3);
  const pointColors = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const dirs = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5) * 25;
    const s = Math.sqrt(1 - u * u);
    const x = Math.cos(a) * s * r, y = u * r, z = Math.sin(a) * s * r;
    const j = i * 3;
    base[j] = positions[j] = x; base[j + 1] = positions[j + 1] = y; base[j + 2] = positions[j + 2] = z;
    pointColors[j] = pointColors[j + 1] = pointColors[j + 2] = 1;
    const du = Math.random() * 2 - 1, da = Math.random() * Math.PI * 2, ds = Math.sqrt(1 - du * du);
    dirs[j] = Math.cos(da) * ds; dirs[j + 1] = du; dirs[j + 2] = Math.sin(da) * ds;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.25 + Math.random() * 0.75;
  }
  const pointGeo = new THREE_NS.BufferGeometry();
  pointGeo.setAttribute("position", new THREE_NS.BufferAttribute(positions, 3));
  pointGeo.setAttribute("color", new THREE_NS.BufferAttribute(pointColors, 3));
  const pointMat = new THREE_NS.PointsMaterial({ color: 0x76c8ff, vertexColors: true, size: 0.42, transparent: true, opacity: 0.72, blending: THREE_NS.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const points = new THREE_NS.Points(pointGeo, pointMat);
  scene.add(points);

  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  const lineGeo = new THREE_NS.BufferGeometry();
  lineGeo.setAttribute("position", new THREE_NS.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute("color", new THREE_NS.BufferAttribute(lineColors, 3));
  const lineMat = new THREE_NS.LineBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.10, blending: THREE_NS.AdditiveBlending, depthWrite: false });
  const lines = new THREE_NS.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const electronCount = 10;
  const electronPositions = new Float32Array(electronCount * 3);
  const electronGeo = new THREE_NS.BufferGeometry();
  electronGeo.setAttribute("position", new THREE_NS.BufferAttribute(electronPositions, 3));
  const electronMat = new THREE_NS.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE_NS.AdditiveBlending,
    vertexShader: `void main(){ vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_PointSize = 5.0 * (80.0 / max(1.0,-mvPosition.z)); gl_Position = projectionMatrix * mvPosition; }`,
    fragmentShader: `void main(){ vec2 p = gl_PointCoord - vec2(0.5); float d = length(p); float a = 1.0 - smoothstep(0.12,0.5,d); if(a < 0.02) discard; gl_FragColor = vec4(0.88,0.97,1.0,a); }`
  });
  const electrons = new THREE_NS.Points(electronGeo, electronMat);
  scene.add(electrons);

  const links = [];
  const travellers = [];
  const clock = new THREE_NS.Clock();
  const target = { ...PROFILES.idle };
  let current = { ...target };
  let activeState = "idle";
  let shapeRecovery = 0;
  const connectionCounts = new Uint8Array(count);
  let analyser = null;
  let audioData = null;
  let voiceActivity = 0;
  let audioEnvelope = 0;
  let previousAudioEnvelope = 0;
  let audioImpact = 0;
  let frame = 0;
  let destroyed = false;
  let resizeObserver = null;
  let isSpeaking = false;

  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the complete orb even on a narrow portrait phone screen.
    const halfHorizontalFov = Math.atan(Math.tan(THREE_NS.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
    camera.position.z = Math.max(78, 31 / Math.sin(halfHorizontalFov));
    camera.updateProjectionMatrix();
  }
  resize();
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else window.addEventListener("resize", resize);

  function rebuildLinks(t) {
    links.length = 0;
    connectionCounts.fill(0);
    const vocalMotion = activeState === "listening" || activeState === "speaking";
    const speakingPulse = activeState === "speaking" ? speakingExpansion(t) : 0;
    const outward = activeState === "speaking" ? speakingPulse : vocalMotion ? Math.max(0, Math.sin(t * 7.4)) : 0;
    // Reduce link density at the listening orb's smallest point, where the
    // tighter network was causing avoidable rendering load.
    const listeningBreath = activeState === "listening"
      ? 0.5 - 0.5 * Math.cos(t * (Math.PI * 2 / 8.0))
      : 1;
    const linkBudget = activeState === "listening"
      ? Math.floor(maxLines * (0.28 + 0.52 * listeningBreath))
      : maxLines;
    const sampleTarget = activeState === "listening"
      ? Math.floor(180 + 300 * listeningBreath)
      : 600;
    const sampleStep = Math.max(1, Math.floor(count / sampleTarget));
    for (let i = 0; i < count; i += sampleStep) {
      const ai = i * 3;
      for (let j = i + sampleStep; j < count; j += sampleStep) {
        const bj = j * 3;
        const dx = positions[ai] - positions[bj], dy = positions[ai + 1] - positions[bj + 1], dz = positions[ai + 2] - positions[bj + 2];
        // Connections breathe in and out: some links temporarily fade away,
        // then reconnect as the network flows through a slow travelling wave.
        const phase = t * (target.electrons ? 2.1 : 1.25) + i * 0.037 + j * 0.019;
        const linkWave = Math.sin(phase);
        const detailBoost = target.electrons ? 1.10 : activeState === "listening" ? 1.55 : 1.0;
        const dynamicDistance = linkDistance * detailBoost *
          (0.82 + 0.18 * Math.sin(t * (target.electrons ? 1.15 : 0.7) + i * 0.011));
        if (linkWave > -0.30 && dx * dx + dy * dy + dz * dz < dynamicDistance * dynamicDistance) {
          // On the outward surge, selected particles briefly shed most of
          // their neighbours, retaining a single tether before reconnecting.
          const looseA = vocalMotion && outward > 0.35 && Math.sin(t * 10.5 + phases[i] * 1.7) > 0.42;
          const looseB = vocalMotion && outward > 0.35 && Math.sin(t * 10.5 + phases[j] * 1.7) > 0.42;
          if ((looseA && connectionCounts[i] >= 1) || (looseB && connectionCounts[j] >= 1)) continue;
          links.push([i, j]);
          connectionCounts[i]++;
          connectionCounts[j]++;
          if (links.length >= linkBudget) break;
        }
      }
      if (links.length >= linkBudget) break;
    }
    const used = links.length * 6;
    for (let k = 0; k < links.length; k++) {
      const [a, b] = links[k], ai = a * 3, bi = b * 3, o = k * 6;
      linePositions[o] = positions[ai]; linePositions[o + 1] = positions[ai + 1]; linePositions[o + 2] = positions[ai + 2];
      linePositions[o + 3] = positions[bi]; linePositions[o + 4] = positions[bi + 1]; linePositions[o + 5] = positions[bi + 2];
      const edgeA = Math.hypot(positions[ai], positions[ai + 1], positions[ai + 2]) / 30;
      const edgeB = Math.hypot(positions[bi], positions[bi + 1], positions[bi + 2]) / 30;
      const lineFlicker = activeState === "listening" ? 0.22 + 0.95 * (0.5 + 0.5 * Math.sin(t * 1.7 + a * 0.071 + b * 0.043)) : 1;
      const edgeGlowA = (activeState === "listening" ? 0.62 + Math.max(0, edgeA - 0.52) * 3.0 : 0.9) * lineFlicker;
      const edgeGlowB = (activeState === "listening" ? 0.62 + Math.max(0, edgeB - 0.52) * 3.0 : 0.9) * lineFlicker;
      lineColors[o] = 0.62 * edgeGlowA; lineColors[o + 1] = 0.84 * edgeGlowA; lineColors[o + 2] = edgeGlowA;
      lineColors[o + 3] = 0.62 * edgeGlowB; lineColors[o + 4] = 0.84 * edgeGlowB; lineColors[o + 5] = edgeGlowB;
    }
    lineGeo.setDrawRange(0, links.length * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.computeBoundingSphere();
    if ((target.electrons || isSpeaking) && links.length && travellers.length < electronCount && Math.random() < (target.electrons ? 0.11 : 0.075)) {
      const pair = links[Math.floor(Math.random() * links.length)];
      travellers.push({ a: pair[0], b: pair[1], t: 0, speed: 0.25 + Math.random() * 0.15 });
    }
  }

  function speakingExpansion(t) {
    // Six-and-a-half-second cycle: two seconds at maximum, two seconds
    // contracting, a half-second minimum hold, then a smooth two-second rise.
    const cycle = 6.5;
    const phase = t % cycle;
    if (phase < 2.0) {
      return 0.975 + 0.025 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
    }
    if (phase < 4.0) {
      const x = (phase - 2.0) / 2.0;
      const eased = x * x * (3 - 2 * x);
      return 1 - eased;
    }
    if (phase < 4.5) return 0;
    const x = (phase - 4.5) / 2.0;
    return x * x * (3 - 2 * x);
  }

  function setState(state) {
    if (!PROFILES[state]) return;
    if (activeState === "thinking" && state !== "thinking") shapeRecovery = 1;
    if (state === "thinking") shapeRecovery = 0;
    activeState = state;
    Object.assign(target, PROFILES[state]);
  }

  function setAnalyser(node) {
    analyser = node;
    audioData = node ? new Uint8Array(node.frequencyBinCount) : null;
  }

  function setVoiceActivity(level) {
    voiceActivity = Math.max(0, Math.min(1, Number(level) || 0));
  }

  function animate() {
    if (destroyed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    shapeRecovery = Math.max(0, shapeRecovery - dt / 1.15);
    frame++;
    const ease = 1 - Math.pow(activeState === "listening" || activeState === "speaking" ? 0.88 : 0.96, dt * 60);
    for (const key of ["radius", "speed", "brightness", "size", "links"]) current[key] += (target[key] - current[key]) * ease;
    pointMat.opacity += (current.brightness * 0.85 - pointMat.opacity) * ease;
    pointMat.size += (current.size - pointMat.size) * ease;
    const networkBreath = 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(t * (target.electrons ? 3.4 : 0.75)));
    const networkOpacity = current.links * (activeState === "listening" ? 0.19 : 0.12) * networkBreath;
    lineMat.opacity += (networkOpacity - lineMat.opacity) * ease;
    let bass = 0, mids = 0;
    if (analyser && audioData) {
      analyser.getByteFrequencyData(audioData);
      const bassEnd = Math.min(8, audioData.length);
      const midsEnd = Math.min(24, audioData.length);
      for (let i = 0; i < bassEnd; i++) bass += audioData[i] / 255;
      for (let i = 8; i < midsEnd; i++) mids += audioData[i] / 255;
      bass /= Math.max(1, bassEnd);
      mids /= Math.max(1, midsEnd - 8);
    }
    const isVocal = activeState === "listening" || activeState === "speaking";
    const isListening = activeState === "listening";
    isSpeaking = activeState === "speaking";

    // Use real bass/mid energy whenever Web Audio is available. Android's
    // SpeechRecognition fallback supplies a short voice-activity envelope.
    const measuredEnergy = analyser && audioData
      ? Math.min(1, bass * 1.45 + mids * 0.72)
      : voiceActivity;
    const targetEnergy = isVocal ? measuredEnergy : 0;
    const energyEase = targetEnergy > audioEnvelope ? 0.42 : 0.105;
    audioEnvelope += (targetEnergy - audioEnvelope) * energyEase;
    audioImpact = Math.max(audioImpact * 0.86, Math.max(0, audioEnvelope - previousAudioEnvelope) * 5.5);
    previousAudioEnvelope = audioEnvelope;
    voiceActivity *= 0.965;
    const soundEnergy = isVocal ? audioEnvelope : 0;
    const speakingAmount = isSpeaking ? speakingExpansion(t) : 0;
    const pulse = isVocal || current.links > 0.7 ? mids : 0;
    for (let i = 0; i < count; i++) {
      const j = i * 3, p = phases[i], wave = Math.sin(t * (0.9 + speeds[i]) + p);
      const listeningBreath = 0.5 - 0.5 * Math.cos(t * (Math.PI * 2 / 8.0));
      const vocalCycle = Math.sin(t * 7.4);
      const expandAmount = isSpeaking ? speakingAmount : isListening ? Math.max(0, vocalCycle) : 0;
      // A quicker, deeper inhale/exhale; each particle lags slightly so the
      // outline feels like a living cloud rather than a uniformly scaling ball.
      const expansion = isSpeaking
        ? 1 + 0.035 * speakingAmount * Math.sin(t * Math.PI * 2.0)
        : isListening
          ? 0.78 + 1.12 * listeningBreath + 0.025 * Math.sin(t * 1.8 + p * 0.7)
          : target.electrons
          ? 1 + 0.09 * Math.sin(t * 1.8 + p * 0.2) + 0.045 * Math.sin(t * 3.1 + p)
          : 1 + 0.115 * Math.sin(t * 0.62) + 0.035 * Math.sin(t * 1.35 + p * 0.35);
      const breathe = expansion * (1 + (isVocal ? 0.11 : 0.045) * wave + bass * (isVocal ? 0.25 : 0.12) + pulse * (isVocal ? 0.20 : 0.08));
      // During the compact half-cycle, particles slide tangentially in smooth,
      // overlapping currents before the next outward pulse.
      const radialLen = Math.hypot(positions[j], positions[j + 1], positions[j + 2]) || 1;
      const nx = positions[j] / radialLen, ny = positions[j + 1] / radialLen, nz = positions[j + 2] / radialLen;
      const swirl = isVocal ? (1 - expandAmount) * (isSpeaking ? 5.8 : 4.8) : 0;
      const edgeFactor = Math.max(0, (Math.hypot(base[j], base[j + 1], base[j + 2]) / 25) - 0.58) / 0.42;
      let edgeX = 0, edgeY = 0, edgeZ = 0;
      const edgeWave = Math.sin(p * 3.2 - t * (3.2 + soundEnergy * 10) + bass * 7);
      const edgeFlutter = edgeFactor * soundEnergy * edgeWave;
      const edgeFlash = edgeFactor * (soundEnergy * (1.15 + bass * 1.9) + audioImpact * 1.25);

      if (isVocal) {
        // Audio travels around the outer particle shell as a rolling ripple.
        // Stronger low frequencies push the rim outward; sharp transients
        // create a brief luminous flare that decays smoothly.
        const edgeMotion = edgeFactor * (0.16 + soundEnergy * 1.65 + audioImpact * 0.85);
        edgeX = Math.cos(p + t * (1.3 + soundEnergy * 2.8)) * edgeMotion + edgeFlutter * 0.75;
        edgeY = Math.sin(p * 1.3 + t * (1.5 + soundEnergy * 2.5)) * edgeMotion + edgeFlutter * 0.55;
        edgeZ = Math.cos(p * 0.8 - t * (1.2 + soundEnergy * 2.2)) * edgeMotion;
        const glow = 1 + edgeFlash * (0.75 + 0.25 * Math.sin(t * 8 + p * 2));
        pointColors[j] = 0.72 + glow * 0.22;
        pointColors[j + 1] = 0.88 + glow * 0.18;
        pointColors[j + 2] = 1.0 + glow * 0.24;
      } else {
        pointColors[j] = pointColors[j + 1] = pointColors[j + 2] = 1;
      }
      const blackHole = activeState === "thinking";
      const blackHoleFlow = blackHole ? 1 : 0;
      const drift = current.speed * (0.35 + speeds[i]) * dt * (isVocal ? 20 : target.electrons ? 12 : 8);
      const baseRadius = Math.hypot(base[j], base[j + 1], base[j + 2]) / 25;
      const orbital = blackHoleFlow * (5.0 + 4.2 * baseRadius);
      const thinkingWarp = blackHoleFlow * (0.8 + baseRadius * 1.5) *
        Math.sin(t * 2.7 + p * 2.1 + base[j] * 0.13);
      positions[j] += (dirs[j] + -ny * (swirl * 0.12 + orbital) + edgeX +
        thinkingWarp * Math.cos(t * 1.7 + p * 1.4)) * drift;
      positions[j + 1] += (dirs[j + 1] + (nx - nz) * swirl * 0.12 + edgeY +
        thinkingWarp * (0.75 * Math.sin(t * 3.1 + p * 2.8) + 0.35 * Math.sin(t * 1.2 + base[j] * 0.2))) * drift;
      positions[j + 2] += (dirs[j + 2] + ny * (swirl * 0.12 + orbital) + edgeZ +
        thinkingWarp * Math.sin(t * 2.0 - p * 1.8)) * drift;
      const len = Math.hypot(positions[j], positions[j + 1], positions[j + 2]) || 1;
      const shell = 0.55 + (Math.hypot(base[j], base[j + 1], base[j + 2]) / 25) * 0.45;
      const desired = current.radius * shell * breathe;
      // Preserve the previous maximum speaking size (1.62x the normal
      // orb radius), then scale that same complete orb smoothly down to 25%.
      // There is no singularity state, particle clustering, or core collapse.
      const speakingExpansionScale = isSpeaking
        ? 1.62 * (0.25 + 0.75 * speakingAmount)
        : 1;
      // Keep the inner cloud composed while the outermost particles breathe,
      // ripple and flare in response to the actual sound envelope.
      const edgeDisplacement = edgeFactor * (
        soundEnergy * (1.0 + bass * 4.2) +
        audioImpact * 2.8 +
        edgeFlutter * 1.15
      );
      const particleDesired = desired * speakingExpansionScale + edgeDisplacement;
      const correction = (particleDesired - len) * (isSpeaking ? 0.10 : isListening ? 0.045 : isVocal ? 0.022 : 0.012);
      positions[j] += positions[j] / len * correction;
      positions[j + 1] += positions[j + 1] / len * correction;
      positions[j + 2] += positions[j + 2] / len * correction;
      if (blackHole) {
        // Thinking follows one coordinated shape at a time. Every particle
        // shares the same two-second shape cycle and eases together into the
        // next form, so the whole cloud moves with intent rather than noise.
        const bx = base[j], by = base[j + 1], bz = base[j + 2];
        const shapeCycle = t / 2.0;
        const shapeIndex = Math.floor(shapeCycle);
        const phaseInCycle = shapeCycle - shapeIndex;
        const transition = THREE_NS.MathUtils.smoothstep(phaseInCycle, 0.70, 1.0);
        const shapePoint = (shape, x, y, z) => {
          const r = Math.hypot(x, y, z) || 1;
          const nx = x / r, ny = y / r, nz = z / r;
          const a = Math.atan2(z, x);
          const radialInput = Math.hypot(x, z);
          const elevation = Math.atan2(y, radialInput || 0.001);
          let px = x, py = y, pz = z;

          if (shape === 0) {
            // A broad crescent: one side swells while the opposite side
            // pulls inward, with a pronounced bend through its depth.
            const crescent = 1.0 + 0.48 * Math.cos(a);
            const bend = 5.8 * Math.sin(a);
            px = Math.cos(a) * (11.5 + radialInput * 0.48) * crescent;
            pz = Math.sin(a) * (11.5 + radialInput * 0.48) * crescent;
            py = y * 0.72 + bend * 0.72 + Math.sin(a * 2.0) * 2.2;
          } else if (shape === 1) {
            // A clearly hollow torus / ring with a rolling, uneven surface.
            const major = 10.0 + 1.8 * Math.sin(a * 3.0 + elevation * 2.0);
            const minor = 3.6 + 1.6 * (ny + 1.0) * 0.5;
            const tube = minor * Math.cos(elevation * 2.2);
            px = (major + tube) * Math.cos(a);
            pz = (major + tube) * Math.sin(a);
            py = minor * Math.sin(elevation * 2.2) * 1.55 +
              1.5 * Math.sin(a * 3.0 + elevation);
          } else if (shape === 2) {
            // A sweeping multi-turn spiral ribbon, with a strong vertical
            // rise and fall instead of another tilted oval.
            const spiralAngle = a + ny * 2.9;
            const spiralRadius = 5.0 + (ny + 1.0) * 6.2 +
              1.8 * Math.sin(a * 2.0 + ny * 3.0);
            px = Math.cos(spiralAngle) * spiralRadius;
            pz = Math.sin(spiralAngle) * spiralRadius;
            py = ny * 13.5 + 2.2 * Math.sin(a * 2.0 + ny * 3.0);
          } else {
            // An asymmetric four-lobed / pinched form, with deep valleys
            // between lobes and a slight 3D corkscrew through the centre.
            const lobes = 7.0 + 6.2 * Math.pow(Math.abs(Math.cos(a * 2.0 + ny * 0.8)), 1.35);
            const pinch = 1.0 - 0.30 * Math.pow(Math.abs(Math.sin(a * 2.0 + ny * 0.8)), 1.2);
            const rr = lobes * pinch * (0.82 + 0.18 * (1.0 - Math.abs(ny)));
            px = Math.cos(a + ny * 0.72) * rr;
            pz = Math.sin(a + ny * 0.72) * rr;
            py = ny * 9.5 + 3.8 * Math.sin(a * 2.0 + ny * 1.4);
          }
          return [px, py, pz];
        };
        const first = shapePoint(shapeIndex % 4, bx, by, bz);
        const second = shapePoint((shapeIndex + 1) % 4, bx, by, bz);
        const thinkingX = first[0] + (second[0] - first[0]) * transition;
        const thinkingY = first[1] + (second[1] - first[1]) * transition;
        const thinkingZ = first[2] + (second[2] - first[2]) * transition;
        const orientation = t * 0.10;
        const co = Math.cos(orientation), si = Math.sin(orientation);
        const rotatedX = thinkingX * co - thinkingZ * si;
        const rotatedZ = thinkingX * si + thinkingZ * co;
        const morph = 1 - Math.exp(-dt * 3.8);
        positions[j] += (rotatedX - positions[j]) * morph;
        positions[j + 1] += (thinkingY - positions[j + 1]) * morph;
        positions[j + 2] += (rotatedZ - positions[j + 2]) * morph;
      } else {
        // Every non-thinking frame gently reasserts the normal 3D layout.
        // This is continuous (not a one-shot timer), so a second or later
        // Thinking visit cannot leave a stale warped shape behind.
        const baseLen = Math.hypot(base[j], base[j + 1], base[j + 2]) || 1;
        const normalX = base[j] / baseLen * particleDesired;
        const normalY = base[j + 1] / baseLen * particleDesired;
        const normalZ = base[j + 2] / baseLen * particleDesired;
        const restore = (1 - Math.exp(-dt * 8));
        positions[j] += (normalX - positions[j]) * restore;
        positions[j + 1] += (normalY - positions[j + 1]) * restore;
        positions[j + 2] += (normalZ - positions[j + 2]) * restore;


      }
    }
    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.color.needsUpdate = true;
    points.rotation.y += dt * (isListening ? 0.19 : current.speed * 0.12);
    points.rotation.x = isListening ? Math.sin(t * 0.10) * 0.13 : Math.sin(t * 0.13) * 0.10;
    lines.rotation.copy(points.rotation);
    electrons.rotation.copy(points.rotation);

    if (frame % (isSpeaking || target.electrons ? 1 : 3) === 0) rebuildLinks(t);
    for (let k = travellers.length - 1; k >= 0; k--) {
      const e = travellers[k];
      e.t += dt * e.speed;
      if (e.t >= 1 || (!target.electrons && !isSpeaking)) { travellers.splice(k, 1); continue; }
      const a = e.a * 3, b = e.b * 3, o = k * 3;
      electronPositions[o] = positions[a] + (positions[b] - positions[a]) * e.t;
      electronPositions[o + 1] = positions[a + 1] + (positions[b + 1] - positions[a + 1]) * e.t;
      electronPositions[o + 2] = positions[a + 2] + (positions[b + 2] - positions[a + 2]) * e.t;
    }
    electronGeo.attributes.position.needsUpdate = true;
    electronGeo.setDrawRange(0, travellers.length);
    renderer.render(scene, camera);
    frame = frame > 1000000 ? 0 : frame;
    requestAnimationFrame(animate);
  }
  const initialColour = new THREE_NS.Color(0x4ca8e8);
  pointMat.color.copy(initialColour);
  animate();

  return {
    setState,
    setAnalyser,
    setVoiceActivity,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resize);
      pointGeo.dispose(); pointMat.dispose(); lineGeo.dispose(); lineMat.dispose(); electronGeo.dispose(); electronMat.dispose(); renderer.dispose();
      travellers.length = 0; links.length = 0;
    }
  };
}
