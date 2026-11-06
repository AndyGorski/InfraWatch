(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const url = path => new URL(path, base).href;
  const apps = [
    {id:'vegetation',short:'Energia',name:'Roślinność przy liniach',path:'demos/05-electricity-vegetation/'},
    {id:'deformation',short:'Deformacje',name:'Deformacje terenu i infrastruktury',path:'demos/03-insar-multisensor-v2/'},
    {id:'flood',short:'Zalanie',name:'Zalanie infrastruktury',path:'demos/04-flood-2d-3d/'}
  ];
  class InfraWatchHeader extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const current = this.getAttribute('app');
      const page = this.getAttribute('page');
      const selected = apps.find(app => app.id === current);
      const appLinks = apps.map(app => `<a href="${url(app.path)}" ${app.id===current?'aria-current="page"':''}>${app.name}<span>${app.short}</span></a>`).join('');
      const navLinks = [
        ['apps','','Aplikacje'],['data','dane-i-metodologia.html','Dane i metodologia'],['archive','archiwum.html','Archiwum']
      ].map(([id,path,label]) => `<a href="${url(path)}" ${page===id?'aria-current="page"':''}>${label}</a>`).join('') + '<a href="https://github.com/AndyGorski/InfraWatch" target="_blank" rel="noopener">GitHub ↗</a>';
      this.attachShadow({mode:'open'}).innerHTML = `<style>
        :host{display:block;height:var(--iw-shell-height,64px);position:relative;z-index:1600;color:#e7f2f3;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:normal}
        *{box-sizing:border-box}header{height:100%;display:flex;align-items:center;gap:24px;padding:0 28px;background:#0c1c27;border-bottom:1px solid #2c414c}a{color:inherit;text-decoration:none}a:focus-visible,summary:focus-visible{outline:2px solid #83e4c3;outline-offset:4px;border-radius:3px}.brand{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:700;white-space:nowrap;letter-spacing:-.7px}.brand em{font-style:normal;color:#76dec1}.mark{display:grid;place-items:center;width:28px;height:30px;border:1px solid #4b7a70;border-radius:7px;background:#17392f;color:#9aebd2;font-size:13px;letter-spacing:-1px}.desktop{display:flex;align-items:center;gap:21px;margin-left:auto}.desktop a{color:#b5c8d0;font-size:13px;white-space:nowrap;padding:9px 0}.desktop a:hover,.desktop a[aria-current]{color:#8ae9ca}.desktop a[aria-current]{box-shadow:0 2px #76dec1}.switch{position:relative}.switch summary{color:#c4e9da;list-style:none;border:1px solid #36574d;background:#16372e;padding:7px 10px;border-radius:6px;white-space:nowrap;cursor:pointer;font-size:12px}.switch summary::-webkit-details-marker{display:none}.chevron{margin-left:12px;color:#94b3a6}.dropdown{position:absolute;top:calc(100% + 12px);left:0;min-width:290px;background:#102631;border:1px solid #39545c;padding:8px;border-radius:10px;box-shadow:0 12px 35px #0005}.dropdown a{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px;border-radius:5px;font-size:13px}.dropdown a:hover,.dropdown a[aria-current]{background:#21463e;color:#a2efd8}.dropdown a span{color:#9bb6b7;font-size:11px}.dropdown .section-label{display:block;padding:9px 12px 5px;font-size:11px;color:#9db7c1;text-transform:uppercase;letter-spacing:.08em}.mobile{display:none;margin-left:auto}.mobile .dropdown{left:auto;right:0}.mobile .dropdown nav{border-top:1px solid #39545c;margin-top:6px;padding-top:6px}.actions{display:flex;align-items:center;gap:8px}slot{display:contents}
        @media(max-width:1120px){header{gap:16px;padding:0 18px}.desktop{gap:15px}.brand{font-size:20px}}
        @media(max-width:930px){.desktop{display:none}.mobile{display:block}.switch.app-switch{margin-right:auto}.mobile .dropdown{min-width:min(340px,calc(100vw - 32px))}}
        @media(max-width:650px){header{gap:12px;padding:0 12px}.brand{font-size:18px;gap:7px}.mark{width:25px;height:27px;font-size:12px}.app-switch{display:none}.mobile{margin-left:auto}.mobile .dropdown{position:fixed;top:58px;left:12px;right:12px;min-width:0}.switch summary{padding:6px 9px}.chevron{margin-left:7px}.actions{gap:5px}}
        @media(max-width:440px){:host([compact]) .brand>span:last-child{display:none}}
        </style><header><a class="brand" href="${url('')}" aria-label="InfraWatch — centrum demonstracyjne"><span class="mark" aria-hidden="true">iW</span><span>Infra<em>Watch</em></span></a>
        ${current?`<details class="switch app-switch"><summary aria-label="Zmień aplikację: ${selected?.short||'Archiwum'}">${selected?.short||'Archiwum'}<span class="chevron" aria-hidden="true">⌄</span></summary><div class="dropdown"><span class="section-label">Zmień aplikację</span>${appLinks}<a href="${url('archiwum.html')}">Wersje archiwalne ↗</a></div></details>`:''}
        <nav class="desktop" aria-label="Nawigacja InfraWatch">${navLinks}</nav>
        <details class="switch mobile"><summary>Menu<span class="chevron" aria-hidden="true">⌄</span></summary><div class="dropdown"><span class="section-label">Aplikacje</span>${appLinks}<nav aria-label="Menu InfraWatch">${navLinks}</nav></div></details>
        <div class="actions"><slot name="actions"></slot></div></header>`;
      const closeMenus = event => {if(!event.composedPath().includes(this))this.shadowRoot.querySelectorAll('details[open]').forEach(d=>d.open=false)};
      const closeOnEscape = event => {if(event.key==='Escape')this.shadowRoot.querySelectorAll('details[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus()})};
      this._closeMenus=closeMenus;this._closeOnEscape=closeOnEscape;
      document.addEventListener('click',closeMenus);this.shadowRoot.addEventListener('keydown',closeOnEscape);
      this.shadowRoot.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)this.shadowRoot.querySelectorAll('details[open]').forEach(other=>{if(other!==details)other.open=false})}));
    }
    disconnectedCallback(){document.removeEventListener('click',this._closeMenus);this.shadowRoot?.removeEventListener('keydown',this._closeOnEscape)}
  }
  customElements.define('infrawatch-header',InfraWatchHeader);
})();
