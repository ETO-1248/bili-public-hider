/* BiliPublicHider — 关于页随机背景图 */
(() => {
  'use strict';

  const backgrounds = globalThis.BPHBackgrounds;
  const image = document.getElementById('aboutImage');
  const shuffleButton = document.getElementById('shuffleImage');

  if (!backgrounds || !image) return;

  let currentId = null;

  function showBackground(item) {
    if (!item) return;
    currentId = item.id;
    image.src = item.file;
  }

  function showNextBackground() {
    showBackground(backgrounds.random(currentId));
  }

  if (shuffleButton) {
    shuffleButton.addEventListener('click', showNextBackground);
  }

  showNextBackground();
})();
