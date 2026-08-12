function ensureCommentsModal() {
  const existing = document.getElementById("comments-modal");
  if (existing) return existing;

  const modal = document.createElement("div");
  modal.id = "comments-modal";
  modal.className = "comment-modal";
  modal.setAttribute("hidden", "hidden");
  modal.innerHTML = `
    <div class="comment-modal__backdrop" data-action="close-comments-modal"></div>
    <div class="comment-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="comments-modal-title">
      <div class="comment-modal__header">
        <div>
          <div class="comment-modal__eyebrow">Frame discussion</div>
          <h2 class="comment-modal__title" id="comments-modal-title">Comments</h2>
        </div>
        <button class="comment-modal__close" data-action="close-comments-modal" aria-label="Close comments">×</button>
      </div>
      <div class="comment-modal__body">
        <div class="comment-modal__list" id="comments-modal-list">
          <div class="comment comment--loading">Loading comments…</div>
        </div>
        <form class="comment-modal__form" id="comments-modal-form">
          <label class="sr-only" for="comments-modal-input">Add a comment</label>
          <input type="text" id="comments-modal-input" class="comment-modal__input" placeholder="Add a comment…" maxlength="500" required />
          <button type="submit" class="btn btn--sm">Post</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function renderCommentModalList(comments) {
  const list = document.getElementById("comments-modal-list");
  if (!list) return;

  if (!comments.length) {
    list.innerHTML = `<div class="comment comment--empty">No comments yet — be the first.</div>`;
    return;
  }

   list.innerHTML = comments.map((comment) => `
    <div class="comment" data-comment-id="${comment.id}">
      <span class="comment__body"><a class="u" href="profile.html?user=${encodeURIComponent(comment.username)}">${escapeHtml(comment.username)}</a>${escapeHtml(comment.content)}</span>
      ${comment.can_delete ? `<button class="comment__delete" data-action="delete-comment" title="Delete comment">×</button>` : ""}
    </div>
  `).join("");
}

async function openCommentsModal(postId) {
  const modal = ensureCommentsModal();
  const list = document.getElementById("comments-modal-list");
  const form = document.getElementById("comments-modal-form");
  const input = document.getElementById("comments-modal-input");
  const submitBtn = form.querySelector("button[type='submit']");

  modal.removeAttribute("hidden");

  list.innerHTML = `<div class="comment comment--loading">Loading comments…</div>`;

  try {
    const comments = await Api.getComments(postId);
    renderCommentModalList(comments);
    modal.dataset.postId = String(postId);
  } catch (err) {
    list.innerHTML = `<div class="comment comment--empty">Couldn't load comments.</div>`;
  }

  input.focus();

  form.dataset.postId = String(postId);
  form.querySelector("button[type='submit']").disabled = false;
}

function closeCommentsModal() {
  const modal = document.getElementById("comments-modal");
  if (!modal) return;
  modal.setAttribute("hidden", "hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  ensureCommentsModal();
});

document.addEventListener("click", async (e) => {
  const modalOpen = e.target.closest("[data-action='open-comments-modal']");
  if (modalOpen) {
    const frame = modalOpen.closest(".frame") || modalOpen.closest(".contact-sheet__cell");
    const postId = Number(frame?.dataset.postId || modalOpen.dataset.postId);
    if (postId) openCommentsModal(postId);
    return;
  }

  if (e.target.closest("[data-action='close-comments-modal']")) {
    closeCommentsModal();
    return;
  }

  const modalDeleteComment = e.target.closest("[data-action='delete-comment']");
  if (modalDeleteComment) {
    const commentEl = modalDeleteComment.closest(".comment");
    if (!commentEl) return;

    const commentId = Number(commentEl.dataset.commentId);
    const modal = document.getElementById("comments-modal");
    const list = document.getElementById("comments-modal-list");

    modalDeleteComment.disabled = true;
    try {
      await Api.deleteComment(commentId);
      commentEl.remove();

      if (!list.querySelector(".comment[data-comment-id]")) {
        list.innerHTML = `<div class="comment comment--empty">No comments yet — be the first.</div>`;
      }
    } catch (err) {
      modalDeleteComment.disabled = false;
      alert(err.message || "Couldn't delete that comment.");
    }
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "comments-modal-form") {
    e.preventDefault();
    const modal = document.getElementById("comments-modal");
    const postId = Number(modal?.dataset.postId || e.target.dataset.postId);
    const input = document.getElementById("comments-modal-input");
    const list = document.getElementById("comments-modal-list");
    const content = input.value.trim();
    const submitBtn = e.target.querySelector("button[type='submit']");

    if (!postId || !content) return;

    submitBtn.disabled = true;

    try {
      const comment = await Api.createComment(postId, content);
      const emptyState = list.querySelector(".comment--empty");
      if (emptyState) emptyState.remove();

      list.insertAdjacentHTML("beforeend", `
        <div class="comment" data-comment-id="${comment.id}">
          <span class="comment__body"><a class="u" href="profile.html?user=${encodeURIComponent(comment.username)}">${escapeHtml(comment.username)}</a>${escapeHtml(comment.content)}</span>
          <button class="comment__delete" data-action="delete-comment" title="Delete comment">×</button>
        </div>
      `);

      input.value = "";
    } catch (err) {
      alert(err.message || "Couldn't post that comment.");
    } finally {
      submitBtn.disabled = false;
    }
  }
});
