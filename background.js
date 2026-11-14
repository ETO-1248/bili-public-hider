/* BiliPublicHider — 首次安装/启动时打开设置向导 */
(() => {
  'use strict';

  const ONBOARDING_KEY = 'bphOnboardingDone';

  async function openWelcomeIfNeeded() {
    try {
      const result = await chrome.storage.local.get(ONBOARDING_KEY);
      if (result[ONBOARDING_KEY]) return;
      await chrome.tabs.create({
        url: chrome.runtime.getURL('welcome.html')
      });
    } catch (error) {
      console.warn('[BiliPublicHider] 无法打开设置向导：', error);
    }
  }

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      openWelcomeIfNeeded();
    }
  });

  chrome.runtime.onStartup.addListener(openWelcomeIfNeeded);
})();
