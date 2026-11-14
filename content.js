/* BiliPublicHider — 内容脚本
 * 只在本机读取扩展设置，不联网、不读取账号数据。
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'bphSettings';
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    hideTriple: true,
    hideProfile: true,
    hideHistory: true,
    hideFavorites: true,
    hideBangumi: true,
    hideSubmissions: true,
    hideCreator: true,
    hideDynamics: true,
    hideMessages: true,
    hideLikes: true,
    hideSpaceVideos: true
  });

  const FEATURE_KEYS = [
    'triple',
    'profile',
    'history',
    'favorites',
    'bangumi',
    'submissions',
    'creator',
    'dynamics',
    'messages',
    'likes',
    'spacevideos'
  ];
  const FEATURE_SETTING = {
    triple: 'hideTriple',
    profile: 'hideProfile',
    history: 'hideHistory',
    favorites: 'hideFavorites',
    bangumi: 'hideBangumi',
    submissions: 'hideSubmissions',
    creator: 'hideCreator',
    dynamics: 'hideDynamics',
    messages: 'hideMessages',
    likes: 'hideLikes',
    spacevideos: 'hideSpaceVideos'
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
    '.right-entry__item',
    '.dynamic-entry',
    '.message-entry',
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
      'hideProfile',
      'hideHistory',
      'hideFavorites',
      'hideBangumi',
      'hideSubmissions',
      'hideCreator',
      'hideDynamics',
      'hideMessages',
      'hideLikes',
      'hideSpaceVideos'
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
    if (/^(个人中心|我的主页|我的空间|个人空间|个人主页)$/.test(value)) return 'profile';
    if (/^(历史|历史记录)$/.test(value)) return 'history';
    if (/^(收藏|收藏夹|我的收藏)$/.test(value)) return 'favorites';
    if (/^(追番|我的追番|追剧|我的追剧|番剧|番剧索引)$/.test(value)) return 'bangumi';
    if (/^(投稿|投稿管理|我的投稿|稿件管理)$/.test(value)) return 'submissions';
    if (/^(创作中心|创作者中心)$/.test(value)) return 'creator';
    if (/^(动态|我的动态|动态首页|动态频道)(\s*\d+)?$/.test(value)) return 'dynamics';
    if (/^(消息|私信|通知|消息中心|我的消息)(\s*\d+)?$/.test(value)) return 'messages';
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

  function scanHeader() {
    const headers = new Set(document.querySelectorAll(HEADER_SELECTOR));

    for (const header of headers) {
      for (const anchor of header.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href') || '';
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
        if (settings.hideDynamics && href.includes('t.bilibili.com')) {
          mark(anchor, 'dynamics');
        }
        if (settings.hideMessages && href.includes('message.bilibili.com')) {
          mark(anchor, 'messages');
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

  function scanDynamicPageProfileLinks() {
    if (location.hostname !== 't.bilibili.com') return;
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const text = normalize(anchor.innerText);
      const href = anchor.getAttribute('href') || '';
      if (text === '我的主页' || text === '个人主页' ||
        (text === '主页' && href.includes('space.bilibili.com'))) {
        mark(entryTarget(anchor), 'profile');
      }
    });
  }

  function spaceSectionTarget(element) {
    const tab = element.closest('[role="tab"], .nav-tab__item, .space-nav-item, [class*="tab-item"], [class*="nav-item"]');
    if (tab) return tab;
    if (element.matches('a, button, [role="button"]')) return element;

    // 从标题向上找同时包含标题和视频/卡片列表的最小容器，
    // 避免只把标题文字隐藏掉、视频卡片仍留在页面上。
    let node = element.parentElement;
    let fallback = node;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      const videoCount = node.querySelectorAll(
        'a[href*="/video/"], a[href*="/bangumi/"], [class*="video-card"]'
      ).length;
      const listCount = node.querySelectorAll(
        'a[href*="/favlist"], a[href*="/bangumi/"], a[href*="/liked"]'
      ).length;
      if (videoCount > 0 || listCount > 1) {
        return node;
      }
      fallback = node;
    }
    return fallback || element.parentElement || element;
  }

  function hideSpaceMediaAfter(start, boundary, feature) {
    const mediaLinks = document.querySelectorAll([
      'a[href*="/video/"]',
      'a[href*="/favlist"]',
      'a[href*="/bangumi/"]',
      'a[href*="/liked"]',
      '[class*="video-card"]',
      '[class*="fav-item"]',
      '[class*="bangumi-item"]',
      '[class*="bangumi-card"]'
    ].join(', '));
    let marked = 0;
    for (const link of mediaLinks) {
      if (!(start.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (boundary && !(link.compareDocumentPosition(boundary) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const card = link.closest('[class*="video-card"], [class*="card"], li, article') || link;
      mark(card, feature);
      marked += 1;
      if (marked >= 120) break;
    }
  }

  function scanSpacePrivacySections() {
    if (location.hostname !== 'space.bilibili.com') return;

    const sections = [
      {
        feature: 'favorites',
        prefixes: ['TA的收藏夹', '我的收藏夹', '收藏夹', '收藏']
      },
      {
        feature: 'bangumi',
        prefixes: ['TA的追番追剧', 'TA的追番', '我的追番', '追番追剧', '追番']
      },
      {
        feature: 'likes',
        prefixes: ['最近点赞的视频', '点赞的视频', 'TA的点赞', '我的点赞', '最近点赞', '点赞']
      }
    ];

    const candidates = document.querySelectorAll([
      'a',
      'button',
      '[role="button"]',
      '[role="tab"]',
      'h1',
      'h2',
      'h3',
      'h4',
      '[class*="section-title"]',
      '[class*="module-title"]',
      '[class*="nav-title"]',
      '[class*="tab-title"]',
      '[class*="nav-tab"]',
      '[class*="title"]'
    ].join(', '));

    const boundaries = Array.from(document.querySelectorAll(
      'h1, h2, h3, h4, [class*="section-title"], [class*="module-title"]'
    ));

    for (const element of candidates) {
      if (!settings.enabled) return;
      if (element.matches('.nav-tab, .nav-bar, .nav-bar__main, .nav-bar__main-left')) continue;
      const text = normalize(element.innerText);
      if (!text || text.length > 40) continue;
      const tabLike = element.matches('a, button, [role="button"], [role="tab"]') ||
        Boolean(element.closest('.nav-tab__item, .space-nav-item, [class*="tab-item"], [class*="nav-item"]'));

      for (const section of sections) {
        if (!settings[FEATURE_SETTING[section.feature]]) continue;
        if (!section.prefixes.some((prefix) => text.startsWith(prefix))) continue;

        const target = spaceSectionTarget(element);
        mark(target, section.feature);
        if (tabLike) continue;

        const boundary = boundaries.find((heading) =>
          heading !== element &&
          !heading.closest('[class*="video-card"], [class*="card"]') &&
          !element.contains(heading) &&
          !heading.contains(element) &&
          (element.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
        hideSpaceMediaAfter(element, boundary || null, section.feature);
      }
    }
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
    if (settings.hideProfile || settings.hideHistory ||
      settings.hideFavorites || settings.hideBangumi || settings.hideSubmissions ||
      settings.hideCreator || settings.hideDynamics || settings.hideMessages) {
      scanHeader();
    }
    if (settings.hideBangumi) scanPersonalBangumiLinks();
    if (settings.hideProfile) scanDynamicPageProfileLinks();
    if (settings.hideFavorites || settings.hideBangumi || settings.hideLikes) {
      scanSpacePrivacySections();
    }
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
      const dynamicsPage = url.hostname === 't.bilibili.com';
      const messagesPage = url.hostname === 'message.bilibili.com';
      const likesPage = url.hostname === 'space.bilibili.com' &&
        /\/liked\/?$/.test(url.pathname);
      const spaceUploadPage = url.hostname === 'space.bilibili.com' &&
        /\/upload\/?$/.test(url.pathname);

      if (settings.enabled && settings.hideSpaceVideos && spaceUploadPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideLikes && likesPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideDynamics && dynamicsPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (settings.enabled && settings.hideMessages && messagesPage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
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
    root.setAttribute('data-bph-profile', 'true');
    root.setAttribute('data-bph-history', 'true');
    root.setAttribute('data-bph-favorites', 'true');
    root.setAttribute('data-bph-bangumi', 'true');
    root.setAttribute('data-bph-submissions', 'true');
    root.setAttribute('data-bph-creator', 'true');
    root.setAttribute('data-bph-dynamics', 'true');
    root.setAttribute('data-bph-messages', 'true');
    root.setAttribute('data-bph-likes', 'true');
    root.setAttribute('data-bph-spacevideos', 'true');

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
