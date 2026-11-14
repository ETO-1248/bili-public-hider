/* BiliPublicHider — 设置弹窗
 * 密码只在本机以 PBKDF2-SHA-256 派生结果保存，不保存明文、不联网。
 */
(() => {
  'use strict';

  const SETTINGS_KEY = 'bphSettings';
  const APPEARANCE_KEY = 'bphAppearance';
  const PASSWORD_KEY = 'bphPassword';
  const PASSWORD_MIN_LENGTH = 4;
  const PASSWORD_MAX_LENGTH = 64;
  const Password = globalThis.BPHPassword;
  const Backgrounds = globalThis.BPHBackgrounds;

  const DEFAULT_APPEARANCE = Object.freeze({
    background: 'random'
  });

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

  const els = {
    loadingView: document.getElementById('loadingView'),
    appView: document.getElementById('appView'),
    lockView: document.getElementById('lockView'),
    saveBadge: document.getElementById('saveBadge'),
    powerTitle: document.getElementById('powerTitle'),
    powerDesc: document.getElementById('powerDesc'),
    enabledInput: document.getElementById('enabledInput'),
    resetButton: document.getElementById('resetButton'),
    backgroundSelect: document.getElementById('backgroundSelect'),
    backgroundPreview: document.getElementById('backgroundPreview'),
    backgroundPreviewLabel: document.getElementById('backgroundPreviewLabel'),
    backgroundDesc: document.getElementById('backgroundDesc'),
    lockBadge: document.getElementById('lockBadge'),
    passwordStatus: document.getElementById('passwordStatus'),
    securityActions: document.getElementById('securityActions'),
    unlockForm: document.getElementById('unlockForm'),
    unlockPassword: document.getElementById('unlockPassword'),
    toggleUnlockPassword: document.getElementById('toggleUnlockPassword'),
    unlockError: document.getElementById('unlockError'),
    unlockButton: document.getElementById('unlockButton'),
    forgotButton: document.getElementById('forgotButton'),
    passwordDialog: document.getElementById('passwordDialog'),
    passwordForm: document.getElementById('passwordForm'),
    dialogTitle: document.getElementById('dialogTitle'),
    dialogDesc: document.getElementById('dialogDesc'),
    dialogClose: document.getElementById('dialogClose'),
    currentPasswordField: document.getElementById('currentPasswordField'),
    currentPassword: document.getElementById('currentPassword'),
    newPasswordFields: document.getElementById('newPasswordFields'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    dialogError: document.getElementById('dialogError'),
    dialogCancel: document.getElementById('dialogCancel'),
    dialogSubmit: document.getElementById('dialogSubmit'),
    helpDialog: document.getElementById('helpDialog'),
    helpClose: document.getElementById('helpClose'),
    helpDone: document.getElementById('helpDone')
  };

  let settings = { ...DEFAULT_SETTINGS };
  let appearance = { ...DEFAULT_APPEARANCE };
  let activeBackgroundId = null;
  let passwordRecord = null;
  let passwordMode = 'set';
  let dialogBusy = false;
  let saveQueue = Promise.resolve();
  let saveTimer = 0;

  function normalizeSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      result[key] = typeof source[key] === 'boolean' ? source[key] : DEFAULT_SETTINGS[key];
    }
    return result;
  }

  function normalizeAppearance(value) {
    const source = value && typeof value === 'object' ? value : {};
    const background = typeof source.background === 'string' ? source.background : 'none';
    if (background === 'none' || background === 'random') {
      return { background };
    }
    if (Backgrounds && Backgrounds.byId(background)) {
      return { background };
    }
    return { ...DEFAULT_APPEARANCE };
  }

  function buildBackgroundOptions() {
    if (!Backgrounds || !els.backgroundSelect) return;
    for (const image of Backgrounds.images) {
      const option = document.createElement('option');
      option.value = image.id;
      option.textContent = image.label;
      els.backgroundSelect.appendChild(option);
    }
  }

  function renderAppearance() {
    if (!els.backgroundSelect) return;

    const mode = appearance.background;
    let image = null;
    if (mode === 'random' && Backgrounds) {
      image = Backgrounds.random(activeBackgroundId);
    } else if (mode !== 'none' && Backgrounds) {
      image = Backgrounds.byId(mode);
    }
    activeBackgroundId = image ? image.id : null;
    els.backgroundSelect.value = mode;

    if (image) {
      const backgroundImage = `url("${image.file}")`;
      const thumbnailImage = `url("${image.thumb || image.file}")`;
      document.body.dataset.bphBg = 'true';
      document.body.style.setProperty('--bph-popup-bg', backgroundImage);
      els.backgroundPreview.classList.add('has-image');
      els.backgroundPreview.style.setProperty('--bph-thumb', thumbnailImage);
      els.backgroundPreviewLabel.textContent = image.label;
      els.backgroundDesc.textContent = mode === 'random'
        ? `每次随机 · 当前 ${image.label}`
        : image.label;
      return;
    }

    delete document.body.dataset.bphBg;
    document.body.style.removeProperty('--bph-popup-bg');
    els.backgroundPreview.classList.remove('has-image');
    els.backgroundPreview.style.removeProperty('--bph-thumb');
    els.backgroundPreviewLabel.textContent = '无';
    els.backgroundDesc.textContent = '不使用背景';
  }

  async function saveAppearance(background, notify = true) {
    appearance = normalizeAppearance({ background });
    renderAppearance();
    try {
      await chrome.storage.sync.set({ [APPEARANCE_KEY]: appearance });
      if (notify) showBadge('已保存');
    } catch (error) {
      console.error('[BiliPublicHider] 保存背景设置失败：', error);
      showBadge('保存失败', true);
    }
  }

  function showView(view) {
    els.loadingView.hidden = true;
    els.appView.hidden = view !== 'app';
    els.lockView.hidden = view !== 'lock';
    if (view === 'lock') {
      window.setTimeout(() => els.unlockPassword.focus(), 40);
    }
  }

  function showBadge(message, isError = false) {
    els.saveBadge.textContent = message;
    els.saveBadge.classList.add('is-visible');
    els.saveBadge.classList.toggle('is-error', isError);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      els.saveBadge.classList.remove('is-visible');
    }, 1900);
  }

  function renderSettings() {
    els.enabledInput.checked = settings.enabled;
    els.powerTitle.textContent = settings.enabled ? '已开启' : '已暂停';
    els.powerDesc.textContent = settings.enabled
      ? '已选入口不会出现在页面中'
      : '所有隐藏规则已临时停用';

    document.querySelectorAll('[data-feature]').forEach((row) => {
      const input = row.querySelector('[data-setting]');
      if (!input) return;
      input.checked = Boolean(settings[input.dataset.setting]);
      input.disabled = !settings.enabled;
      row.classList.toggle('is-disabled', !settings.enabled);
    });
  }

  function queueSave() {
    const snapshot = { ...settings };
    saveQueue = saveQueue
      .then(() => chrome.storage.sync.set({ [SETTINGS_KEY]: snapshot }))
      .then(() => showBadge('已保存'))
      .catch((error) => {
        console.error('[BiliPublicHider] 保存设置失败：', error);
        showBadge('保存失败', true);
      });
  }

  function updateSettings(patch) {
    settings = { ...settings, ...patch };
    renderSettings();
    queueSave();
  }

  function addSecurityButton(label, handler, primary = false, title = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mini-button${primary ? ' mini-button--primary' : ''}`;
    button.textContent = label;
    if (title) {
      button.title = title;
      button.setAttribute('aria-label', title);
    }
    button.addEventListener('click', handler);
    els.securityActions.appendChild(button);
  }

  function renderSecurity() {
    const hasPassword = Boolean(passwordRecord);
    const validPassword = !hasPassword || Password.isValid(passwordRecord);

    els.lockBadge.textContent = hasPassword ? (validPassword ? '已保护' : '数据异常') : '未保护';
    els.lockBadge.classList.toggle('is-on', hasPassword && validPassword);
    els.lockBadge.classList.toggle('is-warning', hasPassword && !validPassword);

    if (!hasPassword) {
      els.passwordStatus.textContent = '未设置 · 任何人都能修改开关';
    } else if (!validPassword) {
      els.passwordStatus.textContent = '密码数据异常 · 请重新安装扩展';
    } else {
      els.passwordStatus.textContent = '已设置 · 打开弹窗需解锁';
    }

    els.securityActions.replaceChildren();
    if (!hasPassword) {
      addSecurityButton('设置密码', () => openPasswordDialog('set'), true, '设置密码');
      return;
    }

    addSecurityButton('修改密码', () => openPasswordDialog('change'), false, '修改设置密码');
    addSecurityButton('移除密码', () => openPasswordDialog('remove'), false, '移除设置密码');
    addSecurityButton('锁定', lockNow, false, '立即锁定设置');
  }

  function clearUnlockError() {
    els.unlockError.hidden = true;
    els.unlockError.textContent = '';
    els.unlockPassword.removeAttribute('aria-invalid');
  }

  function showUnlockError(message) {
    els.unlockError.textContent = message;
    els.unlockError.hidden = false;
    els.unlockPassword.setAttribute('aria-invalid', 'true');
    els.unlockPassword.focus();
    els.unlockPassword.select();
  }

  function resetUnlockForm() {
    els.unlockForm.reset();
    clearUnlockError();
    els.unlockPassword.type = 'password';
    els.toggleUnlockPassword.textContent = '显示';
    els.toggleUnlockPassword.setAttribute('aria-label', '显示密码');
    setUnlockBusy(false);
  }

  function lockNow() {
    if (!passwordRecord) return;
    resetUnlockForm();
    showView('lock');
  }

  function setUnlockBusy(busy) {
    els.unlockButton.disabled = busy;
    els.unlockButton.textContent = busy ? '验证中…' : '解锁设置';
  }

  async function handleUnlock(event) {
    event.preventDefault();
    clearUnlockError();

    const value = els.unlockPassword.value.trim();
    if (!value) {
      showUnlockError('请输入设置密码。');
      return;
    }

    setUnlockBusy(true);
    try {
      const valid = await Password.verify(value, passwordRecord);
      if (!valid) {
        showUnlockError('密码不正确，请重试。');
        return;
      }
      els.unlockPassword.value = '';
      showView('app');
    } catch (error) {
      console.error('[BiliPublicHider] 验证密码失败：', error);
      showUnlockError(error.message || '验证失败，请重试。');
    } finally {
      setUnlockBusy(false);
    }
  }

  function clearDialogError() {
    els.dialogError.hidden = true;
    els.dialogError.textContent = '';
  }

  function showDialogError(message) {
    els.dialogError.textContent = message;
    els.dialogError.hidden = false;
  }

  function dialogTexts(mode) {
    if (mode === 'change') {
      return {
        title: '修改密码',
        desc: '先输入当前密码，再设置新的设置密码。',
        submit: '保存新密码'
      };
    }
    if (mode === 'remove') {
      return {
        title: '移除密码',
        desc: '移除后，打开弹窗将不再需要密码。',
        submit: '移除密码'
      };
    }
    return {
      title: '设置密码',
      desc: '设置后，打开弹窗和修改开关都需要先输入密码。',
      submit: '保存密码'
    };
  }

  function setDialogBusy(busy) {
    dialogBusy = busy;
    els.dialogSubmit.disabled = busy;
    const text = dialogTexts(passwordMode);
    els.dialogSubmit.textContent = busy ? '处理中…' : text.submit;
  }

  function openPasswordDialog(mode) {
    passwordMode = mode;
    const text = dialogTexts(mode);

    els.passwordForm.reset();
    clearDialogError();
    els.dialogTitle.textContent = text.title;
    els.dialogDesc.textContent = text.desc;
    els.currentPasswordField.hidden = mode === 'set';
    els.newPasswordFields.hidden = mode === 'remove';
    els.dialogSubmit.textContent = text.submit;
    els.dialogSubmit.classList.toggle('is-danger', mode === 'remove');
    setDialogBusy(false);

    if (typeof els.passwordDialog.showModal === 'function') {
      els.passwordDialog.showModal();
    } else {
      els.passwordDialog.setAttribute('open', '');
    }

    window.setTimeout(() => {
      if (mode === 'set') {
        els.newPassword.focus();
      } else {
        els.currentPassword.focus();
      }
    }, 40);
  }

  function closePasswordDialog(force = false) {
    if (dialogBusy && !force) return;
    if (typeof els.passwordDialog.close === 'function') {
      els.passwordDialog.close();
    } else {
      els.passwordDialog.removeAttribute('open');
    }
  }

  function validateNewPassword(password, confirmation) {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `新密码至少需要 ${PASSWORD_MIN_LENGTH} 位。`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return `新密码不能超过 ${PASSWORD_MAX_LENGTH} 位。`;
    }
    if (password !== confirmation) {
      return '两次输入的新密码不一致。';
    }
    return '';
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (dialogBusy) return;
    clearDialogError();

    const mode = passwordMode;
    const current = els.currentPassword.value.trim();
    const next = els.newPassword.value.trim();
    const confirmation = els.confirmPassword.value.trim();

    if (mode !== 'set' && !current) {
      showDialogError('请输入当前密码。');
      els.currentPassword.focus();
      return;
    }

    if (mode !== 'remove') {
      const validationError = validateNewPassword(next, confirmation);
      if (validationError) {
        showDialogError(validationError);
        (next.length < PASSWORD_MIN_LENGTH ? els.newPassword : els.confirmPassword).focus();
        return;
      }
    }

    setDialogBusy(true);
    try {
      if (mode !== 'set') {
        const valid = await Password.verify(current, passwordRecord);
        if (!valid) {
          showDialogError('当前密码不正确。');
          els.currentPassword.focus();
          els.currentPassword.select();
          return;
        }
      }

      if (mode === 'remove') {
        await chrome.storage.local.remove(PASSWORD_KEY);
        passwordRecord = null;
        renderSecurity();
        closePasswordDialog(true);
        showBadge('密码已移除');
        return;
      }

      const record = await Password.create(next);
      await chrome.storage.local.set({ [PASSWORD_KEY]: record });
      passwordRecord = record;
      renderSecurity();
      closePasswordDialog(true);
      showBadge(mode === 'change' ? '密码已更新' : '密码已设置');
    } catch (error) {
      console.error('[BiliPublicHider] 保存密码失败：', error);
      showDialogError(error.message || '操作失败，请重试。');
    } finally {
      setDialogBusy(false);
    }
  }

  function toggleUnlockVisibility() {
    const showing = els.unlockPassword.type === 'text';
    els.unlockPassword.type = showing ? 'password' : 'text';
    els.toggleUnlockPassword.textContent = showing ? '显示' : '隐藏';
    els.toggleUnlockPassword.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
    els.unlockPassword.focus();
  }

  function openHelp() {
    if (typeof els.helpDialog.showModal === 'function') {
      els.helpDialog.showModal();
    } else {
      els.helpDialog.setAttribute('open', '');
    }
  }

  function closeHelp() {
    if (typeof els.helpDialog.close === 'function') {
      els.helpDialog.close();
    } else {
      els.helpDialog.removeAttribute('open');
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('change', () => {
        updateSettings({ [input.dataset.setting]: input.checked });
      });
    });

    els.backgroundSelect.addEventListener('change', () => {
      saveAppearance(els.backgroundSelect.value);
    });

    els.resetButton.addEventListener('click', () => {
      settings = { ...DEFAULT_SETTINGS };
      appearance = { ...DEFAULT_APPEARANCE };
      renderSettings();
      renderAppearance();
      queueSave();
      saveAppearance(DEFAULT_APPEARANCE.background, false);
      showBadge('已恢复默认');
    });

    els.unlockForm.addEventListener('submit', handleUnlock);
    els.toggleUnlockPassword.addEventListener('click', toggleUnlockVisibility);
    els.unlockPassword.addEventListener('input', clearUnlockError);
    els.forgotButton.addEventListener('click', openHelp);

    els.passwordForm.addEventListener('submit', handlePasswordSubmit);
    els.dialogClose.addEventListener('click', closePasswordDialog);
    els.dialogCancel.addEventListener('click', closePasswordDialog);
    els.currentPassword.addEventListener('input', clearDialogError);
    els.newPassword.addEventListener('input', clearDialogError);
    els.confirmPassword.addEventListener('input', clearDialogError);

    els.helpClose.addEventListener('click', closeHelp);
    els.helpDone.addEventListener('click', closeHelp);

    els.passwordDialog.addEventListener('close', () => {
      els.passwordForm.reset();
      clearDialogError();
      setDialogBusy(false);
    });
    els.helpDialog.addEventListener('close', () => {
      if (!els.appView.hidden) {
        els.resetButton.focus();
      }
    });
  }

  async function loadState() {
    let settingsLoadError = null;
    let passwordLoadError = null;

    try {
      const result = await chrome.storage.sync.get({
        [SETTINGS_KEY]: DEFAULT_SETTINGS,
        [APPEARANCE_KEY]: DEFAULT_APPEARANCE
      });
      settings = normalizeSettings(result[SETTINGS_KEY]);
      appearance = normalizeAppearance(result[APPEARANCE_KEY]);
    } catch (error) {
      settingsLoadError = error;
      settings = { ...DEFAULT_SETTINGS };
      appearance = { ...DEFAULT_APPEARANCE };
    }

    try {
      const result = await chrome.storage.local.get(PASSWORD_KEY);
      passwordRecord = result[PASSWORD_KEY] || null;
    } catch (error) {
      passwordLoadError = error;
      passwordRecord = null;
    }

    renderSettings();
    renderAppearance();
    renderSecurity();

    if (passwordRecord) {
      lockNow();
    } else {
      showView('app');
    }

    if (settingsLoadError || passwordLoadError) {
      console.error('[BiliPublicHider] 初始化读取失败：', settingsLoadError || passwordLoadError);
      showBadge('读取失败', true);
    }
  }

  function init() {
    buildBackgroundOptions();
    bindEvents();
    loadState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
