async function createModrinthCard(project, slug, authorOverride) {
  // Get team members if no author override
  let author = authorOverride;
  if (!author) {
    try {
      const membersRes = await fetch(`https://api.modrinth.com/v2/project/${slug}/members`);
      const members = await membersRes.json();
      const owner = members.find(m => m.role === "Owner") || members[0];
      author = owner?.user?.username || "Unknown";
    } catch {
      author = "Unknown";
    }
  }

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
