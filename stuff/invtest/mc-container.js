function formatItemName(name) {
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}

function getItemImage(name) {
  return name ? `https://minecraft.wiki/images/Invicon_${formatItemName(name)}.png` : '';
}

function createSlot(itemName = '', count = null) {
  const slot = document.createElement('div');
  slot.className = 'slot';

  if (itemName) {
    const img = document.createElement('img');
    img.src = getItemImage(itemName);
    slot.appendChild(img);

    if (count) {
      const label = document.createElement('div');
      label.className = 'slot-count';
      label.textContent = count;
      slot.appendChild(label);
    }
  }

  return slot;
}

function createGrid(rows, cols, items) {
  const grid = document.createElement('div');
  grid.className = 'inventory-grid';
  grid.style.gridTemplateRows = `repeat(${rows}, 36px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

  const totalSlots = rows * cols;
  for (let i = 0; i < totalSlots; i++) {
    const [name, count] = items[i] || [];
    grid.appendChild(createSlot(name, count));
  }

  return grid;
}

function parseInventoryText(raw) {
  const groups = raw.match(/\{\{([\s\S]*?)\}\}/g);
  if (!groups) return [];

  const wrappers = [];

  for (const group of groups) {
    const subBlocks = group.match(/\{([\s\S]*?)\}/g);
    const wrapper = document.createElement('div');
    wrapper.className = 'container-wrapper';

    const frame = document.createElement('div');
    frame.className = 'container-frame';

    if (subBlocks) {
      for (const block of subBlocks) {
        const lines = block.replace(/[{}]/g, '')
          .split('|')
          .map(s => s.trim())
          .filter(Boolean);

        let title = 'Inventory';
        let cols = 9, rows = 3;
        const items = [];

        for (const line of lines) {
          if (line.toLowerCase().startsWith('title =')) {
            title = line.split('=').slice(1).join('=').trim();
          } else if (line.toLowerCase().startsWith('grid =')) {
            const parts = line.split('=').slice(1).join('=').trim().split('x');
            cols = parseInt(parts[0]) || 9;
            rows = parseInt(parts[1]) || 3;
          } else {
            const [item, count] = line.split(',').map(s => s.trim());
            items.push([item, count ? parseInt(count) : null]);
          }
        }

        const titleEl = document.createElement('div');
        titleEl.className = 'inventory-title';
        titleEl.textContent = title;
        frame.appendChild(titleEl);

        const grid = createGrid(rows, cols, items);
        frame.appendChild(grid);
      }

      wrapper.appendChild(frame);
      wrappers.push(wrapper);
    }
  }

  return wrappers;
}

function parseMinecraftInventories() {
  document.querySelectorAll('p.container').forEach(p => {
    const parsed = parseInventoryText(p.innerHTML);
    parsed.forEach(el => p.replaceWith(el));
  });
}

window.addEventListener('DOMContentLoaded', parseMinecraftInventories);
