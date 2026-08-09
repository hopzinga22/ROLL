/**
 * search.js — the username search box in the nav bar.
 * Shared across index.html, upload.html, and profile.html.
 *
 * Debounced: waits until the person pauses typing before calling the API,
 * so we're not firing a request on every keystroke.
 */

const SEARCH_DEBOUNCE_MS = 250;

function renderSearchResult(user) {
  return `
    <a class="search-result" href="profile.html?user=${encodeURIComponent(user.username)}">
      <span class="search-result__avatar">${escapeHtml(user.username.charAt(0).toUpperCase())}</span>
      <span class="search-result__name">${escapeHtml(user.username)}</span>
    </a>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("nav-search-input");
  const results = document.getElementById("nav-search-results");
  if (!input || !results) return; // page doesn't have the search box (e.g. login/register)

  let debounceTimer = null;
  let latestQuery = "";

  function hideResults() {
    results.hidden = true;
    results.innerHTML = "";
  }

  input.addEventListener("input", () => {
    const query = input.value.trim();
    latestQuery = query;

    clearTimeout(debounceTimer);

    if (query.length === 0) {
      hideResults();
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const users = await Api.searchUsers(query);
        // if the person kept typing while this request was in flight, drop
        // the now-stale response instead of overwriting newer results
        if (query !== latestQuery) return;

        if (users.length === 0) {
          results.innerHTML = `<div class="search-result search-result--empty">No users found</div>`;
        } else {
          results.innerHTML = users.map(renderSearchResult).join("");
        }
        results.hidden = false;
      } catch (err) {
        hideResults();
      }
    }, SEARCH_DEBOUNCE_MS);
  });

  // close the dropdown when clicking anywhere outside it
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav__search")) hideResults();
  });

  // close it on Escape, convenient when the input is focused
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideResults();
      input.blur();
    }
  });
});
