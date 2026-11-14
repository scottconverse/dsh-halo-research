// Native disclosure navigation remains usable without JavaScript.
const menu = document.querySelector(".mobile-nav");
menu.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    menu.open = false;
  }),
);
menu.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});
if (navigator.clipboard?.writeText) {
  document.querySelectorAll(".copy-button").forEach((copy) => {
    copy.hidden = false;
    copy.addEventListener("click", async () => {
      const block = copy.closest(".command-block");
      const status = block.querySelector(".copy-status");
      const command = document
        .getElementById(copy.dataset.copyTarget)
        .textContent.trim()
        .replace(/\r?\n\s*/g, " ");
      try {
        await navigator.clipboard.writeText(command);
        status.textContent = "Command copied.";
      } catch {
        status.textContent = "Select the command above to copy it manually.";
      }
    });
  });
}
