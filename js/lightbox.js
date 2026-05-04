(function () {
  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';
  overlay.innerHTML = `
    <button id="lb-close">✕</button>
    <button id="lb-prev">❮</button>
    <button id="lb-next">❯</button>
    <div id="lb-img-wrap">
      <img id="lb-img" src="" alt="">
    </div>
    <div id="lb-zoom-bar">
      <button id="lb-zoom-out">−</button>
      <span id="lb-zoom-val">100%</span>
      <button id="lb-zoom-in">+</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.textContent = `
    #lb-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 9999;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    #lb-overlay.active { display: flex; }

    #lb-img-wrap {
      overflow: hidden;
      cursor: grab;
      width: 90vw;
      height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    #lb-img-wrap.grabbing { cursor: grabbing; }

    #lb-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transform-origin: center center;
      transition: transform 0.15s ease;
      pointer-events: none;
    }

    #lb-close {
      position: fixed;
      top: 20px; right: 28px;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.8rem;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      line-height: 1;
    }
    #lb-close:hover { opacity: 1; }

    #lb-prev, #lb-next {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.15);
      border: none;
      color: #fff;
      width: 50px; height: 50px;
      border-radius: 50%;
      font-size: 1.2rem;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #lb-prev:hover, #lb-next:hover { background: rgba(255,255,255,0.3); }
    #lb-prev { left: 20px; }
    #lb-next { right: 20px; }

    #lb-zoom-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
    }
    #lb-zoom-bar button {
      background: rgba(255,255,255,0.15);
      border: none;
      color: #fff;
      width: 36px; height: 36px;
      border-radius: 50%;
      font-size: 1.3rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    #lb-zoom-bar button:hover { background: rgba(255,255,255,0.3); }
    #lb-zoom-val {
      color: rgba(255,255,255,0.7);
      font-size: 0.85rem;
      min-width: 44px;
      text-align: center;
      font-family: monospace;
    }
  `;
  document.head.appendChild(style);

  let images = [];
  let current = 0;
  let scale = 1;
  let panX = 0, panY = 0;
  let dragging = false, startX, startY, originPanX, originPanY;

  const img = document.getElementById('lb-img');
  const wrap = document.getElementById('lb-img-wrap');
  const zoomVal = document.getElementById('lb-zoom-val');

  function collectImages() {
    images = [];
    document.querySelectorAll('.img-item img, .slide').forEach(el => {
      images.push(el.src);
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', () => open(el.src));
    });
  }

  function open(src) {
    current = images.indexOf(src);
    scale = 1; panX = 0; panY = 0;
    img.src = src;
    applyTransform();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function applyTransform() {
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    zoomVal.textContent = Math.round(scale * 100) + '%';
  }

  function zoom(delta) {
    scale = Math.min(4, Math.max(1, scale + delta));
    if (scale === 1) { panX = 0; panY = 0; }
    applyTransform();
  }

  function navigate(dir) {
    current = (current + dir + images.length) % images.length;
    scale = 1; panX = 0; panY = 0;
    img.src = images[current];
    applyTransform();
  }

  document.getElementById('lb-close').addEventListener('click', close);
  document.getElementById('lb-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('lb-next').addEventListener('click', () => navigate(1));
  document.getElementById('lb-zoom-in').addEventListener('click', () => zoom(0.5));
  document.getElementById('lb-zoom-out').addEventListener('click', () => zoom(-0.5));

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === '+') zoom(0.5);
    if (e.key === '-') zoom(-0.5);
  });

  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.25 : -0.25);
  }, { passive: false });

  wrap.addEventListener('mousedown', e => {
    if (scale <= 1) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    originPanX = panX; originPanY = panY;
    wrap.classList.add('grabbing');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panX = originPanX + (e.clientX - startX);
    panY = originPanY + (e.clientY - startY);
    applyTransform();
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    wrap.classList.remove('grabbing');
  });


  let lastDist = 0;
  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  });
  wrap.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      zoom((dist - lastDist) * 0.01);
      lastDist = dist;
    }
  }, { passive: false });

  window.addEventListener('load', collectImages);
})();