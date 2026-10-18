import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const buf = readFileSync(process.argv[2]);
new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (g) => {
  let meshes = 0; g.scene.traverse((o) => o.isMesh && meshes++);
  console.log('loads OK:', meshes, 'meshes; clips:', g.animations.map((a) => `${a.name} ${a.duration}s/${a.tracks.length} tracks`).join(', '),
    '; cabin node:', !!g.scene.getObjectByName('Cabin'));
}, (e) => { console.error('FAIL', e); process.exit(1); });
