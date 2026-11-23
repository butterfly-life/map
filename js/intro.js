/* 開場讀條（參考母網站 home 的 js/main.js「讀條」）
   圖示的動畫都在 CSS；這裡只算進度：最短播放時間、3D 場景準備好（park.js 發出 parkready）兩者取較慢者，
   讀完自動淡出。three.js 載入失敗時最多等 FAIL 毫秒也會淡出，不會卡在開場。 */
(() => {
  const intro = document.getElementById('intro'), ld2 = document.getElementById('ld2');
  if (!intro || !ld2) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN = reduce ? 600 : 3200, FAIL = 10000, t0 = performance.now();
  let ready = !!window.parkReady, done = false;
  document.addEventListener('parkready', () => { ready = true; });

  const finish = () => {
    done = true;
    ld2.classList.add('done');
    setTimeout(() => {
      intro.classList.add('out');
      document.documentElement.classList.remove('intro-on');
      setTimeout(() => intro.remove(), 700);
    }, reduce ? 0 : 420);
  };
  const tick = now => {
    if (done) return;
    const t = now - t0;
    const p = Math.min(t / MIN, ready || t > FAIL ? 1 : .95);   // 場景還沒好時停在 95%
    ld2.setAttribute('aria-valuenow', Math.floor(p * 100));
    if (p >= 1) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
