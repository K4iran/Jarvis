import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(() => {
  'use strict';
  let active = null;

  const makeShape = (points) => {
    const shape = new THREE.Shape();
    points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
    shape.closePath();
    return shape;
  };

  function plate(group, points, material, z, depth = 0.075, bevel = 0.045) {
    const geometry = new THREE.ExtrudeGeometry(makeShape(points), {
      depth, bevelEnabled: true, bevelSegments: 3,
      steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 10
    });
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function line(group, points, material, radius = 0.012) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x,y,z]) => new THREE.Vector3(x,y,z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 7, false), material);
    group.add(mesh);
    return mesh;
  }

  function buildHelmet(scene) {
    const root = new THREE.Group();
    root.rotation.set(-0.035, 0.24, -0.015);
    scene.add(root);

    const red = new THREE.MeshPhysicalMaterial({color:0x8f101a, metalness:0.88, roughness:0.24, clearcoat:1, clearcoatRoughness:0.16});
    const brightRed = new THREE.MeshPhysicalMaterial({color:0xc51d29, metalness:0.82, roughness:0.2, clearcoat:1, clearcoatRoughness:0.12});
    const dark = new THREE.MeshPhysicalMaterial({color:0x10151b, metalness:0.82, roughness:0.3});
    const gun = new THREE.MeshPhysicalMaterial({color:0x343c46, metalness:0.9, roughness:0.23, clearcoat:0.8});
    const silver = new THREE.MeshPhysicalMaterial({color:0x929ba6, metalness:0.94, roughness:0.2});
    const black = new THREE.MeshStandardMaterial({color:0x030609, metalness:0.65, roughness:0.28});
    const eyeMat = new THREE.MeshStandardMaterial({color:0xff2635, emissive:0xff0717, emissiveIntensity:0, metalness:0.15, roughness:0.16});
    const eyeCore = new THREE.MeshBasicMaterial({color:0xffb8bd, transparent:true, opacity:0});
    const seam = new THREE.MeshStandardMaterial({color:0x260b10, metalness:0.72, roughness:0.34});

    // Main sculpted cranium and rear shell.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1,64,48), red);
    dome.scale.set(1.38,1.72,0.91);
    dome.position.set(0,0.03,-0.02);
    dome.castShadow = true; root.add(dome);

    const rearRidge = new THREE.Mesh(new THREE.SphereGeometry(1,48,32), gun);
    rearRidge.scale.set(1.18,1.48,0.72);
    rearRidge.position.set(0,0.02,-0.29);
    root.add(rearRidge);

    // One-piece angular face shield with raised bevelled edges.
    plate(root,[
      [-0.92,1.22],[-0.56,1.47],[0,1.56],[0.56,1.47],[0.92,1.22],
      [1.12,0.62],[1.04,-0.25],[0.82,-0.93],[0.48,-1.38],[0,-1.58],
      [-0.48,-1.38],[-0.82,-0.93],[-1.04,-0.25],[-1.12,0.62]
    ],brightRed,0.68,0.11,0.075);

    // Layered forehead armour and central brow crest.
    plate(root,[[-0.88,1.23],[-0.52,1.49],[0,1.61],[0.52,1.49],[0.88,1.23],[0.48,1.18],[0,1.32],[-0.48,1.18]],red,0.82,0.08,0.035);
    plate(root,[[-0.23,1.47],[0,1.58],[0.23,1.47],[0.16,1.12],[0,1.04],[-0.16,1.12]],gun,0.91,0.07,0.025);
    plate(root,[[-0.075,1.48],[0,1.52],[0.075,1.48],[0.055,1.18],[0,1.14],[-0.055,1.18]],silver,0.995,0.018,0.008);

    // Recessed eye housings and sharply tapered illuminated lenses.
    const eyeGroups = [];
    for (const side of [-1,1]) {
      const mirror = pts => pts.map(([x,y])=>[x*side,y]);
      plate(root,mirror([[-0.91,0.91],[-0.13,0.78],[-0.22,0.43],[-0.79,0.49]]),dark,0.91,0.09,0.035);
      plate(root,mirror([[-0.83,0.79],[-0.23,0.68],[-0.31,0.52],[-0.75,0.57]]),black,1.015,0.045,0.018);
      const eye = plate(root,mirror([[-0.79,0.75],[-0.28,0.66],[-0.39,0.55],[-0.73,0.59]]),eyeMat,1.075,0.025,0.012);
      const core = plate(root,mirror([[-0.69,0.68],[-0.37,0.625],[-0.46,0.59],[-0.67,0.61]]),eyeCore,1.11,0.008,0.004);
      eyeGroups.push({eye,core});
      // Heavy brow ridge gives the eyes a recessed, focused expression.
      plate(root,mirror([[-0.98,1.02],[-0.54,1.13],[-0.16,0.91],[-0.24,0.82],[-0.82,0.91]]),red,1.12,0.075,0.03);

      // Temple and cheek armour: separate overlapping metal plates.
      plate(root,mirror([[-1.02,0.48],[-0.79,0.4],[-0.7,-0.14],[-0.94,-0.48],[-1.16,-0.15]]),gun,0.89,0.09,0.04);
      plate(root,mirror([[-0.96,0.25],[-0.34,0.28],[-0.43,-0.33],[-0.79,-0.72],[-1.04,-0.36]]),brightRed,0.91,0.075,0.035);
      plate(root,mirror([[-0.91,-0.12],[-0.46,-0.3],[-0.55,-0.82],[-0.86,-0.94],[-1.08,-0.52]]),red,1.015,0.065,0.03);

      // Small temple vents and machined fasteners.
      for(let n=0;n<3;n++){
        const y=0.12-n*0.105;
        line(root,mirror([[-1.02,y],[-0.89,y-0.045]]),silver,0.012);
      }
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.025,16),silver);
      bolt.rotation.x=Math.PI/2;bolt.position.set(side*0.99,0.78,1.04);root.add(bolt);
    }

    // Nose bridge, angular cheek centre and chin armour.
    plate(root,[[-0.22,0.78],[0,0.94],[0.22,0.78],[0.17,0.12],[0,-0.12],[-0.17,0.12]],gun,1.03,0.13,0.04);
    plate(root,[[-0.16,0.18],[0,0.31],[0.16,0.18],[0.35,-0.22],[0,-0.4],[-0.35,-0.22]],brightRed,1.08,0.08,0.03);
    plate(root,[[-0.34,-0.28],[0,-0.42],[0.34,-0.28],[0.29,-0.92],[0,-1.22],[-0.29,-0.92]],gun,1.02,0.09,0.035);
    plate(root,[[-0.25,-0.93],[0,-1.13],[0.25,-0.93],[0.17,-1.35],[0,-1.48],[-0.17,-1.35]],brightRed,1.12,0.075,0.03);

    // Mouth grille with individual recessed vents and machined borders.
    plate(root,[[-0.39,-0.55],[0,-0.66],[0.39,-0.55],[0.31,-0.91],[0,-1.02],[-0.31,-0.91]],black,1.17,0.045,0.02);
    for(let n=0;n<5;n++){
      const x=-0.23+n*0.115;
      line(root,[[x,-0.72,1.235],[x*0.82,-0.88,1.235]],silver,0.014);
    }

    // Panel seams trace the crown, temples, cheeks and jaw.
    const seamPaths=[
      [[-1.12,0.62,0.91],[-0.99,1.1,0.91],[-0.56,1.45,0.91],[0,1.55,0.91],[0.56,1.45,0.91],[0.99,1.1,0.91],[1.12,0.62,0.91]],
      [[-1.08,-0.28,1.02],[-0.92,-0.74,1.02],[-0.54,-1.18,1.02],[0,-1.46,1.02],[0.54,-1.18,1.02],[0.92,-0.74,1.02],[1.08,-0.28,1.02]],
      [[-1.02,0.4,1.08],[-0.82,0.12,1.1],[-0.68,-0.22,1.1]],
      [[1.02,0.4,1.08],[0.82,0.12,1.1],[0.68,-0.22,1.1]]
    ];
    seamPaths.forEach(p=>line(root,p,seam,0.014));

    // Side hinge discs and fine radial machining.
    for(const side of [-1,1]){
      const hinge=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.09,32),dark);
      hinge.rotation.z=Math.PI/2;hinge.position.set(side*1.16,-0.28,0.35);root.add(hinge);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.105,0.1,32),silver);
      cap.rotation.z=Math.PI/2;cap.position.set(side*1.215,-0.28,0.35);root.add(cap);
      const centre=new THREE.Mesh(new THREE.CylinderGeometry(0.047,0.047,0.105,24),brightRed);
      centre.rotation.z=Math.PI/2;centre.position.set(side*1.24,-0.28,0.35);root.add(centre);
    }

    const eyes = eyeGroups;
    return {root, eyes, eyeMat, eyeCore};
  }

  function start(canvas) {
    if(active) stop();
    const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.25;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(34,1,0.1,100);
    camera.position.set(0,0.05,8.4);
    const pmrem=new THREE.PMREMGenerator(renderer);
    const env=pmrem.fromScene(new RoomEnvironment(),0.04);
    scene.environment=env.texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xcbd8f0,0x17070b,2.0));
    const key=new THREE.DirectionalLight(0xffe7df,4.0);key.position.set(-3.5,4.5,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0x7c9ac5,2.2);fill.position.set(4,1.2,3);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xff1828,3.8);rim.position.set(0.5,2.8,-4);scene.add(rim);
    const eyeLightL=new THREE.PointLight(0xff1026,0,2.8);eyeLightL.position.set(-0.48,0.62,1.55);scene.add(eyeLightL);
    const eyeLightR=new THREE.PointLight(0xff1026,0,2.8);eyeLightR.position.set(0.48,0.62,1.55);scene.add(eyeLightR);

    const halo=new THREE.Mesh(new THREE.TorusGeometry(1.92,0.012,8,128),new THREE.MeshBasicMaterial({color:0x7d101b,transparent:true,opacity:0.42}));
    halo.position.z=-1.35;halo.rotation.x=0.16;scene.add(halo);

    const model=buildHelmet(scene);
    model.root.scale.setScalar(0.76);
    model.root.position.y=-0.04;
    const start=performance.now();
    let frame=0,observer=null,disposed=false;
    const resize=()=>{
      if(disposed)return;
      const rect=canvas.getBoundingClientRect();
      const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();
    };
    if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(canvas)}
    else window.addEventListener('resize',resize);
    resize();

    const tick=now=>{
      if(disposed)return;
      const t=(now-start)/1000;
      const reveal=Math.min(1,Math.max(0,(t-0.12)/2.15));
      const eased=reveal*reveal*(3-2*reveal);
      model.root.scale.setScalar(0.76+0.24*eased);
      model.root.position.y=-0.04+0.035*eased;
      model.root.rotation.y=0.24+Math.sin(t*0.42)*0.035;
      model.root.rotation.x=-0.035+Math.sin(t*0.31)*0.012;
      const eyePower=Math.max(0,Math.min(1,(t-2.35)/1.0));
      const pulse=0.82+0.18*Math.sin(t*3.4);
      model.eyeMat.emissiveIntensity=3.4*eyePower*pulse;
      model.eyeCore.opacity=0.2+0.75*eyePower;
      model.eyes.forEach(({eye,core})=>{eye.material.emissiveIntensity=3.4*eyePower*pulse;core.material.opacity=0.18+0.78*eyePower});
      eyeLightL.intensity=2.4*eyePower*pulse;eyeLightR.intensity=2.4*eyePower*pulse;
      halo.rotation.z=t*0.035;
      renderer.render(scene,camera);
      frame=requestAnimationFrame(tick);
    };
    active={renderer,scene,frame:0,observer,resizeHandler:resize};
    frame=requestAnimationFrame(tick);
    active.frame=frame;
  }

  function stop(){
    if(!active)return;
    const a=active;active=null;
    cancelAnimationFrame(a.frame);
    if(a.observer)a.observer.disconnect();
    else window.removeEventListener('resize',a.resizeHandler);
    a.scene.traverse(o=>{
      if(o.geometry)o.geometry.dispose();
      if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose()}
    });
    a.renderer.dispose();
  }

  window.JarvisBattleHelmet3D=Object.freeze({start,stop});
})();