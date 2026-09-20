/** Chip filters: [data-filter-scope] wraps buttons[data-filter] and items[data-tag]. */
export function initFilters() {
  document.querySelectorAll('[data-filter-scope]').forEach((scope) => {
    const buttons = scope.querySelectorAll('[data-filter]');
    const items = scope.querySelectorAll('[data-tag]');
    const status = scope.querySelector('[data-filter-status]');

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const value = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      items.forEach((item) => {
        const match = value === 'all' || item.dataset.tag.split(' ').includes(value);
        item.hidden = !match;
        if (match) shown += 1;
      });
      if (status) status.textContent = `Showing ${shown} of ${items.length}`;
    }));
  });
}
