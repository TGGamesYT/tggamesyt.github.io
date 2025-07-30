  function formatItemName(name) {
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}

function getItemImage(name, extension = 'png') {
  return name.toLowerCase() === 'air'
    ? ''
    : `https://minecraft.wiki/images/Invicon_${formatItemName(name)}.${extension}`;
}

function createSlot(itemName = '', count = null) {
  const slot = document.createElement('div');
  slot.className = 'slot';

  if (itemName && itemName.toLowerCase() !== 'air') {
    const img = document.createElement('img');
    img.src = getItemImage(itemName, 'png');

    img.onerror = () => {
      // Try GIF fallback
      const gifUrl = getItemImage(itemName, 'gif');
      const gifImg = new Image();
      gifImg.onload = () => img.src = gifUrl;
      gifImg.onerror = () => {
        img.src = 'https://minecraft.wiki/images/Missing_Texture_JE4.png';
      };
      gifImg.src = gifUrl;
    };

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

  const total = rows * cols;
  const finalSlots = Array(total).fill(['Air', null]);

  for (let i = 0; i < items.length; i++) {
    const [index, name, count] = items[i];
    const slotIndex = typeof index === 'number' ? index : finalSlots.findIndex(s => s[0] === 'Air');
    if (slotIndex >= 0 && slotIndex < total) {
      finalSlots[slotIndex] = [name, count];
    }
  }

  finalSlots.forEach(([name, count]) => {
    grid.appendChild(createSlot(name, count));
  });

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
    let index = null;
    let name = '';
    let count = null;

    // Matches: index = name, count
    const indexedMatch = line.match(/^(\d+)\s*=\s*(.*)$/);
    if (indexedMatch) {
      index = parseInt(indexedMatch[1]);
      const rest = indexedMatch[2];
      [name, countStr] = rest.split(',').map(s => s.trim());
      count = countStr ? parseInt(countStr) : null;
    } else {
      // Fallback for "Item Name, Count"
      const parts = line.split(',').map(s => s.trim());
      name = parts[0];
      count = parts[1] ? parseInt(parts[1]) : null;
    }

    items.push([index, name, count]);
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
