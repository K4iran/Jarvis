import * as THREE from "three";

/**
 * JARVIS particle-network orb — original implementation.
 *
 * The visual system is built around a drifting 3D particle cloud, proximity
 * connections, and short-lived light-points that travel along those links.
 * Behaviour changes smoothly between idle/listening/thinking/speaking states.
 *
 * This module intentionally exposes the small controller API used by many
 * canvas-based orb integrations: setState(), setAnalyser(), and destroy().
 */

export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "compacting";

export interface Orb {
  setState(state: OrbState): void;
  setAnalyser(analyser: AnalyserNode | null): void;
  destroy(): void;
}

/** Alias retained for integrations that prefer an explicit controller name. */
export type OrbController = Orb;

export interface OrbOptions {
  /** Number of 3D particles. Default: 2000. */
  particleCount?: number;
  /** Maximum number of line segments in the proximity network. Default: 8000. */
  maxLines?: number;
  /** Maximum distance at which two sampled particles are connected. Default: 8. */
  lineDistance?: number;
  /** Background colour. Default: 0x050508. */
  backgroundColor?: THREE.ColorRepresentation;
  /** Cap for devicePixelRatio to avoid unnecessarily expensive rendering. Default: 2. */
  maxPixelRatio?: number;
}

interface Connection {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}

interface TravellingPoint {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  progress: number;
  /** Progress per second. */
  speed: number;
}

const STATE_PROFILES: Record<OrbState, {
  radius: number;
  speed: number;
  brightness: number;
  pointSize: number;
  linkAmount: number;
  electronRate: number;
}> = {
  idle:       { radius: 28, speed: 0.20, brightness: 0.50, pointSize: 0.35, linkAmount: 0.15, electronRate: 0 },
  listening:  { radius: 22, speed: 0.30, brightness: 0.65, pointSize: 0.40, linkAmount: 0.40, electronRate: 0 },
  thinking:   { radius: 16, speed: 0.50, brightness: 0.70, pointSize: 0.30, linkAmount: 1.00, electronRate: 0.015 },
  speaking:   { radius: 18, speed: 0.20, brightness: 0.70, pointSize: 0.40, linkAmount: 0.80, electronRate: 0 },
  compacting: { radius: 12, speed: 0.08, brightness: 0.28, pointSize: 0.28, linkAmount: 0.00, electronRate: 0 },
};

const STATE_COLOURS: Record<OrbState, THREE.Color> = {
  idle: new THREE.Color(0x4ca8e8),
  listening: new THREE.Color(0x4ca8e8),
  thinking: new THREE.Color(0x6ec4ff),
  speaking: new THREE.Color(0x5ab8f0),
  compacting: new THREE.Color(0x3a5f8a),
};

function smoothingFactor(perFrameFactor: number, frameScale: number): number {
  // Converts a 60-fps interpolation factor into a frame-rate-independent one.
  return 1 - Math.pow(1 - perFrameFactor, frameScale);
}

export function createOrb(
  canvas: HTMLCanvasElement,
  options: OrbOptions = {},
): Orb {
  if (typeof window === "undefined") {
    throw new Error("createOrb() must be called in a browser environment.");
  }

  const particleCount = Math.max(300, Math.floor(options.particleCount ?? 2000));
  const maxLines = Math.max(100, Math.floor(options.maxLines ?? 8000));
  const baseLineDistance = Math.max(1, options.lineDistance ?? 8);
  const maxPixelRatio = Math.max(1, options.maxPixelRatio ?? 2);

  let destroyed = false;
  let animationFrame = 0;
  let state: OrbState = "idle";
  let lastState: OrbState = "idle";

  // ── Renderer, scene, camera ──────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setClearColor(options.backgroundColor ?? 0x050508, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
  camera.position.set(0, 0, 80);

  // Keeping all three visual layers in one group guarantees that the network
  // and travelling points rotate and move in depth with the particle cloud.
  const cloud = new THREE.Group();
  scene.add(cloud);

  const resize = (): void => {
    const width = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(resize)
    : null;
  resizeObserver?.observe(canvas);

  // ── Particle cloud ───────────────────────────────────────────────────────
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // The square-root radial distribution gives the cloud a soft, full body
    // rather than placing every point on a perfectly even spherical shell.
    const radius = Math.pow(Math.random(), 0.5) * 25;
    const sinPhi = Math.sin(phi);
    const i3 = i * 3;

    positions[i3] = radius * sinPhi * Math.cos(theta);
    positions[i3 + 1] = radius * sinPhi * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    phases[i] = Math.random() * 1000;
  }

  const particlePositionAttribute = new THREE.BufferAttribute(positions, 3);
  particlePositionAttribute.setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute("position", particlePositionAttribute);

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x4ca8e8,
    size: 0.4,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  cloud.add(particles);

  // ── Proximity connection network ────────────────────────────────────────
  const linePositions = new Float32Array(maxLines * 6);
  const lineGeometry = new THREE.BufferGeometry();
  const linePositionAttribute = new THREE.BufferAttribute(linePositions, 3);
  linePositionAttribute.setUsage(THREE.DynamicDrawUsage);
  lineGeometry.setAttribute("position", linePositionAttribute);
  lineGeometry.setDrawRange(0, 0);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x4ca8e8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  cloud.add(connectionLines);

  // The source effect keeps a large line buffer but only needs a modest pool
  // of recent links as launch paths for the moving light-points.
  const electronGeometry = new THREE.BufferGeometry();
  const electronCapacity = 3;
  const electronPositions = new Float32Array(electronCapacity * 3);
  const electronPositionAttribute = new THREE.BufferAttribute(electronPositions, 3);
  electronPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  electronGeometry.setAttribute("position", electronPositionAttribute);
  electronGeometry.setDrawRange(0, 0);

  const electronMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const electrons = new THREE.Points(electronGeometry, electronMaterial);
  cloud.add(electrons);

  let activeConnections: Connection[] = [];
  const travellingPoints: TravellingPoint[] = [];
  let lastElectronSpawn = Number.NEGATIVE_INFINITY;

  // ── Smoothed state values ────────────────────────────────────────────────
  let currentRadius = 25;
  let currentSpeed = 0.3;
  let currentBrightness = 0.6;
  let currentPointSize = 0.4;
  let currentLinkAmount = 0;
  let currentElectronRate = 0;

  // A short rotational kick on state changes makes transitions feel alive.
  let spinX = 0;
  let spinY = 0;
  let spinZ = 0;
  let transitionEnergy = 0;

  // Slow spring-like movement along the camera depth axis.
  let cloudZ = 0;
  let cloudZVelocity = 0;

  // ── Audio analyser ───────────────────────────────────────────────────────
  let analyser: AnalyserNode | null = null;
  let frequencyData = new Uint8Array(0);
  let bass = 0;
  let mid = 0;

  const readAudioBands = (): void => {
    bass = 0;
    mid = 0;
    if (!analyser || frequencyData.length === 0) return;

    analyser.getByteFrequencyData(frequencyData);

    // Keep the same low-bin split as the reference: bins 0–7 for bass and
    // bins 8–23 for the middle band. Bounds checks support small FFT sizes.
    const bassEnd = Math.min(8, frequencyData.length);
    const midStart = Math.min(8, frequencyData.length);
    const midEnd = Math.min(24, frequencyData.length);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += frequencyData[i];
    if (bassEnd > 0) bass = bassSum / (bassEnd * 255);

    let midSum = 0;
    for (let i = midStart; i < midEnd; i++) midSum += frequencyData[i];
    if (midEnd > midStart) mid = midSum / ((midEnd - midStart) * 255);
  };

  const clock = new THREE.Clock();

  // ── Animation loop ───────────────────────────────────────────────────────
  const animate = (): void => {
    if (destroyed) return;

    // Clamp long tab-suspension frames so particles do not jump or explode.
    const deltaSeconds = Math.min(clock.getDelta(), 0.05);
    const frameScale = deltaSeconds * 60;
    const elapsed = clock.elapsedTime;
    const blend = smoothingFactor(0.02, frameScale);

    const profile = STATE_PROFILES[state];
    currentRadius += (profile.radius - currentRadius) * blend;
    currentSpeed += (profile.speed - currentSpeed) * blend;
    currentBrightness += (profile.brightness - currentBrightness) * blend;
    currentPointSize += (profile.pointSize - currentPointSize) * blend;
    currentLinkAmount += (profile.linkAmount - currentLinkAmount) * blend;
    currentElectronRate += (profile.electronRate - currentElectronRate) * blend;

    if (state !== lastState) {
      transitionEnergy = 1;
      lastState = state;
    }
    transitionEnergy *= Math.pow(0.985, frameScale);
    if (transitionEnergy > 0.05) {
      spinX += transitionEnergy * 0.012 * Math.sin(elapsed * 1.7) * frameScale;
      spinY += transitionEnergy * 0.015 * frameScale;
      spinZ += transitionEnergy * 0.008 * Math.cos(elapsed * 1.3) * frameScale;
    }

    readAudioBands();

    // The cloud subtly moves towards and away from the camera. Thinking has a
    // wider, more exploratory movement; speaking reacts to the bass band.
    let depthTarget = Math.sin(elapsed * 0.12) * 8;
    if (state === "thinking") {
      depthTarget = Math.sin(elapsed * 0.3) * 15 + Math.sin(elapsed * 0.9) * 6;
    } else if (state === "speaking") {
      depthTarget = Math.sin(elapsed * 0.15) * 6 - bass * 10;
    } else if (state === "compacting") {
      depthTarget = -20 + Math.sin(elapsed * 0.08) * 3;
    }

    cloudZVelocity += (depthTarget - cloudZ) * 0.008 * frameScale;
    cloudZVelocity *= Math.pow(0.94, frameScale);
    cloudZ += cloudZVelocity * frameScale;

    cloud.rotation.set(spinX, spinY, spinZ);
    cloud.position.z = cloudZ;

    // ── Move particles ────────────────────────────────────────────────────
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const phase = phases[i];

      // Three overlapping low-frequency drift fields stop the cloud looking
      // rigid or like a rotating wireframe. The slight coordinate coupling
      // makes the movement feel fluid without introducing large branches.
      velocities[i3] += Math.sin(elapsed * 0.05 + phase) * 0.001 * currentSpeed * frameScale;
      velocities[i3 + 1] += Math.cos(elapsed * 0.06 + phase * 1.3) * 0.001 * currentSpeed * frameScale;
      velocities[i3 + 2] += Math.sin(elapsed * 0.055 + phase * 0.7) * 0.001 * currentSpeed * frameScale;

      velocities[i3] += Math.sin(elapsed * 0.02 + phase * 2.1 + y * 0.1) * 0.0008 * currentSpeed * frameScale;
      velocities[i3 + 1] += Math.cos(elapsed * 0.025 + phase * 1.7 + z * 0.1) * 0.0008 * currentSpeed * frameScale;
      velocities[i3 + 2] += Math.sin(elapsed * 0.022 + phase * 0.9 + x * 0.1) * 0.0008 * currentSpeed * frameScale;

      const distance = Math.sqrt(x * x + y * y + z * z) || 0.01;
      const invDistance = 1 / distance;
      const pull = Math.max(0, distance - currentRadius) * 0.002 + 0.0003;

      // A gentle inward force keeps the cloud gathered around its state radius.
      velocities[i3] -= x * invDistance * pull * frameScale;
      velocities[i3 + 1] -= y * invDistance * pull * frameScale;
      velocities[i3 + 2] -= z * invDistance * pull * frameScale;

      // Bass pushes the cloud outwards. Mid frequencies add a softer speaking
      // pulse, so the orb responds to speech rather than just flashing.
      if (bass > 0.05) {
        const bassPush = bass * 0.02 * frameScale;
        velocities[i3] += x * invDistance * bassPush;
        velocities[i3 + 1] += y * invDistance * bassPush;
        velocities[i3 + 2] += z * invDistance * bassPush;
      }

      if (state === "speaking" && mid > 0.1) {
        const pulse = Math.sin(elapsed * 8 + phase);
        const midPush = mid * 0.012 * pulse * frameScale;
        velocities[i3] += x * invDistance * midPush;
        velocities[i3 + 1] += y * invDistance * midPush;
      }

      const damping = Math.pow(0.992, frameScale);
      velocities[i3] *= damping;
      velocities[i3 + 1] *= damping;
      velocities[i3 + 2] *= damping;

      positions[i3] += velocities[i3] * frameScale;
      positions[i3 + 1] += velocities[i3 + 1] * frameScale;
      positions[i3 + 2] += velocities[i3 + 2] * frameScale;
    }
    particlePositionAttribute.needsUpdate = true;

    // ── Rebuild proximity links ───────────────────────────────────────────
    if (currentLinkAmount > 0.01) {
      let lineCount = 0;
      const nextConnections: Connection[] = [];
      const maxDistance = baseLineDistance * (1 + bass * 0.5);
      const maxDistanceSquared = maxDistance * maxDistance;
      // Sampling to about 600–700 points keeps the pair test affordable while
      // retaining the dense, irregular connection pattern.
      const sampleStep = Math.max(1, Math.floor(particleCount / 600));

      for (let i = 0; i < particleCount && lineCount < maxLines; i += sampleStep) {
        const i3 = i * 3;
        const ax = positions[i3];
        const ay = positions[i3 + 1];
        const az = positions[i3 + 2];

        for (let j = i + sampleStep; j < particleCount && lineCount < maxLines; j += sampleStep) {
          const j3 = j * 3;
          const dx = positions[j3] - ax;
          const dy = positions[j3 + 1] - ay;
          const dz = positions[j3 + 2] - az;

          if (dx * dx + dy * dy + dz * dz < maxDistanceSquared) {
            const offset = lineCount * 6;
            const bx = positions[j3];
            const by = positions[j3 + 1];
            const bz = positions[j3 + 2];

            linePositions[offset] = ax;
            linePositions[offset + 1] = ay;
            linePositions[offset + 2] = az;
            linePositions[offset + 3] = bx;
            linePositions[offset + 4] = by;
            linePositions[offset + 5] = bz;
            lineCount++;

            if (nextConnections.length < 500) {
              nextConnections.push({ ax, ay, az, bx, by, bz });
            }
          }
        }
      }

      lineGeometry.setDrawRange(0, lineCount * 2);
      linePositionAttribute.needsUpdate = true;
      lineMaterial.opacity = currentLinkAmount * 0.12;
      activeConnections = nextConnections;
    } else {
      lineGeometry.setDrawRange(0, 0);
      lineMaterial.opacity = 0;
      activeConnections = [];
    }

    // ── Spawn and animate travelling energy points ────────────────────────
    // Thinking is the only state that launches new points. A maximum of three
    // can be alive simultaneously; at 60 fps each takes roughly 2.8–5.6 seconds.
    if (activeConnections.length > 0 && currentElectronRate > 0.005) {
      if (travellingPoints.length < electronCapacity && elapsed - lastElectronSpawn > 1) {
        const connection = activeConnections[Math.floor(Math.random() * activeConnections.length)];
        travellingPoints.push({
          ax: connection.ax,
          ay: connection.ay,
          az: connection.az,
          bx: connection.bx,
          by: connection.by,
          bz: connection.bz,
          progress: 0,
          // Equivalent to 0.003–0.006 progress per frame at 60 fps.
          speed: 0.18 + Math.random() * 0.18,
        });
        lastElectronSpawn = elapsed;
      }
    }

    let aliveCount = 0;
    for (let i = travellingPoints.length - 1; i >= 0; i--) {
      const point = travellingPoints[i];
      point.progress += point.speed * deltaSeconds;
      if (point.progress >= 1) {
        travellingPoints.splice(i, 1);
        continue;
      }

      const offset = aliveCount * 3;
      electronPositions[offset] = point.ax + (point.bx - point.ax) * point.progress;
      electronPositions[offset + 1] = point.ay + (point.by - point.ay) * point.progress;
      electronPositions[offset + 2] = point.az + (point.bz - point.az) * point.progress;
      aliveCount++;
    }

    electronGeometry.setDrawRange(0, aliveCount);
    electronPositionAttribute.needsUpdate = true;

    // ── State-dependent light and colour ──────────────────────────────────
    particleMaterial.opacity = currentBrightness + bass * 0.08;
    particleMaterial.size = currentPointSize + bass * 0.05;

    const colourBlend = smoothingFactor(0.015, frameScale);
    particleMaterial.color.lerp(STATE_COLOURS[state], colourBlend);
    lineMaterial.color.lerp(STATE_COLOURS[state], colourBlend);

    // Camera drift is intentionally restrained: it adds depth without making
    // the orb feel as though it is orbiting around the viewer.
    camera.position.x = Math.sin(elapsed * 0.02) * 5;
    camera.position.y = Math.cos(elapsed * 0.03) * 3;
    camera.lookAt(0, 0, cloudZ * 0.2);

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  };

  animationFrame = window.requestAnimationFrame(animate);

  return {
    setState(nextState: OrbState): void {
      state = nextState;
    },

    setAnalyser(nextAnalyser: AnalyserNode | null): void {
      analyser = nextAnalyser;
      frequencyData = nextAnalyser
        ? new Uint8Array(nextAnalyser.frequencyBinCount)
        : new Uint8Array(0);
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();

      scene.remove(cloud);
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      electronGeometry.dispose();
      electronMaterial.dispose();
      renderer.dispose();
    },
  };
}
