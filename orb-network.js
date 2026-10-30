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
    const du = Math.random() * 2 - 1, da = Math.random() * Math.PI * 2, ds = Math.sqrt(1 - du * du);
    dirs[j] = Math.cos(da) * ds; dirs[j + 1] = du; dirs[j + 2] = Math.sin(da) * ds;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.25 + Math.random() * 0.75;
  }
  const pointGeo = new THREE_NS.BufferGeometry();
  pointGeo.setAttribute("position", new THREE_NS.BufferAttribute(positions, 3));
  const pointMat = new THREE_NS.PointsMaterial({ color: 0x76c8ff, size: 0.42, transparent: true, opacity: 0.72, blending: THREE_NS.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const points = new THREE_NS.Points(pointGeo, pointMat);
  scene.add(points);

  const linePositions = new Float32Array(maxLines * 6);
  const lineGeo = new THREE_NS.BufferGeometry();
  lineGeo.setAttribute("position", new THREE_NS.BufferAttribute(linePositions, 3));
  const lineMat = new THREE_NS.LineBasicMaterial({ color: 0x55baff, transparent: true, opacity: 0.10, blending: THREE_NS.AdditiveBlending, depthWrite: false });
  const lines = new THREE_NS.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const electronCount = 10;
  const electronPositions = new Float32Array(electronCount * 3);
  const electronGeo = new THREE_NS.BufferGeometry();
  electronGeo.setAttribute("position", new THREE_NS.BufferAttribute(electronPositions, 3));
  const electronMat = new THREE_NS.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE_NS.AdditiveBlending,
    vertexShader: `attribute float size; void main(){ vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_PointSize = 5.0 * (80.0 / max(1.0,-mvPosition.z)); gl_Position = projectionMatrix * mvPosition; }`,
    fragmentShader: `void main(){ vec2 p = gl_PointCoord - vec2(0.5); float d = length(p); float a = 1.0 - smoothstep(0.12,0.5,d); if(a < 0.02) discard; gl_FragColor = vec4(0.88,0.97,1.0,a); }`
  });
  const electrons = new THREE_NS.Points(electronGeo, electronMat);
  scene.add(electrons);

  const links = [];
  const travellers = [];
  const clock = new THREE_NS.Clock();
  const target = { ...PROFILES.idle };
  let current = { ...target };
  let analyser = null;
  let audioData = null;
  let frame = 0;
  let destroyed = false;
  let resizeObserver = null;

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
        const detailBoost = target.electrons ? 1.10 : 1.0;\n        const dynamicDistance = linkDistance * detailBoost * (0.82 + 0.18 * Math.sin(t * (target.electrons ? 1.15 : 0.7) + i * 0.011));
        if (linkWave > -0.30 && dx * dx + dy * dy + dz * dz < dynamicDistance * dynamicDistance) {
          links.push([i, j]);
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
    }
    lineGeo.setDrawRange(0, links.length * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.computeBoundingSphere();
    if ((target.electrons || isSpeaking) && links.length && travellers.length < electronCount && Math.random() < (target.electrons ? 0.11 : 0.075)) {
      const pair = links[Math.floor(Math.random() * links.length)];
      travellers.push({ a: pair[0], b: pair[1], t: 0, speed: 0.25 + Math.random() * 0.15 });
    }
  }

  function setState(state) {
    if (!PROFILES[state]) return;
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
    frame++;
    const ease = 1 - Math.pow(0.98, dt * 60);
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
    const isSpeaking = target.speed === PROFILES.speaking.speed && target.radius === PROFILES.speaking.radius;
    const pulse = isSpeaking || current.links > 0.7 ? mids : 0;
    for (let i = 0; i < count; i++) {
      const j = i * 3, p = phases[i], wave = Math.sin(t * (0.55 + speeds[i]) + p);
      const expansion = isSpeaking
        ? 1 + 0.19 * Math.sin(t * 5.0) + 0.075 * Math.sin(t * 8.2 + p * 0.55)
        : target.electrons
          ? 1 + 0.09 * Math.sin(t * 1.8 + p * 0.2) + 0.045 * Math.sin(t * 3.1 + p)
          : 1 + 0.115 * Math.sin(t * 0.62) + 0.035 * Math.sin(t * 1.35 + p * 0.35);
      const breathe = expansion * (1 + (isSpeaking ? 0.085 : 0.045) * wave + bass * (isSpeaking ? 0.22 : 0.12) + pulse * (isSpeaking ? 0.20 : 0.08));
      const drift = current.speed * (0.35 + speeds[i]) * dt * (isSpeaking ? 17 : target.electrons ? 12 : 8);
      positions[j] += dirs[j] * drift;
      positions[j + 1] += dirs[j + 1] * drift;
      positions[j + 2] += dirs[j + 2] * drift;
      const len = Math.hypot(positions[j], positions[j + 1], positions[j + 2]) || 1;
      const desired = current.radius * (0.55 + (Math.hypot(base[j], base[j + 1], base[j + 2]) / 25) * 0.45) * breathe;
      const correction = (desired - len) * 0.012;
      positions[j] += positions[j] / len * correction;
      positions[j + 1] += positions[j + 1] / len * correction;
      positions[j + 2] += positions[j + 2] / len * correction;
    }
    pointGeo.attributes.position.needsUpdate = true;
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
