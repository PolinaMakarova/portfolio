(function () {
  const P = window.PROJECTS;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const finePointer = matchMedia('(pointer: fine)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  // Цифры на первом экране
  const education = P.filter((p) => p.cat !== 'games');
  const games = P.filter((p) => p.cat === 'games');
  const stats = [
    [6, 'модулей КОМПАС-3D'],
    [4, 'тренажёра ГРАНД-Сметы'],
    [10, 'уроков в симуляторе сметчика'],
  ];
  $('#stats').innerHTML = stats.map(([n, t]) => `<li><b>${n}</b><span>${t}</span></li>`).join('');

  // Мозаика учебных кейсов и инструментов
  const reelSlugs = ['kompas', 'grandsmeta', 'smetchik', 'tutor', 'toolchain', 'planner'];
  $('#reel').innerHTML = reelSlugs.map((slug) => {
    const poster = `media/${slug}.jpg`;
    const media = slug === 'toolchain' || slug === 'planner' || reduceMotion
      ? `<img src="${poster}" alt="">`
      : `<video src="media/teaser-${slug}.mp4" poster="${poster}" muted loop playsinline autoplay preload="metadata"></video>`;
    return `<div class="tile">${media}</div>`;
  }).join('');

  // Фильтры
  $('#filters').innerHTML = window.CATEGORIES.map((c, i) =>
    `<button role="tab" data-cat="${c.id}" aria-selected="${i === 0}">${c.label}</button>`
  ).join('');
  function setFilter(cat) {
    document.querySelectorAll('#filters button').forEach((b) => b.setAttribute('aria-selected', b.dataset.cat === cat));
    document.querySelectorAll('#grid .card').forEach((c) => c.classList.toggle('hidden', cat !== 'all' && c.dataset.cat !== cat));
  }
  $('#filters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.cat); });

  // Карточки
  const renderCard = (p) => `
    <button class="card" data-slug="${p.slug}" data-cat="${p.cat}">
      <div class="card-media">
        <div class="ph">${esc(p.title)}</div>
        <img src="media/${p.slug}.jpg" alt="" loading="lazy" onerror="this.remove()">
        ${p.noVideo ? '' : `<video data-src="media/${p.slug}.mp4" muted loop playsinline preload="none"></video>`}
        ${p.play ? '<span class="badge play">▶ Можно поиграть</span>' : p.nda ? '<span class="badge">Фрагмент · NDA</span>' : ''}
      </div>
      <div class="card-text">
        <span class="card-kind">${esc(p.kind)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.tagline)}</p>
      </div>
    </button>`;
  $('#grid').innerHTML = education.map(renderCard).join('');
  $('#game-grid').innerHTML = games.map(renderCard).join('');

  function startVideo(card) {
    const v = card.querySelector('video');
    if (!v) return;
    if (!v.src && v.dataset.src) v.src = v.dataset.src;
    v.play().catch(() => {});
  }
  function stopVideo(card) { const v = card.querySelector('video'); if (v && v.src) v.pause(); }

  document.querySelectorAll('.card').forEach((card) => {
    if (finePointer) {
      card.addEventListener('mouseenter', () => startVideo(card));
      card.addEventListener('mouseleave', () => stopVideo(card));
    }
    card.addEventListener('click', () => openCase(card.dataset.slug));
  });
  if (!finePointer && !reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) =>
      e.isIntersecting ? startVideo(e.target) : stopVideo(e.target)), { threshold: 0.7 });
    document.querySelectorAll('.card').forEach((c) => io.observe(c));
  }

  // Окно кейса
  const dlg = $('#case');
  function openCase(slug) {
    const p = P.find((x) => x.slug === slug);
    if (!p) return;
    const actions = [];
    if (p.play) actions.push(`<button class="btn" data-play="${p.slug}">▶ Играть прямо здесь</button>`);
    (p.links || []).forEach((l) => actions.push(`<a class="btn ${actions.length ? 'btn-ghost' : ''}" href="${l.href}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`));
    $('#case-body').innerHTML = `
      ${p.noVideo ? '' : `<div class="case-media">
        <video src="media/${p.slug}.mp4" poster="media/${p.slug}.jpg" controls muted loop playsinline autoplay></video>
      </div>`}
      <div class="case-info">
        <span class="card-kind">${esc(p.kind)}</span>
        <h2>${esc(p.title)}</h2>
        <p class="lead" style="max-width:none">${esc(p.tagline)}</p>
        ${p.task ? `<div class="task"><b>Задача</b><p>${esc(p.task)}</p></div>` : ''}
        ${p.method ? `<div class="task"><b>Методическое решение</b><p>${esc(p.method)}</p></div>` : ''}
        ${p.facts && p.facts.length ? `<h3 class="sub">Что получилось</h3><ul>${p.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <div class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
        ${p.nda ? '<p class="nda">Проект для заказчика: тексты в ролике размыты, показан только интерактив.</p>' : ''}
        ${actions.length ? `<div class="case-actions">${actions.join('')}</div>` : ''}
      </div>`;
    dlg.showModal();
  }
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) closeCase();
    const b = e.target.closest('[data-play]');
    if (b) { closeCase(); openPlayer(b.dataset.play); }
  });
  dlg.addEventListener('close', () => { $('#case-body').innerHTML = ''; });
  function closeCase() { dlg.close(); }

  // Игра в полноэкранном окне
  const player = $('#player');
  function openPlayer(slug) {
    const p = P.find((x) => x.slug === slug);
    $('#player-title').textContent = p.title;
    $('#player-newtab').href = p.play;
    const frame = $('#player-frame');
    frame.className = 'player-frame' + (p.orientation === 'portrait' ? ' portrait' : '');
    frame.innerHTML = `<div class="loading">Загружаем игру…</div><iframe src="${p.play}" title="${esc(p.title)}" allow="fullscreen; autoplay" allowfullscreen style="opacity:0" onload="this.style.opacity=1;this.previousElementSibling.remove()"></iframe>`;
    player.hidden = false;
    document.body.style.overflow = 'hidden';
    history.pushState({ play: slug }, '', '#play-' + slug);
  }
  function closePlayer() {
    if (player.hidden) return;
    player.hidden = true;
    $('#player-frame').innerHTML = '';
    document.body.style.overflow = '';
  }
  $('#player-close').addEventListener('click', () => history.back());
  addEventListener('popstate', closePlayer);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !player.hidden) history.back(); });

  // Прямая ссылка на игру: #play-sushi
  const m = location.hash.match(/^#play-(\w+)/);
  if (m && P.some((p) => p.slug === m[1] && p.play)) { history.replaceState(null, '', location.pathname); openPlayer(m[1]); }
})();
