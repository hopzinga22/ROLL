/**
 * feed.js — loads and renders "the roll" (main feed) on index.html.
 */

function renderFrame(post) {
  const liked = !!post.liked_by_me;
  const initial = (post.username || "?").charAt(0).toUpperCase();
  const me = Api.getCurrentUser();
  const isOwnPost = me && me.username === post.username;
  const profileHref = `profile.html?user=${encodeURIComponent(post.username)}`;

  return `
    <article class="frame" data-post-id="${post.id}">
      <div class="frame__head">
        <a class="frame__author" href="${profileHref}">
          <span class="frame__avatar">${escapeHtml(initial)}</span>
          <div>
            <div class="frame__username">${escapeHtml(post.username)}</div>
            <div class="frame__meta">${timeAgo(post.created_at)}</div>
          </div>
        </a>
        <div class="frame__head-right">
          <span class="frame__index">#${String(post.id).padStart(4, "0")}</span>
          ${
            isOwnPost
              ? `<button class="frame__delete" data-action="delete-post" title="Delete this frame">&times;</button>`
              : ""
          }
        </div>
      </div>
      <div class="frame__media">
        <img src="${post.image_url}" alt="${escapeHtml(post.caption || "Untitled frame")}" loading="lazy" />
      </div>
      <div class="frame__actions">
        <button class="like-btn ${liked ? "is-liked" : ""}" data-action="like">
          <span class="heart">${liked ? "♥" : "♡"}</span>
          <span class="like-count">${post.like_count ?? 0}</span>
        </button>
        <button class="comment-toggle" data-action="open-comments-modal">
          <span class="comment-icon">&#9998;</span>
          <span class="comment-count">${post.comment_count ?? 0}</span>
        </button>
      </div>
      ${
        post.caption
          ? `<div class="frame__caption"><a class="u" href="${profileHref}">${escapeHtml(post.username)}</a>${escapeHtml(post.caption)}</div>`
          : ""
      }
      <div class="frame__comments-button-row">
        <button class="btn btn--ghost btn--sm" data-action="open-comments-modal">View comments</button>
      </div>
      <div class="frame__comments" data-loaded="false" hidden>
        <div class="frame__comments-list"></div>
        <form class="frame__comment-form" data-action="submit-comment">
          <input type="text" class="frame__comment-input" placeholder="Add a comment…" maxlength="500" required />
          <button type="submit" class="btn btn--sm">Post</button>
        </form>
      </div>
    </article>
  `;
}

function renderComment(comment) {
  return `
    <div class="comment" data-comment-id="${comment.id}">
      <span class="comment__body"><a class="u" href="profile.html?user=${encodeURIComponent(comment.username)}">${escapeHtml(comment.username)}</a>${escapeHtml(comment.content)}</span>
      ${comment.can_delete ? `<button class="comment__delete" data-action="delete-comment" title="Delete comment">&times;</button>` : ""}
    </div>
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

async function toggleComments(button) {
  const frame = button.closest(".frame");
  const postId = frame.dataset.postId;
  const panel = frame.querySelector(".frame__comments");
  const list = frame.querySelector(".frame__comments-list");

  const isHidden = panel.hasAttribute("hidden");
  if (!isHidden) {
    panel.setAttribute("hidden", "");
    return;
  }

  panel.removeAttribute("hidden");

  if (panel.dataset.loaded === "true") return; // already fetched once

  list.innerHTML = `<div class="comment comment--loading">Loading comments…</div>`;
  try {
    const comments = await Api.getComments(postId);
    list.innerHTML = comments.length
      ? comments.map(renderComment).join("")
      : `<div class="comment comment--empty">No comments yet — be the first.</div>`;
    panel.dataset.loaded = "true";
  } catch (err) {
    list.innerHTML = `<div class="comment comment--empty">Couldn't load comments.</div>`;
  }
}

async function submitComment(form) {
  const frame = form.closest(".frame");
  const postId = frame.dataset.postId;
  const input = form.querySelector(".frame__comment-input");
  const list = frame.querySelector(".frame__comments-list");
  const countEl = frame.querySelector(".comment-count");
  const content = input.value.trim();
  if (!content) return;

  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  try {
    const comment = await Api.createComment(postId, content);
    // if the "no comments yet" placeholder is showing, clear it first
    const emptyState = list.querySelector(".comment--empty");
    if (emptyState) emptyState.remove();

    list.insertAdjacentHTML("beforeend", renderComment(comment));
    countEl.textContent = Number(countEl.textContent) + 1;
    input.value = "";
  } catch (err) {
    alert(err.message || "Couldn't post that comment.");
  } finally {
    submitBtn.disabled = false;
  }
}

async function deleteComment(button) {
  const commentEl = button.closest(".comment");
  const commentId = commentEl.dataset.commentId;
  const frame = button.closest(".frame");
  const countEl = frame.querySelector(".comment-count");

  button.disabled = true;
  try {
    await Api.deleteComment(commentId);
    commentEl.remove();
    countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
  } catch (err) {
    button.disabled = false;
    alert(err.message || "Couldn't delete that comment.");
  }
}

async function deletePost(button) {
  if (!confirm("Delete this frame? This can't be undone.")) return;

  const frame = button.closest(".frame");
  const postId = frame.dataset.postId;

  button.disabled = true;
  try {
    await Api.deletePost(postId);
    frame.remove();
    if (!document.querySelector("#feed .frame")) {
      renderEmptyState(document.getElementById("feed"));
    }
  } catch (err) {
    button.disabled = false;
    alert(err.message || "Couldn't delete that frame.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  loadFeed();

  const feedEl = document.getElementById("feed");

  feedEl.addEventListener("click", (e) => {
    const likeBtn = e.target.closest("[data-action='like']");
    if (likeBtn) return toggleLike(likeBtn);

    const commentToggle = e.target.closest("[data-action='open-comments-modal']");
    if (commentToggle) {
      const frame = commentToggle.closest(".frame");
      const postId = Number(frame?.dataset.postId);
      if (postId) return openCommentsModal(postId);
    }

    const deleteCommentBtn = e.target.closest("[data-action='delete-comment']");
    if (deleteCommentBtn) return deleteComment(deleteCommentBtn);

    const deletePostBtn = e.target.closest("[data-action='delete-post']");
    if (deletePostBtn) return deletePost(deletePostBtn);
  });

  feedEl.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-action='submit-comment']");
    if (form) {
      e.preventDefault();
      submitComment(form);
    }
  });
});
