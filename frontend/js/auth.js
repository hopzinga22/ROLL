/**
 * auth.js — handles the login and register forms.
 * Shared by login.html and register.html (each only has the form it needs).
 */

function showFormError(el, message) {
  el.textContent = message;
  el.classList.add("is-visible");
}

function hideFormError(el) {
  el.classList.remove("is-visible");
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Already signed in and sitting on the login/register page? Skip to the feed.
  // Guarded to only these two pages — without this check, index.html (which
  // also loads auth.js, for the logout() function) would redirect to itself
  // on every load and get stuck in an infinite reload loop.
  if ((loginForm || registerForm) && Api.isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  if (loginForm) {
    const errorBox = document.getElementById("login-error");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideFormError(errorBox);

      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const submitBtn = loginForm.querySelector("button[type='submit']");

      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in…";

      try {
        await Api.login(username, password);
        window.location.href = "index.html";
      } catch (err) {
        showFormError(errorBox, err.message || "Couldn't sign you in.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    });
  }

  if (registerForm) {
    const errorBox = document.getElementById("register-error");
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideFormError(errorBox);

      const username = document.getElementById("register-username").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const confirm = document.getElementById("register-confirm").value;
      const submitBtn = registerForm.querySelector("button[type='submit']");

      if (password !== confirm) {
        showFormError(errorBox, "Those passwords don't match.");
        return;
      }
      if (password.length < 8) {
        showFormError(errorBox, "Use at least 8 characters for your password.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account…";

      try {
        await Api.register(username, email, password);
        await Api.login(username, password);
        window.location.href = "index.html";
      } catch (err) {
        showFormError(errorBox, err.message || "Couldn't create that account.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
      }
    });
  }
});

function logout() {
  Api.logout();
  window.location.href = "login.html";
}
