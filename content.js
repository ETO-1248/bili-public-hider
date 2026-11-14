/* BiliPublicHider — 内容脚本
 * 只在本机读取扩展设置，不联网、不读取账号数据。
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'bphSettings';
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    hideTriple: true,
    hideHome: true,
    hideProfile: true,
    hideHistory: true,
    hideFavorites: true,
    hideBangumi: true,
    hideSubmissions: true,
    hideCreator: true
  });

  const FEATURE_KEYS = [
    'triple',
    'home',
    'profile',
    'history',
    'favorites',
    'bangumi',
    'submissions',
    'creator'
  ];
  const FEATURE_SETTING = {
    triple: 'hideTriple',
    home: 'hideHome',
    profile: 'hideProfile',
    history: 'hideHistory',
    favorites: 'hideFavorites',
    bangumi: 'hideBangumi',
    submissions: 'hideSubmissions',
    creator: 'hideCreator'
  };

  const HEADER_SELECTOR = [
    '.bili-header',
    '#biliHeader',
    '.bili-header__bar',
    '.z-top-container',
    '.nav-user-center',
    '.mini-header'
  ].join(', ');

  const HEADER_ENTRY_SELECTOR = [
    'a',
    'button',
    '[role="button"]',
    'li',
    '.right-entry-item',
    '.left-entry__title',
    '.header-entry',
    '.nav-item'
  ].join(', ');

  const TRIPLE_ROOT_SELECTOR = '.video-toolbar-left, #arc_toolbar_report, .video-toolbar';
  const TRIPLE_CANDIDATE_SELECTOR = [
    '.video-toolbar-left-item',
    '.toolbar-left-item-wrap',
    '.video-like',
    '.video-coin',
    '.video-fav',
    '.video-collect',
    '.video-favorite',
    '.video-toolbar-item-text',
    '[role="button"]',
    'a',
    'button',
    '[class*="like"]',
    '[class*="coin"]',
    '[class*="fav"]',
    '[class*="collect"]'
  ].join(', ');

  let root = document.documentElement;
  let settings = { ...DEFAULT_SETTINGS };
  let booting = true;
  let bootFallback = 0;
  let scanTimer = 0;
  let observer = null;

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const key of [
      'enabled',
      'hideTriple',
      'hideHome',
      'hideProfile',
      'hideHistory',
      'hideFavorites',
      'hideBangumi',
      'hideSubmissions',
      'hideCreator'
    ]) {
      result[key] = typeof source[key] === 'boolean' ? source[key] : DEFAULT_SETTINGS[key];
    }
    return result;
  }

  function applyAttributes() {
    root.setAttribute('data-bph-enabled', String(settings.enabled));
    for (const feature of FEATURE_KEYS) {
      root.setAttribute(
        `data-bph-${feature}`,
        String(settings.enabled && settings[FEATURE_SETTING[feature]])
      );
    }
  }

  function finishBoot() {
    if (!booting) return;
    booting = false;
    window.clearTimeout(bootFallback);
    root.removeAttribute('data-bph-booting');
  }

  function mark(element, feature) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    const current = element.getAttribute('data-bph-mark') || '';
    const marks = new Set(current.split(/\s+/).filter(Boolean));
    if (marks.has(feature)) return;
    marks.add(feature);
    element.setAttribute('data-bph-mark', Array.from(marks).join(' '));
  }

  function clearMarks(feature) {
    document.querySelectorAll(`[data-bph-mark~="${feature}"]`).forEach((element) => {
      const remaining = (element.getAttribute('data-bph-mark') || '')
        .split(/\s+/)
        .filter((item) => item && item !== feature);
      if (remaining.length) {
        element.setAttribute('data-bph-mark', remaining.join(' '));
      } else {
        element.removeAttribute('data-bph-mark');
      }
    });
  }

  function clearDisabledMarks() {
    for (const feature of FEATURE_KEYS) {
      if (!settings.enabled || !settings[FEATURE_SETTING[feature]]) {
        clearMarks(feature);
      }
    }
  }

  function countActionLabels(text) {
    return (normalize(text).match(/点赞|投币|收藏|一键三连|三连/g) || []).length;
  }

  function isTripleLabel(value) {
    const text = normalize(value);
    if (!text || text.length > 24 || countActionLabels(text) !== 1) return false;
    return /^(点赞|投币|收藏|一键三连|三连)(?=$|[\s\d.,+万亿（）()Qq])/.test(text);
  }

  function labelOf(element) {
    const explicit = normalize(element.getAttribute('aria-label') || element.getAttribute('title'));
    if (isTripleLabel(explicit)) return explicit;
    return normalize(element.innerText || element.textContent);
  }

  function tripleTarget(element) {
    const item = element.closest('.video-toolbar-left-item, .toolbar-left-item-wrap');
    if (item && countActionLabels(item.innerText) <= 1) return item;

    const oldItem = element.closest('#arc_toolbar_report .toolbar-left > *, .video-toolbar-left > *');
    if (oldItem && oldItem !== element.closest('.video-toolbar-left') && countActionLabels(oldItem.innerText) <= 1) {
      return oldItem;
    }

    return element.closest('a, button, [role="button"], .video-like, .video-coin, .video-fav') || element;
  }

  function scanTriple() {
    const roots = new Set(document.querySelectorAll(TRIPLE_ROOT_SELECTOR));
    for (const toolbar of roots) {
      for (const candidate of toolbar.querySelectorAll(TRIPLE_CANDIDATE_SELECTOR)) {
        const label = labelOf(candidate);
        if (!isTripleLabel(label)) continue;
        const target = tripleTarget(candidate);
        if (target && target !== document.body && target !== toolbar) {
          mark(target, 'triple');
        }
      }
    }

    // 视频结束页等位置的“一键三连”按钮不在工具栏内，单独兜底。
    document.querySelectorAll('button, [role="button"]').forEach((candidate) => {
      const text = normalize(candidate.innerText);
      if (text === '一键三连' || text === '长按三连' || text === '三连') {
        mark(candidate, 'triple');
      }
    });
  }

  function headerFeature(text) {
    const value = normalize(text);
    if (!value || value.length > 12) return null;
    if (value === '首页') return 'home';
    if (/^(个人中心|我的主页|我的空间|个人空间|个人主页)$/.test(value)) return 'profile';
    if (/^(历史|历史记录)$/.test(value)) return 'history';
    if (/^(收藏|收藏夹|我的收藏)$/.test(value)) return 'favorites';
    if (/^(追番|我的追番|追剧|我的追剧|番剧|番剧索引)$/.test(value)) return 'bangumi';
    if (/^(投稿|投稿管理|我的投稿|稿件管理)$/.test(value)) return 'submissions';
    if (/^(创作中心|创作者中心)$/.test(value)) return 'creator';
    return null;
  }

  function isPersonalBangumiUrl(anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      return url.hostname === 'space.bilibili.com' && /\/bangumi\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function isSubmissionUrl(anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      return url.hostname === 'member.bilibili.com' &&
        (url.pathname.includes('/upload') || url.pathname.includes('/archive'));
    } catch {
      return false;
    }
  }

  function isCreatorUrl(anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      return url.hostname === 'member.bilibili.com' &&
        !url.pathname.includes('/upload') &&
        !url.pathname.includes('/archive');
    } catch {
      return false;
    }
  }

  function entryTarget(element) {
    return element.closest([
      'a',
      'button',
      '[role="button"]',
      '.right-entry-item',
      '.left-entry__title',
      '.header-entry',
      '.nav-item',
      'li'
    ].join(', ')) || element;
  }

  function isHomeUrl(anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      return (url.hostname === 'www.bilibili.com' || url.hostname === 'bilibili.com') &&
        url.pathname === '/';
    } catch {
      return false;
    }
  }

  function scanHeader() {
    const headers = new Set(document.querySelectorAll(HEADER_SELECTOR));

    for (const header of headers) {
      for (const anchor of header.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href') || '';
        if (settings.hideHome && (href === '/' || isHomeUrl(anchor))) {
          mark(anchor, 'home');
        }
        if (settings.hideProfile && href.includes('space.bilibili.com')) {
          mark(anchor, 'profile');
        }
        if (settings.hideHistory && href.includes('/history')) {
          mark(anchor, 'history');
        }
        if (settings.hideFavorites && (href.includes('/medialist') || href.includes('/favlist'))) {
          mark(anchor, 'favorites');
        }
        if (settings.hideBangumi && isPersonalBangumiUrl(anchor)) {
          mark(anchor, 'bangumi');
        }
        if (settings.hideSubmissions && isSubmissionUrl(anchor)) {
          mark(anchor, 'submissions');
        }
        if (settings.hideCreator && isCreatorUrl(anchor)) {
          mark(anchor, 'creator');
        }
      }

      for (const entry of header.querySelectorAll(HEADER_ENTRY_SELECTOR)) {
        const feature = headerFeature(entry.innerText);
        if (!feature) continue;
        if (!settings.enabled || !settings[FEATURE_SETTING[feature]]) continue;
        mark(entryTarget(entry), feature);
      }
    }
  }

  function scanPersonalBangumiLinks() {
    document.querySelectorAll('a[href*="/bangumi"]').forEach((anchor) => {
      if (isPersonalBangumiUrl(anchor)) mark(anchor, 'bangumi');
    });
  }

  function clearActiveMarks() {
    for (const feature of FEATURE_KEYS) {
      if (settings.enabled && settings[FEATURE_SETTING[feature]]) {
        clearMarks(feature);
      }
    }
  }

  function scan() {
    if (!settings.enabled) return;
    // 先清掉本轮标记，避免 B 站复用节点后留下过期隐藏。
    clearActiveMarks();
    if (settings.hideTriple) scanTriple();
    if (settings.hideHome || settings.hideProfile || settings.hideHistory ||
      settings.hideFavorites || settings.hideBangumi || settings.hideSubmissions ||
      settings.hideCreator) {
      scanHeader();
    }
    if (settings.hideBangumi) scanPersonalBangumiLinks();
  }

  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      scan();
    }, 80);
  }

  function applySettings(next) {
    settings = sanitizeSettings(next);
    applyAttributes();
    clearDisabledMarks();
    finishBoot();
    scheduleScan();
  }

  function isBilibiliHost(hostname) {
    return hostname === 'bilibili.com' || hostname.endsWith('.bilibili.com');
  }

  function blockNavigation(event, anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      if (!isBilibiliHost(url.hostname)) return;
      const inHeader = Boolean(anchor.closest(HEADER_SELECTOR));
      const historyPage = url.pathname === '/history' ||
        url.pathname.startsWith('/history/') ||
        url.pathname === '/account/history';
      const favoritesPage = url.pathname.includes('/medialist') || url.pathname.includes('/favlist');
      const bangumiPage = url.hostname === 'space.bilibili.com' &&
        /\/bangumi\/?$/.test(url.pathname);
      const creatorPage = url.hostname === 'member.bilibili.com';
      const submissionPage = creatorPage &&
        (url.pathname.includes('/upload') || url.pathname.includes('/archive'));

      if (settings.enabled && settings.hideBangumi && bangumiPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideSubmissions && submissionPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideCreator && creatorPage && !submissionPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideHistory && historyPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideFavorites && favoritesPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideProfile && inHeader &&
        url.hostname === 'space.bilibili.com') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideHome && inHeader &&
        (url.hostname === 'www.bilibili.com' || url.hostname === 'bilibili.com') &&
        url.pathname === '/') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    } catch {
      // 无效链接交给浏览器处理。
    }
  }

  function onNavigationClick(event) {
    if (!settings.enabled) return;
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const anchor = target.closest('a[href]');
    if (!anchor) return;
    blockNavigation(event, anchor);
  }

  function startObserver() {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          scheduleScan();
          return;
        }
      }
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'href']
    });
  }

  function loadSettings() {
    bootFallback = window.setTimeout(finishBoot, 1200);

    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
      finishBoot();
      scheduleScan();
      return;
    }

    try {
      chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[BiliPublicHider] 读取设置失败：', chrome.runtime.lastError.message);
          finishBoot();
          return;
        }
        applySettings(result && result[STORAGE_KEY]);
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync' || !changes[STORAGE_KEY]) return;
        applySettings(changes[STORAGE_KEY].newValue || DEFAULT_SETTINGS);
      });
    } catch (error) {
      console.warn('[BiliPublicHider] 初始化失败：', error);
      finishBoot();
      scheduleScan();
    }
  }

  function start() {
    // 在异步读取设置前先加上启动标记，避免页面先闪出按钮。
    root.setAttribute('data-bph-booting', '');
    root.setAttribute('data-bph-enabled', 'true');
    root.setAttribute('data-bph-triple', 'true');
    root.setAttribute('data-bph-home', 'true');
    root.setAttribute('data-bph-profile', 'true');
    root.setAttribute('data-bph-history', 'true');
    root.setAttribute('data-bph-favorites', 'true');
    root.setAttribute('data-bph-bangumi', 'true');
    root.setAttribute('data-bph-submissions', 'true');
    root.setAttribute('data-bph-creator', 'true');

    applyAttributes();
    startObserver();
    loadSettings();

    document.addEventListener('click', onNavigationClick, true);
    document.addEventListener('auxclick', onNavigationClick, true);
    document.addEventListener('DOMContentLoaded', scheduleScan, { once: true });
    window.addEventListener('load', scheduleScan, { once: true });
    window.addEventListener('pageshow', scheduleScan);
  }

  if (root) {
    start();
  } else {
    // 极少数 document_start 时序下 <html> 尚未创建，等它出现后再启动。
    const rootWatcher = new MutationObserver(() => {
      if (!document.documentElement) return;
      root = document.documentElement;
      rootWatcher.disconnect();
      start();
    });
    rootWatcher.observe(document, { childList: true });
  }
})();
