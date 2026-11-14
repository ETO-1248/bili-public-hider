/* BiliPublicHider — 首次安装设置向导 */
(() => {
  'use strict';

  const SETTINGS_KEY = 'bphSettings';
  const PASSWORD_KEY = 'bphPassword';
  const ONBOARDING_KEY = 'bphOnboardingDone';
  const PASSWORD_MIN_LENGTH = 4;
  const PASSWORD_MAX_LENGTH = 64;
  const Password = globalThis.BPHPassword;
  const Backgrounds = globalThis.BPHBackgrounds;

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

  const FEATURE_GROUPS = [
    {
      title: '互动防误触',
      features: [
        { key: 'hideTriple', label: '三连按钮' }
      ]
    },
    {
      title: '浏览入口',
      features: [
        { key: 'hideBangumi', label: '追番 / 番剧' },
        { key: 'hideSubmissions', label: '投稿入口' },
        { key: 'hideCreator', label: '创作中心' },
        { key: 'hideDynamics', label: '动态' },
        { key: 'hideMessages', label: '消息' }
      ]
    },
    {
      title: '个人隐私',
      features: [
        { key: 'hideProfile', label: '个人主页入口' },
        { key: 'hideHistory', label: '历史记录' },
        { key: 'hideFavorites', label: '收藏夹' },
        { key: 'hideLikes', label: '点赞记录' },
        { key: 'hideSpaceVideos', label: '主页投稿视频' }
      ]
    }
  ];

  const PRESETS = {
    all: Object.keys(DEFAULT_SETTINGS).filter((key) => key !== 'enabled'),
    triple: ['hideTriple'],
    privacy: [
      'hideProfile',
      'hideHistory',
      'hideFavorites',
      'hideLikes',
      'hideSpaceVideos',
      'hideBangumi',
      'hideDynamics',
      'hideMessages'
    ]
  };

  const els = {
    welcomeImage: document.getElementById('welcomeImage'),
    stepCounter: document.getElementById('stepCounter'),
    featureGroups: document.getElementById('featureGroups'),
    skipButton: document.getElementById('skipButton'),
    startButton: document.getElementById('startButton'),
    backToWelcome: document.getElementById('backToWelcome'),
    nextFromFeatures: document.getElementById('nextFromFeatures'),
    backToFeatures: document.getElementById('backToFeatures'),
    finishButton: document.getElementById('finishButton'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    passwordHint: document.getElementById('passwordHint'),
    finishError: document.getElementById('finishError'),
    wizardPassword: document.getElementById('wizardPassword'),
    wizardUnlockError: document.getElementById('wizardUnlockError'),
    wizardUnlockButton: document.getElementById('wizardUnlockButton'),
    doneSummary: document.getElementById('doneSummary'),
    openBilibili: document.getElementById('openBilibili'),
    openSettings: document.getElementById('openSettings')
  };

  const panels = Array.from(document.querySelectorAll('[data-step]'));
  const dots = Array.from(document.querySelectorAll('[data-step-dot]'));
  const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
  const featureInputs = new Map();
  let settings = { ...DEFAULT_SETTINGS };
  let currentStep = 1;
  let busy = false;
  let unlockBusy = false;
  let passwordRecord = null;

  function normalizeSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      result[key] = typeof source[key] === 'boolean' ? source[key] : DEFAULT_SETTINGS[key];
    }
    return result;
  }

  function normalizeIdList(list) {
    return new Set(list.filter((key) => key in DEFAULT_SETTINGS));
  }

  function showBackground() {
    if (!Backgrounds || !els.welcomeImage) return;
    const image = Backgrounds.random();
    if (image) els.welcomeImage.src = image.file;
  }

  function buildFeatureGroups() {
    els.featureGroups.replaceChildren();

    for (const group of FEATURE_GROUPS) {
      const card = document.createElement('div');
      card.className = 'feature-group';

      const title = document.createElement('h3');
      title.textContent = group.title;
      card.appendChild(title);

      for (const feature of group.features) {
        const row = document.createElement('label');
        row.className = 'feature-row';

        const label = document.createElement('span');
        label.textContent = feature.label;

        const control = document.createElement('span');
        control.className = 'mini-switch';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = settings[feature.key] !== false;
        input.dataset.setting = feature.key;
        input.addEventListener('change', () => {
          settings[feature.key] = input.checked;
          syncPresetState();
        });
        featureInputs.set(feature.key, input);

        const track = document.createElement('span');
        track.className = 'track';
        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        track.appendChild(thumb);

        control.append(input, track);
        row.append(label, control);
        card.appendChild(row);
      }

      els.featureGroups.appendChild(card);
    }
  }

  function renderInputs() {
    for (const [key, input] of featureInputs.entries()) {
      input.checked = settings[key] !== false;
    }
    syncPresetState();
  }

  function setPreset(name) {
    const enabledKeys = normalizeIdList(PRESETS[name] || []);
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (key === 'enabled') continue;
      settings[key] = enabledKeys.has(key);
    }
    renderInputs();
  }

  function syncPresetState() {
    for (const button of presetButtons) {
      const expected = normalizeIdList(PRESETS[button.dataset.preset] || []);
      const matches = Object.keys(DEFAULT_SETTINGS)
        .filter((key) => key !== 'enabled')
        .every((key) => Boolean(settings[key]) === expected.has(key));
      button.classList.toggle('is-active', matches);
    }
  }

  function setStep(step) {
    currentStep = step;
    for (const panel of panels) {
      panel.hidden = Number(panel.dataset.step) !== step;
    }
    for (const dot of dots) {
      const dotStep = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', dotStep === step);
      dot.classList.toggle('is-complete', dotStep < step);
    }
    els.stepCounter.textContent = step === 0 ? '锁定' : step >= 4 ? '完成' : `${step} / 3`;
  }

  function setUnlockBusy(value) {
    unlockBusy = value;
    els.wizardUnlockButton.disabled = value;
    els.wizardUnlockButton.textContent = value ? '验证中…' : '解锁并继续';
  }

  function clearUnlockError() {
    els.wizardUnlockError.hidden = true;
    els.wizardUnlockError.textContent = '';
    els.wizardPassword.removeAttribute('aria-invalid');
  }

  function showUnlockError(message) {
    els.wizardUnlockError.textContent = message;
    els.wizardUnlockError.hidden = false;
    els.wizardPassword.setAttribute('aria-invalid', 'true');
    els.wizardPassword.focus();
    els.wizardPassword.select();
  }

  async function unlockWizard() {
    if (unlockBusy) return;
    clearUnlockError();
    const password = els.wizardPassword.value.trim();
    if (!password) {
      showUnlockError('请输入设置密码。');
      return;
    }

    setUnlockBusy(true);
    try {
      const valid = await Password.verify(password, passwordRecord);
      if (!valid) {
        showUnlockError('密码不正确，请重试。');
        return;
      }
      els.wizardPassword.value = '';
      setStep(1);
    } catch (error) {
      console.error('[BiliPublicHider] 向导解锁失败：', error);
      showUnlockError(error.message || '验证失败，请重试。');
    } finally {
      setUnlockBusy(false);
    }
  }

  function setBusy(value) {
    busy = value;
    els.finishButton.disabled = value;
    els.finishButton.textContent = value ? '正在保存…' : '完成并启用';
  }

  function clearError() {
    els.finishError.hidden = true;
    els.finishError.textContent = '';
  }

  function showError(message) {
    els.finishError.textContent = message;
    els.finishError.hidden = false;
  }

  function markDone() {
    return chrome.storage.local.set({ [ONBOARDING_KEY]: true });
  }

  async function finishSetup() {
    if (busy) return;
    clearError();

    const password = els.newPassword.value.trim();
    const confirmation = els.confirmPassword.value.trim();
    if (password || confirmation) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        showError(`密码至少需要 ${PASSWORD_MIN_LENGTH} 位。`);
        els.newPassword.focus();
        return;
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        showError(`密码不能超过 ${PASSWORD_MAX_LENGTH} 位。`);
        els.newPassword.focus();
        return;
      }
      if (password !== confirmation) {
        showError('两次输入的密码不一致。');
        els.confirmPassword.focus();
        return;
      }
    }

    setBusy(true);
    try {
      await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
      if (password) {
        const record = await Password.create(password);
        await chrome.storage.local.set({ [PASSWORD_KEY]: record });
      }
      await markDone();
      els.doneSummary.textContent = password
        ? '公共大屏保护已经启用，并设置了设置密码。'
        : '公共大屏保护已经启用，之后可以随时修改隐藏选项。';
      setStep(4);
    } catch (error) {
      console.error('[BiliPublicHider] 向导保存失败：', error);
      showError('保存失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  async function skipSetup() {
    if (busy) return;
    setBusy(true);
    try {
      await markDone();
      els.doneSummary.textContent = '已跳过向导，默认保护设置仍然生效。';
      setStep(4);
    } catch (error) {
      console.error('[BiliPublicHider] 无法完成向导：', error);
      showError('操作失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    els.startButton.addEventListener('click', () => setStep(2));
    els.skipButton.addEventListener('click', skipSetup);
    els.backToWelcome.addEventListener('click', () => setStep(1));
    els.nextFromFeatures.addEventListener('click', () => setStep(3));
    els.backToFeatures.addEventListener('click', () => setStep(2));
    els.finishButton.addEventListener('click', finishSetup);
    els.newPassword.addEventListener('input', clearError);
    els.confirmPassword.addEventListener('input', clearError);
    els.wizardUnlockButton.addEventListener('click', unlockWizard);
    els.wizardPassword.addEventListener('input', clearUnlockError);
    els.wizardPassword.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        unlockWizard();
      }
    });

    for (const button of presetButtons) {
      button.addEventListener('click', () => setPreset(button.dataset.preset));
    }

    els.openBilibili.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.bilibili.com/' });
    });
    els.openSettings.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });
  }

  async function init() {
    showBackground();
    buildFeatureGroups();
    bindEvents();

    try {
      const [settingsResult, passwordResult] = await Promise.all([
        chrome.storage.sync.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }),
        chrome.storage.local.get(PASSWORD_KEY)
      ]);
      settings = normalizeSettings(settingsResult[SETTINGS_KEY]);
      passwordRecord = passwordResult[PASSWORD_KEY] || null;
      renderInputs();
    } catch (error) {
      console.error('[BiliPublicHider] 读取向导设置失败：', error);
      settings = { ...DEFAULT_SETTINGS };
      renderInputs();
    }

    if (passwordRecord) {
      els.passwordHint.textContent = '当前已设置密码；留空保留现有密码，填写则覆盖。';
      setStep(0);
      window.setTimeout(() => els.wizardPassword.focus(), 60);
    } else {
      setStep(1);
    }
  }

  init();
})();
