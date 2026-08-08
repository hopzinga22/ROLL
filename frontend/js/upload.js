/**
 * upload.js — handles the "Develop a frame" upload form on upload.html.
 */

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("image-input");
  const preview = document.getElementById("preview");
  const previewImg = preview.querySelector("img");
  const form = document.getElementById("upload-form");
  const errorBox = document.getElementById("upload-error");
  const submitBtn = form.querySelector("button[type='submit']");

  let selectedFile = null;

  function setPreview(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.classList.add("is-visible");
      dropzone.querySelector(".dropzone__label").textContent = file.name;
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) setPreview(fileInput.files[0]);
  });

  ["dragover", "dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.toggle("is-dragover", evt === "dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      setPreview(file);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormError(errorBox);

    if (!selectedFile) {
      showFormError(errorBox, "Choose an image before developing this frame.");
      return;
    }

    const caption = document.getElementById("caption-input").value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Developing…";

    try {
      await Api.createPost(selectedFile, caption);
      window.location.href = "index.html";
    } catch (err) {
      showFormError(errorBox, err.message || "Couldn't upload that frame.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Develop frame";
    }
  });
});
