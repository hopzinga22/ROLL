/**
 * profile.js — loads "your reel" on profile.html: user info + a grid of their frames.
 * Reads ?user=<username> from the query string; defaults to the signed-in user.
 */

function renderContactSheetCell(post, isOwnProfile) {
  return `
    <div class="contact-sheet__cell" data-post-id="${post.id}">
      <img src="${post.image_url}" alt="${escapeHtml(post.caption || "Frame")}" loading="lazy" />
      <div class="contact-sheet__toolbar">
        <button class="contact-sheet__comment" data-action="open-comments-modal">${post.comment_count ?? 0} comments</button>
        ${
          isOwnProfile
            ? `<button class="contact-sheet__delete" data-action="delete-post" title="Delete this frame">&times;</button>`
            : ""
        }
      </div>
    </div>
  `;
}

function updateFollowButton(button, isFollowing) {
  button.textContent = isFollowing ? "Following" : "Follow";
  button.classList.toggle("btn--ghost", isFollowing);
  button.dataset.following = isFollowing ? "true" : "false";
}

async function toggleFollow(button) {
  const username = button.dataset.username;
  const wasFollowing = button.dataset.following === "true";

  button.disabled = true;
  try {
    if (wasFollowing) {
      await Api.unfollowUser(username);
    } else {
      await Api.followUser(username);
    }
    updateFollowButton(button, !wasFollowing);

    // keep the follower count in profile-stats in sync (2nd <strong> is followers)
    const followerCountEl = document.querySelectorAll("#profile-stats strong")[1];
    if (followerCountEl) {
      followerCountEl.textContent = Math.max(
        0,
        Number(followerCountEl.textContent) + (wasFollowing ? -1 : 1)
      );
    }
  } catch (err) {
    alert(err.message || "Couldn't update follow status.");
  } finally {
    button.disabled = false;
  }
}

async function loadProfile() {
  const params = new URLSearchParams(window.location.search);
  const me = Api.getCurrentUser();
  const username = params.get("user") || me?.username;
  const isOwnProfile = username === me?.username;

  const nameEl = document.getElementById("profile-name");
  const handleEl = document.getElementById("profile-handle");
  const avatarEl = document.getElementById("profile-avatar");
  const statsEl = document.getElementById("profile-stats");
  const sheetEl = document.getElementById("contact-sheet");
  const logoutBtn = document.getElementById("logout-btn");
  const followBtn = document.getElementById("follow-btn");

  logoutBtn.style.display = isOwnProfile ? "inline-flex" : "none";

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

    if (isOwnProfile) {
      followBtn.hidden = true;
    } else {
      followBtn.hidden = false;
      followBtn.dataset.username = user.username;
      updateFollowButton(followBtn, !!user.is_following);
    }

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
    sheetEl.innerHTML = posts.map((p) => renderContactSheetCell(p, isOwnProfile)).join("");
  } catch (err) {
    sheetEl.innerHTML = `
      <div class="state-block" style="grid-column: 1 / -1;">
        <div class="state-block__title">Couldn't load this reel</div>
        <p>${escapeHtml(err.message || "Something went wrong.")}</p>
      </div>
    `;
  }
}

async function deleteProfilePost(button) {
  if (!confirm("Delete this frame? This can't be undone.")) return;

  const cell = button.closest(".contact-sheet__cell");
  const postId = cell.dataset.postId;
  const statsEl = document.getElementById("profile-stats");
  const countEl = statsEl.querySelector("strong");

  button.disabled = true;
  try {
    await Api.deletePost(postId);
    cell.remove();
    if (countEl) countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);

    const sheetEl = document.getElementById("contact-sheet");
    if (!sheetEl.querySelector(".contact-sheet__cell")) {
      sheetEl.innerHTML = `
        <div class="state-block" style="grid-column: 1 / -1;">
          <div class="state-block__title">No frames yet</div>
          <p>Nothing developed on this reel so far.</p>
        </div>
      `;
    }
  } catch (err) {
    button.disabled = false;
    alert(err.message || "Couldn't delete that frame.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  loadProfile();
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("follow-btn").addEventListener("click", (e) => toggleFollow(e.currentTarget));
  document.getElementById("contact-sheet").addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-action='delete-post']");
    if (deleteBtn) deleteProfilePost(deleteBtn);
  });
});