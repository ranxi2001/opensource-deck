(() => {
  const button = document.querySelector(
    '[aria-label="Change GitHub data access"]',
  );
  if (!(button instanceof HTMLButtonElement)) return false;
  button.click();
  return true;
})();
