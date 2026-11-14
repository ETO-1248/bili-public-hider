/* BiliPublicHider — 内置背景插画清单
 * 关于页随机展示，设置页可选择关闭、随机或指定其中一张。
 */
(() => {
  'use strict';

  const images = Object.freeze([
    { id: 'bg-01', file: 'pictures/bg-01.jpg', thumb: 'pictures/thumbs/bg-01.jpg', label: '插画 01' },
    { id: 'bg-02', file: 'pictures/bg-02.jpg', thumb: 'pictures/thumbs/bg-02.jpg', label: '插画 02' },
    { id: 'bg-03', file: 'pictures/bg-03.jpg', thumb: 'pictures/thumbs/bg-03.jpg', label: '插画 03' },
    { id: 'bg-04', file: 'pictures/bg-04.jpg', thumb: 'pictures/thumbs/bg-04.jpg', label: '插画 04' },
    { id: 'bg-05', file: 'pictures/bg-05.jpg', thumb: 'pictures/thumbs/bg-05.jpg', label: '插画 05' },
    { id: 'bg-06', file: 'pictures/bg-06.jpg', thumb: 'pictures/thumbs/bg-06.jpg', label: '插画 06' },
    { id: 'bg-07', file: 'pictures/bg-07.jpg', thumb: 'pictures/thumbs/bg-07.jpg', label: '插画 07' },
    { id: 'bg-08', file: 'pictures/bg-08.jpg', thumb: 'pictures/thumbs/bg-08.jpg', label: '插画 08' },
    { id: 'bg-09', file: 'pictures/bg-09.jpg', thumb: 'pictures/thumbs/bg-09.jpg', label: '插画 09' }
  ]);

  function byId(id) {
    return images.find((image) => image.id === id) || null;
  }

  function random(excludeId) {
    const pool = images.filter((image) => image.id !== excludeId);
    const candidates = pool.length ? pool : images;
    return candidates[Math.floor(Math.random() * candidates.length)] || null;
  }

  globalThis.BPHBackgrounds = Object.freeze({
    images,
    byId,
    random
  });
})();
