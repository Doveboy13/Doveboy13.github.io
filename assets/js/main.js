/* =========================================================================
   Jackson Hu · AIPM Resume — Page Logic
   - Loads Resume-AIPM-Jackson.md, parses with marked, enhances DOM,
     wires up interactions (TOC, progress bar, chips, contact reveal,
     entrance animations, print).
   ========================================================================= */
(function () {
  'use strict';

  const MD_PATH = 'Resume-AIPM-Jackson.md';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setYear();
    bindProgressBar();

    try {
      const md = await loadMarkdown();
      renderResume(md);
    } catch (err) {
      console.error('[Resume] load failed:', err);
      showLoadError(err);
      return;
    }

    enhanceDom();
    buildToc();
    bindIntersectionAnims();
    bindPrintButton();
  }

  /* ---------- Load & render ---------- */

  async function loadMarkdown() {
    if (location.protocol === 'file:') {
      throw new Error(
        '通过 file:// 直接打开 index.html 时浏览器禁止 fetch 本地文件。\n请改用 `python -m http.server` 或部署到 GitHub Pages 后访问。'
      );
    }
    const res = await fetch(MD_PATH, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`无法加载 ${MD_PATH}（HTTP ${res.status}）`);
    return res.text();
  }

  function renderResume(md) {
    if (typeof marked === 'undefined') {
      throw new Error('marked.js 未加载，请检查 CDN 网络。');
    }
    if (marked.setOptions) {
      marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });
    }
    const html = marked.parse(preprocessMarkdown(md));
    const container = $('#resume');
    container.innerHTML = html;
    container.removeAttribute('aria-busy');
  }

  /**
   * Light-weight, in-memory normalization of the markdown source so that
   * marked can correctly identify markdown blocks. The on-disk MD file
   * is never modified — only the parsed copy in memory.
   */
  function preprocessMarkdown(md) {
    let out = md.replace(/\r\n/g, '\n');
    // 1. Ensure a blank line between an HTML closing tag and a markdown ATX heading
    //    e.g. "</div>\n## 专业技能" -> "</div>\n\n## 专业技能"
    out = out.replace(/(<\/[a-zA-Z][^>]*>)\n(#{1,6}\s)/g, '$1\n\n$2');
    // 2. Ensure a blank line between a markdown heading and a directly-following
    //    "**bold**" line (e.g. "#### Title\n**date**" -> "#### Title\n\n**date**")
    out = out.replace(/(^#{1,6}[^\n]*)\n(\*\*[^\n]+)/gm, '$1\n\n$2');
    return out;
  }

  function showLoadError(err) {
    const container = $('#resume');
    container.innerHTML = `
      <div class="error-box">
        <strong>简历加载失败：</strong>
        <p style="margin:8px 0 0;white-space:pre-line">${escapeHtml(err && err.message ? err.message : String(err))}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#94a3b8">
          本地预览请运行：<code>python -m http.server 8000</code>，然后访问
          <code>http://localhost:8000</code>。
        </p>
      </div>`;
    container.removeAttribute('aria-busy');
  }

  /* =========================================================================
     DOM enhancements
     ========================================================================= */

  function enhanceDom() {
    normalizeWorkEntries();
    wrapSections();
    buildTimeline();
    buildKeywordChips();
    obfuscateContact();
  }

  /**
   * Convert markdown-style job block (h4 + <p><strong>date</strong></p> + body)
   * into the same .entry structure used by the later <div class="entry"> blocks
   * so they all share the same timeline styling.
   */
  function normalizeWorkEntries() {
    const root = $('#resume');
    const h4s = $$('h4', root);

    h4s.forEach((h4) => {
      // Skip if already inside an .entry
      if (h4.closest('.entry')) return;

      const titleText = (h4.textContent || '').trim();
      const next = h4.nextElementSibling;
      // Expect next to be <p><strong>date</strong></p>
      let timeText = '';
      if (next && next.tagName === 'P') {
        const strong = next.querySelector('strong');
        const onlyHasStrong = strong && next.children.length === 1 && next.textContent.trim() === strong.textContent.trim();
        if (onlyHasStrong && /\d{4}/.test(strong.textContent)) {
          timeText = strong.textContent.trim();
        }
      }

      // Collect siblings until next h2/h3/h4 or .entry or end
      const collected = [];
      let cursor = next && timeText ? next.nextElementSibling : (next || null);
      while (cursor) {
        const tag = cursor.tagName;
        if (tag === 'H2' || tag === 'H3' || tag === 'H4') break;
        if (cursor.classList && cursor.classList.contains('entry')) break;
        const node = cursor;
        cursor = cursor.nextElementSibling;
        collected.push(node);
      }

      // Build new .entry
      const entry = document.createElement('div');
      entry.className = 'entry entry-featured';

      const head = document.createElement('div');
      head.className = 'entry-head';
      if (timeText) {
        const t = document.createElement('div');
        t.className = 'entry-time';
        t.textContent = timeText;
        head.appendChild(t);
      }
      const title = document.createElement('div');
      title.className = 'entry-title';
      title.textContent = titleText;
      head.appendChild(title);

      entry.appendChild(head);
      collected.forEach((n) => entry.appendChild(n));

      // Replace h4 (and the date <p>) with the new entry
      h4.parentNode.insertBefore(entry, h4);
      h4.remove();
      if (timeText && next && next.parentNode) next.remove();
    });
  }

  /**
   * Wrap each <h2> + following siblings (until next <h2>) into a <section class="section">
   * to enable consistent card styling and entrance animation.
   */
  function wrapSections() {
    const root = $('#resume');
    const h2s = $$('h2', root);

    h2s.forEach((h2) => {
      const section = document.createElement('section');
      section.className = 'section fade-in';
      const slug = slugify(h2.textContent || '');
      section.id = 'section-' + slug;
      section.dataset.title = (h2.textContent || '').trim();

      const parent = h2.parentNode;
      parent.insertBefore(section, h2);

      const moves = [h2];
      let cursor = h2.nextElementSibling;
      while (cursor && cursor.tagName !== 'H2') {
        const node = cursor;
        cursor = cursor.nextElementSibling;
        moves.push(node);
      }
      moves.forEach((n) => section.appendChild(n));
    });

    // Header gets fade-in too
    const header = $('#resume .header');
    if (header) header.classList.add('fade-in');
  }

  /**
   * Wrap the .entry items inside the 工作经历 section with a .timeline container
   * so the timeline rail can render relative to that wrapper.
   */
  function buildTimeline() {
    const sections = $$('#resume section.section');
    sections.forEach((sec) => {
      const entries = $$(':scope > .entry', sec);
      if (entries.length === 0) return;
      const timeline = document.createElement('div');
      timeline.className = 'timeline';
      sec.insertBefore(timeline, entries[0]);
      entries.forEach((e) => {
        timeline.appendChild(e);
        e.classList.add('fade-in');
      });
    });
  }

  /**
   * Find paragraphs / elements containing "关键词：A、B、C" and convert the
   * comma-separated list into <span class="chip"> tags.
   */
  function buildKeywordChips() {
    const candidates = [];
    // <p class="keywords"> or <p class="small keywords"> in <div class="entry">
    $$('#resume .keywords').forEach((el) => candidates.push(el));
    // Inline paragraphs with leading <strong>关键词：</strong>
    $$('#resume p').forEach((p) => {
      if (candidates.includes(p)) return;
      const strong = p.querySelector(':scope > strong, :scope > b');
      if (strong && /^关键词[:：]/.test(strong.textContent.trim())) {
        candidates.push(p);
        return;
      }
      // Fallback: literal "**关键词：**..." that marked failed to parse
      // (happens when intraword ** closing is followed by non-ASCII punctuation
      // and an alphanumeric, e.g. "**关键词：**AI产品0-1")
      const txt = (p.textContent || '').trim();
      if (/^\*\*\s*关键词[:：]\s*\*\*/.test(txt)) {
        p.dataset.keywordLiteral = '1';
        candidates.push(p);
      }
    });

    candidates.forEach((el) => {
      // Path A: literal text — rebuild from textContent
      if (el.dataset && el.dataset.keywordLiteral === '1') {
        const txt = (el.textContent || '').trim();
        const m = txt.match(/^\*\*\s*关键词[:：]\s*\*\*(.+)$/);
        if (!m) return;
        const items = splitKeywords(m[1]);
        if (items.length === 0) return;
        el.innerHTML = '';
        const label = document.createElement('b');
        label.textContent = '关键词：';
        el.appendChild(label);
        appendChipList(el, items);
        return;
      }

      const labelEl = el.querySelector('strong, b');
      let raw;
      if (labelEl) {
        raw = '';
        let n = labelEl.nextSibling;
        while (n) {
          raw += n.nodeType === Node.TEXT_NODE ? n.textContent : (n.textContent || '');
          n = n.nextSibling;
        }
      } else {
        raw = (el.textContent || '').replace(/^关键词[:：]\s*/, '');
      }

      const items = splitKeywords(raw);
      if (items.length === 0) return;

      if (labelEl) {
        let n = labelEl.nextSibling;
        while (n) {
          const next = n.nextSibling;
          n.remove();
          n = next;
        }
        if (!/[:：]\s*$/.test(labelEl.textContent)) {
          labelEl.textContent = labelEl.textContent.trim() + '：';
        }
      } else {
        el.innerHTML = '<b>关键词：</b>';
      }

      appendChipList(el, items);
    });
  }

  function splitKeywords(raw) {
    return String(raw)
      .split(/[、,，;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function appendChipList(el, items) {
    const list = document.createElement('span');
    list.className = 'chip-list';
    items.forEach((txt) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = txt;
      list.appendChild(chip);
    });
    el.appendChild(list);
  }

  /**
   * In the .meta block, locate phone numbers and emails and wrap them as
   * click-to-reveal+copy chips for light-weight privacy.
   */
  function obfuscateContact() {
    const meta = $('#resume .meta');
    if (!meta) return;

    const phoneRe = /(1[3-9]\d)[-\s]?(\d{4})[-\s]?(\d{4})/g;
    const emailRe = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    walkTextNodes(meta, (textNode) => {
      const text = textNode.textContent;
      if (!phoneRe.test(text) && !emailRe.test(text)) return;
      phoneRe.lastIndex = 0;
      emailRe.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;

      // Combine matches from both regexes by position
      const matches = [];
      let m;
      while ((m = phoneRe.exec(text)) !== null) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          full: m[0],
          masked: m[1] + '-****-' + m[3],
          type: 'phone',
        });
      }
      while ((m = emailRe.exec(text)) !== null) {
        const local = m[1];
        const masked =
          local.length <= 2
            ? local[0] + '*'
            : local[0] + '*'.repeat(Math.max(2, local.length - 3)) + local.slice(-2);
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          full: m[0],
          masked: masked + '@' + m[2],
          type: 'email',
        });
      }
      matches.sort((a, b) => a.start - b.start);

      matches.forEach((mt) => {
        if (mt.start > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, mt.start)));
        }
        frag.appendChild(buildContactChip(mt));
        lastIdx = mt.end;
      });
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function buildContactChip(match) {
    const chip = document.createElement('span');
    chip.className = 'contact-item is-masked';
    chip.setAttribute('data-type', match.type);
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', (match.type === 'phone' ? '电话' : '邮箱') + '，点击查看并复制');
    chip.title = '点击查看并复制';

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'contact-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.innerHTML =
      match.type === 'phone'
        ? '<path fill="currentColor" d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.58l2.2-2.21c.28-.27.36-.66.25-1.01A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5a1 1 0 0 0-1-1z"/>'
        : '<path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/>';

    const maskSpan = document.createElement('span');
    maskSpan.className = 'mask-text';
    maskSpan.textContent = match.masked;

    const realSpan = document.createElement('span');
    realSpan.className = 'real-text';
    realSpan.textContent = match.full;
    realSpan.style.display = 'none';

    const tip = document.createElement('span');
    tip.className = 'copy-tip';
    tip.textContent = '点击解锁';

    chip.appendChild(icon);
    chip.appendChild(maskSpan);
    chip.appendChild(realSpan);
    chip.appendChild(tip);

    let revealed = false;
    chip.addEventListener('click', async () => {
      if (!revealed) {
        revealed = true;
        chip.classList.remove('is-masked');
        chip.classList.add('revealed');
        maskSpan.style.display = 'none';
        realSpan.style.display = 'inline';
        tip.textContent = '已显示 · 点击复制';
      } else {
        try {
          await navigator.clipboard.writeText(match.full);
          const original = tip.textContent;
          tip.textContent = '已复制 ✓';
          setTimeout(() => (tip.textContent = original), 1500);
        } catch (e) {
          tip.textContent = '复制失败';
          setTimeout(() => (tip.textContent = '点击复制'), 1500);
        }
      }
    });
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        chip.click();
      }
    });

    return chip;
  }

  /* =========================================================================
     TOC sidebar
     ========================================================================= */

  function buildToc() {
    const toc = $('#toc .toc-list');
    if (!toc) return;
    const sections = $$('#resume section.section');
    if (sections.length === 0) {
      $('#toc').style.display = 'none';
      return;
    }

    sections.forEach((sec) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + sec.id;
      a.textContent = sec.dataset.title || sec.id;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + sec.id);
      });
      li.appendChild(a);
      toc.appendChild(li);
    });

    requestAnimationFrame(() => $('#toc').classList.add('is-ready'));

    if ('IntersectionObserver' in window) {
      const links = $$('#toc .toc-list a');
      const map = new Map();
      sections.forEach((s, i) => map.set(s, links[i]));

      const io = new IntersectionObserver(
        (entries) => {
          // Pick the topmost intersecting section
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length > 0) {
            links.forEach((l) => l.classList.remove('is-active'));
            const link = map.get(visible[0].target);
            if (link) link.classList.add('is-active');
          }
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      sections.forEach((s) => io.observe(s));
    }
  }

  /* =========================================================================
     Reading progress bar
     ========================================================================= */

  function bindProgressBar() {
    const bar = $('#progress');
    if (!bar) return;
    let raf = 0;
    const update = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* =========================================================================
     Entrance animations
     ========================================================================= */

  function bindIntersectionAnims() {
    if (!('IntersectionObserver' in window)) {
      $$('.fade-in').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const targets = $$('.fade-in');
    let staggerCount = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target;
            const delay = Math.min(staggerCount++, 6) * 60;
            el.style.transitionDelay = delay + 'ms';
            el.classList.add('is-visible');
            io.unobserve(el);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* =========================================================================
     Print button
     ========================================================================= */

  function bindPrintButton() {
    const btn = $('#btn-print');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Reveal contact info temporarily so it shows in PDF
      $$('#resume .contact-item.is-masked').forEach((el) => {
        const real = el.querySelector('.real-text');
        const mask = el.querySelector('.mask-text');
        if (real && mask) {
          el.dataset.prevReal = real.style.display;
          el.dataset.prevMask = mask.style.display;
          real.style.display = 'inline';
          mask.style.display = 'none';
        }
      });
      window.print();
      // Restore after print
      setTimeout(() => {
        $$('#resume .contact-item.is-masked').forEach((el) => {
          const real = el.querySelector('.real-text');
          const mask = el.querySelector('.mask-text');
          if (real && mask && el.dataset.prevReal !== undefined) {
            real.style.display = el.dataset.prevReal || 'none';
            mask.style.display = el.dataset.prevMask || 'inline';
            delete el.dataset.prevReal;
            delete el.dataset.prevMask;
          }
        });
      }, 800);
    });
  }

  /* =========================================================================
     Utilities
     ========================================================================= */

  function setYear() {
    const el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(s) {
    return String(s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .slice(0, 40) || 'sec-' + Math.random().toString(36).slice(2, 7);
  }

  function walkTextNodes(root, cb) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(cb);
  }
})();
