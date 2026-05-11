/* =========================================================================
   Jackson Hu · AIPM Resume — Page Logic
   - Loads Resume-AIPM-Jackson.md, parses with marked, enhances DOM,
     wires up interactions (TOC, progress bar, chips, contact reveal,
     entrance animations, print).
   ========================================================================= */
(function () {
  'use strict';

  const CONFIG_PATH = 'assets/config/site.json';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const LOCALE_STORAGE_KEY = 'resume-locale';
  const SUPPORTED_LOCALES = ['zh-CN', 'en', 'ja'];
  const DEFAULT_LOCALE = 'zh-CN';
  const SOURCE_REPO_BASE = 'https://github.com/Doveboy13/Doveboy13.github.io/blob/main/';
  let i18nMessages = {};
  let i18nLoadedLocale = '';

  function t(key) {
    if (!key) return '';
    const parts = String(key).split('.');
    let cur = i18nMessages;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (cur != null && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else return key;
    }
    return typeof cur === 'string' ? cur : key;
  }

  /** Returns nested value from i18n JSON (object or array), or undefined if path missing. */
  function i18nGet(key) {
    const parts = String(key).split('.');
    let cur = i18nMessages;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (cur == null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  async function loadI18nMessages(loc, force) {
    const locale = SUPPORTED_LOCALES.includes(loc) ? loc : DEFAULT_LOCALE;
    if (!force && i18nLoadedLocale === locale && i18nMessages && Object.keys(i18nMessages).length) return;
    try {
      const res = await fetch(`assets/i18n/${locale}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error('i18n http ' + res.status);
      i18nMessages = await res.json();
      i18nLoadedLocale = locale;
    } catch (e) {
      console.warn('[i18n] load failed:', locale, e);
      i18nMessages = {};
      i18nLoadedLocale = '';
      if (locale !== DEFAULT_LOCALE) await loadI18nMessages(DEFAULT_LOCALE, false);
    }
  }

  function getLocale() {
    try {
      const v = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (SUPPORTED_LOCALES.includes(v)) return v;
    } catch (e) { /* noop */ }
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('zh')) return 'zh-CN';
    if (nav.startsWith('ja')) return 'ja';
    return 'en';
  }

  function syncLocaleDom(loc) {
    const v = SUPPORTED_LOCALES.includes(loc) ? loc : DEFAULT_LOCALE;
    document.documentElement.lang = v === 'zh-CN' ? 'zh-CN' : v === 'ja' ? 'ja' : 'en';
    document.documentElement.setAttribute('data-locale', v);
    const cur = $('#btn-lang .lang-current');
    const short = { 'zh-CN': '中文', en: 'English', ja: '日本語' };
    if (cur) cur.textContent = short[v] || v;
  }

  function setLocaleStorage(loc) {
    const v = SUPPORTED_LOCALES.includes(loc) ? loc : DEFAULT_LOCALE;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, v);
    } catch (e) { /* noop */ }
    syncLocaleDom(v);
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.closest && el.closest('#btn-lang')) return;
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    const md = document.querySelector('meta[name="description"]');
    const d = t('meta.description');
    if (md && d && d !== 'meta.description') md.setAttribute('content', d);
    const title = t('meta.title');
    if (title && title !== 'meta.title') document.title = title;
  }

  function refreshFooterBuiltLine() {
    const el = $('#footer-built-line');
    if (!el) return;
    const raw = t('footer.built');
    el.textContent = raw && raw !== 'footer.built' ? raw.replace(/\{year\}/g, String(new Date().getFullYear())) : '';
  }

  function updateSourceLinkHref(site) {
    const a = $('#btn-source');
    if (!a) return;
    const map = (site && site.resumeMarkdown) || DEFAULT_SITE_CONFIG.resumeMarkdown;
    const path = map[getLocale()] || map[DEFAULT_LOCALE];
    a.href = SOURCE_REPO_BASE + (path || 'Resume-AIPM-Jackson.md');
  }

  const DEFAULT_SITE_CONFIG = {
    resumeMarkdown: {
      'zh-CN': 'Resume-AIPM-Jackson.md',
      en: 'Resume-AIPM-Jackson-en.md',
      ja: 'Resume-AIPM-Jackson-ja.md',
    },
    weather: {
      defaultLat: 22.5431,
      defaultLon: 114.0579,
      fallbackCityLabel: '深圳市',
      nominatimEmail: 'doverboy1313@gmail.com',
    },
    skillsRadar: {
      dimensions: [
        { id: 'ai_product', label: 'AI 产品', value: 90 },
        { id: 'backend', label: '后端工程', value: 85 },
        { id: 'frontend', label: '前端', value: 70 },
        { id: 'collab', label: '跨团队协同', value: 88 },
        { id: 'docs', label: '文档表达', value: 92 },
      ],
    },
    now: {
      updated: '2026-05',
      items: [
        { label: '求职状态', text: '开放新机会，可随时到岗' },
        { label: '在带项目', text: '3D 数字影棚交付方案' },
        { label: '学习中', text: 'Agent / RAG 工程化、Eval 体系建设' },
        { label: '阅读', text: '《Generative Deep Learning》' },
        { label: '兴趣', text: 'AI 创作工具、Workflow 编排' },
      ],
    },
    contact: {
      wechatId: '',
      links: [
        { type: 'mailto', label: '邮箱', href: 'mailto:doverboy1313@gmail.com' },
        { type: 'url', label: 'GitHub', href: 'https://github.com/Doveboy13' },
      ],
    },
  };

  function cloneDefaultSite() {
    return JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG));
  }

  async function loadSiteConfig() {
    try {
      const res = await fetch(CONFIG_PATH, { cache: 'no-cache' });
      if (!res.ok) return cloneDefaultSite();
      const j = await res.json();
      const base = cloneDefaultSite();
      if (j.weather) Object.assign(base.weather, j.weather);
      if (j.skillsRadar && Array.isArray(j.skillsRadar.dimensions) && j.skillsRadar.dimensions.length >= 3) {
        base.skillsRadar.dimensions = j.skillsRadar.dimensions;
      }
      if (j.now) {
        if (j.now.updated) base.now.updated = j.now.updated;
        if (Array.isArray(j.now.items) && j.now.items.length) base.now.items = j.now.items;
      }
      if (j.contact) {
        if (typeof j.contact.wechatId === 'string') base.contact.wechatId = j.contact.wechatId;
        if (Array.isArray(j.contact.links) && j.contact.links.length) base.contact.links = j.contact.links;
      }
      if (j.resumeMarkdown && typeof j.resumeMarkdown === 'object') {
        Object.assign(base.resumeMarkdown, j.resumeMarkdown);
      }
      return base;
    } catch (e) {
      console.warn('[SiteConfig] load failed, using defaults:', e);
      return cloneDefaultSite();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  let unregisterTocScroll = null;
  let clockTickInterval = null;
  let themeCardRenderRef = null;

  async function init() {
    setYear();
    bindProgressBar();

    await loadI18nMessages(getLocale(), false);
    syncLocaleDom(getLocale());
    initTheme();

    const site = await loadSiteConfig();
    updateSourceLinkHref(site);
    initLangSwitcher(site);
    initRightbar(site);
    applyI18n();
    refreshFooterBuiltLine();

    let md;
    try {
      md = await loadMarkdown(site);
    } catch (err) {
      console.error('[Resume] load failed:', err);
      showLoadError(err);
      return;
    }

    renderResume(md);
    enhanceDom();
    buildToc();
    applyI18n();
    bindIntersectionAnims();
    bindPrintButton();
    bindRightbarDrawer();
    refreshFooterBuiltLine();
  }

  function initLangSwitcher(site) {
    const btn = $('#btn-lang');
    const menu = $('#lang-menu');
    if (!btn || !menu) return;

    const closeMenu = () => {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    const openMenu = () => {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else closeMenu();
    });

    menu.querySelectorAll('.lang-menu-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const loc = item.getAttribute('data-locale');
        if (!SUPPORTED_LOCALES.includes(loc)) return;
        closeMenu();
        await loadI18nMessages(loc, true);
        setLocaleStorage(loc);
        updateSourceLinkHref(site);
        updateThemeButton(getStoredMode(), document.documentElement.dataset.theme || 'dark');
        initRightbar(site);
        applyI18n();
        refreshFooterBuiltLine();
        const resumeEl = $('#resume');
        if (resumeEl) {
          resumeEl.setAttribute('aria-busy', 'true');
          resumeEl.innerHTML =
            '<div class="loading"><div class="loader-ring"></div><div class="loader-text" data-i18n="loading.resume"></div></div>';
          applyI18n();
        }
        try {
          const md = await loadMarkdown(site);
          renderResume(md);
          enhanceDom();
          if (unregisterTocScroll) {
            unregisterTocScroll();
            unregisterTocScroll = null;
          }
          const tl = $('#toc .toc-list');
          if (tl) tl.innerHTML = '';
          buildToc();
          bindIntersectionAnims();
          applyI18n();
          refreshFooterBuiltLine();
        } catch (err) {
          console.error('[Resume] reload failed:', err);
          showLoadError(err);
        }
      });
    });

    document.addEventListener('click', () => closeMenu());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        closeMenu();
        btn.focus();
      }
    });
  }

  /* ---------- Load & render ---------- */

  function resolveMdPath(site, locale) {
    const map = (site && site.resumeMarkdown) || DEFAULT_SITE_CONFIG.resumeMarkdown;
    const loc = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
    return map[loc] || map[DEFAULT_LOCALE] || 'Resume-AIPM-Jackson.md';
  }

  async function loadMarkdown(site) {
    if (location.protocol === 'file:') {
      throw new Error(t('error.fileProtocol'));
    }
    const locale = getLocale();
    const paths = (site && site.resumeMarkdown) || DEFAULT_SITE_CONFIG.resumeMarkdown;
    let path = resolveMdPath(site, locale);
    let res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok && locale !== DEFAULT_LOCALE) {
      const fb = paths[DEFAULT_LOCALE];
      if (fb && fb !== path) {
        console.warn('[Resume] MD missing for locale, fallback:', locale, '->', fb);
        path = fb;
        res = await fetch(path, { cache: 'no-cache' });
      }
    }
    if (!res.ok) {
      throw new Error(
        t('error.mdLoad')
          .replace('{path}', path)
          .replace('{status}', String(res.status))
      );
    }
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
        <strong>${escapeHtml(t('error.loadTitle'))}</strong>
        <p style="margin:8px 0 0;white-space:pre-line">${escapeHtml(err && err.message ? err.message : String(err))}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#94a3b8">
          ${escapeHtml(t('error.loadHint'))}
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
      if (strong && /^(关键词|Keywords|キーワード)[:：]?\s*/i.test(strong.textContent.trim())) {
        candidates.push(p);
        return;
      }
      // Fallback: literal "**关键词：**..." that marked failed to parse
      // (happens when intraword ** closing is followed by non-ASCII punctuation
      // and an alphanumeric, e.g. "**关键词：**AI产品0-1")
      const txt = (p.textContent || '').trim();
      if (/^\*\*\s*(关键词|Keywords|キーワード)[:：]?\s*\*\*/i.test(txt)) {
        p.dataset.keywordLiteral = '1';
        candidates.push(p);
      }
    });

    candidates.forEach((el) => {
      // Path A: literal text — rebuild from textContent
      if (el.dataset && el.dataset.keywordLiteral === '1') {
        const txt = (el.textContent || '').trim();
        const m = txt.match(/^\*\*\s*(关键词|Keywords|キーワード)[:：]?\s*\*\*(.+)$/i);
        if (!m) return;
        const items = splitKeywords(m[2]);
        if (items.length === 0) return;
        el.innerHTML = '';
        const label = document.createElement('b');
        label.textContent = t('resume.keywordLabel');
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
        raw = (el.textContent || '').replace(/^(关键词|Keywords|キーワード)[:：]?\s*/i, '');
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
        labelEl.textContent = t('resume.keywordLabel');
      } else {
        el.innerHTML = `<b>${escapeHtml(t('resume.keywordLabel'))}</b>`;
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
    chip.setAttribute('aria-label', match.type === 'phone' ? t('resume.chipPhoneAria') : t('resume.chipEmailAria'));
    chip.title = t('resume.chipTitle');

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
    tip.textContent = t('resume.chipUnlock');

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
        tip.textContent = t('resume.chipShown');
      } else {
        try {
          await navigator.clipboard.writeText(match.full);
          const original = tip.textContent;
          tip.textContent = t('resume.chipCopied');
          setTimeout(() => (tip.textContent = original), 1500);
        } catch (e) {
          tip.textContent = t('resume.chipCopyFail');
          setTimeout(() => (tip.textContent = t('resume.chipCopyAgain')), 1500);
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
    if (unregisterTocScroll) {
      unregisterTocScroll();
      unregisterTocScroll = null;
    }
    const sections = $$('#resume section.section');
    if (sections.length === 0) {
      $('#toc').style.display = 'none';
      return;
    }
    $('#toc').style.display = '';
    toc.innerHTML = '';

    const links = [];

    sections.forEach((sec, idx) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + sec.id;
      a.textContent = sec.dataset.title || sec.id;
      a.dataset.idx = String(idx);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        // Highlight immediately so first/last short sections respond visually
        setActive(idx);
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + sec.id);
      });
      li.appendChild(a);
      toc.appendChild(li);
      links.push(a);
    });

    requestAnimationFrame(() => $('#toc').classList.add('is-ready'));

    function setActive(idx) {
      links.forEach((l, i) => l.classList.toggle('is-active', i === idx));
    }

    /**
     * scrollY-based detector that always picks exactly one section: the last
     * section whose top has been scrolled past (with a small offset). This is
     * robust at top/bottom edges where short sections never reach the middle
     * of the viewport.
     */
    function updateActive() {
      const y = window.scrollY || document.documentElement.scrollTop;
      const offset = 160;
      let idx = 0;
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop - offset <= y) idx = i;
        else break;
      }
      // Edge case: scrolled to bottom — force-activate the last section
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      if (y + winH >= docH - 2) idx = sections.length - 1;
      setActive(idx);
    }

    let raf = 0;
    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          updateActive();
          raf = 0;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();
    unregisterTocScroll = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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

  function bindRightbarDrawer() {
    const btn = $('#btn-widgets');
    const backdrop = $('#rightbar-backdrop');
    if (!btn || !backdrop) return;

    const mq = window.matchMedia('(max-width: 1280px)');
    const setOpen = (open) => {
      document.body.classList.toggle('is-rightbar-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    const close = () => setOpen(false);

    btn.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('is-rightbar-open'));
    });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    const onMq = () => {
      if (!mq.matches) close();
    };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else mq.addListener(onMq);
  }

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

  /* =========================================================================
     Theme system (auto / light / dark)
     ========================================================================= */

  const THEME_KEY = 'resume-theme';
  const THEME_MODES = ['auto', 'light', 'dark'];
  const themeListeners = [];

  function getStoredMode() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return THEME_MODES.includes(v) ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  }
  function setStoredMode(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* noop */ }
  }
  function resolveAuto() {
    const h = new Date().getHours();
    return (h >= 7 && h < 19) ? 'light' : 'dark';
  }
  function nextAutoSwitchHint() {
    const now = new Date();
    const h = now.getHours();
    let target;
    if (h >= 7 && h < 19) {
      target = new Date(now); target.setHours(19, 0, 0, 0);
      return { time: '19:00', goingTo: 'dark' };
    } else {
      target = new Date(now);
      if (h >= 19) target.setDate(target.getDate() + 1);
      target.setHours(7, 0, 0, 0);
      return { time: '07:00', goingTo: 'light' };
    }
  }
  function applyTheme() {
    const mode = getStoredMode();
    const real = mode === 'auto' ? resolveAuto() : mode;
    document.documentElement.dataset.theme = real;
    document.documentElement.dataset.themeMode = mode;
    updateThemeButton(mode, real);
    themeListeners.forEach((fn) => { try { fn(mode, real); } catch (e) { /* noop */ } });
  }
  function updateThemeButton(mode, real) {
    const btn = $('#btn-theme');
    if (!btn) return;
    const icon = btn.querySelector('.theme-icon');
    const label = btn.querySelector('.theme-label');
    const map = {
      auto: { icon: '⚙️', labelKey: 'theme.toolbarAuto' },
      light: { icon: '☀️', labelKey: 'theme.toolbarLight' },
      dark: { icon: '🌙', labelKey: 'theme.toolbarDark' },
    };
    const m = map[mode] || map.auto;
    const lab = t(m.labelKey);
    if (icon) icon.textContent = m.icon;
    if (label) label.textContent = lab;
    const realLab = real === 'dark' ? t('theme.toolbarDark') : t('theme.toolbarLight');
    btn.title = t('theme.toolbarTitle').replace('{mode}', lab).replace('{real}', realLab);
    btn.setAttribute('aria-label', t('theme.toolbarAria').replace('{mode}', lab));
  }
  function cycleTheme() {
    const current = getStoredMode();
    const idx = THEME_MODES.indexOf(current);
    const next = THEME_MODES[(idx + 1) % THEME_MODES.length];
    setStoredMode(next);
    applyTheme();
  }
  function onThemeChange(fn) { themeListeners.push(fn); }

  function initTheme() {
    applyTheme();
    const btn = $('#btn-theme');
    if (btn) btn.addEventListener('click', cycleTheme);
    // Re-evaluate auto mode every minute so it switches at 07:00 / 19:00
    setInterval(() => {
      if (getStoredMode() === 'auto') applyTheme();
    }, 60 * 1000);
  }

  /* =========================================================================
     Right sidebar — orchestrator
     ========================================================================= */

  function initRightbar(site) {
    if (!$('#rightbar')) return;
    initClockWidget();
    initWeatherWidget(site && site.weather);
    initThemeCardWidget();
    initRadarWidget(site && site.skillsRadar);
    initNowWidget(site && site.now);
    initContactWidget(site && site.contact);
  }

  /* ---------- Clock + greeting ---------- */

  function initClockWidget() {
    const root = $('#w-clock');
    if (!root) return;
    if (clockTickInterval) {
      clearInterval(clockTickInterval);
      clockTickInterval = null;
    }
    root.innerHTML = `
      <div class="clock-greeting"></div>
      <div class="clock-time"><span class="clock-hm"></span><span class="clock-sec"></span></div>
      <div class="clock-date"></div>`;
    const greet = root.querySelector('.clock-greeting');
    const hm = root.querySelector('.clock-hm');
    const sec = root.querySelector('.clock-sec');
    const dateEl = root.querySelector('.clock-date');

    const weekDay = (i) => t(`clock.week${i}`);

    const greetingFor = (h) => {
      if (h >= 5 && h < 11) return t('clock.greetingMorning');
      if (h >= 11 && h < 13) return t('clock.greetingNoon');
      if (h >= 13 && h < 18) return t('clock.greetingAfternoon');
      if (h >= 18 && h < 23) return t('clock.greetingEvening');
      return t('clock.greetingNight');
    };
    const pad = (n) => String(n).padStart(2, '0');

    const formatClockDate = (d, dayLabel) => {
      const loc = getLocale();
      if (loc === 'zh-CN') {
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${dayLabel}`;
      }
      const intl = loc === 'ja' ? 'ja-JP' : 'en-US';
      try {
        const datePart = d.toLocaleDateString(intl, { year: 'numeric', month: 'long', day: 'numeric' });
        return `${datePart} · ${dayLabel}`;
      } catch (e) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} · ${dayLabel}`;
      }
    };

    const tick = () => {
      const d = new Date();
      hm.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      sec.textContent = ` :${pad(d.getSeconds())}`;
      greet.textContent = greetingFor(d.getHours());
      dateEl.textContent = formatClockDate(d, weekDay(d.getDay()));
    };
    tick();
    clockTickInterval = setInterval(tick, 1000);
  }

  /* ---------- Weather ---------- */

  function initWeatherWidget(weatherCfg) {
    const root = $('#w-weather');
    if (!root) return;
    const status = root.querySelector('.widget-status');
    const body = root.querySelector('.widget-body');
    const refreshBtn = root.querySelector('#btn-weather-refresh');

    const w = weatherCfg || DEFAULT_SITE_CONFIG.weather;
    const defW = DEFAULT_SITE_CONFIG.weather;
    const defaultLat = Number.isFinite(Number(w.defaultLat)) ? Number(w.defaultLat) : defW.defaultLat;
    const defaultLon = Number.isFinite(Number(w.defaultLon)) ? Number(w.defaultLon) : defW.defaultLon;
    const fallbackCityLabel = w.fallbackCityLabel || defW.fallbackCityLabel || '深圳市';
    const nominatimEmail = (typeof w.nominatimEmail === 'string' && w.nominatimEmail.trim()) || defW.nominatimEmail || '';

    const setStatus = (s, text) => {
      if (!status) return;
      status.dataset.status = s;
      status.textContent = text;
    };

    const getCoords = (forceRefresh) =>
      new Promise((resolve) => {
        const fallback = { lat: defaultLat, lon: defaultLon, usedDefault: true };
        if (!('geolocation' in navigator)) return resolve(fallback);
        let done = false;
        const waitMs = forceRefresh ? 11000 : 5000;
        const geoTimeout = forceRefresh ? 10000 : 4500;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(fallback);
          }
        }, waitMs);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              usedDefault: false,
            });
          },
          () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(fallback);
          },
          {
            enableHighAccuracy: !!forceRefresh,
            timeout: geoTimeout,
            maximumAge: forceRefresh ? 0 : 10 * 60 * 1000,
          }
        );
      });

    function nominatimDisplayNameShort(displayName, maxLen) {
      if (!displayName || typeof displayName !== 'string') return '';
      const parts = displayName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      let s = parts.join(' · ');
      const n = maxLen == null ? 48 : maxLen;
      if (s.length > n) s = s.slice(0, n - 1) + '…';
      return s;
    }

    function nominatimLocationLabel(j) {
      if (!j || typeof j !== 'object') return '';
      const a = j.address || {};
      const primary =
        a.municipality ||
        a.city ||
        a.town ||
        a.city_district ||
        a.district ||
        a.county ||
        a.suburb ||
        a.borough ||
        a.village ||
        a.neighbourhood ||
        a.quarter ||
        a.hamlet ||
        '';
      const parts = [];
      if (primary) {
        parts.push(primary);
        if (a.state && a.state !== primary && !parts.includes(a.state)) parts.push(a.state);
      } else {
        if (a.county && a.state) {
          parts.push(a.county, a.state);
        } else if (a.state) {
          parts.push(a.state);
        } else if (a.county) {
          parts.push(a.county);
        }
        if (a.region && !parts.includes(a.region)) parts.push(a.region);
      }
      if (primary && a.region && !parts.includes(a.region) && a.region !== primary) parts.push(a.region);
      if (a.country && String(a.country_code || '').toLowerCase() !== 'cn' && !parts.includes(a.country)) {
        parts.push(a.country);
      }
      const joined = parts.filter(Boolean).join(' · ');
      if (joined) return joined;
      return nominatimDisplayNameShort(j.display_name, 48);
    }

    function haversineKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** BigDataCloud client reverse-geocode (browser, no key). Use within their fair-use terms. */
    function bigDataCloudLocationLabel(j) {
      if (!j || typeof j !== 'object') return '';
      const city = (j.city && String(j.city).trim()) || '';
      const loc = (j.locality && String(j.locality).trim()) || '';
      const prov = (j.principalSubdivision && String(j.principalSubdivision).trim()) || '';
      const parts = [];
      if (loc && city && loc !== city) parts.push(loc, city);
      else if (city) parts.push(city);
      else if (loc) parts.push(loc);
      if (prov && !parts.includes(prov)) parts.push(prov);
      return parts.filter(Boolean).join(' · ');
    }

    function weatherLocalityLang() {
      const loc = getLocale();
      if (loc === 'ja') return 'ja';
      if (loc === 'en') return 'en';
      return 'zh';
    }

    function nominatimAcceptLanguage() {
      const loc = getLocale();
      if (loc === 'ja') return 'ja, en;q=0.8';
      if (loc === 'en') return 'en, zh;q=0.5';
      return 'zh-CN, zh;q=0.9, en;q=0.8';
    }

    async function reverseGeocodeBigDataLabel(lat, lon) {
      if (location.protocol === 'file:') return '';
      try {
        const lang = weatherLocalityLang();
        const url =
          'https://api.bigdatacloud.net/data/reverse-geocode-client' +
          `?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=${encodeURIComponent(lang)}`;
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) return '';
        const j = await res.json();
        return bigDataCloudLocationLabel(j);
      } catch (e) {
        console.warn('[Weather] BigDataCloud reverse geocode failed:', e);
        return '';
      }
    }

    async function reverseGeocodeLabel(lat, lon) {
      if (location.protocol === 'file:') return '';
      try {
        const emailQ = nominatimEmail ? `&email=${encodeURIComponent(nominatimEmail)}` : '';
        const url =
          'https://nominatim.openstreetmap.org/reverse?format=jsonv2' +
          `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=zh${emailQ}`;
        const res = await fetch(url, {
          cache: 'no-cache',
          headers: { 'Accept-Language': nominatimAcceptLanguage() },
        });
        if (!res.ok) return '';
        const j = await res.json();
        return nominatimLocationLabel(j);
      } catch (e) {
        console.warn('[Weather] reverse geocode failed:', e);
        return '';
      }
    }

    async function fetchWeatherJson(lat, lon) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('weather http ' + res.status);
      return res.json();
    }

    async function fetchWeatherWithRetry(lat, lon, retries) {
      let last;
      const n = retries == null ? 2 : retries;
      for (let i = 0; i <= n; i++) {
        try {
          return await fetchWeatherJson(lat, lon);
        } catch (e) {
          last = e;
          if (i < n) await new Promise((r) => setTimeout(r, 450 * (i + 1)));
        }
      }
      throw last;
    }

    const render = (data, locLabel) => {
      const cur = data.current || {};
      const daily = data.daily || {};
      const code = cur.weather_code;
      const meta = wmoMeta(code);
      const tempC = Math.round(cur.temperature_2m);
      const rh = cur.relative_humidity_2m;

      const days = (daily.time || []).slice(0, 3).map((d, i) => {
        const dt = new Date(d);
        const labels = [t('weather.day0'), t('weather.day1'), t('weather.day2')];
        const m = wmoMeta(daily.weather_code[i]);
        return `
          <div class="forecast-day">
            <span class="fd-label">${labels[i] || dt.getMonth() + 1 + '/' + dt.getDate()}</span>
            <span class="fd-icon" title="${m.label}">${m.icon}</span>
            <span class="fd-temp">${Math.round(daily.temperature_2m_max[i])}° <span class="fd-min">${Math.round(
          daily.temperature_2m_min[i]
        )}°</span></span>
          </div>`;
      }).join('');

      body.innerHTML = `
        <div class="weather-current">
          <div class="weather-icon" title="${meta.label}">${meta.icon}</div>
          <div class="weather-current-text">
            <div class="weather-temp">${tempC}<sup>°C</sup></div>
            <div class="weather-desc">${meta.label}${
          rh != null ? ` · ${t('weather.humidity').replace('{rh}', String(rh))}` : ''
        }</div>
            <span class="weather-loc">📍 ${escapeHtml(locLabel)}</span>
          </div>
        </div>
        <div class="weather-forecast">${days}</div>`;
      setStatus('ok', t('weather.statusOk'));
    };

    const renderUnavailable = (locLabel) => {
      body.innerHTML = `
        <div class="weather-current weather-current--unavailable">
          <div class="weather-icon" title="${escapeHtml(t('weather.unavailableTitle'))}">🌡️</div>
          <div class="weather-current-text">
            <div class="weather-temp">—<sup>°C</sup></div>
            <div class="weather-desc">${escapeHtml(t('weather.unavailableDesc'))}</div>
            <span class="weather-loc">📍 ${escapeHtml(locLabel)}</span>
          </div>
        </div>
        <div class="weather-forecast weather-forecast--placeholder" aria-hidden="true">
          <div class="forecast-day"><span class="fd-label">${escapeHtml(t('weather.day0'))}</span><span class="fd-icon">${escapeHtml(
        t('weather.forecastNA')
      )}</span><span class="fd-temp">${escapeHtml(t('weather.forecastNA'))}</span></div>
          <div class="forecast-day"><span class="fd-label">${escapeHtml(t('weather.day1'))}</span><span class="fd-icon">${escapeHtml(
        t('weather.forecastNA')
      )}</span><span class="fd-temp">${escapeHtml(t('weather.forecastNA'))}</span></div>
          <div class="forecast-day"><span class="fd-label">${escapeHtml(t('weather.day2'))}</span><span class="fd-icon">${escapeHtml(
        t('weather.forecastNA')
      )}</span><span class="fd-temp">${escapeHtml(t('weather.forecastNA'))}</span></div>
        </div>`;
      setStatus('error', t('weather.statusError'));
    };

    let weatherLoadInFlight = false;

    async function loadWeather(forceRefresh) {
      if (weatherLoadInFlight) return;
      weatherLoadInFlight = true;
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('is-busy');
      }
      try {
        if (forceRefresh) {
          body.innerHTML = `<div class="widget-loading">${escapeHtml(t('weather.loadingBody'))}</div>`;
        }
        setStatus('loading', t('weather.statusLocating'));
        const c = await getCoords(!!forceRefresh);
        setStatus('loading', t('weather.statusGeocode'));
        let geoLabel = await reverseGeocodeLabel(c.lat, c.lon);
        if (!geoLabel) geoLabel = await reverseGeocodeBigDataLabel(c.lat, c.lon);
        if (!geoLabel) {
          if (c.usedDefault) {
            geoLabel = fallbackCityLabel;
          } else if (haversineKm(c.lat, c.lon, defaultLat, defaultLon) <= 80) {
            geoLabel = fallbackCityLabel;
          } else {
            geoLabel = t('weather.geoUnknown');
          }
        }

        setStatus('loading', t('weather.statusFetching'));
        try {
          const data = await fetchWeatherWithRetry(c.lat, c.lon, 2);
          render(data, geoLabel);
        } catch (err) {
          console.warn('[Weather] forecast failed:', err);
          renderUnavailable(geoLabel);
        }
      } catch (err) {
        console.warn('[Weather] failed:', err);
        body.innerHTML = `<div class="widget-loading">${escapeHtml(t('error.weatherLoad'))}<br>${escapeHtml(
          t('error.weatherRetry')
        )}</div>`;
        setStatus('error', t('error.weatherOffline'));
      } finally {
        weatherLoadInFlight = false;
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('is-busy');
        }
      }
    }

    loadWeather(false);
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        loadWeather(true);
      };
    }
  }

  function wmoMeta(code) {
    // WMO Weather interpretation codes — https://open-meteo.com/en/docs
    const map = {
      0: { icon: '☀️', labelKey: 'wmo.0' },
      1: { icon: '🌤️', labelKey: 'wmo.1' },
      2: { icon: '⛅', labelKey: 'wmo.2' },
      3: { icon: '☁️', labelKey: 'wmo.3' },
      45: { icon: '🌫️', labelKey: 'wmo.45' },
      48: { icon: '🌫️', labelKey: 'wmo.48' },
      51: { icon: '🌦️', labelKey: 'wmo.51' },
      53: { icon: '🌦️', labelKey: 'wmo.53' },
      55: { icon: '🌧️', labelKey: 'wmo.55' },
      56: { icon: '🌧️', labelKey: 'wmo.56' },
      57: { icon: '🌧️', labelKey: 'wmo.57' },
      61: { icon: '🌧️', labelKey: 'wmo.61' },
      63: { icon: '🌧️', labelKey: 'wmo.63' },
      65: { icon: '🌧️', labelKey: 'wmo.65' },
      66: { icon: '🌧️', labelKey: 'wmo.66' },
      67: { icon: '🌧️', labelKey: 'wmo.67' },
      71: { icon: '🌨️', labelKey: 'wmo.71' },
      73: { icon: '🌨️', labelKey: 'wmo.73' },
      75: { icon: '❄️', labelKey: 'wmo.75' },
      77: { icon: '❄️', labelKey: 'wmo.77' },
      80: { icon: '🌦️', labelKey: 'wmo.80' },
      81: { icon: '🌧️', labelKey: 'wmo.81' },
      82: { icon: '⛈️', labelKey: 'wmo.82' },
      85: { icon: '🌨️', labelKey: 'wmo.85' },
      86: { icon: '❄️', labelKey: 'wmo.86' },
      95: { icon: '⛈️', labelKey: 'wmo.95' },
      96: { icon: '⛈️', labelKey: 'wmo.96' },
      99: { icon: '⛈️', labelKey: 'wmo.99' },
    };
    const fallback = { icon: '🌡️', labelKey: 'wmo.unknown' };
    const m = map[code] || fallback;
    return { icon: m.icon, label: t(m.labelKey) };
  }

  /* ---------- Theme card ---------- */

  function initThemeCardWidget() {
    const root = $('#w-theme');
    if (!root) return;
    const body = root.querySelector('.widget-body');

    const render = (mode, real) => {
      const map = {
        auto: { icon: '⚙️', label: t('theme.cardAuto') },
        light: { icon: '☀️', label: t('theme.cardLight') },
        dark: { icon: '🌙', label: t('theme.cardDark') },
      };
      let detail;
      if (mode === 'auto') {
        const hint = nextAutoSwitchHint();
        const nextTheme = hint.goingTo === 'dark' ? t('theme.themeDark') : t('theme.themeLight');
        detail = t('theme.cardDetailAuto').replace('{time}', hint.time).replace('{next}', nextTheme);
      } else {
        detail = t('theme.cardDetailLocked');
      }
      const curTheme = real === 'dark' ? t('theme.themeDark') : t('theme.themeLight');
      body.innerHTML = `
        <div class="tc-row">
          <div class="tc-icon">${map[mode].icon}</div>
          <div class="tc-info">
            <div class="tc-mode">${map[mode].label}</div>
            <div class="tc-detail">${detail} · ${t('theme.cardCurrent').replace('{theme}', curTheme)}</div>
          </div>
        </div>`;
    };

    if (themeCardRenderRef) {
      const ix = themeListeners.indexOf(themeCardRenderRef);
      if (ix >= 0) themeListeners.splice(ix, 1);
    }
    themeCardRenderRef = render;
    onThemeChange(render);

    if (root.dataset.themeCardClickBound !== '1') {
      root.addEventListener('click', cycleTheme);
      root.dataset.themeCardClickBound = '1';
    }
    root.style.cursor = 'pointer';

    render(getStoredMode(), document.documentElement.dataset.theme || 'dark');
  }

  /* ---------- Skills radar ---------- */

  function initRadarWidget(radarCfg) {
    const root = $('#w-radar');
    if (!root) return;
    const body = root.querySelector('.widget-body');

    let dims = (radarCfg && radarCfg.dimensions) || DEFAULT_SITE_CONFIG.skillsRadar.dimensions;
    dims = dims.map((d) => {
      const id = d.id || '';
      const k = id ? `radarDims.${id}` : '';
      const tr = k ? t(k) : '';
      const label = k && tr !== k ? tr : d.label || '';
      return {
        id,
        label,
        value: Math.max(0, Math.min(100, Number(d.value) || 0)),
      };
    });

    const innerW = 232;
    const innerH = 256;
    const padX = 44;
    const padY = 40;
    const vbMinX = -padX;
    const vbMinY = -padY;
    const vbW = innerW + padX * 2;
    const vbH = innerH + padY * 2;
    const cx = innerW / 2;
    const cy = innerH / 2 - 4;
    const radius = 64;
    const labelR = radius + 24;
    const N = dims.length;

    const point = (r, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / N;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };

    const rings = [0.25, 0.5, 0.75, 1]
      .map((f) => {
        const pts = dims
          .map((_, i) => point(radius * f, i).join(','))
          .join(' ');
        return `<polygon class="radar-grid" points="${pts}" />`;
      })
      .join('');

    const axes = dims
      .map((_, i) => {
        const [x, y] = point(radius, i);
        return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
      })
      .join('');

    const shapePts = dims.map((d, i) => point(radius * (d.value / 100), i).join(',')).join(' ');

    const verts = dims
      .map((d, i) => {
        const [x, y] = point(radius * (d.value / 100), i);
        return `<circle class="radar-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" />`;
      })
      .join('');

    const labels = dims
      .map((d, i) => {
        const [lx, ly] = point(labelR, i);
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / N;
        let anchor = 'middle';
        if (Math.cos(angle) > 0.3) anchor = 'start';
        else if (Math.cos(angle) < -0.3) anchor = 'end';
        let baselineY = ly;
        if (Math.sin(angle) < -0.45) baselineY -= 4;
        else if (Math.sin(angle) > 0.45) baselineY += 6;
        const safeLabel = escapeHtml(d.label);
        return `
        <text class="radar-label-group" x="${lx.toFixed(1)}" y="${baselineY.toFixed(1)}" text-anchor="${anchor}">
          <tspan class="radar-label" x="${lx.toFixed(1)}" dy="0">${safeLabel}</tspan>
          <tspan class="radar-value" x="${lx.toFixed(1)}" dy="1.15em">${d.value}</tspan>
        </text>`;
      })
      .join('');

    body.innerHTML = `
      <svg viewBox="${vbMinX} ${vbMinY} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(t('radar.svgAria'))}">
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.45" />
          </linearGradient>
        </defs>
        ${rings}
        ${axes}
        <polygon class="radar-shape" points="${shapePts}" />
        ${verts}
        ${labels}
      </svg>`;
  }

  /* ---------- Now ---------- */

  function initNowWidget(nowCfg) {
    const root = $('#w-now');
    if (!root) return;
    const body = root.querySelector('.widget-body');

    const cfg = nowCfg || DEFAULT_SITE_CONFIG.now;
    const baseItems = Array.isArray(cfg.items) && cfg.items.length ? cfg.items : DEFAULT_SITE_CONFIG.now.items;
    const i18nItems = i18nGet('nowWidget.items');
    const items =
      Array.isArray(i18nItems) && i18nItems.length === baseItems.length
        ? baseItems.map((it, i) => ({
            label: (i18nItems[i] && i18nItems[i].label) || it.label || '',
            text: (i18nItems[i] && i18nItems[i].text) || it.text || '',
          }))
        : baseItems;
    const updated = cfg.updated || DEFAULT_SITE_CONFIG.now.updated;

    body.innerHTML = `
      <ul class="now-list">
        ${items
          .map(
            (it) =>
              `<li><span class="now-label">${escapeHtml(it.label || '')}</span><span class="now-text">${escapeHtml(
                it.text || ''
              )}</span></li>`
          )
          .join('')}
      </ul>
      <div class="now-updated">${escapeHtml(t('now.updatedLabel'))} ${escapeHtml(updated)}</div>`;
  }

  /* ---------- Contact links + optional WeChat copy ---------- */

  function initContactWidget(contactCfg) {
    const root = $('#w-contact');
    if (!root) return;
    const body = root.querySelector('.widget-body');
    const cfg = contactCfg || DEFAULT_SITE_CONFIG.contact;
    const links = Array.isArray(cfg.links) ? cfg.links : [];
    const wechatId = typeof cfg.wechatId === 'string' ? cfg.wechatId.trim() : '';

    const linkLabels = i18nGet('contactLinks');
    let html = '<div class="contact-actions">';
    links.forEach((link, idx) => {
      const href = link.href || '#';
      const fromI18n = Array.isArray(linkLabels) && linkLabels[idx] && linkLabels[idx].label;
      const label = escapeHtml((fromI18n || link.label || href).trim());
      const safeHref = escapeHtml(href);
      const isMail = link.type === 'mailto' || /^mailto:/i.test(href);
      const external = isMail ? '' : ' target="_blank" rel="noopener noreferrer"';
      html += `<a class="contact-link-btn" href="${safeHref}"${external}>${label}</a>`;
    });
    if (wechatId) {
      html += `<button type="button" class="contact-link-btn contact-wechat-btn">${escapeHtml(t('contact.wechatCopy'))}</button>`;
    }
    html += '</div>';
    body.innerHTML = html;

    const wxBtn = body.querySelector('.contact-wechat-btn');
    if (wxBtn && wechatId) {
      const defaultLabel = t('contact.wechatCopy');
      wxBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(wechatId);
          wxBtn.textContent = t('contact.wechatCopied');
          setTimeout(() => {
            wxBtn.textContent = defaultLabel;
          }, 2000);
        } catch (e) {
          console.warn('[Contact] clipboard failed:', e);
          wxBtn.textContent = t('contact.wechatFail');
          setTimeout(() => {
            wxBtn.textContent = defaultLabel;
          }, 2000);
        }
      };
    }
  }

})();
