function formatItemName(name) {
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}

function getItemImage(name, extension = 'png') {
  if (/^https?:\/\//i.test(name)) return name;
  return name.toLowerCase() === 'air'
    ? ''
    : `https://minecraft.wiki/images/Invicon_${formatItemName(name)}.${extension}`;
}

function createSlot(itemName = '', count = null, hidden = false) {
  const slot = document.createElement('div');
  slot.className = 'slot';

  if (itemName && itemName.toLowerCase() !== 'air') {
    const img = document.createElement('img');
    const isUrl = /^https?:\/\//i.test(itemName);
    img.src = isUrl ? itemName : getItemImage(itemName, 'png');

    img.onerror = () => {
      if (isUrl) {
        img.src = 'https://minecraft.wiki/images/Missing_Texture_JE4.png';
      } else {
        const gifUrl = getItemImage(itemName, 'gif');
        const gifImg = new Image();
        gifImg.onload = () => img.src = gifUrl;
        gifImg.onerror = () => {
          img.src = 'https://minecraft.wiki/images/Missing_Texture_JE4.png';
        };
        gifImg.src = gifUrl;
      }
    };

    slot.appendChild(img);

    if (count) {
      const label = document.createElement('div');
      label.className = 'slot-count';
      label.textContent = count;
      slot.appendChild(label);
    }
  }

  if (hidden) {
  slot.classList.add('invisible-slot');
  }

  return slot;
}

function createGrid(rows, cols, items, hiddenSlots = new Set()) {
  const grid = document.createElement('div');
  grid.className = 'inventory-grid';
  grid.style.gridTemplateRows = `repeat(${rows}, 36px)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

  const total = rows * cols;
  const finalSlots = Array(total).fill(['Air', null]);

  for (const [index, name, count] of items) {
    const slotIndex = typeof index === 'number' ? index : finalSlots.findIndex(s => s[0] === 'Air');
    if (slotIndex >= 0 && slotIndex < total) {
      finalSlots[slotIndex] = [name, count];
    }
  }

  finalSlots.forEach(([name, count], idx) => {
    const hidden = hiddenSlots.has(idx);
    grid.appendChild(createSlot(name, count, hidden));
  });

  return grid;
}

function parseInventoryBlock(lines) {
  let title = 'Inventory';
  let cols = 9, rows = 3;
  const items = [];
  const hiddenSlots = new Set();
  const midItems = [];
  const newGrids = [];

  for (const line of lines) {
    if (line.toLowerCase().startsWith('title =')) {
      title = line.split('=').slice(1).join('=').trim();

    } else if (line.toLowerCase().startsWith('grid =')) {
      const parts = line.split('=').slice(1).join('=').trim().split('x');
      cols = parseInt(parts[0]) || 9;
      rows = parseInt(parts[1]) || 3;

    } else if (line.toLowerCase().startsWith('hideslot =')) {
      const raw = line.split('=').slice(1).join('=').trim();
      const matches = raw.match(/\[([^\]]+)\]/);
      if (matches) {
        const parts = matches[1].split(',').map(s => s.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) hiddenSlots.add(i);
          } else {
            hiddenSlots.add(parseInt(part));
          }
        }
      }

    } else if (line.toLowerCase().startsWith('mid')) {
      const match = line.match(/^mid\s+(\d+),\s*(\d+)\s*=\s*(.*)$/i);
      if (match) {
        const [, a, b, rest] = match;
        const [name, countStr] = rest.split(',').map(s => s.trim());
        const count = countStr ? parseInt(countStr) : null;
        midItems.push({ a: parseInt(a), b: parseInt(b), name, count });
      }

    } else if (line.toLowerCase().startsWith('newgrid =')) {
      const parts = line.split('=').slice(1).join('=').trim().split(' ');
      if (parts.length >= 2) {
        const [dim, dir, ...cutParts] = parts;
        const [newCols, newRows] = dim.split('x').map(n => parseInt(n.trim()));
        const cutSlots = cutParts.join(' ').split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        newGrids.push({ cols: newCols, rows: newRows, dir, cutSlots });
      }

    } else {
      const match = line.match(/^(\d+)\s*=\s*(.*)$/);
      let index = null;
      let content = line;

      if (match) {
        index = parseInt(match[1]);
        content = match[2];
      }

      const [nameOrUrl, countStr] = content.split(',').map(s => s.trim());
      const count = countStr ? parseInt(countStr) : null;
      items.push([index, nameOrUrl, count]);
    }
  }

  const frame = document.createElement('div');
  frame.className = 'container-frame';

  const titleEl = document.createElement('div');
  titleEl.className = 'inventory-title';
  titleEl.textContent = title;
  frame.appendChild(titleEl);

  // Multi-grid setup
  const grid = createMultiGrid(rows, cols, items, newGrids, hiddenSlots);
  frame.appendChild(grid);

  // Add mid items (floating)
  for (const mid of midItems) {
    const midEl = createSlot(mid.name, mid.count);
    midEl.classList.add('mid-item');
    midEl.dataset.slotA = mid.a;
    midEl.dataset.slotB = mid.b;
    frame.appendChild(midEl);
  }

  return frame;
    }
function parseInventoryText(raw, callback)
{
  const groups = raw.match(/\{\{([\s\S]*?)\}\}/g);

  if (!groups) return;
  
  for (const group of groups) {
    const presetMatch = group.match(/\|preset\s*=\s*([^\|\}\n]+)/i);
    if (presetMatch) {
      let presetPath = presetMatch[1].trim();
      if (!presetPath.endsWith('.json')) presetPath += '.json';
      if (!presetPath.startsWith('http')) {
        presetPath = `https://tggamesyt.dev/inv/presets/${presetPath}`;
      }

      fetch(presetPath)
        .then(res => res.json())
        .then(data => {
          const block = data['inventory'] || data.default || Object.values(data)[0];
          const innerLines = block.split('|').map(s => s.trim()).filter(Boolean);
          const wrapper = document.createElement('div');
          wrapper.className = 'container-wrapper';
          const parsedBlock = parseInventoryBlock(innerLines);
          wrapper.appendChild(parsedBlock);
          positionMidItems(wrapper);
          callback(wrapper);
        })
        .catch(() => {
          const err = document.createElement('div');
          err.textContent = `Failed to load preset: ${presetPath}`;
          callback(err);
        });
    } else {
      const subBlocks = group.match(/\{([\s\S]*?)\}/g);
      if (subBlocks) {
        for (const block of subBlocks) {
          const lines = block.replace(/[{}]/g, '')
            .split('|')
            .map(s => s.trim())
            .filter(Boolean);

          const wrapper = document.createElement('div');
          wrapper.className = 'container-wrapper';
          const parsedBlock = parseInventoryBlock(lines);
          wrapper.appendChild(parsedBlock);
          positionMidItems(wrapper);
          callback(wrapper);
        }
      }
    }
  }
}

function parseMinecraftInventories() {
  document.querySelectorAll('p.container').forEach(p => {
    const raw = p.textContent;
    parseInventoryText(raw, parsed => {
      p.replaceWith(parsed);
      positionMidItems(parsed);
    });
  });
}

function positionMidItems(container) {
  const slots = container.querySelectorAll('.slot');
  const mids = container.querySelectorAll('.mid-item');

  mids.forEach(mid => {
    const a = parseInt(mid.dataset.slotA);
    const b = parseInt(mid.dataset.slotB);
    const elA = slots[a];
    const elB = slots[b];

    if (!elA || !elB) return;

    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();

    const x = (rectA.left + rectB.left) / 2 + window.scrollX;
    const y = (rectA.top + rectB.top) / 2 + window.scrollY;

    mid.style.position = 'absolute';
    mid.style.left = `${x}px`;
    mid.style.top = `${y}px`;
  });
}

function createMultiGrid(baseRows, baseCols, items, newGrids, hiddenSlots = new Set()) {
  // Ensure newGrids is an array to avoid .map() crash
  if (!Array.isArray(newGrids)) newGrids = [];

  const container = document.createElement('div');
  container.className = 'multi-grid-wrapper';

  const allGrids = [{ cols: baseCols, rows: baseRows, items: [], offset: 0 }].concat(
    newGrids.map((g, i) => ({ ...g, items: [], offset: 0 }))
  );

  // Flatten items into corresponding grids
  let offset = 0;
  for (let i = 0; i < items.length; i++) {
    const [index, name, count] = items[i];
    for (let g = 0; g < allGrids.length; g++) {
      const grid = allGrids[g];
      const slotCount = grid.cols * grid.rows;
      if (index >= offset && index < offset + slotCount) {
        const gridIndex = index - offset;
        if (!grid.cutSlots || !grid.cutSlots.includes(gridIndex.toString())) {
          grid.items.push([gridIndex, name, count]);
        }
        break;
      }
      offset += slotCount;
    }
  }

  // Render all grids
  allGrids.forEach((grid, i) => {
    const gridEl = createGrid(grid.rows, grid.cols, grid.items, hiddenSlots);
    gridEl.classList.add('grid-block');
    container.appendChild(gridEl);
  });

  container.classList.add('grid-flex');
  return container;
    }

window.addEventListener('DOMContentLoaded', parseMinecraftInventories);
