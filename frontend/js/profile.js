/**
 * profile.js — loads "your reel" on profile.html: user info + a grid of their frames.
 * Reads ?user=<username> from the query string; defaults to the signed-in user.
 */

function renderContactSheetCell(post) {
  return `
    <a class="contact-sheet__cell" href="#" data-post-id="${post.id}">
      <img src="${post.image_url}" alt="${escapeHtml(post.caption || "Frame")}" loading="lazy" />
    </a>
  `;
}

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const me = Api.getCurrentUser();
  const username = params.get("user") || me?.username;

  const nameEl = document.getElementById("profile-name");
  const handleEl = document.getElementById("profile-handle");
  const avatarEl = document.getElementById("profile-avatar");
  const statsEl = document.getElementById("profile-stats");
  const sheetEl = document.getElementById("contact-sheet");
  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.style.display = username === me?.username ? "inline-flex" : "none";

  try {
    const user = await Api.getUser(username);
    nameEl.textContent = user.display_name || user.username;
    handleEl.textContent = `@${user.username}`;
    avatarEl.textContent = user.username.charAt(0).toUpperCase();
    statsEl.innerHTML = `
      <span><strong>${user.post_count ?? 0}</strong>frames</span>
      <span><strong>${user.follower_count ?? 0}</strong>followers</span>
      <span><strong>${user.following_count ?? 0}</strong>following</span>
    `;

    const posts = await Api.getUserPosts(username);
    if (!posts || posts.length === 0) {
      sheetEl.innerHTML = `
        <div class="state-block" style="grid-column: 1 / -1;">
          <div class="state-block__title">No frames yet</div>
          <p>Nothing developed on this reel so far.</p>
        </div>
      `;
      return;
    }
    sheetEl.innerHTML = posts.map(renderContactSheetCell).join("");
  } catch (err) {
    sheetEl.innerHTML = `
      <div class="state-block" style="grid-column: 1 / -1;">
        <div class="state-block__title">Couldn't load this reel</div>
        <p>${escapeHtml(err.message || "Something went wrong.")}</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  loadProfile();
  document.getElementById("logout-btn").addEventListener("click", logout);
});
