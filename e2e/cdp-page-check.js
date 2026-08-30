(() => {
  const heading = document.querySelector("h1");
  const sidebar = document.querySelector(".project-sidebar");
  const table = document.querySelector(".work-table");
  const body = document.body;
  return {
    title: document.title,
    heading: heading?.textContent?.trim() ?? null,
    projects: document.querySelectorAll(".project-entry").length,
    rows: document.querySelectorAll(".work-row").length,
    accessMode: document
      .querySelector(".header-context")
      ?.textContent?.includes("private view")
      ? "private"
      : "public",
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
    bodyOverflow: body.scrollWidth - innerWidth,
    headingVisible: Boolean(
      heading && heading.getBoundingClientRect().height > 0,
    ),
    sidebarVisible: Boolean(
      sidebar && sidebar.getBoundingClientRect().height > 0,
    ),
    tableVisible: Boolean(table && table.getBoundingClientRect().height > 0),
  };
})();
