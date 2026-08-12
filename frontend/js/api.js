/**
 * api.js — thin wrapper around fetch() for talking to the FastAPI backend.
 *
 * Assumes the backend is mounted at the same origin under /api.
 * Auth: a JWT access token is stored in localStorage and sent as
 * "Authorization: Bearer <token>" on every request that needs it.
 *
 * NOTE: these endpoint paths/shapes are my best guess at a sensible
 * Instagram-lite API. Once we design the real backend together, this
 * is the one file we'll need to line up with whatever we settle on.
 */

const API_BASE = "/api";

const Api = {
  getToken() {
    return localStorage.getItem("roll_token");
  },

  setToken(token) {
    localStorage.setItem("roll_token", token);
  },

  clearToken() {
    localStorage.removeItem("roll_token");
    localStorage.removeItem("roll_user");
  },

  getCurrentUser() {
    const raw = localStorage.getItem("roll_user");
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem("roll_user", JSON.stringify(user));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Core request helper.
   * @param {string} path - e.g. "/posts"
   * @param {object} options - fetch options; body may be a plain object (auto JSON) or FormData
   * @param {boolean} auth - attach the bearer token if present
   */
  async request(path, { method = "GET", body = null, auth = true } = {}) {
    const headers = {};
    let payload = body;

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    if (auth && this.getToken()) {
      headers["Authorization"] = `Bearer ${this.getToken()}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
    } catch (networkErr) {
      throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
    }

    if (response.status === 401) {
      this.clearToken();
    }

    if (!response.ok) {
      let detail = "Something went wrong.";
      try {
        const errJson = await response.json();
        detail = errJson.detail || detail;
      } catch (_) {
        /* response had no JSON body */
      }
      throw new ApiError(detail, response.status);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // ---- auth ----
  register(username, email, password) {
    return this.request("/auth/register", {
      method: "POST",
      body: { username, email, password },
      auth: false,
    });
  },

  async login(username, password) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
    this.setToken(data.access_token);
    if (data.user) this.setCurrentUser(data.user);
    return data;
  },

  logout() {
    this.clearToken();
  },

  // ---- posts / "frames" ----
  getFeed(cursor = null) {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request(`/posts${qs}`);
  },

  createPost(imageFile, caption) {
    const form = new FormData();
    form.append("image", imageFile);
    form.append("caption", caption || "");
    return this.request("/posts", { method: "POST", body: form });
  },

  likePost(postId) {
    return this.request(`/posts/${postId}/like`, { method: "POST" });
  },

  unlikePost(postId) {
    return this.request(`/posts/${postId}/like`, { method: "DELETE" });
  },

  deletePost(postId) {
    return this.request(`/posts/${postId}`, { method: "DELETE" });
  },

  // ---- comments ----
  getComments(postId) {
    return this.request(`/posts/${postId}/comments`);
  },

  createComment(postId, content) {
    return this.request(`/posts/${postId}/comments`, {
      method: "POST",
      body: { content },
    });
  },

  deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, { method: "DELETE" });
  },

  // ---- search ----
  searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  },

  // ---- users / "reels" ----
  getUser(username) {
    return this.request(`/users/${encodeURIComponent(username)}`);
  },

  getUserPosts(username) {
    return this.request(`/users/${encodeURIComponent(username)}/posts`);
  },

  followUser(username) {
    return this.request(`/users/${encodeURIComponent(username)}/follow`, { method: "POST" });
  },

  unfollowUser(username) {
    return this.request(`/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" });
  },

  getMe() {
    return this.request("/users/me");
  },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Redirects to /login.html if there's no token. Call at the top of protected pages. */
function requireAuth() {
  if (!Api.isAuthenticated()) {
    window.location.href = "login.html";
  }
}

/** Small relative-time formatter for frame__meta, e.g. "2m ago", "3d ago". */
function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  const steps = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Infinity, "y"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [size, label] of steps) {
    if (value < size) {
      unit = label;
      break;
    }
    value = Math.floor(value / size);
    unit = label;
  }
  return `${value}${unit} ago`;
}

/** Escapes text before it's dropped into innerHTML, so captions/usernames can't inject markup. */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
