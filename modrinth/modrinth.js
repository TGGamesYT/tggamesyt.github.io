// DEPLOY THIS ALREADY GITHUB PLSPLSPLS
async function getProjectOwner(slug) {
  try {
    // 1. Check project members
    const membersRes = await fetch(`https://api.modrinth.com/v3/project/${slug}/members`);
    const members = await membersRes.json();

    const owner = members.find(m => m.is_owner === true);
    if (owner) return owner.user?.username || "Unknown";
  } catch (err) {
    console.warn("Failed to fetch members for", slug, err);
  }

  try {
    // 2. If no owner in members, check organization members
    const orgRes = await fetch(`https://api.modrinth.com/v3/project/${slug}/organization`);
    const org = await orgRes.json();

    if (org && Array.isArray(org.members)) {
      const owner = org.members.find(m => m.is_owner === true);
      if (owner) return owner.user?.username || "Unknown";
    }
  } catch (err) {
    console.warn("Failed to fetch org for", slug, err);
  }

  return "Unknown";
}

async function createModrinthCard(project, slug, authorOverride) {
  const author = authorOverride || (await getProjectOwner(slug));

  const gallery = project.gallery || [];
  const bannerImage = gallery.length > 0 ? gallery[0].url : project.icon_url;

  const card = document.createElement("a");
  card.href = `https://modrinth.com/project/${slug}`;
  card.className = "modrinth-card";
  card.innerHTML = `
    <div class="modrinth-banner" style="background-image: url('${bannerImage}');"></div>
    <div class="modrinth-content">
      <img class="modrinth-icon" src="${project.icon_url}" alt="${project.title}">
      <div class="modrinth-info">
        <h3 class="modrinth-title">${project.title}</h3>
        <p class="modrinth-author">by ${author}</p>
      </div>
    </div>
    <p class="modrinth-description">${project.description}</p>
  `;
  return card;
}

async function loadModrinthCards() {
  const elements = document.querySelectorAll(".modrinth");

  for (const el of elements) {
    const text = el.textContent.trim();

    try {
      // Case 1: user:<username>
      if (text.startsWith("user:")) {
        const username = text.slice(5).trim();
        const res = await fetch(`https://api.modrinth.com/v2/user/${username}/projects`);
        const projects = await res.json();

        const container = document.createElement("div");
        container.className = "modrinth-user-container";

        for (const project of projects) {
          const card = await createModrinthCard(project, project.slug, username);
          container.appendChild(card);
        }

        el.replaceWith(container);
      }
      // Case 2: single project slug
      else {
        const slug = text;
        const projectRes = await fetch(`https://api.modrinth.com/v2/project/${slug}`);
        const project = await projectRes.json();

        const card = await createModrinthCard(project, slug);
        el.replaceWith(card);
      }
    } catch (err) {
      console.error("Failed to load from Modrinth:", text, err);
    }
  }
}

document.addEventListener("DOMContentLoaded", loadModrinthCards);
