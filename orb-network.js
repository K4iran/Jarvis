import * as THREE from "three";

const PROFILES = {
  idle:       { radius: 28, speed: 0.20, brightness: 0.50, size: 0.35, links: 0.15, electrons: false },
  listening:  { radius: 22, speed: 0.30, brightness: 0.65, size: 0.40, links: 0.40, electrons: false },
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
  scene.background = new THREE_NS.Color(options.backgroundColor ?? 0x050508);
  const camera = new THREE_NS.PerspectiveCamera(50, 1, 0.1, 400);
  camera.position.z = 90;
  const renderer = new THREE_NS.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2));
  renderer.setClearColor(0x050508, 1);

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
    const sampleStep = Math.max(1, Math.floor(count / 600));
    for (let i = 0; i < count; i += sampleStep) {
      const ai = i * 3;
      for (let j = i + sampleStep; j < count; j += sampleStep) {
        const bj = j * 3;
        const dx = positions[ai] - positions[bj], dy = positions[ai + 1] - positions[bj + 1], dz = positions[ai + 2] - positions[bj + 2];
        // Connections breathe in and out: some links temporarily fade away,
        // then reconnect as the network flows through a slow travelling wave.
        const phase = t * (target.electrons ? 2.1 : 1.25) + i * 0.037 + j * 0.019;
        const linkWave = Math.sin(phase);
        const detailBoost = target.electrons ? 1.10 : 1.0;
        const dynamicDistance = linkDistance * detailBoost * (0.82 + 0.18 * Math.sin(t * (target.electrons ? 1.15 : 0.7) + i * 0.011));
        if (linkWave > -0.30 && dx * dx + dy * dy + dz * dz < dynamicDistance * dynamicDistance) {
          // On the outward surge, selected particles briefly shed most of
          // their neighbours, retaining a single tether before reconnecting.
          const looseA = vocalMotion && outward > 0.35 && Math.sin(t * 10.5 + phases[i] * 1.7) > 0.42;
          const looseB = vocalMotion && outward > 0.35 && Math.sin(t * 10.5 + phases[j] * 1.7) > 0.42;
          if ((looseA && connectionCounts[i] >= 1) || (looseB && connectionCounts[j] >= 1)) continue;
          links.push([i, j]);
          connectionCounts[i]++;
          connectionCounts[j]++;
          if (links.length >= maxLines) break;
        }
      }
      if (links.length >= maxLines) break;
    }
    const used = links.length * 6;
    for (let k = 0; k < links.length; k++) {
      const [a, b] = links[k], ai = a * 3, bi = b * 3, o = k * 6;
      linePositions[o] = positions[ai]; linePositions[o + 1] = positions[ai + 1]; linePositions[o + 2] = positions[ai + 2];
      linePositions[o + 3] = positions[bi]; linePositions[o + 4] = positions[bi + 1]; linePositions[o + 5] = positions[bi + 2];
      const edgeA = Math.hypot(positions[ai], positions[ai + 1], positions[ai + 2]) / 30;
      const edgeB = Math.hypot(positions[bi], positions[bi + 1], positions[bi + 2]) / 30;
      const edgeGlowA = activeState === "listening" ? 0.72 + Math.max(0, edgeA - 0.62) * 2.4 : 0.9;
      const edgeGlowB = activeState === "listening" ? 0.72 + Math.max(0, edgeB - 0.62) * 2.4 : 0.9;
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
    // Full compact / full expanded cycle with short endpoint holds.
    const phase = (t % 3.0) / 3.0;
    const hold = 0.12;
    const travel = 0.38;
    if (phase < hold) return 0;
    if (phase < hold + travel) {
      const x = (phase - hold) / travel;
      return x * x * (3 - 2 * x);
    }
    if (phase < hold * 2 + travel) return 1;
    const x = (phase - hold * 2 - travel) / travel;
    const eased = x * x * (3 - 2 * x);
    return 1 - eased;
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
    lineMat.opacity += (current.links * 0.12 * networkBreath - lineMat.opacity) * ease;
    let bass = 0, mids = 0;
    if (analyser && audioData) {
      analyser.getByteFrequencyData(audioData);
      for (let i = 0; i < Math.min(8, audioData.length); i++) bass += audioData[i] / 255;
      for (let i = 8; i < Math.min(24, audioData.length); i++) mids += audioData[i] / 255;
      bass /= 8; mids /= 16;
    }
    const isVocal = activeState === "listening" || activeState === "speaking";
    const isListening = activeState === "listening";
    isSpeaking = activeState === "speaking";
    const speakingAmount = isSpeaking ? speakingExpansion(t) : 0;
    const pulse = isVocal || current.links > 0.7 ? mids : 0;
    for (let i = 0; i < count; i++) {
      const j = i * 3, p = phases[i], wave = Math.sin(t * (0.9 + speeds[i]) + p);
      const vocalCycle = Math.sin(t * 7.4);
      const expandAmount = isSpeaking ? speakingAmount : isListening ? Math.max(0, vocalCycle) : 0;
      // A quicker, deeper inhale/exhale; each particle lags slightly so the
      // outline feels like a living cloud rather than a uniformly scaling ball.
      const expansion = isSpeaking
        ? 0.12 + 1.50 * speakingAmount
        : isListening
          ? 0.79 + 0.43 * (0.5 + 0.5 * vocalCycle) + 0.055 * Math.sin(t * 12.0 + p * 0.7)
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
      if (isListening) {
        // Add temporary tangential movement without rewriting the particles'
        // underlying directions, so the listening state cannot deform later states.
        const edgeMotion = edgeFactor * (0.9 + 0.55 * Math.sin(t * 5.2 + p * 1.8));
        edgeX = Math.cos(p + t * 1.8) * edgeMotion;
        edgeY = Math.sin(p * 1.3 + t * 2.1) * edgeMotion;
        edgeZ = Math.cos(p * 0.8 - t * 1.6) * edgeMotion;
        const glow = 1 + edgeFactor * (0.65 + 0.35 * Math.sin(t * 6 + p * 2));
        pointColors[j] = glow; pointColors[j + 1] = glow; pointColors[j + 2] = glow;
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
      const isOuterSingularityParticle = Math.sin(p * 2.37 + i * 0.071) > 0.68;
      const singularityRadius = isOuterSingularityParticle
        ? 2.0 + baseRadius * 2.5
        : 0.16 + baseRadius * 0.58;
      const singularityAmount = isSpeaking ? 1 - speakingAmount : 0;
      const speakingDesired = desired + (singularityRadius - desired) * singularityAmount;
      const particleDesired = isSpeaking ? speakingDesired : desired;
      const correction = (particleDesired - len) * (isSpeaking ? 0.10 : isVocal ? 0.022 : 0.012);
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
          let radial = 1, vertical = 1, bend = 0, twist = 0;
          if (shape === 0) {
            radial = 0.91 + 0.075 * Math.cos(a * 3 + ny * 2.2);
            vertical = 0.82;
            bend = Math.sin(a * 2 + ny * 2.0) * 2.0;
            twist = 0.12;
          } else if (shape === 1) {
            radial = 0.86 + 0.09 * Math.cos(a * 2 - ny * 2.8);
            vertical = 0.94;
            bend = Math.sin(a + ny * 3.0) * 2.6;
            twist = -0.16;
          } else if (shape === 2) {
            radial = 0.94 + 0.07 * Math.sin(a * 3 + ny * 2.5);
            vertical = 0.72 + 0.08 * Math.cos(a * 2);
            bend = Math.sin(a * 2.5 - ny * 2.0) * 2.2;
            twist = 0.22;
          } else {
            radial = 0.88 + 0.08 * Math.cos(a * 2 + ny * 3.2);
            vertical = 0.88;
            bend = Math.sin(a * 3 - ny * 1.8) * 1.8;
            twist = -0.08;
          }
          const angle = twist + Math.sin(ny * 2.4) * 0.08;
          const ca = Math.cos(angle), sa = Math.sin(angle);
          const px = x * radial, pz = z * radial;
          return [
            (px * ca - pz * sa) * 0.78 + bend,
            y * vertical + Math.sin(a * 2 + ny) * 1.5,
            (px * sa + pz * ca) * 0.78 + Math.cos(a * 2 - ny) * 1.2
          ];
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

        if (isSpeaking && singularityAmount > 0.02) {
          // The singularity is a tiny, bright swarm rather than a scaled-down
          // miniature orb. Most particles crowd the white core; a minority
          // orbit just outside it, constantly exchanging places.
          const spin = (isOuterSingularityParticle ? 1.0 : 2.8) * singularityAmount;
          const sx = positions[j], sz = positions[j + 2];
          positions[j] += -sz * spin * dt * 2.2;
          positions[j + 2] += sx * spin * dt * 2.2;
          positions[j + 1] += Math.sin(t * (2.8 + speeds[i] * 2.2) + p * 1.7) *
            singularityAmount * (isOuterSingularityParticle ? 0.75 : 0.28) * dt * 8;
          const coreGlow = 1 + singularityAmount * (isOuterSingularityParticle ? 0.35 : 1.15);
          pointColors[j] = coreGlow;
          pointColors[j + 1] = coreGlow;
          pointColors[j + 2] = coreGlow;
        }
      }
    }
    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.color.needsUpdate = true;
    points.rotation.y += dt * current.speed * 0.12;
    points.rotation.x = Math.sin(t * 0.13) * 0.10;
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
