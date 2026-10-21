/**
 * 博客主逻辑 v3
 * - Markdown 渲染（marked.js）
 * - 代码高亮（highlight.js）
 * - 首页：文章列表、搜索、标签筛选
 * - 详情页：fetch .md 文件并渲染
 * - 标签页：标签云
 */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  initTheme();
  initReadingProgress();

  if (page === "home") initHome();
  if (page === "post") initPost();
  if (page === "tags") initTags();
});

/* ========== 工具函数 ========== */

function getAllTags() {
  const tagSet = new Set();
  POSTS_INDEX.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
  return [...tagSet];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function calcReadTime(md) {
  const chars = md.replace(/[#>*`\-|\s]/g, "").length;
  const minutes = Math.max(1, Math.round(chars / 400));
  return minutes;
}

/* ========== 深色模式 ========== */

function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const currentTheme = document.documentElement.getAttribute("data-theme");
  toggle.textContent = currentTheme === "dark" ? "☀️" : "🌙";

  toggle.addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme");
    const newTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    toggle.textContent = newTheme === "dark" ? "☀️" : "🌙";
  });
}

/* ========== 阅读进度条 ========== */

function initReadingProgress() {
  const bar = document.getElementById("reading-progress");
  if (!bar) return;

  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ========== 首页 ========== */

function initHome() {
  const postListEl = document.getElementById("post-list");
  const searchInput = document.getElementById("search-input");
  const tagFilterEl = document.getElementById("tag-filter");

  let activeTag = null;
  let keyword = "";

  const allTags = getAllTags();
  tagFilterEl.innerHTML =
    '<button class="tag-chip active" data-tag="">全部</button>' +
    allTags
      .map((t) => `<button class="tag-chip" data-tag="${t}">${t}</button>`)
      .join("");

  function render() {
    let filtered = POSTS_INDEX.slice().sort((a, b) => b.date.localeCompare(a.date));

    if (activeTag) filtered = filtered.filter((p) => p.tags.includes(activeTag));
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.excerpt.toLowerCase().includes(kw)
      );
    }

    if (filtered.length === 0) {
      postListEl.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🍂</div>
          <p>没有找到相关文章，换个关键词试试？</p>
        </div>`;
      return;
    }

    postListEl.innerHTML = filtered
      .map(
        (p) => `
        <article class="post-card" onclick="location.href='post.html?id=${p.id}'">
          <h2><a href="post.html?id=${p.id}">${p.title}</a></h2>
          <div class="post-meta">
            <span>📅 ${formatDate(p.date)}</span>
            <span>☕ 约 ${calcReadTime(p.excerpt)} 分钟</span>
          </div>
          <p class="post-excerpt">${p.excerpt}</p>
          <div class="post-tags">
            ${p.tags.map((t) => `<span class="post-tag">${t}</span>`).join("")}
          </div>
        </article>`
      )
      .join("");
  }

  searchInput.addEventListener("input", (e) => {
    keyword = e.target.value.trim();
    render();
  });

  tagFilterEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-chip");
    if (!chip) return;
    tagFilterEl.querySelectorAll(".tag-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeTag = chip.dataset.tag || null;
    render();
  });

  render();
}

/* ========== 文章详情页 ========== */

async function initPost() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const post = POSTS_INDEX.find((p) => p.id === id);
  const container = document.getElementById("post-container");

  if (!post) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🍃</div>
        <p>这篇文章不存在，可能已经被移走了。</p>
        <p style="margin-top:16px"><a href="index.html">← 回到首页</a></p>
      </div>`;
    return;
  }

  document.title = `${post.title} · 拾光集`;

  container.innerHTML = `
    <div class="empty-state">
      <div class="emoji">🍂</div>
      <p>正在加载文章…</p>
    </div>`;

  try {
    const res = await fetch(post.file);
    if (!res.ok) throw new Error("文章加载失败");
    const md = await res.text();

    const html = marked.parse(md);
    const readMin = calcReadTime(md);

    const sorted = POSTS_INDEX.slice().sort((a, b) => b.date.localeCompare(a.date));
    const idx = sorted.findIndex((p) => p.id === id);
    const prev = sorted[idx - 1];
    const next = sorted[idx + 1];

    container.innerHTML = `
      <article class="post-detail">
        <header class="post-detail-header">
          <h1>${post.title}</h1>
          <div class="post-meta">
            <span>📅 ${formatDate(post.date)}</span>
            <span>☕ 约 ${readMin} 分钟读完</span>
            <span>🏷️ ${post.tags.map((t) => `<a href="tags.html?tag=${encodeURIComponent(t)}">${t}</a>`).join(" / ")}</span>
          </div>
        </header>
        <div class="post-detail-content">${html}</div>
        <div class="post-nav">
          ${prev ? `<a class="back-link" href="post.html?id=${prev.id}">← ${prev.title}</a>` : `<span></span>`}
          ${next ? `<a class="back-link" href="post.html?id=${next.id}">${next.title} →</a>` : `<a class="back-link" href="index.html">返回列表</a>`}
        </div>
      </article>`;

    if (window.hljs) {
      container.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    }

    window.scrollTo(0, 0);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">😢</div>
        <p>文章加载失败：${err.message}</p>
        <p style="margin-top:16px"><a href="index.html">← 回到首页</a></p>
      </div>`;
  }
}

/* ========== 标签页 ========== */

function initTags() {
  const tagsContainer = document.getElementById("tag-cloud");
  const postListEl = document.getElementById("tag-post-list");
  const params = new URLSearchParams(location.search);
  const currentTag = params.get("tag");

  const allTags = getAllTags();

  tagsContainer.innerHTML = allTags
    .map((t) => {
      const count = POSTS_INDEX.filter((p) => p.tags.includes(t)).length;
      const active = t === currentTag ? "active" : "";
      return `<a href="tags.html?tag=${encodeURIComponent(t)}" class="tag-chip ${active}">${t}<span class="count">${count}</span></a>`;
    })
    .join("");

  if (currentTag) {
    const filtered = POSTS_INDEX.filter((p) => p.tags.includes(currentTag));
    postListEl.innerHTML = `
      <h2 style="margin-bottom:20px; text-align:center;">标签：${currentTag}（${filtered.length} 篇）</h2>
      <div class="post-list">
        ${filtered
          .map(
            (p) => `
          <article class="post-card" onclick="location.href='post.html?id=${p.id}'">
            <h2><a href="post.html?id=${p.id}">${p.title}</a></h2>
            <div class="post-meta">
              <span>📅 ${formatDate(p.date)}</span>
            </div>
            <p class="post-excerpt">${p.excerpt}</p>
          </article>`
          )
          .join("")}
      </div>`;
  } else {
    postListEl.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🌿</div>
        <p>点击上方标签，查看对应分类下的文章。</p>
      </div>`;
  }
}
