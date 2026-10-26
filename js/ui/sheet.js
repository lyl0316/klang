// Bottom sheet used for filters, versions, reviews, etc.
// openSheet({ title, subtitle, body: Node, footer: Node|null, onClose }) -> { close, setBody, setFooter, el }

import { h, icon, clear } from '../util.js';
import { t } from '../i18n.js';

let openCount = 0;

export function openSheet({ title, subtitle = null, body, footer = null, onClose = null, closeLabel = null }) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const bodyEl = h('div', { class: 'sheet-body' }, body);
  const footerEl = h('div', { class: 'sheet-footer' }, footer);
  if (!footer) footerEl.hidden = true;
  const closeBtn = closeLabel
    ? h('button', { class: 'btn small', onclick: () => close() }, closeLabel)
    : h('button', { class: 'icon-btn', 'aria-label': t('Close'), onclick: () => close() }, icon('close', 18));
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-handle' }),
    h('div', { class: 'sheet-header' },
      h('div', { class: 'grow' }, h('div', { class: 't' }, title), subtitle && h('div', { class: 's' }, subtitle)),
      closeBtn),
    bodyEl,
    footerEl);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    openCount -= 1;
    if (!openCount) document.body.style.overflow = '';
    setTimeout(() => {
      sheet.remove();
      backdrop.remove();
    }, 260);
    onClose?.();
  }
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  // Going to another page (a link, Back, the iPhone's edge swipe) never leaves a sheet over it.
  window.addEventListener('hashchange', close);
  document.body.append(backdrop, sheet);
  openCount += 1;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    sheet.classList.add('open');
  });
  return {
    el: sheet,
    close,
    setBody(node) {
      clear(bodyEl).append(node);
    },
    setFooter(node) {
      clear(footerEl);
      if (node) {
        footerEl.append(node);
        footerEl.hidden = false;
      } else footerEl.hidden = true;
    },
  };
}
