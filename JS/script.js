(function () {
  'use strict';

  const GRADE_ORDER = { A: 0, B: 1, C: 2 };
  const HIGH_GAP = 100; // от 100% оценки расходятся вдвое и более

  const $ = (selector) => document.querySelector(selector);

  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const formatNumber = (value, digits = 3) =>
    value.toLocaleString('ru-RU', { maximumFractionDigits: digits }).replace(/ /g, ' ');

  /* ---------- Расчёты: всё производное считается из REGIONS ---------- */

  const regions = REGIONS.map((region) => {
    const regional = region.estimates.find((e) => e.role === 'regional') || null;
    const rosstat = region.estimates.find((e) => e.role === 'rosstat') || null;
    const alts = region.estimates.filter((e) => e.role === 'alt');
    const values = region.estimates.map((e) => e.value);
    const gap = regional && rosstat ? (regional.value - rosstat.value) / rosstat.value * 100 : null;
    const spread = values.length > 1 ? Math.max(...values) / Math.min(...values) : null;
    const grades = region.estimates.map((e) => GRADE_ORDER[e.reliability]);
    return {
      ...region,
      regional,
      rosstat,
      alts,
      gap,
      spread,
      regionalValue: regional ? regional.value : null,
      rosstatValue: rosstat ? rosstat.value : null,
      reliability: grades.length ? Math.min(...grades) : null
    };
  });

  const byId = new Map(regions.map((r) => [r.id, r]));
  const withGap = regions.filter((r) => r.gap !== null);
  const withSpread = regions.filter((r) => r.spread !== null);

  const gapText = (gap) => `+${formatNumber(gap, 1)}%`;

  /* ---------- Первый экран и сводные тексты ---------- */

  function renderSummaries() {
    const maxSpread = withSpread.reduce((a, b) => (b.spread > a.spread ? b : a));
    const empty = regions.filter((r) => !r.estimates.length);
    const stats = [
      [`${withGap.length} из ${regions.length}`, 'регионов, где есть и оценка региона, и оценка Росстата'],
      [`×${formatNumber(maxSpread.spread, 1)}`, `максимальный разброс оценок: ${maxSpread.name}, ${maxSpread.period}`],
      [`${empty.length} из ${regions.length}`, `без абсолютных значений турпотока: ${empty.map((r) => r.name).join(', ')}`]
    ];
    $('#hero-stats').innerHTML = stats.map(([value, label]) =>
      `<div class="stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    ).join('');

    $('#data-lede').textContent =
      `Разрыв удаётся посчитать только для ${withGap.length} регионов из ${regions.length}. ` +
      'Остальные строки показаны как есть: отсутствие сопоставимой цифры — тоже результат скрининга.';
    $('#limit-coverage').textContent =
      `Пара «регион — Росстат» есть только у ${withGap.length} регионов из ${regions.length}, и для Астраханской области она относится к 2023 году.`;
  }

  /* ---------- Состояние фильтров и таблицы ---------- */

  const state = {
    selected: new Set(), // пусто = все регионы
    onlyGap: false,
    sortKey: 'gap',
    sortDir: 'desc'
  };

  function visibleRegions() {
    return regions.filter((r) =>
      (state.selected.size === 0 || state.selected.has(r.id)) &&
      (!state.onlyGap || r.gap !== null)
    );
  }

  function compareRows(a, b) {
    const x = a[state.sortKey];
    const y = b[state.sortKey];
    if (x === null && y === null) return a.name.localeCompare(b.name, 'ru');
    if (x === null) return 1; // пропуски всегда внизу
    if (y === null) return -1;
    const order = typeof x === 'string' ? x.localeCompare(y, 'ru') : x - y;
    return state.sortDir === 'asc' ? order : -order;
  }

  function renderChips() {
    const allChip = `<button type="button" class="chip" data-id="" aria-pressed="${state.selected.size === 0}">Все регионы</button>`;
    const chips = regions.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((r) =>
      `<button type="button" class="chip" data-id="${r.id}" aria-pressed="${state.selected.has(r.id)}">${escapeHtml(r.name)}</button>`
    ).join('');
    $('#region-chips').innerHTML = allChip + chips;
  }

  function sourceItem(estimate) {
    return `<li>
      <span class="grade grade-${estimate.reliability.toLowerCase()}" title="Надёжность ${estimate.reliability}">${estimate.reliability}</span>
      <span><a href="${escapeHtml(estimate.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(estimate.who)}</a>, ${escapeHtml(estimate.unit)}</span>
    </li>`;
  }

  function valueCell(estimate, alts) {
    if (!estimate) return '<span class="na">нет данных</span>';
    const altLines = (alts || []).map((a) => `<span class="value-alt">другая: ${formatNumber(a.value)}</span>`).join('');
    return `<span class="value-main">${formatNumber(estimate.value)}</span>${altLines}`;
  }

  function gapCell(gap) {
    if (gap === null) return '<span class="gap gap-na">не считается</span>';
    const high = gap >= HIGH_GAP;
    return `<span class="gap ${high ? 'gap-high' : 'gap-mid'}" title="${high ? 'Расходятся вдвое и более' : 'Расходятся менее чем вдвое'}">${high ? '▲ ' : ''}${gapText(gap)}</span>`;
  }

  function renderTable() {
    const rows = visibleRegions().sort(compareRows);
    $('#table-body').innerHTML = rows.map((r) => {
      const oldPair = r.period !== '2025';
      const sources = r.estimates.length
        ? `<ul class="source-list">${r.estimates.map(sourceItem).join('')}</ul>`
        : '<span class="na">источников с абсолютным значением нет</span>';
      return `<tr>
        <td data-label="Регион">
          <div>
            <button type="button" class="row-name" data-id="${r.id}" title="Показать на карте">${escapeHtml(r.name)}</button>
            <span class="row-sub${oldPair ? ' is-warn' : ''}">${oldPair ? `Данные за ${r.period} год, не сравнивать напрямую` : `${r.period} год`}</span>
          </div>
        </td>
        <td data-label="Оценка региона, млн" class="num"><div>${valueCell(r.regional, r.alts)}</div></td>
        <td data-label="Оценка Росстата, млн" class="num"><div>${valueCell(r.rosstat)}</div></td>
        <td data-label="Разрыв, %" class="num">${gapCell(r.gap)}</td>
        <td data-label="Источник">
          ${sources}
          <details class="row-note"><summary>Комментарий</summary><p>${escapeHtml(r.note)}</p></details>
        </td>
      </tr>`;
    }).join('');

    $('#table-empty').hidden = rows.length > 0;
    $('#data-table').hidden = rows.length === 0;

    document.querySelectorAll('#data-table th').forEach((th) => {
      if (th.dataset.key === state.sortKey) {
        th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
  }

  /* ---------- Графики ---------- */

  function renderCharts() {
    const shown = visibleRegions();

    const pairs = shown.filter((r) => r.gap !== null).sort((a, b) => b.regional.value - a.regional.value);
    const maxPair = Math.max(0, ...pairs.map((r) => Math.max(r.regional.value, r.rosstat.value)));
    $('#chart-pairs').innerHTML = pairs.length ? pairs.map((r) => {
      const tip = `${r.name}, ${r.period}: регион ${formatNumber(r.regional.value)} млн, Росстат ${formatNumber(r.rosstat.value)} млн. Разрыв ${gapText(r.gap)}.`;
      const yearMark = r.period !== '2025' ? `<small>${r.period} год</small>` : '';
      return `<div class="bar-group" tabindex="0" data-tip="${escapeHtml(tip)}">
        <div class="bar-name">${escapeHtml(r.name)}${yearMark}</div>
        <div class="bar-line"><div class="bar-track"><div class="bar bar-regional" style="width:calc((100% - 56px) * ${r.regional.value / maxPair})"></div><span class="bar-val">${formatNumber(r.regional.value)}</span></div></div>
        <div class="bar-line"><div class="bar-track"><div class="bar bar-rosstat" style="width:calc((100% - 56px) * ${r.rosstat.value / maxPair})"></div><span class="bar-val">${formatNumber(r.rosstat.value)}</span></div></div>
      </div>`;
    }).join('') : '<p class="chart-empty">В выбранных регионах нет пары «регион — Росстат».</p>';

    const spreads = shown.filter((r) => r.spread !== null).sort((a, b) => b.spread - a.spread);
    const maxSpread = Math.max(1, ...spreads.map((r) => r.spread));
    $('#chart-spread').innerHTML = spreads.length ? spreads.map((r) => {
      const values = r.estimates.map((e) => formatNumber(e.value)).join(', ');
      const tip = `${r.name}, ${r.period}: оценки ${values} млн.`;
      return `<div class="bar-group" tabindex="0" data-tip="${escapeHtml(tip)}">
        <div class="bar-name">${escapeHtml(r.name)}</div>
        <div class="bar-line"><div class="bar-track"><div class="bar bar-rosstat" style="width:calc((100% - 56px) * ${r.spread / maxSpread})"></div><span class="bar-val">×${formatNumber(r.spread, 2)}</span></div></div>
      </div>`;
    }).join('') : '<p class="chart-empty">В выбранных регионах меньше двух оценок показателя.</p>';
  }

  function initChartTips() {
    const tip = $('#chart-tip');
    const show = (group, x, y) => {
      tip.textContent = group.dataset.tip;
      tip.hidden = false;
      const left = Math.min(x + 14, window.innerWidth - tip.offsetWidth - 8);
      const top = y - tip.offsetHeight - 12;
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${top < 8 ? y + 16 : top}px`;
    };
    document.querySelectorAll('.chart').forEach((chart) => {
      chart.addEventListener('mousemove', (event) => {
        const group = event.target.closest('.bar-group');
        if (group) show(group, event.clientX, event.clientY); else tip.hidden = true;
      });
      chart.addEventListener('mouseleave', () => { tip.hidden = true; });
      chart.addEventListener('focusin', (event) => {
        const group = event.target.closest('.bar-group');
        if (!group) return;
        const box = group.getBoundingClientRect();
        show(group, box.left, box.top);
      });
      chart.addEventListener('focusout', () => { tip.hidden = true; });
    });
    window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  }

  function renderData() {
    renderChips();
    renderCharts();
    renderTable();
  }

  function initData() {
    $('#region-chips').addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      if (!chip.dataset.id) state.selected.clear();
      else if (state.selected.has(chip.dataset.id)) state.selected.delete(chip.dataset.id);
      else state.selected.add(chip.dataset.id);
      renderData();
      const again = document.querySelector(`.chip[data-id="${chip.dataset.id}"]`);
      if (again) again.focus();
    });
    $('#only-gap').addEventListener('change', (event) => {
      state.onlyGap = event.target.checked;
      renderData();
    });
    $('#reset-filters').addEventListener('click', () => {
      state.selected.clear();
      state.onlyGap = false;
      $('#only-gap').checked = false;
      renderData();
    });
    $('#data-table thead').addEventListener('click', (event) => {
      const th = event.target.closest('th');
      if (!th) return;
      const key = th.dataset.key;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        // Текстовые колонки и шкала A→C сначала по возрастанию, числа — от большего
        state.sortDir = key === 'name' || key === 'reliability' ? 'asc' : 'desc';
      }
      renderTable();
    });
    $('#table-body').addEventListener('click', (event) => {
      const button = event.target.closest('.row-name');
      if (!button) return;
      selectRegion(button.dataset.id);
      $('#map').scrollIntoView();
    });
    initChartTips();
    renderData();
  }

  /* ---------- Карта ---------- */

  let map = null;
  const selection = { circles: new Map(), ooptMarkers: [] };

  // Площадь круга пропорциональна значению; на узких экранах масштаб меньше
  function radiusScale() {
    return window.innerWidth < 680 ? 7.4 : 10.4;
  }
  const radiusFor = (value) => Math.max(5, Math.sqrt(value) * radiusScale());

  function renderLegendScale() {
    $('#legend-scale').innerHTML = [1, 5, 15].map((value) => {
      const size = radiusFor(value) * 2;
      return `<div><i style="width:${size}px;height:${size}px"></i>${value} млн</div>`;
    }).join('');
  }

  function renderRegionCard(region) {
    const card = $('#region-card');
    const row = (label, value) => `<dt>${label}</dt><dd>${value}</dd>`;
    const growthOnly = !region.estimates.length;
    card.innerHTML = `
      <h3>${escapeHtml(region.name)} · ${region.period}</h3>
      ${growthOnly ? '' : `<dl class="kv">
        ${row('Оценка региона', region.regional ? `${formatNumber(region.regional.value)} млн` : '<span class="na">нет</span>')}
        ${row('Оценка Росстата', region.rosstat ? `${formatNumber(region.rosstat.value)} млн` : '<span class="na">нет</span>')}
        ${region.gap !== null ? row('Разрыв', gapCell(region.gap)) : ''}
      </dl>`}
      <p class="card-note">${escapeHtml(region.note)}</p>`;
  }

  function renderOoptCard(oopt) {
    $('#region-card').innerHTML = `
      <h3>${escapeHtml(oopt.name)}</h3>
      <dl class="kv">
        <dt>Категория</dt><dd>${escapeHtml(oopt.category)}</dd>
        <dt>Регион</dt><dd>${escapeHtml(oopt.region)}</dd>
      </dl>
      <p class="note note-warn">Демо-точка: координаты приблизительные. Границы и режим нужно проверять по кадастру ООПТ и положению о территории.</p>`;
  }

  function highlightCircle(id) {
    selection.circles.forEach((parts, key) => {
      parts.forEach(({ layer, base }) => layer.setStyle({ weight: key === id ? base + 1.5 : base }));
    });
  }

  function clearOoptSelection() {
    selection.ooptMarkers.forEach((m) => {
      const el = m.getElement();
      if (el) el.classList.remove('is-selected');
    });
  }

  function selectRegion(id) {
    const region = byId.get(id);
    if (!region) return;
    $('#region-select').value = id;
    renderRegionCard(region);
    clearOoptSelection();
    if (map) highlightCircle(id);
  }

  function labelMarker(region, radius) {
    const offsets = {
      top: `translate(-50%, calc(-100% - ${radius + 3}px))`,
      bottom: `translate(-50%, ${radius + 3}px)`,
      belowEnd: `translate(-${radius}px, ${radius + 3}px)`,
      right: `translate(${radius + 5}px, -50%)`,
      left: `translate(calc(-100% - ${radius + 5}px), -50%)`
    };
    const value = region.regional || region.rosstat;
    const sub = value ? `${formatNumber(value.value)} млн` : 'нет данных';
    const narrow = window.innerWidth < 680;
    const title = narrow ? region.short : region.name;
    const direction = narrow && region.labelDir === 'left' ? 'belowEnd' : region.labelDir; // слева подпись обрезается краем карты
    return L.marker([region.lat, region.lng], {
      pane: 'flowLayer',
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="map-label" style="transform:${offsets[direction]}">${escapeHtml(title)}<small>${sub}</small></div>`
      })
    });
  }

  function ooptIcon(oopt) {
    const shape = oopt.severity === 'strict'
      ? '<path d="M12 4l9 16H3z" class="sym-strict"/>'
      : '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z" class="sym-partial"/>';
    return L.divIcon({
      className: 'oopt-marker',
      iconSize: [26, 26],
      html: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${shape}</svg>`
    });
  }

  function initMap() {
    const frame = $('.map-frame');
    if (!window.L) {
      const message = document.createElement('p');
      message.className = 'map-failed';
      message.textContent = 'Не удалось загрузить карту: нет доступа к интернету или CDN. Данные доступны в таблице ниже.';
      frame.appendChild(message);
      return;
    }

    const touch = L.Browser.mobile;
    map = L.map('leaflet-map', {
      zoomSnap: 0.25,
      scrollWheelZoom: false,
      dragging: !touch, // на телефоне одним пальцем листается страница, двумя — карта
      attributionControl: true
    });
    map.attributionControl.setPrefix(false);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 12
    }).addTo(map);

    ['flowLayer', 'ooptLayer'].forEach((name, index) => {
      const pane = map.createPane(name);
      pane.style.zIndex = 410 + index * 10;
      pane.classList.add('layer-pane');
    });

    map.fitBounds([[43.4, 32.6], [50.6, 49.2]], { padding: [10, 10] });
    new ResizeObserver(() => map.invalidateSize()).observe(frame);
    frame.addEventListener('click', () => map.scrollWheelZoom.enable(), { once: true });

    const sorted = regions.slice().sort((a, b) => (b.regionalValue || 0) - (a.regionalValue || 0));
    sorted.forEach((region) => {
      const parts = [];
      const add = (value, style, base) => {
        const layer = L.circleMarker([region.lat, region.lng], {
          pane: 'flowLayer', radius: radiusFor(value), ...style, weight: base
        }).addTo(map);
        layer.on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          selectRegion(region.id);
        });
        parts.push({ layer, base });
      };

      if (region.regional) add(region.regional.value, { color: '#159a9c', fillColor: '#159a9c', fillOpacity: 0.26 }, 1.5);
      if (region.rosstat) add(region.rosstat.value, { color: '#ffffff', fillColor: '#1d4e89', fillOpacity: 1 }, 1);
      if (!region.estimates.length) {
        const layer = L.circleMarker([region.lat, region.lng], {
          pane: 'flowLayer', radius: 9, color: '#7b8c9c', weight: 1.5, dashArray: '3 3', fillColor: '#ffffff', fillOpacity: 1
        }).addTo(map);
        layer.on('click', () => selectRegion(region.id));
        parts.push({ layer, base: 1.5 });
      }
      selection.circles.set(region.id, parts);

      const biggest = Math.max(region.regionalValue || 0, region.rosstatValue || 0);
      labelMarker(region, biggest ? radiusFor(biggest) : 9).addTo(map);
    });

    OOPT.forEach((oopt) => {
      const marker = L.marker([oopt.lat, oopt.lng], {
        pane: 'ooptLayer',
        icon: ooptIcon(oopt),
        title: `${oopt.name} (демо)`,
        alt: oopt.name
      }).addTo(map);
      const open = () => {
        clearOoptSelection();
        highlightCircle(null);
        const el = marker.getElement();
        if (el) el.classList.add('is-selected');
        renderOoptCard(oopt);
      };
      marker.on('click', open);
      selection.ooptMarkers.push(marker);
    });
  }

  function initLayerSwitches() {
    const flow = $('#layer-flow');
    const oopt = $('#layer-oopt');
    const apply = () => {
      if (map) {
        map.getPane('flowLayer').classList.toggle('is-off', !flow.checked);
        map.getPane('ooptLayer').classList.toggle('is-off', !oopt.checked);
      }
      $('#legend-flow').classList.toggle('is-off', !flow.checked);
      $('#legend-oopt').classList.toggle('is-off', !oopt.checked);
      $('#map-empty').hidden = flow.checked || oopt.checked;
    };
    flow.addEventListener('change', apply);
    oopt.addEventListener('change', apply);
    apply();
  }

  function initRegionSelect() {
    const select = $('#region-select');
    select.innerHTML = regions.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((r) => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    select.addEventListener('change', () => selectRegion(select.value));
  }

  /* ---------- Шапка, видео, подвал ---------- */

  function initNav() {
    const toggle = $('.nav-toggle');
    const nav = $('#site-nav');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    const links = [...nav.querySelectorAll('a')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    ['top', 'map', 'data', 'method', 'limits', 'about'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function initVideo() {
    $('#play-btn').addEventListener('click', () => {
      $('#video-status').textContent = 'Видео-инфографика пока готовится. Здесь появится ролик о том, почему цифры расходятся.';
    });
  }

  function renderFooter() {
    $('#footer-authors').innerHTML = PROJECT.authors.map((name) => `<li>${escapeHtml(name)}</li>`).join('');
    $('#footer-mentor').textContent = PROJECT.mentor;
    $('#footer-github').href = PROJECT.github;
  }

  /* ---------- Запуск ---------- */

  renderSummaries();
  renderFooter();
  initNav();
  initVideo();
  initRegionSelect();
  renderLegendScale();
  initMap();
  initLayerSwitches();
  initData();
  selectRegion('crimea');
})();
