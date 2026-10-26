class KwizyLoader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        #intro-overlay {
          position: fixed;
          inset: 0;
          background: #0a0a0a;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.7s ease;
        }
        #stage {
          display: flex;
          align-items: center;
          gap: 1.2rem;
        }
        #kwizy-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 3.2rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: white;
          clip-path: inset(0 100% 0 0);
        }
        #lock-wrap {
          color: white;
          opacity: 0;
          transform: scale(0.4) translateY(-20px);
          display: flex;
          align-items: center;
        }
        #lock-wrap.locked {
          color: #0070FF;
          animation: lockClick 0.3s ease forwards;
        }
        @keyframes textReveal {
          to { clip-path: inset(0 0% 0 0); }
        }
        @keyframes lockIn {
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lockClick {
          0%   { transform: scale(1); opacity: 1; }
          40%  { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 640px) {
          #kwizy-text { font-size: 2.2rem; letter-spacing: 0.1em; }
          #stage { gap: 0.8rem; }
          svg#lock-svg { width: 36px; height: 36px; }
        }
      </style>
      <div id="intro-overlay">
        <div id="stage">
          <div id="kwizy-text">Kwizy</div>
          <div id="lock-wrap">
            <svg id="lock-svg" width="46" height="46" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"></rect>
              <path id="lock-arch" d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
          </div>
        </div>
      </div>
    `;

    const text = this.querySelector('#kwizy-text');
    const lockWrap = this.querySelector('#lock-wrap');
    const lockArch = this.querySelector('#lock-arch');
    const stage = this.querySelector('#stage');
    const overlay = this.querySelector('#intro-overlay');

    setTimeout(() => {
      text.style.animation = 'textReveal 0.9s cubic-bezier(0.7,0,0.3,1) forwards';
    }, 50);

    setTimeout(() => {
      lockWrap.style.animation = 'lockIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards';
    }, 1200);

    setTimeout(() => {
      lockArch.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
      lockWrap.style.color = '#0070FF';
      lockWrap.style.animation = 'lockClick 0.3s ease forwards';
      
      this.dispatchEvent(new CustomEvent('kwizy-loader-locked', { bubbles: true }));
    }, 1800);

    setTimeout(() => {
      stage.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      stage.style.opacity = '0';
      stage.style.transform = 'scale(1.04)';
    }, 2300);

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        this.dispatchEvent(new CustomEvent('kwizy-loader-finished', { bubbles: true }));
        this.remove();
      }, 700);
    }, 2800);
  }
}

customElements.define('kwizy-loader', KwizyLoader);
