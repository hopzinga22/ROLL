/**
 * feed.js — loads and renders "the roll" (main feed) on index.html.
 */

function renderFrame(post) {
  const liked = !!post.liked_by_me;
  const initial = (post.username || "?").charAt(0).toUpperCase();

  return `
    <article class="frame" data-post-id="${post.id}">
      <div class="frame__head">
        <div class="frame__author">
          <span class="frame__avatar">${escapeHtml(initial)}</span>
          <div>
            <div class="frame__username">${escapeHtml(post.username)}</div>
            <div class="frame__meta">${timeAgo(post.created_at)}</div>
          </div>
        </div>
        <span class="frame__index">#${String(post.id).padStart(4, "0")}</span>
      </div>
      <div class="frame__media">
        <img src="${post.image_url}" alt="${escapeHtml(post.caption || "Untitled frame")}" loading="lazy" />
      </div>
      <div class="frame__actions">
        <button class="like-btn ${liked ? "is-liked" : ""}" data-action="like">
          <span class="heart">${liked ? "♥" : "♡"}</span>
          <span class="like-count">${post.like_count ?? 0}</span>
        </button>
      </div>
      ${
        post.caption
          ? `<div class="frame__caption"><span class="u">${escapeHtml(post.username)}</span>${escapeHtml(post.caption)}</div>`
          : ""
      }
    </article>
  `;
}

function renderSkeletons(container, count = 3) {
  container.innerHTML = Array.from({ length: count }, () => `<div class="skeleton"></div>`).join("");
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="state-block">
      <div class="state-block__title">Your roll is empty</div>
      <p>Frames from people you follow will show up here. <a href="upload.html">Develop your first frame →</a></p>
    </div>
  `;
}

function renderErrorState(container, message) {
  container.innerHTML = `
    <div class="state-block">
      <div class="state-block__title">Couldn't load the roll</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function loadFeed() {
  const feedEl = document.getElementById("feed");
  renderSkeletons(feedEl);

  try {
    const posts = await Api.getFeed();
    if (!posts || posts.length === 0) {
      renderEmptyState(feedEl);
      return;
    }
    feedEl.innerHTML = posts.map(renderFrame).join("");
  } catch (err) {
    renderErrorState(feedEl, err.message || "Something went wrong loading your feed.");
  }
}

async function toggleLike(button) {
  const frame = button.closest(".frame");
  const postId = frame.dataset.postId;
  const countEl = button.querySelector(".like-count");
  const heartEl = button.querySelector(".heart");
  const wasLiked = button.classList.contains("is-liked");

  // optimistic update
  button.classList.toggle("is-liked");
  heartEl.textContent = wasLiked ? "♡" : "♥";
  countEl.textContent = Number(countEl.textContent) + (wasLiked ? -1 : 1);
  button.disabled = true;

  try {
    if (wasLiked) {
      await Api.unlikePost(postId);
    } else {
      await Api.likePost(postId);
    }
  } catch (err) {
    // roll back on failure
    button.classList.toggle("is-liked");
    heartEl.textContent = wasLiked ? "♥" : "♡";
    countEl.textContent = Number(countEl.textContent) + (wasLiked ? 1 : -1);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  loadFeed();

  document.getElementById("feed").addEventListener("click", (e) => {
    const likeBtn = e.target.closest("[data-action='like']");
    if (likeBtn) toggleLike(likeBtn);
  });
});
