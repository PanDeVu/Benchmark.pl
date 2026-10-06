const state = {
  articles: [],
  filtered: [],
  visibleCount: 24,
  pageSize: 24,
};

const els = {
  grid: document.querySelector("#articles-grid"),
  search: document.querySelector("#search-input"),
  category: document.querySelector("#category-filter"),
  year: document.querySelector("#year-filter"),
  sort: document.querySelector("#sort-filter"),
  reset: document.querySelector("#reset-filters"),
  summary: document.querySelector("#results-summary"),
  empty: document.querySelector("#empty-state"),
  loadMore: document.querySelector("#load-more"),
  activeFilters: document.querySelector("#active-filters"),
  statCount: document.querySelector("#stat-count"),
};

const polishDate = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function normalize(value = "") {
  return value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateFilters() {
  const categories = [...new Set(state.articles.map((article) => article.category))]
    .sort((a, b) => a.localeCompare(b, "pl"));

  const years = [...new Set(state.articles.map((article) => article.date.slice(0, 4)))]
    .sort((a, b) => Number(b) - Number(a));

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.category.append(option);
  });

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    els.year.append(option);
  });
}

function updateActiveFilters() {
  const active = [];
  const query = els.search.value.trim();

  if (query) active.push(`fraza: „${query}”`);
  if (els.category.value) active.push(`kategoria: ${els.category.value}`);
  if (els.year.value) active.push(`rok: ${els.year.value}`);

  if (active.length === 0) {
    els.activeFilters.hidden = true;
    els.activeFilters.textContent = "";
    return;
  }

  els.activeFilters.hidden = false;
  els.activeFilters.textContent = `Aktywne filtry — ${active.join(" · ")}`;
}

function applyFilters({ resetVisible = true } = {}) {
  const query = normalize(els.search.value.trim());
  const category = els.category.value;
  const year = els.year.value;
  const sort = els.sort.value;

  state.filtered = state.articles.filter((article) => {
    const searchable = normalize(`${article.title} ${article.category} ${article.publisher}`);

    const matchesQuery = !query || searchable.includes(query);
    const matchesCategory = !category || article.category === category;
    const matchesYear = !year || article.date.startsWith(year);

    return matchesQuery && matchesCategory && matchesYear;
  });

  state.filtered.sort((a, b) => {
    if (sort === "oldest") {
      return a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "pl");
    }

    if (sort === "az") {
      return a.title.localeCompare(b.title, "pl");
    }

    return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "pl");
  });

  if (resetVisible) state.visibleCount = state.pageSize;

  updateActiveFilters();
  render();
}

function articleTemplate(article) {
  const date = polishDate.format(new Date(`${article.date}T12:00:00`));

  return `
    <article class="article-card">
      <div class="article-card__meta">
        <span class="article-card__category">${escapeHtml(article.category)}</span>
        <span aria-hidden="true">•</span>
        <time datetime="${escapeHtml(article.date)}">${escapeHtml(date)}</time>
      </div>

      <h3>${escapeHtml(article.title)}</h3>

      <div class="article-card__footer">
        <span>${escapeHtml(article.publisher)}</span>
        <a
          class="article-card__link"
          href="${escapeHtml(article.url)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Otwórz publikację: ${escapeHtml(article.title)}"
        >
          Czytaj <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  `;
}

function render() {
  const total = state.filtered.length;
  const visible = state.filtered.slice(0, state.visibleCount);

  els.grid.innerHTML = visible.map(articleTemplate).join("");

  els.summary.textContent =
    total === 1
      ? "1 publikacja"
      : `${total} publikacji`;

  els.empty.hidden = total !== 0;
  els.grid.hidden = total === 0;

  const hasMore = state.visibleCount < total;
  els.loadMore.hidden = !hasMore;

  if (hasMore) {
    const remaining = total - state.visibleCount;
    els.loadMore.textContent = `Pokaż więcej (${remaining})`;
  }
}

function resetFilters() {
  els.search.value = "";
  els.category.value = "";
  els.year.value = "";
  els.sort.value = "newest";
  applyFilters();
}

async function init() {
  try {
    const response = await fetch("articles.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const articles = await response.json();

    if (!Array.isArray(articles)) {
      throw new Error("Nieprawidłowy format articles.json");
    }

    state.articles = articles;
    els.statCount.textContent = articles.length.toLocaleString("pl-PL");

    populateFilters();
    applyFilters();
  } catch (error) {
    console.error(error);
    els.summary.textContent = "Nie udało się załadować publikacji.";
    els.empty.hidden = false;
    els.empty.querySelector("h3").textContent = "Błąd ładowania danych";
    els.empty.querySelector("p").textContent =
      "Sprawdź, czy plik articles.json znajduje się obok index.html.";
  }
}

els.search.addEventListener("input", () => applyFilters());
els.category.addEventListener("change", () => applyFilters());
els.year.addEventListener("change", () => applyFilters());
els.sort.addEventListener("change", () => applyFilters());
els.reset.addEventListener("click", resetFilters);

els.loadMore.addEventListener("click", () => {
  state.visibleCount += state.pageSize;
  render();
});

document.querySelector("#back-to-top").addEventListener("click", (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

init();
