(() => {
  const input = document.querySelector(".public-lookup input");
  if (!(input instanceof HTMLInputElement)) return false;
  input.focus();
  input.select();
  return true;
})();
