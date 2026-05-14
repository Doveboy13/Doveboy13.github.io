/* =========================================================================
   Full-viewport hero background — WebGL noise field + pointer bias,
   optional scroll parallax for .bg-mesh-wrap / .grid, theme sync.
   Modes (site.effects.hero): off | css | full
   ========================================================================= */
(function (global) {
  'use strict';

  const LOG = '[HeroEffect]';
  function heroLog() {
    console.info(LOG, ...arguments);
  }

  heroLog('script loaded (defer order: before main.js runs init)');

  const VS =
    'attribute vec2 a_pos;' +
    'void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  const FS =
    'precision mediump float;' +
    'uniform vec2 u_res;' +
    'uniform float u_time;' +
    'uniform vec2 u_mouse;' +
    'uniform float u_light;' +
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float noise(vec2 p){' +
    'vec2 i=floor(p);vec2 f=fract(p);' +
    'float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));' +
    'vec2 u=f*f*(3.0-2.0*f);' +
    'return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);' +
    '}' +
    'void main(){' +
    'vec2 fc=gl_FragCoord.xy;' +
    'vec2 uv=fc/u_res.xy;' +
    'vec2 p=uv*2.0-1.0;p.x*=u_res.x/u_res.y;' +
    'vec2 mu=u_mouse*2.0-1.0;mu.x*=u_res.x/u_res.y;' +
    'vec2 pull=(mu-p)*0.12;' +
    'float t=u_time*0.22;' +
    'vec2 q=p*1.65+pull+t*0.11;' +
    'float n=noise(q);float n2=noise(q*2.25+8.3);' +
    'float f=smoothstep(0.28,0.82,n*0.55+n2*0.45);' +
    'vec3 dA=vec3(0.38,0.2,0.72),dB=vec3(0.08,0.38,0.58),dC=vec3(0.16,0.12,0.4);' +
    'vec3 lA=vec3(0.55,0.38,0.92),lB=vec3(0.14,0.48,0.6),lC=vec3(0.45,0.4,0.82);' +
    'vec3 col=u_light>0.5?mix(lC,lA,f):mix(dC,dA,f);' +
    'col=mix(col,(u_light>0.5?lB:dB),n2*0.52);' +
    'float vig=1.0-dot(p,p)*0.09;col*=vig;col*=1.08;' +
    'gl_FragColor=vec4(col,0.62);' +
    '}';

  let state = null;

  function normalizeHeroLevel(raw) {
    const s = String(raw == null ? 'full' : raw)
      .trim()
      .toLowerCase();
    if (s === 'off' || s === 'none' || s === 'false' || s === '0') return 'off';
    if (s === 'css' || s === 'minimal') return 'css';
    return 'full';
  }

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function themeIsLight() {
    return String(document.documentElement.dataset.theme || 'dark') === 'light';
  }

  function compileProgram(gl) {
    const v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v, VS);
    gl.compileShader(v);
    if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) {
      heroLog('vertex shader compile failed', gl.getShaderInfoLog(v) || '');
      gl.deleteShader(v);
      return null;
    }
    const f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f, FS);
    gl.compileShader(f);
    if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) {
      heroLog('fragment shader compile failed', gl.getShaderInfoLog(f) || '');
      gl.deleteShader(v);
      gl.deleteShader(f);
      return null;
    }
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      heroLog('program link failed', gl.getProgramInfoLog(p) || '');
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function tryWebGL(canvas) {
    const gl =
      canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      heroLog('WebGL unavailable: getContext(webgl) returned null');
      return null;
    }
    const program = compileProgram(gl);
    if (!program) {
      heroLog('WebGL program build aborted (see shader logs above)');
      return null;
    }
    const posLoc = gl.getAttribLocation(program, 'a_pos');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return {
      gl,
      program,
      uRes: gl.getUniformLocation(program, 'u_res'),
      uTime: gl.getUniformLocation(program, 'u_time'),
      uMouse: gl.getUniformLocation(program, 'u_mouse'),
      uLight: gl.getUniformLocation(program, 'u_light'),
      buf,
    };
  }

  function resizeCanvas(canvas, ctx) {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(r.width * dpr));
    const h = Math.max(1, Math.floor(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.gl.viewport(0, 0, w, h);
  }

  function destroy() {
    const s = state;
    state = null;
    if (!s) return;
    if (s.rafId) global.cancelAnimationFrame(s.rafId);
    if (s.onScroll) global.removeEventListener('scroll', s.onScroll, { capture: true });
    if (s.onPointer) {
      global.removeEventListener('pointermove', s.onPointer, { capture: true });
      global.removeEventListener('pointerleave', s.onPointerLeave, { capture: true });
    }
    if (s.onTheme) document.removeEventListener('resume:theme', s.onTheme);
    if (s.onResize) global.removeEventListener('resize', s.onResize);
    if (s.ro && s.ro.disconnect) s.ro.disconnect();
    if (s.ctx && s.ctx.gl) {
      try {
        const gl = s.ctx.gl;
        if (s.ctx.buf) gl.deleteBuffer(s.ctx.buf);
        if (s.ctx.program) gl.deleteProgram(s.ctx.program);
      } catch (e) { /* noop */ }
    }
  }

  function init(site) {
    destroy();

    const rawHero = site && site.effects && site.effects.hero;
    const level = normalizeHeroLevel(rawHero);
    const reduced = prefersReducedMotion();
    document.documentElement.setAttribute('data-hero-effect', level);

    heroLog('init()', {
      rawEffectsHero: rawHero,
      normalizedLevel: level,
      prefersReducedMotion: reduced,
      theme: document.documentElement.dataset.theme || '',
    });

    const glWrap = document.getElementById('hero-bg-gl');
    const canvas = document.getElementById('hero-bg-canvas');

    if (!glWrap || !canvas) {
      heroLog('missing DOM (#hero-bg-gl or #hero-bg-canvas); background script skipped');
      return;
    }

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--hero-parallax-mesh', '0px');
    rootStyle.setProperty('--hero-parallax-grid', '0px');

    if (reduced || level === 'off') {
      if (glWrap) glWrap.style.display = 'none';
      heroLog('dynamic hero inactive', {
        reason: reduced ? 'prefers-reduced-motion' : 'effects.hero is off',
        hint: reduced
          ? 'Turn off OS/browser “reduce motion” to test WebGL + parallax.'
          : 'Set site.json effects.hero to "full" or "css".',
      });
      return;
    }

    if (level === 'css') {
      if (glWrap) glWrap.style.display = 'none';
    } else if (glWrap) {
      glWrap.style.display = '';
    }

    const wantParallax = level === 'full' || level === 'css';
    const wantGl = level === 'full' && canvas && glWrap;

    let ctx = null;
    let webglOk = false;
    if (wantGl) {
      ctx = tryWebGL(canvas);
      webglOk = !!ctx;
      if (!webglOk && glWrap) glWrap.style.display = 'none';
      if (webglOk) {
        heroLog('WebGL OK — noise field + pointer bias active');
      } else {
        heroLog('WebGL failed — falling back to CSS layers + parallax only');
      }
    } else if (level === 'css') {
      heroLog('mode css — WebGL wrapper hidden; CSS animations + parallax only');
    }

    const next = {
      level,
      reduced: false,
      canvas,
      glWrap,
      ctx,
      webglOk,
      rafId: 0,
      t0: global.performance ? global.performance.now() : 0,
      mouseTarget: [0.5, 0.5],
      mouseSmooth: [0.5, 0.5],
      light: themeIsLight() ? 1 : 0,
      onScroll: null,
      onPointer: null,
      onPointerLeave: null,
      onTheme: null,
      onResize: null,
      ro: null,
      loggedFirstParallaxScroll: false,
    };

    state = next;

    const onTheme = () => {
      next.light = themeIsLight() ? 1 : 0;
      heroLog('theme event resume:theme → u_light', next.light, themeIsLight() ? 'light' : 'dark');
    };
    document.addEventListener('resume:theme', onTheme);
    next.onTheme = onTheme;

    const updateParallax = (fromScroll) => {
      if (!wantParallax) return;
      const y = global.scrollY || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(1, (document.documentElement.scrollHeight || 0) - global.innerHeight);
      const t = Math.min(1, y / maxScroll);
      const mesh = t * 0.09 * global.innerHeight;
      const grid = t * 0.055 * global.innerHeight;
      rootStyle.setProperty('--hero-parallax-mesh', `${mesh.toFixed(2)}px`);
      rootStyle.setProperty('--hero-parallax-grid', `${grid.toFixed(2)}px`);
      if (fromScroll && !next.loggedFirstParallaxScroll) {
        next.loggedFirstParallaxScroll = true;
        heroLog('first scroll → parallax CSS vars set', {
          scrollY: Math.round(y),
          maxScroll: Math.round(maxScroll),
          '--hero-parallax-mesh': `${mesh.toFixed(2)}px`,
          '--hero-parallax-grid': `${grid.toFixed(2)}px`,
        });
      }
    };
    next.onScroll = function () {
      updateParallax(true);
    };
    global.addEventListener('scroll', next.onScroll, { passive: true, capture: true });
    updateParallax(false);
    if (wantParallax) {
      heroLog('parallax listeners attached — scroll the page once to log pixel shifts');
    }

    if (webglOk) {
      resizeCanvas(canvas, ctx);
      const onResize = () => {
        if (state !== next || !next.webglOk) return;
        resizeCanvas(canvas, ctx);
      };
      global.addEventListener('resize', onResize);
      next.onResize = onResize;

      if (global.ResizeObserver && next.glWrap) {
        const ro = new ResizeObserver(() => onResize());
        ro.observe(next.glWrap);
        next.ro = ro;
      }
      resizeCanvas(canvas, ctx);

      next.onPointer = function (e) {
        const w = global.innerWidth;
        const h = global.innerHeight;
        if (w < 8 || h < 8) return;
        next.mouseTarget[0] = e.clientX / w;
        next.mouseTarget[1] = 1 - e.clientY / h;
      };
      next.onPointerLeave = function () {
        next.mouseTarget[0] = 0.5;
        next.mouseTarget[1] = 0.5;
      };
      global.addEventListener('pointermove', next.onPointer, { passive: true, capture: true });
      global.addEventListener('pointerleave', next.onPointerLeave, { passive: true, capture: true });

      const gl = ctx.gl;
      let loggedFirstFrame = false;
      const step = (now) => {
        if (state !== next) return;
        next.rafId = global.requestAnimationFrame(step);
        const t = (now - next.t0) / 1000;
        const a = 0.07;
        next.mouseSmooth[0] += (next.mouseTarget[0] - next.mouseSmooth[0]) * a;
        next.mouseSmooth[1] += (next.mouseTarget[1] - next.mouseSmooth[1]) * a;
        if (!loggedFirstFrame) {
          loggedFirstFrame = true;
          heroLog('first WebGL frame drawn', {
            canvasCssPx: { w: Math.round(canvas.clientWidth), h: Math.round(canvas.clientHeight) },
            drawablePx: { w: canvas.width, h: canvas.height },
            u_time: t.toFixed(3),
          });
        }
        gl.useProgram(ctx.program);
        gl.uniform2f(ctx.uRes, canvas.width, canvas.height);
        gl.uniform1f(ctx.uTime, t);
        gl.uniform2f(ctx.uMouse, next.mouseSmooth[0], next.mouseSmooth[1]);
        gl.uniform1f(ctx.uLight, next.light);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      next.rafId = global.requestAnimationFrame(step);
    }
  }

  global.ResumeHeroEffect = {
    init,
    destroy,
  };
})(typeof window !== 'undefined' ? window : this);
