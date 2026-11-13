(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const MARS_R = 3396190;
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  const ROUTE = {
    tile: 100,
    rows: 50,
    cols: 50,
    width: 5000,
    height: 5000,
    x0: -6000,
    yTop: 1095000,
    lon0: 77.5,
    latTs: 18.4,
    marsR: MARS_R,
  };
  ROUTE.yBottom = ROUTE.yTop - ROUTE.height;

  const SOURCES = {
    dtmPrimary: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif',
    dtmMirror: 'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif',
    usgsPage: 'https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hi_rise_and_ctx_digital_terrain_model_mosaic',
    nasaTrek: 'https://trek.nasa.gov/mars/',
  };

  const MAP_LAYERS = {
    hirise: {
      label: 'Jezero HiRISE controlled mosaic',
      sourceShort: 'NASA/JPL Mars Trek · HiRISE',
      id: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
      hardTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{y}/{x}.png',
      minZoom: 0,
      fallbackMax: 16,
    },
    ctx: {
      label: 'Jezero CTX controlled mosaic',
      sourceShort: 'NASA/JPL Mars Trek · CTX',
      id: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
      hardTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/default/default028mm/{z}/{y}/{x}.png',
      minZoom: 0,
      fallbackMax: 14,
    },
    mola: {
      label: 'MOLA / HRSC global context',
      sourceShort: 'NASA/JPL Mars Trek · MOLA/HRSC',
      id: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw',
      minZoom: 0,
      fallbackMax: 7,
      hardTemplate: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    },
  };

  const SCIENCE_ANCHORS = [
    { name: 'Delta Front context', lat: 18.4380, lon: 77.4210, strength: 1.0 },
    { name: 'Séítah context', lat: 18.4210, lon: 77.4410, strength: 0.82 },
    { name: 'Three Forks context', lat: 18.4310, lon: 77.4280, strength: 0.90 },
    { name: 'Delta Top context', lat: 18.4500, lon: 77.4080, strength: 0.94 },
  ];

  const PRESETS = {
    fast: { label: 'Fast', riskW: 0, sciW: 0, slopeCap: null, className: 'route-fast' },
    safe: { label: 'Safe', riskW: 3, sciW: 0, slopeCap: 18, className: 'route-safe' },
    balanced: { label: 'Balanced', riskW: 1.25, sciW: 0.13, slopeCap: 22, className: 'route-balanced' },
    science: { label: 'Science', riskW: 0.65, sciW: 0.34, slopeCap: 23.5, className: 'route-science' },
  };

  const state = {
    terrain: null,
    terrainStatus: 'idle',
    map: null,
    base: null,
    stops: [],
    mode: 'base',
    routeMode: 'balanced',
    route: null,
    comparisons: null,
    overlay: 'terrain',
    showGrid: true,
    playbackIndex: null,
    playbackTimer: null,
    sourceLabel: 'No terrain loaded',
  };

  function localToLatLon(lx, ly) {
    const x = ROUTE.x0 + lx;
    const y = ROUTE.yBottom + ly;
    const lat = (y / ROUTE.marsR) * RAD;
    const lon = ROUTE.lon0 + (x / (ROUTE.marsR * Math.cos(ROUTE.latTs * DEG))) * RAD;
    return { lat, lon };
  }

  function latLonToLocal(lat, lon) {
    const x = ROUTE.marsR * ((lon - ROUTE.lon0) * DEG) * Math.cos(ROUTE.latTs * DEG);
    const y = ROUTE.marsR * (lat * DEG);
    return { x: x - ROUTE.x0, y: y - ROUTE.yBottom };
  }

  function marsDistance(a, b) {
    const lat1 = a.lat * DEG, lat2 = b.lat * DEG;
    const dLat = (b.lat - a.lat) * DEG;
    const dLon = (b.lon - a.lon) * DEG;
    const q = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * MARS_R * Math.asin(Math.min(1, Math.sqrt(q)));
  }

  function zoneBounds() {
    const sw = localToLatLon(0, 0);
    const ne = localToLatLon(ROUTE.width, ROUTE.height);
    return { sw, ne };
  }

  function tileToLocal(i) {
    const r = Math.floor(i / ROUTE.cols);
    const c = i % ROUTE.cols;
    return {
      x: (c + 0.5) * ROUTE.tile,
      y: ROUTE.height - (r + 0.5) * ROUTE.tile,
      r,
      c,
    };
  }

  function tileToLatLon(i) {
    const p = tileToLocal(i);
    return localToLatLon(p.x, p.y);
  }

  function tileAtLatLon(lat, lon) {
    const p = latLonToLocal(lat, lon);
    if (p.x < 0 || p.y < 0 || p.x >= ROUTE.width || p.y >= ROUTE.height) return -1;
    const c = Math.floor(p.x / ROUTE.tile);
    const r = Math.floor((ROUTE.height - p.y) / ROUTE.tile);
    if (r < 0 || c < 0 || r >= ROUTE.rows || c >= ROUTE.cols) return -1;
    return r * ROUTE.cols + c;
  }

  function tileId(i) {
    const r = Math.floor(i / ROUTE.cols), c = i % ROUTE.cols;
    return `JEZ-100-R${String(r).padStart(3, '0')}-C${String(c).padStart(3, '0')}`;
  }

  function toast(message, tone = 'info') {
    const el = $('#mapToast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.toggle('bad', tone === 'warn');
    el.classList.toggle('good', tone === 'ok');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; el.classList.remove('bad','good'); }, 4200);
  }

  function setStatus(text, detail = '') {
    const a = $('#terrainLabel');
    const b = $('#terrainDetail');
    if (a) a.textContent = text;
    if (b) b.textContent = detail;
  }

  function setProgress(value, label) {
    const bar = $('#terrainProgress');
    const text = $('#terrainProgressText');
    if (bar) bar.style.width = `${clamp(value, 0, 100)}%`;
    if (text) text.textContent = label || `${Math.round(value)}%`;
  }

  class MarsCanvasMap {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      const bounds = zoneBounds();
      this.center = {
        lat: (bounds.sw.lat + bounds.ne.lat) / 2,
        lon: (bounds.sw.lon + bounds.ne.lon) / 2,
      };
      this.zoom = 13;
      this.layerKey = 'hirise';
      this.layer = MAP_LAYERS[this.layerKey];
      this.template = null;
      this.maxNative = this.layer.fallbackMax;
      this.tileCache = new Map();
      this.drag = null;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement || canvas);
      this.bind();
      this.resize();
      this.setLayer('hirise');
    }

    static worldSize(z) { return { w: 512 * 2 ** z, h: 256 * 2 ** z }; }

    project(lat, lon, z = this.zoom) {
      const { w, h } = MarsCanvasMap.worldSize(z);
      return { x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h };
    }

    unproject(x, y, z = this.zoom) {
      const { w, h } = MarsCanvasMap.worldSize(z);
      return { lon: (x / w) * 360 - 180, lat: 90 - (y / h) * 180 };
    }

    screenToLatLon(sx, sy) {
      const c = this.project(this.center.lat, this.center.lon);
      return this.unproject(c.x + sx - this.canvas.clientWidth / 2, c.y + sy - this.canvas.clientHeight / 2);
    }

    latLonToScreen(lat, lon) {
      const c = this.project(this.center.lat, this.center.lon);
      const p = this.project(lat, lon);
      return { x: p.x - c.x + this.canvas.clientWidth / 2, y: p.y - c.y + this.canvas.clientHeight / 2 };
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    }

    bind() {
      this.canvas.addEventListener('pointerdown', e => {
        this.drag = { x: e.clientX, y: e.clientY, center: this.project(this.center.lat, this.center.lon), moved: false };
        this.canvas.setPointerCapture(e.pointerId);
      });
      this.canvas.addEventListener('pointermove', e => {
        const r = this.canvas.getBoundingClientRect();
        const ll = this.screenToLatLon(e.clientX - r.left, e.clientY - r.top);
        updateCursorReadout(ll);
        if (!this.drag) return;
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 3) this.drag.moved = true;
        this.center = this.unproject(this.drag.center.x - dx, this.drag.center.y - dy);
        this.render();
      });
      this.canvas.addEventListener('pointerup', e => {
        const wasMoved = this.drag?.moved;
        this.drag = null;
        if (!wasMoved) {
          const r = this.canvas.getBoundingClientRect();
          handleMapClick(this.screenToLatLon(e.clientX - r.left, e.clientY - r.top));
        }
      });
      this.canvas.addEventListener('pointerleave', () => {
        if (!this.drag) $('#mapCoords').textContent = '—';
      });
      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const r = this.canvas.getBoundingClientRect();
        const sx = e.clientX - r.left, sy = e.clientY - r.top;
        const before = this.screenToLatLon(sx, sy);
        const old = this.zoom;
        this.zoom = clamp(this.zoom + (e.deltaY < 0 ? 1 : -1), 3, this.maxNative + 2);
        if (old !== this.zoom) {
          const pBefore = this.project(before.lat, before.lon);
          const cNew = { x: pBefore.x - sx + this.canvas.clientWidth / 2, y: pBefore.y - sy + this.canvas.clientHeight / 2 };
          this.center = this.unproject(cNew.x, cNew.y);
          this.render();
        }
      }, { passive: false });
    }

    async setLayer(key) {
      this.layerKey = key;
      this.layer = MAP_LAYERS[key];
      this.template = this.layer.hardTemplate || null;
      this.maxNative = this.layer.fallbackMax;
      $('#mapSource').textContent = `BASEMAP · ${this.layer.label} · NASA/JPL Mars Trek`;
      const provenanceBasemap = $('#mapProvenanceBasemap');
      if (provenanceBasemap) provenanceBasemap.textContent = this.layer.sourceShort || `NASA/JPL Mars Trek · ${this.layer.label}`;
      try {
        if (!this.template) {
          const caps = `https://trek.nasa.gov/tiles/Mars/EQ/${this.layer.id}/1.0.0/WMTSCapabilities.xml`;
          const res = await fetch(caps, { mode: 'cors' });
          if (!res.ok) throw new Error(`Capabilities ${res.status}`);
          const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
          const resources = [...xml.querySelectorAll('ResourceURL')];
          const tileResource = resources.find(x => x.getAttribute('resourceType') === 'tile');
          if (!tileResource) throw new Error('No WMTS tile template');
          this.template = tileResource.getAttribute('template');
          const matrices = [...xml.querySelectorAll('TileMatrix > Identifier')]
            .map(x => Number(x.textContent.trim())).filter(Number.isFinite);
          if (matrices.length) this.maxNative = Math.max(...matrices);
        }
        if (state.terrainStatus !== 'ready' && $('#headerStatus')) $('#headerStatus').textContent = 'NASA MAP READY';
      } catch (err) {
        console.warn(err);
        if (state.terrainStatus !== 'ready' && $('#headerStatus')) $('#headerStatus').textContent = 'NASA MAP UNAVAILABLE';
        if (key !== 'mola') {
          toast('NASA imagery could not be reached. The mission grid and terrain engine still work; try the MOLA layer or reconnect.', 'warn');
        }
      }
      this.render();
      const loading=$('#mapLoading'); if(loading) loading.hidden=true;
    }

    tileURL(z, x, y) {
      if (!this.template) return null;
      return this.template.replace('{TileMatrix}', z).replace('{TileRow}', y).replace('{TileCol}', x)
        .replace('{z}', z).replace('{x}', x).replace('{y}', y);
    }

    getImage(url) {
      if (!url) return null;
      let rec = this.tileCache.get(url);
      if (rec) return rec;
      const img = new Image();
      rec = { img, state: 'loading' };
      this.tileCache.set(url, rec);
      img.onload = () => { rec.state = 'ready'; this.render(); };
      img.onerror = () => { rec.state = 'error'; };
      img.referrerPolicy = 'no-referrer';
      img.src = url;
      if (this.tileCache.size > 260) {
        for (const [k, v] of this.tileCache) {
          if (v.state !== 'loading') { this.tileCache.delete(k); break; }
        }
      }
      return rec;
    }

    fitZone() {
      const b = zoneBounds();
      const zCandidates = [];
      for (let z = 3; z <= this.maxNative + 2; z++) {
        const sw = this.project(b.sw.lat, b.sw.lon, z);
        const ne = this.project(b.ne.lat, b.ne.lon, z);
        const w = Math.abs(ne.x - sw.x), h = Math.abs(ne.y - sw.y);
        if (w < this.canvas.clientWidth * 0.72 && h < this.canvas.clientHeight * 0.72) zCandidates.push(z);
      }
      this.zoom = zCandidates.at(-1) || 12;
      this.center = { lat: (b.sw.lat + b.ne.lat) / 2, lon: (b.sw.lon + b.ne.lon) / 2 };
      this.render();
    }

    zoomBy(delta) {
      this.zoom = clamp(this.zoom + delta, 3, this.maxNative + 2);
      this.render();
    }

    render() {
      const ctx = this.ctx, w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0c0d0e';
      ctx.fillRect(0, 0, w, h);

      const nativeZ = Math.min(this.zoom, this.maxNative);
      const scale = 2 ** (this.zoom - nativeZ);
      const cNative = this.project(this.center.lat, this.center.lon, nativeZ);
      const viewWNative = w / scale, viewHNative = h / scale;
      const left = cNative.x - viewWNative / 2, top = cNative.y - viewHNative / 2;
      const tileSize = 256;
      const x0 = Math.floor(left / tileSize), x1 = Math.floor((left + viewWNative) / tileSize);
      const y0 = Math.floor(top / tileSize), y1 = Math.floor((top + viewHNative) / tileSize);
      const { w: worldW, h: worldH } = MarsCanvasMap.worldSize(nativeZ);
      const cols = Math.ceil(worldW / tileSize), rows = Math.ceil(worldH / tileSize);

      for (let ty = y0; ty <= y1; ty++) {
        if (ty < 0 || ty >= rows) continue;
        for (let tx = x0; tx <= x1; tx++) {
          let wrappedX = ((tx % cols) + cols) % cols;
          const url = this.tileURL(nativeZ, wrappedX, ty);
          const rec = this.getImage(url);
          const sx = (tx * tileSize - left) * scale;
          const sy = (ty * tileSize - top) * scale;
          const s = tileSize * scale + 0.8;
          if (rec?.state === 'ready') {
            ctx.drawImage(rec.img, sx, sy, s, s);
          } else {
            ctx.fillStyle = ((tx + ty) & 1) ? '#111315' : '#0f1112';
            ctx.fillRect(sx, sy, s, s);
          }
        }
      }

      ctx.fillStyle = 'rgba(7,9,10,.10)';
      ctx.fillRect(0, 0, w, h);
      drawMissionOverlay(ctx, this);
    }
  }

  function drawMissionOverlay(ctx, map) {
    const b = zoneBounds();
    const nw = map.latLonToScreen(b.ne.lat, b.sw.lon);
    const se = map.latLonToScreen(b.sw.lat, b.ne.lon);
    const x = Math.min(nw.x, se.x), y = Math.min(nw.y, se.y), w = Math.abs(se.x - nw.x), h = Math.abs(se.y - nw.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 205, 151, .92)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 205, 151, .06)';
    ctx.fillRect(x, y, w, h);

    if (state.terrain) drawTerrainOverlay(ctx, map);
    drawRoutesAndPoints(ctx, map);

    ctx.fillStyle = 'rgba(255,239,219,.92)';
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('5 × 5 KM JEZERO EVA ZONE', x + 9, y + 16);
    ctx.restore();
  }

  function cellColor(cell, overlay) {
    if (!cell.ok) return 'rgba(29, 22, 20, .72)';
    if (overlay === 'slope') {
      const t = clamp(cell.p90 / 25, 0, 1);
      return `rgba(${Math.round(52 + 203 * t)},${Math.round(128 - 72 * t)},${Math.round(160 - 110 * t)},${0.07 + 0.34 * t})`;
    }
    if (overlay === 'science') {
      const t = cell.science || 0;
      return `rgba(${Math.round(92 + 115 * t)},${Math.round(72 + 45 * t)},${Math.round(151 + 90 * t)},${0.04 + 0.38 * t})`;
    }
    const t = cell.risk || 0;
    return `rgba(${Math.round(150 + 95 * t)},${Math.round(105 - 55 * t)},${Math.round(59 - 34 * t)},${0.05 + 0.38 * t})`;
  }

  function drawTerrainOverlay(ctx, map) {
    const cells = state.terrain.cells;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const r = Math.floor(i / ROUTE.cols), c = i % ROUTE.cols;
      const x0l = c * ROUTE.tile, x1l = (c + 1) * ROUTE.tile;
      const yTopLocal = ROUTE.height - r * ROUTE.tile;
      const yBotLocal = yTopLocal - ROUTE.tile;
      const nwLL = localToLatLon(x0l, yTopLocal), seLL = localToLatLon(x1l, yBotLocal);
      const nw = map.latLonToScreen(nwLL.lat, nwLL.lon), se = map.latLonToScreen(seLL.lat, seLL.lon);
      if (se.x < 0 || nw.x > map.canvas.clientWidth || se.y < 0 || nw.y > map.canvas.clientHeight) continue;
      ctx.fillStyle = cellColor(cell, state.overlay);
      ctx.fillRect(nw.x, nw.y, se.x - nw.x + 0.4, se.y - nw.y + 0.4);
      if (state.showGrid && Math.abs(se.x - nw.x) > 5) {
        ctx.strokeStyle = 'rgba(255,255,255,.07)';
        ctx.lineWidth = .6;
        ctx.strokeRect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
      }
    }
  }

  function drawRoutesAndPoints(ctx, map) {
    const route = state.route;
    if (route?.path?.length) {
      ctx.save();
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = route.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      route.path.forEach((idx, k) => {
        const ll = tileToLatLon(idx), p = map.latLonToScreen(ll.lat, ll.lon);
        k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
      drawRouteDirectionMarkers(ctx, map, route);
    }

    const points = [];
    if (state.base != null) points.push({ i: state.base, label: 'BASE', kind: 'base' });
    state.stops.forEach((i, n) => points.push({ i, label: `S${n + 1}`, kind: 'stop' }));
    for (const p of points) {
      const ll = tileToLatLon(p.i), s = map.latLonToScreen(ll.lat, ll.lon);
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.kind === 'base' ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = p.kind === 'base' ? '#f8d4a4' : '#f57d52';
      ctx.fill();
      ctx.strokeStyle = '#101214'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff5e8';
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(p.label, s.x + 10, s.y + 4);
      ctx.restore();
    }

    if (state.playbackIndex != null && route?.path?.[state.playbackIndex] != null) {
      const idx = route.path[state.playbackIndex], ll = tileToLatLon(idx), s = map.latLonToScreen(ll.lat, ll.lon);
      ctx.save();
      ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    }
  }


  function drawRouteDirectionMarkers(ctx, map, route) {
    const path = route?.path || [];
    if (path.length < 4) return;
    const step = Math.max(8, Math.floor(path.length / 6));
    ctx.save();
    ctx.fillStyle = '#fff0dc';
    ctx.strokeStyle = 'rgba(14,16,17,.9)';
    ctx.lineWidth = 1.2;
    for (let k = step; k < path.length - 1; k += step) {
      const aLL = tileToLatLon(path[Math.max(0, k - 2)]);
      const bLL = tileToLatLon(path[Math.min(path.length - 1, k + 2)]);
      const a = map.latLonToScreen(aLL.lat, aLL.lon);
      const b = map.latLonToScreen(bLL.lat, bLL.lon);
      const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      if (!Number.isFinite(ang)) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -4.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-5, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function updateCursorReadout(ll) {
    const el = $('#mapCoords');
    if (!el) return;
    const idx = tileAtLatLon(ll.lat, ll.lon);
    if (idx >= 0) {
      const c = state.terrain?.cells?.[idx];
      el.textContent = `${ll.lat.toFixed(5)}°, ${ll.lon.toFixed(5)}° · ${tileId(idx)}${c ? ` · ${c.p90.toFixed(1)}° p90` : ''}`;
    } else {
      el.textContent = `${ll.lat.toFixed(5)}°, ${ll.lon.toFixed(5)}°`;
    }
  }

  async function importGeoTIFF() {
    if (importGeoTIFF._mod) return importGeoTIFF._mod;
    const urls = [
      'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm',
      'https://esm.sh/geotiff@2.1.3',
    ];
    let last;
    for (const url of urls) {
      try {
        importGeoTIFF._mod = await import(url);
        return importGeoTIFF._mod;
      } catch (e) { last = e; }
    }
    throw new Error(`GeoTIFF.js could not be loaded: ${last?.message || last}`);
  }

  function percentile(sorted, p) {
    if (!sorted.length) return NaN;
    const x = (sorted.length - 1) * p;
    const lo = Math.floor(x), hi = Math.ceil(x);
    if (lo === hi) return sorted[lo];
    return lerp(sorted[lo], sorted[hi], x - lo);
  }

  function scienceContext(lat, lon) {
    let best = 0, bestName = null;
    for (const a of SCIENCE_ANCHORS) {
      const d = marsDistance({ lat, lon }, a);
      const score = a.strength * Math.exp(-((d / 480) ** 2));
      if (score > best) { best = score; bestName = a.name; }
    }
    return { score: clamp(best, 0, 1), name: best >= 0.05 ? bestName : null };
  }

  async function openGeoTiffFromRemote() {
    const GeoTIFF = await importGeoTIFF();
    const urls = [SOURCES.dtmPrimary, SOURCES.dtmMirror];
    let last;
    for (const url of urls) {
      try {
        setStatus('Opening official USGS CTX DEM', url.includes('s3') ? 'NASA/USGS PDS mirror' : 'USGS Astrogeology');
        setProgress(8, 'Opening GeoTIFF…');
        if (GeoTIFF.fromUrl) return { tiff: await GeoTIFF.fromUrl(url, { cache: true }), url };
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { tiff: await GeoTIFF.fromArrayBuffer(await res.arrayBuffer()), url };
      } catch (err) { last = err; console.warn('Terrain source failed', url, err); }
    }
    throw new Error(`The official CTX DEM could not be opened in this browser. ${last?.message || ''}`.trim());
  }

  async function openGeoTiffFromFile(file) {
    const GeoTIFF = await importGeoTIFF();
    setStatus('Reading local CTX DEM', file.name);
    setProgress(8, 'Reading local GeoTIFF…');
    return { tiff: await GeoTIFF.fromArrayBuffer(await file.arrayBuffer()), url: `local:${file.name}` };
  }

  async function buildTerrainFromTiff(tiff, sourceURL) {
    const image = await tiff.getImage();
    const origin = image.getOrigin();
    const resolution = image.getResolution();
    const imgW = image.getWidth(), imgH = image.getHeight();
    const nodata = Number(image.getGDALNoData?.());
    setProgress(18, 'Locating the 5 × 5 km Jezero window…');

    const corners = [localToLatLon(0, 0), localToLatLon(ROUTE.width, 0), localToLatLon(0, ROUTE.height), localToLatLon(ROUTE.width, ROUTE.height)];
    const srcPts = corners.map(p => ({ x: MARS_R * p.lon * DEG, y: MARS_R * p.lat * DEG }));
    const cols = srcPts.map(p => (p.x - origin[0]) / resolution[0]);
    const rows = srcPts.map(p => (p.y - origin[1]) / resolution[1]);
    let x0 = clamp(Math.floor(Math.min(...cols)) - 3, 0, imgW - 1);
    let x1 = clamp(Math.ceil(Math.max(...cols)) + 4, x0 + 1, imgW);
    let y0 = clamp(Math.floor(Math.min(...rows)) - 3, 0, imgH - 1);
    let y1 = clamp(Math.ceil(Math.max(...rows)) + 4, y0 + 1, imgH);

    setProgress(25, `Reading ${x1 - x0} × ${y1 - y0} source pixels…`);
    const raster = await image.readRasters({ window: [x0, y0, x1, y1], samples: [0], interleave: true });
    const srcW = x1 - x0, srcH = y1 - y0;

    const workRes = 20;
    const workN = Math.round(ROUTE.width / workRes);
    const elev = new Float64Array(workN * workN);
    elev.fill(NaN);
    const validSource = v => Number.isFinite(v) && Math.abs(v) <= 1e20 && !(Number.isFinite(nodata) && v === nodata);
    const sampleAt = (lx, ly) => {
      const ll = localToLatLon(lx, ly);
      const sx = MARS_R * ll.lon * DEG;
      const sy = MARS_R * ll.lat * DEG;
      const cf = (sx - origin[0]) / resolution[0] - x0;
      const rf = (sy - origin[1]) / resolution[1] - y0;
      const c0 = Math.floor(cf), r0 = Math.floor(rf), c1 = c0 + 1, r1 = r0 + 1;
      if (c0 < 0 || r0 < 0 || c1 >= srcW || r1 >= srcH) return NaN;
      const vals = [Number(raster[r0*srcW+c0]), Number(raster[r0*srcW+c1]), Number(raster[r1*srcW+c0]), Number(raster[r1*srcW+c1])];
      if (!vals.every(validSource)) {
        const nearest = Number(raster[Math.round(rf) * srcW + Math.round(cf)]);
        return validSource(nearest) ? nearest : NaN;
      }
      const tx = cf - c0, ty = rf - r0;
      const top = vals[0] * (1-tx) + vals[1] * tx;
      const bottom = vals[2] * (1-tx) + vals[3] * tx;
      return top * (1-ty) + bottom * ty;
    };

    setProgress(38, 'Reprojecting elevation onto the MarsWalk grid…');
    for (let wr = 0; wr < workN; wr++) {
      const ly = ROUTE.height - (wr + 0.5) * workRes;
      for (let wc = 0; wc < workN; wc++) {
        const lx = (wc + 0.5) * workRes;
        elev[wr * workN + wc] = sampleAt(lx, ly);
      }
      if (wr % 25 === 0) setProgress(38 + 18 * wr / workN, `Reprojecting row ${wr + 1}/${workN}…`);
    }

    setProgress(58, 'Computing slope from the real CTX elevation surface…');
    const slope = new Float64Array(elev.length); slope.fill(NaN);
    for (let r = 1; r < workN - 1; r++) {
      for (let c = 1; c < workN - 1; c++) {
        const l = elev[r * workN + c - 1], rr = elev[r * workN + c + 1];
        const u = elev[(r - 1) * workN + c], d = elev[(r + 1) * workN + c];
        if (![l, rr, u, d].every(Number.isFinite)) continue;
        const gx = (rr - l) / (2 * workRes);
        const gy = (d - u) / (2 * workRes);
        slope[r * workN + c] = Math.atan(Math.hypot(gx, gy)) * RAD;
      }
    }

    setProgress(68, 'Summarizing 2,500 route cells…');
    const cells = [];
    const cellWork = ROUTE.tile / workRes;
    const reliefs = [];
    for (let tr = 0; tr < ROUTE.rows; tr++) {
      for (let tc = 0; tc < ROUTE.cols; tc++) {
        const zs = [], ss = [];
        for (let dr = 0; dr < cellWork; dr++) for (let dc = 0; dc < cellWork; dc++) {
          const wr = tr * cellWork + dr, wc = tc * cellWork + dc;
          const z = elev[wr * workN + wc], s = slope[wr * workN + wc];
          if (Number.isFinite(z)) zs.push(z);
          if (Number.isFinite(s)) ss.push(s);
        }
        zs.sort((a,b) => a-b); ss.sort((a,b) => a-b);
        const coverage = zs.length / (cellWork * cellWork);
        const meanElev = zs.length ? zs.reduce((a,b)=>a+b,0) / zs.length : NaN;
        const p90 = ss.length ? percentile(ss, .90) : NaN;
        const steepFrac = ss.length ? ss.filter(v => v > 25).length / ss.length : 1;
        const relief = zs.length ? percentile(zs, .90) - percentile(zs, .10) : NaN;
        if (Number.isFinite(relief)) reliefs.push(relief);
        cells.push({ elev: meanElev, p90, steepFrac, relief, coverage, risk: 0, science: 0, scienceLabel: null, ok: false });
      }
    }

    reliefs.sort((a,b)=>a-b);
    const reliefScale = Math.max(1, percentile(reliefs, .95));
    let openCount = 0;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const ll = tileToLatLon(i);
      const sci = scienceContext(ll.lat, ll.lon);
      const slopeScore = Number.isFinite(cell.p90) ? clamp((cell.p90 - 5) / 20, 0, 1) : 1;
      const reliefScore = Number.isFinite(cell.relief) ? clamp(cell.relief / reliefScale, 0, 1) : 1;
      cell.risk = clamp(.80 * slopeScore + .20 * reliefScore, 0, 1);
      cell.science = sci.score;
      cell.scienceLabel = sci.name;
      cell.ok = cell.coverage >= .80 && Number.isFinite(cell.p90) && cell.p90 <= 25;
      if (cell.ok) openCount++;
      for (const k of ['elev','p90','steepFrac','relief','coverage','risk','science']) {
        if (Number.isFinite(cell[k])) cell[k] = Math.round(cell[k] * 1000) / 1000;
      }
    }

    setProgress(88, 'Validating route graph…');
    const terrain = {
      version: 3,
      created: new Date().toISOString(),
      source: sourceURL,
      sourceType: 'USGS Mars 2020 CTX DTM',
      sourceResolutionM: Math.abs(resolution[0] || 20),
      grid: { rows: ROUTE.rows, cols: ROUTE.cols, tileM: ROUTE.tile, localCrs: `+proj=eqc +lat_ts=${ROUTE.latTs} +lat_0=0 +lon_0=${ROUTE.lon0} +R=${MARS_R} +units=m`, x0: ROUTE.x0, yTop: ROUTE.yTop },
      methodology: {
        slope: '20 m working grid; central-difference slope; p90 summarized per 100 m cell',
        passable: '>=80% elevation coverage and p90 slope <=25°',
        risk: 'modeled terrain cost = 0.80 normalized p90 slope + 0.20 normalized local relief',
        science: 'context-only proximity to named Jezero waypoints; not a CRISM mineral measurement',
      },
      cells,
    };
    terrain.stats = summarizeTerrain(terrain);
    if (openCount < 150) throw new Error('Too few passable cells were produced. This DEM may not cover the mission zone correctly.');
    setProgress(100, `Ready · ${openCount.toLocaleString()} passable cells`);
    return terrain;
  }

  function summarizeTerrain(terrain) {
    const valid = terrain.cells.filter(c => Number.isFinite(c.p90));
    const pass = terrain.cells.filter(c => c.ok);
    const slopes = valid.map(c => c.p90).sort((a,b)=>a-b);
    const elevs = valid.map(c => c.elev).filter(Number.isFinite);
    return {
      valid: valid.length,
      passable: pass.length,
      impassable: terrain.cells.length - pass.length,
      medianSlope: slopes.length ? percentile(slopes, .5) : NaN,
      p95Slope: slopes.length ? percentile(slopes, .95) : NaN,
      minElev: elevs.length ? Math.min(...elevs) : NaN,
      maxElev: elevs.length ? Math.max(...elevs) : NaN,
    };
  }

  function acceptTerrain(terrain, sourceLabel, cache = true) {
    state.terrain = terrain;
    state.sourceLabel = sourceLabel;
    state.terrainStatus = 'ready';
    if (cache) {
      try { localStorage.setItem('tdmTerrainGridV3', JSON.stringify(terrain)); } catch (e) { console.warn('Terrain cache skipped', e); }
    }
    const stats = terrain.stats || summarizeTerrain(terrain);
    terrain.stats = stats;
    setStatus('Real terrain ready', `${sourceLabel} · ${stats.passable.toLocaleString()} passable / 2,500 cells · median p90 ${Number.isFinite(stats.medianSlope) ? stats.medianSlope.toFixed(1) + '°' : '—'}`);
    $('#terrainDot')?.classList.remove('bad'); $('#terrainDot')?.classList.add('ready');
    $('#headerDot')?.classList.remove('bad'); $('#headerDot')?.classList.add('ready');
    if ($('#headerStatus')) $('#headerStatus').textContent = 'REAL TERRAIN READY';
    $('#planRoute').disabled = !(state.base != null && state.stops.length);
    $('#compareRoutes').disabled = !(state.base != null && state.stops.length);
    state.map?.render();
    updateInspector(state.base ?? 0);
    renderPoints();
  }

  async function loadOfficialTerrain() {
    if (state.terrainStatus === 'loading') return;
    state.terrainStatus = 'loading';
    try {
      const { tiff, url } = await openGeoTiffFromRemote();
      const terrain = await buildTerrainFromTiff(tiff, url);
      acceptTerrain(terrain, 'USGS CTX DTM · live', true);
      toast('Real CTX terrain loaded. You can now place a base and route stops.', 'ok');
    } catch (err) {
      console.error(err);
      state.terrainStatus = 'error';
      $('#terrainDot')?.classList.add('bad'); $('#headerDot')?.classList.add('bad');
      setStatus('Terrain not loaded', 'Use “Open local GeoTIFF” if your browser blocks cross-origin range requests.');
      setProgress(0, 'No terrain grid');
      toast(err.message || 'Could not load the official terrain dataset.', 'warn');
    }
  }

  async function loadLocalTerrain(file) {
    if (!file) return;
    state.terrainStatus = 'loading';
    try {
      const { tiff, url } = await openGeoTiffFromFile(file);
      const terrain = await buildTerrainFromTiff(tiff, url);
      acceptTerrain(terrain, `Local official CTX DTM · ${file.name}`, true);
      toast('Local CTX DEM processed successfully.', 'ok');
    } catch (err) {
      console.error(err);
      state.terrainStatus = 'error';
      $('#terrainDot')?.classList.add('bad'); $('#headerDot')?.classList.add('bad');
      setStatus('Local terrain failed', err.message || 'Could not process GeoTIFF');
      toast(err.message || 'Could not process the selected GeoTIFF.', 'warn');
    }
  }

  function restoreTerrain() {
    if (window.TDM_TERRAIN_GRID?.cells?.length === ROUTE.rows * ROUTE.cols) {
      acceptTerrain(window.TDM_TERRAIN_GRID, 'Bundled precomputed CTX grid', false);
      setProgress(100, 'Bundled real terrain ready');
      return true;
    }
    try {
      const raw = localStorage.getItem('tdmTerrainGridV3');
      if (!raw) return false;
      const terrain = JSON.parse(raw);
      if (terrain?.cells?.length !== ROUTE.rows * ROUTE.cols) return false;
      acceptTerrain(terrain, 'Cached CTX terrain', false);
      setProgress(100, 'Cached real terrain ready');
      return true;
    } catch { return false; }
  }

  function findNearestOpen(i, radius = 4, slopeCap = null) {
    if (i < 0 || !state.terrain) return -1;
    const cell = state.terrain.cells[i];
    if (cell?.ok && (slopeCap == null || cell.p90 <= slopeCap)) return i;
    const r0 = Math.floor(i / ROUTE.cols), c0 = i % ROUTE.cols;
    let best = -1, bestD = Infinity;
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || c < 0 || r >= ROUTE.rows || c >= ROUTE.cols) continue;
      const j = r * ROUTE.cols + c, cc = state.terrain.cells[j];
      if (!cc.ok || (slopeCap != null && cc.p90 > slopeCap)) continue;
      const d = Math.hypot(dr, dc);
      if (d < bestD) { bestD = d; best = j; }
    }
    return best;
  }

  function handleMapClick(ll) {
    const idxRaw = tileAtLatLon(ll.lat, ll.lon);
    if (idxRaw < 0) {
      toast('That point is outside the 5 × 5 km MarsWalk planning zone.', 'warn');
      return;
    }
    if (!state.terrain) {
      toast('Load the real CTX terrain first. The imagery map can be explored while it loads.', 'warn');
      return;
    }
    if (state.mode === 'inspect') {
      updateInspector(idxRaw);
      return;
    }
    const idx = findNearestOpen(idxRaw, 4);
    if (idx < 0) {
      toast('No passable 100 m cell was found near that click.', 'warn');
      return;
    }
    if (idx !== idxRaw) toast('Clicked cell is outside the slope/coverage envelope; snapped to the nearest passable cell.', 'warn');
    if (state.mode === 'base') {
      state.base = idx;
      state.route = null;
      state.comparisons = null;
      state.mode = 'stop';
      activateModeButton('stop');
      toast('Base placed. Add one or more destination stops.', 'ok');
    } else {
      if (idx === state.base || state.stops.includes(idx)) {
        toast('That cell is already in the mission plan.', 'warn');
        return;
      }
      state.stops.push(idx);
      state.route = null;
      state.comparisons = null;
    }
    renderPoints();
    updateInspector(idx);
    const enabled = state.base != null && state.stops.length;
    $('#planRoute').disabled = !enabled; $('#compareRoutes').disabled = !enabled;
    state.map.render();
  }

  function renderPoints() {
    const el = $('#pointList');
    if (!el) return;
    const items = [];
    if (state.base != null) items.push({ idx: state.base, name: 'Base Camp Alpha', type: 'BASE', remove: 'base' });
    state.stops.forEach((idx, n) => items.push({ idx, name: `Stop ${String(n + 1).padStart(2, '0')}`, type: 'STOP', remove: n }));
    if (!items.length) {
      el.innerHTML = '<div class="empty-state">No mission points yet. Load terrain, then click the real Jezero map to place a base.</div>';
      return;
    }
    el.innerHTML = items.map((p,n) => {
      const ll = tileToLatLon(p.idx), c = state.terrain?.cells[p.idx];
      return `<article class="point-item ${p.type === 'BASE' ? 'base' : ''}"><i>${p.type === 'BASE' ? 'B' : n}</i><div><b>${p.name}</b><small>${tileId(p.idx)} · ${ll.lat.toFixed(5)}°, ${ll.lon.toFixed(5)}°${c ? ` · p90 ${c.p90.toFixed(1)}°` : ''}</small></div><button data-remove-point="${p.remove}" aria-label="Remove ${p.name}">×</button></article>`;
    }).join('');
    $$('[data-remove-point]', el).forEach(btn => btn.onclick = () => {
      const val = btn.dataset.removePoint;
      if (val === 'base') {
        state.base = null; state.stops = []; state.mode = 'base'; activateModeButton('base');
      } else state.stops.splice(Number(val), 1);
      state.route = null; state.comparisons = null; state.playbackIndex = null;
      const enabled = state.base != null && state.stops.length;
      $('#planRoute').disabled = !enabled;
      $('#compareRoutes').disabled = !enabled;
      renderPoints(); renderRouteSummary(); state.map.render();
    });
  }

  function updateInspector(i) {
    const el = $('#inspector');
    if (!el || !state.terrain || i == null || i < 0) return;
    const c = state.terrain.cells[i], ll = tileToLatLon(i);
    el.innerHTML = `<div class="inspector-head"><b>${tileId(i)}</b><span>${ll.lat.toFixed(5)}°, ${ll.lon.toFixed(5)}°</span><em class="terrain-pill ${c.ok ? 'good' : 'bad'}">${c.ok ? 'PASSABLE · CURRENT LIMITS' : 'IMPASSABLE / INCOMPLETE'}</em></div>
      <div class="inspector-grid">
        <div><small>Elevation</small><b>${Number.isFinite(c.elev) ? Math.round(c.elev) + ' m' : '—'}</b></div>
        <div><small>p90 slope</small><b>${Number.isFinite(c.p90) ? c.p90.toFixed(1) + '°' : '—'}</b></div>
        <div><small>Local relief</small><b>${Number.isFinite(c.relief) ? c.relief.toFixed(1) + ' m' : '—'}</b></div>
        <div><small>Terrain cost</small><b>${Number.isFinite(c.risk) ? Math.round(c.risk * 100) : '—'}</b></div>
        <div><small>Coverage</small><b>${Number.isFinite(c.coverage) ? Math.round(c.coverage * 100) + '%' : '—'}</b></div>
        <div><small>Science context</small><b>${Number.isFinite(c.science) ? Math.round(c.science * 100) : '—'}</b></div>
      </div><p class="micro">${c.scienceLabel ? `${c.scienceLabel}. ` : ''}Science context is a storytelling waypoint layer, not a CRISM mineral measurement.</p>`;
  }

  const NBRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  function isOpen(i, preset = null) {
    const c = state.terrain.cells[i];
    return !!(c?.ok && (preset?.slopeCap == null || c.p90 <= preset.slopeCap));
  }

  function neighbors(u, preset) {
    const r = Math.floor(u / ROUTE.cols), c = u % ROUTE.cols, out = [];
    for (const [dr, dc] of NBRS) {
      const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || c2 < 0 || r2 >= ROUTE.rows || c2 >= ROUTE.cols) continue;
      const v = r2 * ROUTE.cols + c2;
      if (!isOpen(v, preset)) continue;
      const diag = dr !== 0 && dc !== 0;
      if (diag) {
        const a = r * ROUTE.cols + c2, b = r2 * ROUTE.cols + c;
        if (!isOpen(a, preset) || !isOpen(b, preset)) continue;
      }
      out.push([v, diag]);
    }
    return out;
  }

  function assumptions() {
    return {
      capacityL: Number($('#o2Capacity').value) || 480,
      reserveL: Number($('#o2Reserve').value) || 90,
      walkLMin: Number($('#o2Walk').value) || 1.2,
      dwellLMin: Number($('#o2Dwell').value) || .8,
      dwellMin: Number($('#dwellMin').value) || 10,
      baseSpeed: Number($('#baseSpeed').value) || .85,
    };
  }

  function edgeMetrics(u, v, diag, A = assumptions()) {
    const a = state.terrain.cells[u], b = state.terrain.cells[v];
    const d = diag ? ROUTE.tile * Math.SQRT2 : ROUTE.tile;
    const tan = (b.elev - a.elev) / d;
    const tobler = A.baseSpeed * Math.exp(-3.5 * Math.abs(tan + 0.05));
    const risk = (a.risk + b.risk) / 2;
    const speed = clamp(tobler / (1 + .24 * risk), .10, Math.max(.12, A.baseSpeed * 1.12));
    return { distance: d, time: d / speed, tan, risk, science: ((a.science || 0) + (b.science || 0)) / 2 };
  }

  function edgeCost(u, v, diag, preset, pureTime = false, A = assumptions()) {
    const m = edgeMetrics(u, v, diag, A);
    if (pureTime) return m.time;
    return m.time * (1 + preset.riskW * m.risk) * Math.max(.54, 1 - preset.sciW * m.science);
  }

  class MinHeap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(k, v) {
      const a = this.a; a.push([k,v]); let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p],a[i]]=[a[i],a[p]]; i=p; }
    }
    pop() {
      const a=this.a, top=a[0], last=a.pop();
      if (a.length) { a[0]=last; let i=0; for (;;) { const l=2*i+1,r=l+1; let m=i; if(l<a.length&&a[l][0]<a[m][0])m=l; if(r<a.length&&a[r][0]<a[m][0])m=r; if(m===i)break; [a[m],a[i]]=[a[i],a[m]]; i=m; } }
      return top;
    }
  }

  function dijkstra(source, target, preset, { reverse = false, pureTime = false } = {}) {
    const n = ROUTE.rows * ROUTE.cols;
    const dist = new Float64Array(n); dist.fill(Infinity);
    const prev = new Int32Array(n); prev.fill(-1);
    const heap = new MinHeap(); dist[source]=0; heap.push(0,source);
    while (heap.size) {
      const [du,u]=heap.pop(); if (du !== dist[u]) continue; if (u === target) break;
      for (const [v,diag] of neighbors(u,preset)) {
        const w = reverse ? edgeCost(v,u,diag,preset,pureTime) : edgeCost(u,v,diag,preset,pureTime);
        const nd = du + w;
        if (nd < dist[v]) { dist[v]=nd; prev[v]=u; heap.push(nd,v); }
      }
    }
    return { dist, prev };
  }

  function reconstruct(prev, source, target) {
    const path=[]; let v=target, guard=0;
    while (v !== -1 && guard++ < 10000) { path.push(v); if (v === source) break; v=prev[v]; }
    path.reverse();
    return path[0] === source ? path : null;
  }

  function walkbackMap(base, A) {
    return dijkstra(base, -1, { riskW:0,sciW:0,slopeCap:null }, { reverse:true, pureTime:true }).dist;
  }

  function planSequence(presetKey) {
    const preset = PRESETS[presetKey], A = assumptions();
    const points = [state.base, ...state.stops, state.base];
    const path=[points[0]], stopAt=[];
    for (let k=0;k<points.length-1;k++) {
      const start = points[k], end = points[k+1];
      if (!isOpen(start, preset) || !isOpen(end, preset)) return { error: `${preset.label} mode cannot use one of the selected points under its slope cap.` };
      const {prev}=dijkstra(start,end,preset);
      const leg=reconstruct(prev,start,end);
      if (!leg) return { error: `${preset.label} mode could not connect all mission points.` };
      path.push(...leg.slice(1));
      if (k + 1 < points.length - 1) stopAt.push(path.length - 1);
    }
    return evaluateRoute(path, stopAt, presetKey, A);
  }

  function evaluateRoute(path, stopAt, presetKey, A) {
    const preset=PRESETS[presetKey], thome=walkbackMap(path[0],A);
    const stopSet=new Set(stopAt);
    const elapsed=new Float64Array(path.length), usedO2=new Float64Array(path.length), margin=new Float64Array(path.length);
    let time=0, o2=0, distance=0, ascent=0, riskSum=0, sciSum=0, maxSlope=0, riskN=0, sciN=0;
    let minMargin=Infinity;
    for (let k=0;k<path.length;k++) {
      const c=state.terrain.cells[path[k]];
      maxSlope=Math.max(maxSlope,Number.isFinite(c.p90)?c.p90:0); riskSum+=c.risk||0; riskN++; sciSum+=c.science||0; sciN++;
      if (k>0) {
        const u=path[k-1],v=path[k], diag=(u%ROUTE.cols)!==(v%ROUTE.cols)&&Math.floor(u/ROUTE.cols)!==Math.floor(v/ROUTE.cols);
        const m=edgeMetrics(u,v,diag,A); time+=m.time; distance+=m.distance; o2+=m.time*(A.walkLMin/60);
        const dz=state.terrain.cells[v].elev-state.terrain.cells[u].elev; if(dz>0)ascent+=dz;
      }
      if (stopSet.has(k)) { const dwellS=A.dwellMin*60; time+=dwellS; o2+=A.dwellMin*A.dwellLMin; }
      elapsed[k]=time; usedO2[k]=o2;
      const homeO2=Number.isFinite(thome[path[k]]) ? thome[path[k]]*(A.walkLMin/60) : Infinity;
      margin[k]=A.capacityL-A.reserveL-o2-homeO2; minMargin=Math.min(minMargin,margin[k]);
    }
    return {
      presetKey, preset, path, stopAt, elapsed, usedO2, margin,
      ok: minMargin>=0,
      minMargin, totalTime:time, totalO2:o2, distance, ascent, maxSlope,
      avgRisk:riskN?riskSum/riskN:0, avgScience:sciN?sciSum/sciN:0,
      o2Remaining:A.capacityL-o2,
      assumptions:A,
      color: presetKey==='fast'?'#f0a15b':presetKey==='safe'?'#66b6c5':presetKey==='science'?'#bd8bff':'#f0714a',
    };
  }

  function planCurrentRoute() {
    if (!state.terrain || state.base == null || !state.stops.length) return;
    const result=planSequence(state.routeMode);
    if (result.error) { toast(result.error,'warn'); return; }
    state.route=result; state.playbackIndex=null;
    renderRouteSummary(); state.map.render();
    if (!result.ok) toast('Route calculated, but it violates the configured walkback oxygen reserve.', 'warn');
    else toast(`${result.preset.label} route ready. Walkback oxygen margin remains positive.`, 'ok');
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec)) return '—';
    const h=Math.floor(sec/3600), m=Math.round((sec%3600)/60);
    return h ? `${h}h ${m}m` : `${m} min`;
  }

  function renderRouteSummary() {
    const r=state.route;
    const box=$('#routeSummary');
    if (!box) return;
    const actions=$('#reportActions');
    if (!r) {
      box.innerHTML='<div class="empty-state">Plan a route to see travel time, oxygen, terrain exposure, walkback margin, and a tile-by-tile report.</div>';
      if (actions) actions.hidden=true;
      return;
    }
    box.innerHTML=`<div class="headline"><div class="headline-top"><span class="route-name">${r.preset.label.toUpperCase()} ROUTE</span><span class="route-state ${r.ok?'':'fail'}">${r.ok?'PASS':'REVIEW'}</span></div><h2>${(r.distance/1000).toFixed(2)} km</h2><p>${r.ok?'Walkback oxygen reserve maintained at every sampled route cell.':'Configured reserve is violated somewhere along the route.'}</p></div>
      <div class="summary-grid">
        <div><small>Mission time</small><b>${formatTime(r.totalTime)}</b></div>
        <div><small>O₂ used</small><b>${r.totalO2.toFixed(0)} L</b></div>
        <div><small>O₂ remaining</small><b>${r.o2Remaining.toFixed(0)} L</b></div>
        <div><small>Min walkback</small><b>${r.minMargin.toFixed(0)} L</b></div>
        <div><small>Total ascent</small><b>${Math.round(r.ascent)} m</b></div>
        <div><small>Max p90 slope</small><b>${r.maxSlope.toFixed(1)}°</b></div>
      </div><div class="route-warning ${r.ok?'':'bad'}">${r.ok?'Terrain calculations use the loaded CTX DEM; life-support values use the adjustable scenario assumptions at left.':'Try a safer objective, fewer stops, more O₂ capacity, or a different base. The planner will not hide this failure.'}</div>`;
    if (actions) actions.hidden=false;
    updateReportDialog();
  }

  function compareRoutes() {
    if (!state.terrain || state.base == null || !state.stops.length) return;
    const results={};
    for (const key of Object.keys(PRESETS)) results[key]=planSequence(key);
    state.comparisons=results;
    const el=$('#compareTable');
    const rows=Object.entries(results).map(([key,r])=>{
      if(r.error)return `<tr><td>${PRESETS[key].label}</td><td colspan="5">Unavailable</td></tr>`;
      return `<tr class="${r.ok?'best':''}"><td><button class="text-link" data-choose-route="${key}">${r.preset.label}</button></td><td>${(r.distance/1000).toFixed(2)}</td><td>${formatTime(r.totalTime)}</td><td>${r.totalO2.toFixed(0)}</td><td>${r.minMargin.toFixed(0)}</td><td>${Math.round(r.avgRisk*100)}</td></tr>`;
    }).join('');
    el.innerHTML=`<table><thead><tr><th>Mode</th><th>km</th><th>Time</th><th>O₂ L</th><th>Margin</th><th>Cost</th></tr></thead><tbody>${rows}</tbody></table>`;
    $('#compareSection').hidden=false;
    $$('[data-choose-route]',el).forEach(btn=>btn.onclick=()=>{
      const r=results[btn.dataset.chooseRoute]; if(r?.error)return;
      state.routeMode=btn.dataset.chooseRoute; state.route=r; activateRouteButton(state.routeMode); renderRouteSummary(); state.map.render();
    });
  }

  function updateReportDialog() {
    const r=state.route; if(!r)return;
    const doc=$('#reportDocument'); if(!doc)return;
    doc.className='report-doc';
    const b=zoneBounds();
    const points=[state.base,...state.stops].map((idx,n)=>{const ll=tileToLatLon(idx);return `<tr><td>${n===0?'Base':`Stop ${n}`}</td><td>${tileId(idx)}</td><td>${ll.lat.toFixed(5)}°, ${ll.lon.toFixed(5)}°</td></tr>`;}).join('');
    doc.innerHTML=`<header><div class="report-kicker">TOUR DE MARS · MARSWALK · JEZERO EVA-01</div><h1>EVA route report</h1><p>Generated ${new Date().toLocaleString()} · ${escapeHtml(state.sourceLabel)}</p></header>
      <div class="big-stats"><div><small>ROUTE</small><b>${r.preset.label}</b></div><div><small>DISTANCE</small><b>${(r.distance/1000).toFixed(2)} km</b></div><div><small>TIME</small><b>${formatTime(r.totalTime)}</b></div><div><small>WALKBACK</small><b>${r.minMargin.toFixed(0)} L</b></div></div>
      <h2>Selected mission points</h2><table><thead><tr><th>Role</th><th>Tile</th><th>Coordinate</th></tr></thead><tbody>${points}</tbody></table>
      <h2>Mission result</h2><p><strong>${r.ok?'PASS — configured walkback reserve is maintained.':'REVIEW — configured walkback reserve is violated.'}</strong> Modeled O₂ use is ${r.totalO2.toFixed(0)} L, leaving ${r.o2Remaining.toFixed(0)} L at mission end. Total ascent is ${Math.round(r.ascent)} m and maximum encountered cell p90 slope is ${r.maxSlope.toFixed(1)}°.</p>
      <h2>Terrain & assumptions</h2><div class="method-note"><p><strong>Planning zone:</strong> ${b.sw.lat.toFixed(5)}–${b.ne.lat.toFixed(5)}°N, ${b.sw.lon.toFixed(5)}–${b.ne.lon.toFixed(5)}°E.</p><p><strong>Terrain:</strong> passable cells require ≥80% valid elevation coverage and p90 slope ≤25°. Terrain cost blends normalized p90 slope and local relief.</p><p><strong>Life support:</strong> ${r.assumptions.capacityL} L capacity; ${r.assumptions.reserveL} L reserve; ${r.assumptions.walkLMin} L/min walking; ${r.assumptions.dwellMin} min dwell per stop at ${r.assumptions.dwellLMin} L/min.</p><p><strong>Disclosure:</strong> oxygen and suited-walking inputs are adjustable scenario assumptions. Science context is waypoint proximity, not CRISM mineral abundance.</p></div>`;
  }

  function escapeHtml(s='') { return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  function playRoute() {
    const r=state.route; if(!r)return;
    if(state.playbackTimer){ clearInterval(state.playbackTimer); state.playbackTimer=null; $('#playRoute').textContent='Replay walk'; return; }
    state.playbackIndex=0; $('#playRoute').textContent='Stop replay'; $('#playbackHud').hidden=false;
    const step=Math.max(1,Math.ceil(r.path.length/135));
    state.playbackTimer=setInterval(()=>{
      state.playbackIndex=Math.min(r.path.length-1,(state.playbackIndex??0)+step);
      const i=state.playbackIndex;
      $('#playTime').textContent=formatTime(r.elapsed[i]);
      $('#playO2').textContent=`${r.usedO2[i].toFixed(0)} L`;
      $('#playMargin').textContent=`${r.margin[i].toFixed(0)} L`;
      state.map.render();
      if(i>=r.path.length-1){clearInterval(state.playbackTimer);state.playbackTimer=null;$('#playRoute').textContent='Replay walk';}
    },90);
  }

  function exportReport() {
    const r=state.route;if(!r)return;
    const payload={
      project:'Tour de Mars / MarsWalk', generated:new Date().toISOString(), result:r.ok?'PASS':'REVIEW', routeMode:r.presetKey,
      terrain:{label:state.sourceLabel,source:state.terrain.source,methodology:state.terrain.methodology},
      assumptions:r.assumptions,
      metrics:{distanceM:r.distance,totalTimeS:r.totalTime,totalO2L:r.totalO2,o2RemainingL:r.o2Remaining,minWalkbackMarginL:r.minMargin,ascentM:r.ascent,maxP90SlopeDeg:r.maxSlope,avgTerrainCost:r.avgRisk,avgScienceContext:r.avgScience},
      points:[state.base,...state.stops].map((idx,n)=>({role:n===0?'base':`stop-${n}`,tile:tileId(idx),...tileToLatLon(idx)})),
      path:r.path.map(idx=>({tile:tileId(idx),...tileToLatLon(idx)})),
      notes:['Oxygen parameters are adjustable scenario assumptions, not medical/flight-certified limits.','Science score is contextual waypoint proximity and not a CRISM mineral measurement.']
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`marswalk-route-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function activateModeButton(mode) {
    state.mode=mode;
    $$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const hint=$('#modeHint'); if(hint) hint.textContent = mode==='base'?'Click a passable cell to place or move the base.':mode==='stop'?'Click passable cells to add destinations.':'Click any cell to inspect real terrain metrics.';
  }
  function activateRouteButton(mode) {
    state.routeMode=mode;
    $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===mode));
  }

  function stopPlayback() {
    if (state.playbackTimer) clearInterval(state.playbackTimer);
    state.playbackTimer=null; state.playbackIndex=null;
    $('#playRoute').textContent='Replay walk';
    $('#playbackHud').hidden=true;
    state.map?.render();
  }

  function bindUI() {
    state.map=new MarsCanvasMap($('#marsMap'));
    $('#basemapSelect').onchange=e=>state.map.setLayer(e.target.value);
    $('#zoomIn').onclick=()=>state.map.zoomBy(1); $('#zoomOut').onclick=()=>state.map.zoomBy(-1); $('#fitZone').onclick=()=>state.map.fitZone();
    $('#retryTerrain').onclick=loadOfficialTerrain;
    $('#terrainFile').onchange=e=>loadLocalTerrain(e.target.files?.[0]);
    $$('[data-mode]').forEach(b=>b.onclick=()=>activateModeButton(b.dataset.mode));
    $$('[data-route]').forEach(b=>b.onclick=()=>activateRouteButton(b.dataset.route));
    const overlays={toggleRisk:'terrain',toggleSlope:'slope',toggleScience:'science'};
    $('#toggleRisk').checked=true;
    for (const [id,overlay] of Object.entries(overlays)) {
      $('#'+id).onchange=e=>{
        if(!e.target.checked){ e.target.checked=true; return; }
        for(const other of Object.keys(overlays)) if(other!==id) $('#'+other).checked=false;
        state.overlay=overlay; state.map.render();
      };
    }
    $('#toggleGrid').onchange=e=>{state.showGrid=e.target.checked;state.map.render();};
    $('#planRoute').onclick=planCurrentRoute; $('#compareRoutes').onclick=compareRoutes; $('#playRoute').onclick=playRoute; $('#exportReport').onclick=exportReport;
    $('#stopPlayback').onclick=stopPlayback;
    $('#clearPoints').onclick=()=>{stopPlayback();state.base=null;state.stops=[];state.route=null;state.comparisons=null;activateModeButton('base');renderPoints();renderRouteSummary();$('#compareSection').hidden=true;$('#planRoute').disabled=true;$('#compareRoutes').disabled=true;state.map.render();};
    const report=$('#reportDialog'); $('#closeReport').onclick=()=>report.close();
    $('#printReport').onclick=()=>{ if(!state.route){toast('Plan a route first.','warn');return;} updateReportDialog(); report.showModal(); };
    ['o2Capacity','o2Reserve','o2Walk','o2Dwell','dwellMin','baseSpeed'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if(state.route)toast('Assumptions changed. Re-plan to update the route report.','info');}));
  }

  function boot() {
    bindUI();
    renderPoints(); renderRouteSummary(); activateModeButton('base'); activateRouteButton('balanced');
    const restored=restoreTerrain();
    if(!restored){
      setStatus('Connecting to real terrain','Trying the official USGS/PDS CTX DEM. You can also open the same GeoTIFF from disk.');
      setProgress(2,'Starting official terrain load');
      setTimeout(loadOfficialTerrain, 650);
    }
    state.map.fitZone();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
