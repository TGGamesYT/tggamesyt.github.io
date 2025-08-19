async function loadModrinthCards() {
  const elements = document.querySelectorAll(".modrinth");

  for (const el of elements) {
    const slug = el.textContent.trim();
    if (!slug) continue;

    try {
      // Get project info
      const projectRes = await fetch(`https://api.modrinth.com/v2/project/${slug}`);
      const project = await projectRes.json();

      // Get gallery images
      const gallery = project.gallery || [];
      const bannerImage = gallery.length > 0 ? gallery[0].url : project.icon_url;

      // Build card
      const card = document.createElement("a");
      card.href = `https://modrinth.com/project/${slug}`;
      card.className = "modrinth-card";
      card.innerHTML = `
        <div class="modrinth-banner" style="background-image: url('${bannerImage}');"></div>
        <div class="modrinth-content">
          <img class="modrinth-icon" src="${project.icon_url}" alt="${project.title}">
          <div class="modrinth-info">
            <h3 class="modrinth-title">${project.title}</h3>
            <p class="modrinth-author">by ${project.author}</p>
          </div>
        </div>
        <p class="modrinth-description">${project.description}</p>
      `;

      el.replaceWith(card);
    } catch (err) {
      console.error("Failed to load project:", slug, err);
    }
  }
}

// Run after page load
document.addEventListener("DOMContentLoaded", loadModrinthCards);
