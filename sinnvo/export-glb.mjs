// Exports the SINNVO villa lift as a .glb with a 20 s "Ride_Demo" animation clip.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { writeFileSync } from 'node:fs';
import { buildElevator, demoState, DEMO_LEN } from './elevator-model.js';

// Minimal FileReader so GLTFExporter can write binary in Node
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend?.({ target: this }); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,` + Buffer.from(buf).toString('base64');
      this.onloadend?.({ target: this });
    });
  }
};

const finish = process.argv[2] || 'champagne';
const out = process.argv[3] || `sinnvo-villa-lift-${finish}.glb`;
const lift = buildElevator(THREE, { RoundedBoxGeometry, finish });
const scene = new THREE.Scene();
scene.name = 'SINNVO_VillaLift_Scene';
scene.add(lift.root);

// Bake the ride cycle into keyframes (30 fps)
const fps = 30, n = DEMO_LEN * fps + 1;
const times = Float32Array.from({ length: n }, (_, i) => i / fps);
const tracks = [];
const posTrack = (obj, fn) => {
  const v = new Float32Array(n * 3);
  times.forEach((t, i) => {
    const p = fn(demoState(t));
    v.set([p.x, p.y, p.z], i * 3);
  });
  tracks.push(new THREE.VectorKeyframeTrack(`${obj.name}.position`, times, v));
};
posTrack(lift.cabin, (s) => ({ x: 0, y: s.cabinY, z: 0 }));
const door = (g, k) => ({ x: g.userData.closedX + (g.userData.openX - g.userData.closedX) * k, y: g.position.y, z: g.position.z });
lift.landing[0].forEach((g) => posTrack(g, (s) => door(g, s.door1)));
lift.landing[1].forEach((g) => posTrack(g, (s) => door(g, s.door2)));
lift.cabinDoors.forEach((g) => posTrack(g, (s) => door(g, s.cabinDoor)));
const clip = new THREE.AnimationClip('Ride_Demo', DEMO_LEN, tracks);

new GLTFExporter().parse(
  scene,
  (glb) => {
    writeFileSync(out, Buffer.from(glb));
    let meshes = 0;
    scene.traverse((o) => o.isMesh && meshes++);
    console.log(`${out}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${meshes} meshes, ${tracks.length} animation tracks`);
  },
  (err) => { console.error(err); process.exit(1); },
  { binary: true, animations: [clip] }
);
