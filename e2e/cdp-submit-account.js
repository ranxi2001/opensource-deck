(() => {
  const form = document.querySelector(".public-lookup");
  if (!(form instanceof HTMLFormElement)) return false;
  form.requestSubmit();
  return true;
})();
