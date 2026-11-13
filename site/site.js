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
const copy = document.querySelector(".copy-button");
if (navigator.clipboard?.writeText) {
  copy.hidden = false;
  copy.addEventListener("click", async () => {
    const status = document.querySelector(".copy-status");
    try {
      await navigator.clipboard.writeText(".\\Install-DSH.cmd");
      status.textContent = "Command copied.";
    } catch {
      status.textContent = "Select the command above to copy it manually.";
    }
  });
}
