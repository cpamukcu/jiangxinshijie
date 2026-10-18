// SINNVO villa lift — parametric 3D model (three.js). Units: metres.
// Shared by the browser viewer and the Node .glb exporter.

export const DIM = { W: 1.7, D: 1.6, FLOOR_H: 3.1, HEAD: 0.45, FLOORS: 2 };

export const FINISHES = {
  champagne: { label: 'Champagne', frame: 0xc4b089, metal: 1.0, rough: 0.3 },
  graphite: { label: 'Graphite', frame: 0x2d2e32, metal: 0.7, rough: 0.42 },
  silver: { label: 'Silver', frame: 0xd0d3d7, metal: 1.0, rough: 0.22 },
};

export function easeInOut(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => easeInOut(clamp01((t - a) / (b - a)));

// One 20-second ride cycle: open at L1, close, ride up, open at L2, close, ride down.
export const DEMO_LEN = 20;
export function demoState(t) {
  t = ((t % DEMO_LEN) + DEMO_LEN) % DEMO_LEN;
  const H = DIM.FLOOR_H;
  const door1 = seg(t, 0.4, 1.8) - seg(t, 3.6, 5.0);
  const door2 = seg(t, 9.6, 11.0) - seg(t, 13.0, 14.4);
  return {
    cabinY: H * (seg(t, 4.9, 9.4) - seg(t, 14.4, 18.9)),
    door1,
    door2,
    cabinDoor: door1 + door2,
  };
}

export function buildElevator(THREE, opts = {}) {
  const RBG = opts.RoundedBoxGeometry;
  const { W, D, FLOOR_H, HEAD, FLOORS } = DIM;
  const shaftTop = FLOOR_H * FLOORS; // underside of the head unit
  const shaftH = shaftTop + HEAD;
  const fin = FINISHES[opts.finish || 'champagne'];

  const std = (name, p) => new THREE.MeshStandardMaterial({ name, ...p });
  const M = {
    frame: std('Frame_Metal', { color: fin.frame, metalness: fin.metal, roughness: fin.rough }),
    glass: std('Shaft_Glass', {
      color: 0xdbe9e7, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.14,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.8,
    }),
    doorGlass: std('Door_Glass', {
      color: 0xd6e6e4, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.8,
    }),
    wood: std('Walnut_Panel', { color: 0x3f2c1f, roughness: 0.62, metalness: 0, envMapIntensity: 0.7 }),
    stone: std('Stone_Floor', { color: 0xe7e3dc, roughness: 0.22, metalness: 0 }),
    panel: std('Control_Panel', { color: 0x0f1012, roughness: 0.15, metalness: 0.4 }),
    led: std('LED_Ceiling', { color: 0xfff7ea, emissive: 0xfff0d8, emissiveIntensity: 2.4 }),
    button: std('LED_Button', { color: 0xfff2dc, emissive: 0xffdcae, emissiveIntensity: 1.6 }),
    rail: std('Guide_Rail', { color: 0x8a8d93, metalness: 0.9, roughness: 0.35 }),
    slab: std('Floor_Slab', { color: 0xefece6, roughness: 0.9, metalness: 0 }),
    oak: std('Oak_Floor', { color: 0xc9b194, roughness: 0.6, metalness: 0 }),
  };

  const geo = (w, h, d, r) =>
    RBG && r ? new RBG(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);

  function box(parent, name, w, h, d, mat, x, y, z, r = 0) {
    const m = new THREE.Mesh(geo(w, h, d, r), mat);
    m.name = name;
    m.position.set(x, y, z);
    const isGlass = mat === M.glass || mat === M.doorGlass;
    m.castShadow = !isGlass && mat !== M.led;
    m.receiveShadow = !isGlass;
    parent.add(m);
    return m;
  }

  const root = new THREE.Group();
  root.name = 'SINNVO_VillaLift';


  // Telescopic centre-opening doors: two panels per side that stack when open.
  function doorSet(parent, prefix, totalW, h, y, z, fr, matGlass) {
    const pw = totalW / 4 + 0.006;
    const panels = [];
    [-1, 1].forEach((s) => {
      [0, 1].forEach((k) => {
        const g = new THREE.Group();
        g.name = `${prefix}_${s < 0 ? 'L' : 'R'}${k + 1}`;
        g.userData.closedX = s * pw * (k + 0.5);
        g.userData.openX = s * (totalW / 2 + 0.012 + pw / 2);
        g.position.set(g.userData.closedX, y, z + (k === 0 ? 0.03 : 0));
        box(g, `${g.name}_Glass`, pw - fr * 2, h - fr * 2, 0.01, matGlass, 0, h / 2, 0);
        box(g, `${g.name}_Frame_T`, pw, fr, 0.022, M.frame, 0, h - fr / 2, 0, 0.004);
        box(g, `${g.name}_Frame_B`, pw, fr * 1.6, 0.022, M.frame, 0, fr * 0.8, 0, 0.004);
        box(g, `${g.name}_Frame_A`, fr, h, 0.022, M.frame, (pw - fr) / 2, h / 2, 0, 0.004);
        box(g, `${g.name}_Frame_B2`, fr, h, 0.022, M.frame, -(pw - fr) / 2, h / 2, 0, 0.004);
        parent.add(g);
        panels.push(g);
      });
    });
    return panels;
  }

  // ── Shaft ────────────────────────────────────────────────
  const shaft = new THREE.Group();
  shaft.name = 'Shaft';
  root.add(shaft);
  const px = W / 2 - 0.04, pz = D / 2 - 0.04, post = 0.08;

  box(shaft, 'Base_Plinth', W + 0.06, 0.05, D + 0.06, M.frame, 0, 0.025, 0, 0.01);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    box(shaft, `Post_${i + 1}`, post, shaftTop, post, M.frame, sx * px, shaftTop / 2, sz * pz, 0.012)
  );

  // Horizontal frame band around the shaft at a given height
  function band(y, h, tag) {
    const t = 0.06;
    box(shaft, `Band_${tag}_Front`, W - post, h, t, M.frame, 0, y, pz, 0.008);
    box(shaft, `Band_${tag}_Back`, W - post, h, t, M.frame, 0, y, -pz, 0.008);
    box(shaft, `Band_${tag}_Left`, t, h, D - post, M.frame, -px, y, 0, 0.008);
    box(shaft, `Band_${tag}_Right`, t, h, D - post, M.frame, px, y, 0, 0.008);
  }
  band(0.09, 0.08, 'Base');
  for (let f = 1; f < FLOORS; f++) band(f * FLOOR_H - 0.11, 0.22, `L${f + 1}`);
  band(shaftTop - 0.04, 0.08, 'Top');

  // Guide rails on the back wall
  [-0.32, 0.32].forEach((x, i) =>
    box(shaft, `Guide_Rail_${i + 1}`, 0.045, shaftTop - 0.1, 0.06, M.rail, x, shaftTop / 2, -D / 2 + 0.14)
  );

  // Glass and landing doors, floor by floor
  const doorW = 0.86, doorH = 2.15;
  const landing = [];
  for (let f = 0; f < FLOORS; f++) {
    const y0 = f * FLOOR_H + (f === 0 ? 0.13 : 0.0);
    const y1 = f === FLOORS - 1 ? shaftTop - 0.08 : (f + 1) * FLOOR_H - 0.22;
    const gh = y1 - y0, gy = (y0 + y1) / 2;
    box(shaft, `Glass_L${f + 1}_Back`, W - post, gh, 0.012, M.glass, 0, gy, -pz);
    box(shaft, `Glass_L${f + 1}_Left`, 0.012, gh, D - post, M.glass, -px, gy, 0);
    box(shaft, `Glass_L${f + 1}_Right`, 0.012, gh, D - post, M.glass, px, gy, 0);

    // Front face: side lights, jambs, header, transom
    const base = f * FLOOR_H;
    const sideW = px - post / 2 - (doorW / 2 + 0.02);
    const sideX = doorW / 2 + 0.02 + sideW / 2;
    [-1, 1].forEach((s) => {
      box(shaft, `Glass_L${f + 1}_FrontSide_${s < 0 ? 'L' : 'R'}`, sideW, gh, 0.012, M.glass, s * sideX, gy, pz);
      box(shaft, `Jamb_L${f + 1}_${s < 0 ? 'L' : 'R'}`, 0.04, doorH + 0.04 - (y0 - base), 0.07, M.frame,
        s * (doorW / 2 + 0.02), base + (y0 - base) / 2 + (doorH + 0.04) / 2, pz, 0.006);
    });
    box(shaft, `Header_L${f + 1}`, doorW + 0.08, 0.06, 0.08, M.frame, 0, base + doorH + 0.05, pz, 0.008);
    const tY0 = base + doorH + 0.08;
    if (y1 - tY0 > 0.05)
      box(shaft, `Glass_L${f + 1}_Transom`, doorW, y1 - tY0, 0.012, M.glass, 0, (tY0 + y1) / 2, pz);

    // Landing doors
    landing.push(doorSet(shaft, `LandingDoor_L${f + 1}`, doorW, doorH - 0.02, base + 0.02, pz + 0.05, 0.02, M.doorGlass));
  }

  // Head unit with downlight strip
  box(shaft, 'Head_Unit', W + 0.04, HEAD, D + 0.04, M.frame, 0, shaftTop + HEAD / 2, 0, 0.02);
  box(shaft, 'Head_LED_Strip', W - 0.3, 0.01, 0.05, M.led, 0, shaftTop - 0.005, pz - 0.06);

  // ── Cabin ────────────────────────────────────────────────
  const cabin = new THREE.Group();
  cabin.name = 'Cabin';
  root.add(cabin);
  const cw = 1.04, cd = 1.15, ch = 2.2, cz = -0.06;
  const cfront = cz + cd / 2;

  box(cabin, 'Cabin_Floor', cw + 0.06, 0.07, cd + 0.06, M.stone, 0, -0.035, cz, 0.01);
  box(cabin, 'Cabin_Apron', cw + 0.06, 0.08, cd + 0.06, M.frame, 0, -0.11, cz, 0.01);
  box(cabin, 'Cabin_Ceiling', cw + 0.06, 0.08, cd + 0.06, M.frame, 0, ch + 0.04, cz, 0.01);
  box(cabin, 'Cabin_LED_Panel', cw - 0.24, 0.012, cd - 0.24, M.led, 0, ch - 0.006, cz, 0.004);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    box(cabin, `Cabin_Post_${i + 1}`, 0.04, ch, 0.04, M.frame, (sx * cw) / 2, ch / 2, cz + (sz * cd) / 2, 0.006)
  );
  box(cabin, 'Cabin_Back_Walnut', cw - 0.04, ch, 0.03, M.wood, 0, ch / 2, cz - cd / 2 + 0.01, 0.005);
  box(cabin, 'Cabin_Glass_Left', 0.012, ch - 0.02, cd - 0.04, M.glass, -cw / 2, ch / 2, cz);
  box(cabin, 'Cabin_Glass_Right', 0.012, ch - 0.02, cd - 0.04, M.glass, cw / 2, ch / 2, cz);
  box(cabin, 'Cabin_Kick_Left', 0.03, 0.12, cd - 0.04, M.frame, -cw / 2, 0.06, cz, 0.004);
  box(cabin, 'Cabin_Kick_Right', 0.03, 0.12, cd - 0.04, M.frame, cw / 2, 0.06, cz, 0.004);

  // Handrail on the right wall
  const railMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.78, 20), M.frame);
  railMesh.name = 'Cabin_Handrail';
  railMesh.rotation.x = Math.PI / 2;
  railMesh.position.set(cw / 2 - 0.07, 0.95, cz - 0.05);
  railMesh.castShadow = true;
  cabin.add(railMesh);
  [-0.3, 0.2].forEach((dz, i) =>
    box(cabin, `Cabin_Handrail_Bracket_${i + 1}`, 0.07, 0.02, 0.02, M.frame, cw / 2 - 0.035, 0.95, cz - 0.05 + dz, 0.005)
  );

  // Control panel with two floor buttons and a display
  const panelX = cw / 2 - 0.022, panelZ = cfront - 0.14;
  box(cabin, 'Control_Panel', 0.012, 0.36, 0.085, M.panel, panelX, 1.12, panelZ, 0.004);
  box(cabin, 'Control_Display', 0.004, 0.04, 0.05, M.button, panelX - 0.007, 1.24, panelZ);
  [1.12, 1.04].forEach((y, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 24), M.button);
    b.name = `Control_Button_L${2 - i}`;
    b.rotation.z = Math.PI / 2;
    b.position.set(panelX - 0.008, y, panelZ);
    cabin.add(b);
  });

  // Cabin doors
  const cabinDoors = doorSet(cabin, 'CabinDoor', cw - 0.04, ch - 0.02, 0.005, cfront + 0.03, 0.016, M.doorGlass);

  // Car frame brackets that ride the guide rails
  [-0.32, 0.32].forEach((x, i) => {
    box(cabin, `Rail_Shoe_Top_${i + 1}`, 0.09, 0.1, 0.12, M.rail, x, ch - 0.1, cz - cd / 2 - 0.06, 0.01);
    box(cabin, `Rail_Shoe_Bottom_${i + 1}`, 0.09, 0.1, 0.12, M.rail, x, 0.05, cz - cd / 2 - 0.06, 0.01);
  });

  // ── Villa context: upper-floor slab, oak flooring and glass balustrade ──
  if (opts.context !== false) {
    const ctx = new THREE.Group();
    ctx.name = 'Villa_Context';
    root.add(ctx);
    const top = FLOOR_H, t = 0.22, gap = 0.03;
    const xR0 = W / 2 + gap, xR1 = 4.4, zB0 = -2.8, zF1 = 2.4, xL0 = -1.4;
    const zFront0 = D / 2 + gap;
    const slab = (name, x0, x1, z0, z1) => {
      box(ctx, name, x1 - x0, t, z1 - z0, M.slab, (x0 + x1) / 2, top - t / 2 - 0.012, (z0 + z1) / 2);
      box(ctx, name + '_Oak', x1 - x0, 0.012, z1 - z0, M.oak, (x0 + x1) / 2, top - 0.006, (z0 + z1) / 2);
    };
    slab('Slab_Wing', xR0, xR1, zB0, zF1);
    slab('Slab_Landing', xL0, xR0, zFront0, zF1);
    // Balustrade along the open edges
    const bh = 1.0;
    const rail = (name, len, x, z, alongX) => {
      const [w, d] = alongX ? [len, 0.012] : [0.012, len];
      box(ctx, name + '_Glass', w, bh, d, M.glass, x, top + bh / 2, z);
      box(ctx, name + '_Cap', alongX ? len : 0.04, 0.035, alongX ? 0.04 : len, M.frame, x, top + bh + 0.015, z, 0.008);
      box(ctx, name + '_Shoe', alongX ? len : 0.05, 0.06, alongX ? 0.05 : len, M.frame, x, top + 0.03, z, 0.006);
    };
    rail('Balustrade_Front', xR1 - xL0, (xR1 + xL0) / 2, zF1 - 0.03, true);
    rail('Balustrade_Side', zF1 - zFront0, xL0 + 0.03, (zF1 + zFront0) / 2, false);
    // Slim columns carrying the open corners of the slab
    [[xL0 + 0.15, zF1 - 0.15], [xR1 - 0.15, zF1 - 0.15], [xR1 - 0.15, zB0 + 0.15]].forEach(([x, z], i) =>
      box(ctx, `Column_${i + 1}`, 0.16, top - t, 0.16, M.slab, x, (top - t) / 2, z, 0.02)
    );
  }

  function setState(s) {
    cabin.position.y = s.cabinY;
    const lerp = (g, k) => (g.position.x = g.userData.closedX + (g.userData.openX - g.userData.closedX) * k);
    landing.forEach((panels, i) => panels.forEach((g) => lerp(g, i === 0 ? s.door1 : s.door2)));
    cabinDoors.forEach((g) => lerp(g, s.cabinDoor));
  }

  function setFinish(name) {
    const f = FINISHES[name];
    if (!f) return;
    M.frame.color.setHex(f.frame);
    M.frame.metalness = f.metal;
    M.frame.roughness = f.rough;
  }

  setState({ cabinY: 0, door1: 0, door2: 0, cabinDoor: 0 });
  return { root, cabin, shaft, landing, cabinDoors, materials: M, setState, setFinish, shaftH };
}
