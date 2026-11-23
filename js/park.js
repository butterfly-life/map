/* 木生昆蟲館 3D 生態園區（three.js r128）
   版面架構：頂部列 → 滿版 3D 地圖（左上標題、右上進度、下方工具列、編號標記、導覽卡）→ 展區清單（搜尋＋分類）→ 展區面板（dialog）
   - 場景目前是暫代幾何：草地、環狀步道、樹、展區標柱（位置在 js/zones.js）
   - 點標記／卡片 → 鏡頭沿弧線飛過去 → 打開展區面板；網址 #zone-id 可直接開某一區
   - 導覽：一站一站自動前進（進度條），可上一站／暫停／下一站／結束；拖曳地圖會暫停
   - 已探索的展區記在 localStorage（讀寫失敗也能正常使用）
   - 之後有正式模型：.glb 放進 map/assets/models/，填 MODEL，並在 index.html 加上 GLTFLoader（見 README）
   - WebGL 不能用 → 地圖區顯示說明、清單照常可用；減少動態效果 → 不自動旋轉、鏡頭直接切換 */
(() => {
  'use strict';
  const MODEL = '';
  const ZONES = window.PARK_ZONES || [];
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth <= 650;
  const deck = $('deck'), cv = $('pkCv'), markersBox = $('markers'), status = $('worldStatus');
  const panel = $('panel'), tourCard = $('tourCard'), toast = $('toast');

  /* ---------- 已探索 ---------- */
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem('pk-seen') || '[]')); } catch (e) {}
  const markSeen = z => {
    seen.add(z.id);
    try { localStorage.setItem('pk-seen', JSON.stringify([...seen])); } catch (e) {}
    renderProgress(); renderCards();
    const m = markers.find(o => o.z === z); if (m) m.el.classList.add('seen');
  };
  const renderProgress = () => { $('progress').textContent = `${ZONES.filter(z => seen.has(z.id)).length} / ${ZONES.length} 已探索`; };

  let toastT = 0;
  const say = msg => { toast.textContent = msg; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, 2600); };

  /* ---------- 展區清單：搜尋＋分類 ---------- */
  const cards = $('cards'), search = $('search'), cat = $('category');
  [...new Set(ZONES.map(z => z.group).filter(Boolean))].forEach(g => cat.add(new Option(g, g)));
  const renderCards = () => {
    const q = search.value.trim().toLowerCase(), g = cat.value;
    const list = ZONES.filter(z => (!g || z.group === g) && (!q || [z.name, z.en, z.desc, z.group].join(' ').toLowerCase().includes(q)));
    cards.innerHTML = list.length ? '' : '<p class="empty">找不到符合條件的展區。</p>';
    list.forEach(z => {
      const i = ZONES.indexOf(z), b = document.createElement('button');
      b.type = 'button'; b.className = 'zone-card';
      b.innerHTML = `<small><i style="background:${z.color}"></i>${String(i + 1).padStart(2, '0')} · ${z.group || ''}${seen.has(z.id) ? ' · 已探索' : ''}</small>` +
        `<strong>${z.name}</strong><span>${z.desc}</span>`;
      b.addEventListener('click', () => { deck.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); select(i, 1600); });
      cards.appendChild(b);
    });
  };
  search.addEventListener('input', renderCards);
  cat.addEventListener('change', renderCards);
  const toList = () => $('zone-list').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  ['browse', 'mastList', 'toolList'].forEach(id => $(id).addEventListener('click', toList));

  /* ---------- 展區面板 ---------- */
  let current = -1;
  const openPanel = i => {
    const z = ZONES[i];
    $('panelGroup').textContent = `${String(i + 1).padStart(2, '0')} · ${z.group || ''}`;
    $('panelTitle').textContent = z.name;
    $('panelContent').innerHTML =
      (z.img ? `<img src="${z.img}" alt="${z.name}">` : '') +
      `<p>${z.desc}</p>` +
      `<div class="panel-section"><h3>${z.en}</h3><p>展區照片與詳細介紹待補（請以木生昆蟲館提供的資料為準）。</p></div>` +
      `<div class="panel-section"><h3>直達其他展區</h3><div class="jump">${ZONES.map((o, k) => k === i ? '' : `<button type="button" data-k="${k}">${String(k + 1).padStart(2, '0')} ${o.name}</button>`).join('')}</div></div>`;
    $('panelContent').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { panel.close(); select(+b.dataset.k, 1400); }));
    if (!panel.open) panel.showModal();
    history.replaceState(null, '', '#' + z.id);
  };
  $('panelClose').addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => { if (!tour.on) overview(); });

  /* ---------- 3D ---------- */
  let select = i => { current = i; markSeen(ZONES[i]); openPanel(i); };
  let overview = () => {};
  let markers = [];
  const tour = { on: false, i: 0, paused: false, t0: 0, arrived: false };
  renderProgress(); renderCards();

  const fail = msg => { status.hidden = false; status.textContent = msg || '你的瀏覽器無法顯示 3D 場景，可以從下方的展區清單瀏覽。'; deck.dataset.unavailable = 'true'; };
  if (!window.THREE || !THREE.OrbitControls) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true;   // 不設 outputEncoding：r128 不設的話色碼照原樣顯示

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#E6EFE4');
  scene.fog = new THREE.Fog('#E6EFE4', 95, 180);
  const camera = new THREE.PerspectiveCamera(42, 1, .5, 400);
  // 電腦版：鏡頭中心往左移 → 園區偏畫面右半邊，不壓到左上的標題；手機版標題在上方，園區置中
  const HOME = mobile() ? { pos: new THREE.Vector3(10, 78, 96), target: new THREE.Vector3(2, 0, 6) } : { pos: new THREE.Vector3(-6, 66, 82), target: new THREE.Vector3(-20, 0, 2) };
  camera.position.copy(HOME.pos);
  const controls = new THREE.OrbitControls(camera, cv);
  controls.target.copy(HOME.target);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, minDistance: 22, maxDistance: 150, maxPolarAngle: Math.PI * .44, enablePan: false });
  controls.autoRotate = !reduce; controls.autoRotateSpeed = .3;
  controls.addEventListener('start', () => { controls.autoRotate = false; fly = null; if (tour.on) pauseTour(true); });

  scene.add(new THREE.HemisphereLight('#FFFDF4', '#7E9A6A', .75));
  const sun = new THREE.DirectionalLight('#FFF4DC', .9);
  sun.position.set(-40, 70, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile() ? 1024 : 2048, mobile() ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 200 });
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(48, 50, 3, 64), new THREE.MeshLambertMaterial({ color: '#9CC98A' }));
  ground.position.y = -1.5; ground.receiveShadow = true; scene.add(ground);
  const path = new THREE.Mesh(new THREE.RingGeometry(26, 29.5, 96), new THREE.MeshLambertMaterial({ color: '#E8DCC0', side: THREE.DoubleSide }));
  path.rotation.x = -Math.PI / 2; path.position.y = .02; path.receiveShadow = true; scene.add(path);

  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const trunkMat = new THREE.MeshLambertMaterial({ color: '#6E5236' });
  const leafMats = ['#0F7652', '#2E8459', '#3F9466', '#72B47E'].map(c => new THREE.MeshLambertMaterial({ color: c }));
  const nearZone = (x, z) => ZONES.some(o => Math.hypot(o.pos[0] - x, o.pos[1] - z) < 8);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(r - 27.7) < 3.5 || nearZone(x, z)) continue;
    const s = .7 + rnd() * .8, tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.35 * s, .5 * s, 3 * s, 6), trunkMat); trunk.position.y = 1.5 * s;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 * s, 0), leafMats[i % leafMats.length]); crown.position.y = 4 * s;
    [trunk, crown].forEach(m => { m.castShadow = true; tree.add(m); });
    tree.position.set(x, 0, z); scene.add(tree);
  }

  // 展區標柱＋HTML 編號標記
  const pickables = [];
  markers = ZONES.map((z, i) => {
    const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: z.color });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, .6, 32), new THREE.MeshLambertMaterial({ color: '#F6F4EF' })); base.position.y = .3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 6, 8), mat); pole.position.y = 3.6;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), mat); orb.position.y = 7.4;
    [base, pole, orb].forEach(m => { m.castShadow = true; m.userData.i = i; g.add(m); pickables.push(m); });
    g.position.set(z.pos[0], 0, z.pos[1]); scene.add(g);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'marker' + (seen.has(z.id) ? ' seen' : '');
    el.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b>${z.name}`;
    el.addEventListener('click', () => select(i));
    markersBox.appendChild(el);
    return { z, g, orb, el, anchor: new THREE.Vector3(z.pos[0], 10, z.pos[1]) };
  });
  if (MODEL && THREE.GLTFLoader) new THREE.GLTFLoader().load(MODEL, gltf => scene.add(gltf.scene));

  /* ---------- 鏡頭飛行（弧線、smoothstep） ---------- */
  let fly = null;
  const flyTo = (pos, target, ms, done) => {
    controls.autoRotate = false;
    if (reduce) { camera.position.copy(pos); controls.target.copy(target); done && done(); return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), ms: ms * (mobile() ? .7 : 1), done };
  };
  const focusPose = z => {
    const t = new THREE.Vector3(z.pos[0], 2, z.pos[1]);
    return { pos: t.clone().add(new THREE.Vector3(mobile() ? 3 : 10, 20, 26)), target: t };
  };
  select = (i, ms = 1930) => {
    current = i;
    deck.dataset.focus = 'true';
    markers.forEach((m, k) => m.el.classList.toggle('on', k === i));
    const p = focusPose(ZONES[i]);
    flyTo(p.pos, p.target, ms, () => { markSeen(ZONES[i]); if (!tour.on) openPanel(i); });
  };
  overview = () => {
    current = -1; deck.dataset.focus = 'false';
    markers.forEach(m => m.el.classList.remove('on'));
    flyTo(HOME.pos.clone(), HOME.target.clone(), 1500);
    history.replaceState(null, '', location.pathname + location.search);
  };
  ['mastOverview', 'toolOverview'].forEach(id => $(id).addEventListener('click', () => { endTour(); if (panel.open) panel.close(); overview(); }));

  /* ---------- 導覽 ---------- */
  const STAY = reduce ? 6200 : 4900;
  const renderTour = () => {
    const z = ZONES[tour.i];
    tourCard.hidden = false;
    tourCard.innerHTML = `<h3>${tour.i + 1} / ${ZONES.length}｜${z.name}</h3><p>${z.desc}</p>` +
      `<progress max="1" value="0" aria-label="本站導覽進度"></progress>` +
      `<div class="tour-btns"><button type="button" data-a="prev"${tour.i ? '' : ' disabled'}>上一站</button>` +
      `<button type="button" data-a="pause">${tour.paused ? '繼續' : '暫停'}</button>` +
      `<button type="button" data-a="next">${tour.i === ZONES.length - 1 ? '完成' : '下一站'}</button>` +
      `<button type="button" data-a="end">結束</button></div>`;
    tourCard.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'prev') playTour(tour.i - 1);
      else if (a === 'next') tour.i < ZONES.length - 1 ? playTour(tour.i + 1) : endTour(true);
      else if (a === 'pause') pauseTour(!tour.paused);
      else endTour(true);
    }));
  };
  const playTour = i => {
    if (panel.open) panel.close();
    Object.assign(tour, { on: true, i, paused: false, arrived: false });
    deck.dataset.focus = 'true';
    markers.forEach((m, k) => m.el.classList.toggle('on', k === i));
    renderTour();
    const p = focusPose(ZONES[i]);
    flyTo(p.pos, p.target, 1760, () => { markSeen(ZONES[i]); tour.arrived = true; tour.t0 = performance.now(); });
  };
  const pauseTour = v => { if (!tour.on) return; tour.paused = v; if (!v) tour.t0 = performance.now() - (tour.prog || 0) * STAY; renderTour(); };
  const endTour = back => { if (!tour.on) return; tour.on = false; tourCard.hidden = true; if (back) { overview(); say('導覽結束'); } };
  ['tourStart', 'toolTour'].forEach(id => $(id).addEventListener('click', () => playTour(0)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && tour.on) endTour(true); });

  /* ---------- 點 3D 標柱 ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const hitAt = e => {
    const r = cv.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables)[0];
  };
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const h = hitAt(e); if (h) { endTour(); select(h.object.userData.i); }
  });
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') cv.style.cursor = hitAt(e) ? 'pointer' : ''; });

  /* ---------- 尺寸與迴圈 ---------- */
  const resize = () => {
    const w = deck.clientWidth, h = deck.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(deck);
  resize();

  const v = new THREE.Vector3(), placed = [];
  const placeMarkers = () => {
    const w = deck.clientWidth, h = deck.clientHeight, top = mobile() && current < 0 ? 250 : 40, bottom = h - (mobile() ? 88 : 64);
    placed.length = 0;
    markers.forEach((m, i) => {
      v.copy(m.anchor).project(camera);
      let x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      const off = v.z > 1 || x < -40 || x > w + 40;
      if (off || (current >= 0 && i !== current)) { m.el.hidden = current >= 0 && i !== current ? false : off; if (off) return; }
      // 避免標記互相重疊：試幾個位移，挑第一個不撞到的位置
      const bw = m.el.offsetWidth || 120, bh = m.el.offsetHeight || 32;
      let ok = null;
      for (const dy of [0, -50, 50, -100, 100, -150, 150]) {
        for (const dx of [0, 55, -55, 105, -105]) {
          const cx = Math.min(w - bw / 2 - 6, Math.max(bw / 2 + 6, x + dx)), cy = Math.min(bottom, Math.max(top, y + dy));
          if (!placed.some(p => Math.abs(p.x - cx) < (p.w + bw) / 2 + 4 && Math.abs(p.y - cy) < (p.h + bh) / 2 + 4)) { ok = { x: cx, y: cy }; break; }
        }
        if (ok) break;
      }
      if (!ok) { m.el.hidden = true; return; }
      m.el.hidden = false;
      placed.push({ x: ok.x, y: ok.y, w: bw, h: bh });
      m.el.style.left = ok.x.toFixed(1) + 'px'; m.el.style.top = ok.y.toFixed(1) + 'px';
    });
  };

  const tick = now => {
    if (fly) {
      const r = Math.min(1, (now - fly.s) / fly.ms), s = r * r * (3 - 2 * r);
      camera.position.lerpVectors(fly.p0, fly.p1, s);
      camera.position.y += Math.sin(s * Math.PI) * 4.8;
      camera.position.x += Math.sin(s * Math.PI) * 2.4;
      controls.target.lerpVectors(fly.t0, fly.t1, s);
      if (r >= 1) { const d = fly.done; fly = null; d && d(); }
    }
    if (tour.on && tour.arrived && !tour.paused) {
      tour.prog = Math.min(1, (now - tour.t0) / STAY);
      const pr = tourCard.querySelector('progress'); if (pr) pr.value = tour.prog;
      if (tour.prog >= 1) { tour.arrived = false; tour.i < ZONES.length - 1 ? playTour(tour.i + 1) : endTour(true); }
    }
    controls.update();
    if (!reduce) markers.forEach((m, i) => { m.orb.position.y = 7.4 + Math.sin(now / 700 + i) * .35; });
    placeMarkers();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  status.hidden = true;
  $('worldTools').hidden = false;
  const z0 = ZONES.findIndex(z => '#' + z.id === location.hash);
  if (z0 >= 0) select(z0, 1200);
})();
