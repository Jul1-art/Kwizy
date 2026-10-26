// ── Fond Three.js — shader vagues sombres ──────────────────────────────────
const KWZY_WAVES_SHADER = `
#ifdef GL_ES
precision highp float;
#endif
#define PI2 6.28318530718
#define MAX_ITER 5
uniform float uTime;
uniform vec2 uResolution;
uniform float spectrum;

void main() {
    float time = uTime * 0.12;
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p  = mod(uv * PI2, PI2) - 100.0;
    vec2 i  = vec2(p);
    float c     = 0.5;
    float inten = 0.0094;

    for (int n = 0; n < MAX_ITER; n++) {
        float t = time * (4.5 - (2.2 / float(n + 122)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y),
                     sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(
            p.x / (sin(i.x + t) / inten + spectrum),
            p.y / (cos(i.y + t) / inten)
        ));
    }

    c /= float(MAX_ITER);
    c = 1.10 - pow(c, 1.26);

    vec3 colour = vec3(0.098, 0.098, 0.098 + pow(abs(c), 4.1));
    gl_FragColor = vec4(colour, 1.3);
}
`;

class KwizyWavesScene {
    constructor() {
        this.scene = this.camera = this.geometry = this.material = null;
        this.mesh = this.renderer = this.clock = null;
        this._raf = null;
        this._running = false;
        this._ro = null;
    }
    init(canvas) {
        this._running = true;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#06060e');
        this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 1, 100);
        this.geometry = new THREE.PlaneGeometry(30, 20);
        this.material = new THREE.ShaderMaterial({
            vertexShader: `precision mediump float;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: KWZY_WAVES_SHADER,
            uniforms: {
                uTime:       { value: 0.0 },
                uResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
                spectrum:    { value: 0.0 }
            }
        });
        this.mesh     = new THREE.Mesh(this.geometry, this.material);
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(canvas.width, canvas.height);
        this.scene.add(this.camera);
        this.scene.add(this.mesh);
        this.mesh.position.set(0, 0, 0);
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(this.mesh.position);
        this.clock = new THREE.Clock();
        const self = this;
        this._ro = new ResizeObserver(() => self.onResize());
        this._ro.observe(canvas.parentElement);
    }
    run() {
        if (!this._running || !this.renderer) return;
        if (!document.getElementById('ai-hub-bg-canvas')) { this.destroy(); return; }
        this._raf = requestAnimationFrame(this.run.bind(this));
        this.material.uniforms.uTime.value = this.clock.getElapsedTime();
        this.renderer.render(this.scene, this.camera);
    }
    onResize() {
        if (!this.renderer || !this.material || !this.camera) return;
        const canvas = this.renderer.domElement;
        const parent = canvas.parentElement;
        if (!parent) return;
        const r = parent.getBoundingClientRect();
        canvas.width = r.width; canvas.height = r.height;
        this.material.uniforms.uResolution.value.set(r.width, r.height);
        this.camera.aspect = r.width / r.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(r.width, r.height);
    }
    destroy() {
        this._running = false;
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this._ro)  this._ro.disconnect();
        if (this.renderer)  this.renderer.dispose();
        if (this.geometry)  this.geometry.dispose();
        if (this.material)  this.material.dispose();
    }
}
// ───────────────────────────────────────────────────────────────────────────

window.KwizyAIEngine = {
    endpoint: window.location.origin + window.location.pathname.split('/professeurs/')[0] + '/api/v1/ai.php',
    mode: 'landing',
    _lastGenerated: null,
    _currentPrompt: '',
    _attachedFiles: [],
    lang: localStorage.getItem('kwizy-lang') || document.documentElement.lang || 'fr',
    _mistralKeys: [],
    _lastMistralKeyIndex: -1,
    _pickMistralKey: function() {
        const customKey = localStorage.getItem('kwizy-mistral-key');
        if (customKey && customKey.trim() !== '') return customKey.trim();
        if (this._mistralKeys.length === 0) return '';
        const pool = this._mistralKeys.map((k, i) => i).filter(i => i !== this._lastMistralKeyIndex);
        this._lastMistralKeyIndex = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0;
        return this._mistralKeys[this._lastMistralKeyIndex] || '';
    },
    texts: {
        fr: {
            kwizyIntelligence: "Kwizy IA",
            removeAttachment: "Retirer",
            uploadDocumentTitle: "Ajouter un document (txt, pdf, doc...)",
            describeSubject: "Décrivez votre sujet...",
            suggestionOne: "Les figures de style en poésie",
            suggestionTwo: "La division cellulaire (Mitose)",
            suggestionThree: "Le théorème de Pythagore",
            backToHome: "Retour à l'accueil",
            aiConfiguration: "Configuration de votre IA",
            aiSettingsDescription: "Ajustez les paramètres pour une évaluation sur mesure.",
            subject: "Sujet",
            contextHint: "Précisez le contexte pour plus de qualité",
            chars: "caractères",
            difficulty: "Difficulté",
            format: "Format",
            mixed: "Mixte",
            singleMcq: "QCM unique",
            writtenAnswer: "Réponse écrite",
            difficultyBeginner: "Débutant",
            difficultyIntermediate: "Intermédiaire",
            difficultyAdvanced: "Avancé",
            examplePrompt: "Ex : Contrôle sur la Révolution française...",
            advancedOptions: "Options avancées",
            trickQuestions: "Questions pièges",
            trickDesc: "Challenge supplémentaire",
            detailedExplanations: "Explications détaillées",
            detailedDesc: "Justifications pédagogiques",
            numberOfQuestions: "Nombre de questions",
            generateQuiz: "Générer le Quiz",
            preview: "Aperçu",
            questionsCount: "questions",
            importToEditor: "Importer dans l'éditeur",
            warningDisclaimer: "Kwizy AI peut commettre des erreurs. Vérifiez les informations.",
            pleaseDescribeSubject: "Veuillez décrire le sujet.",
            analyzing: "Analyse par Mistral AI...",
            fileUploadFallback: "Contenu extrait du document ",
            fileParseError: "Erreur lors de l'analyse du fichier",
            apiError: "Erreur API",
            generatedQuizTitlePrefix: "Quiz IA : ",
            generatedQuizDescription: "Évaluation générée par Kwizy IA.",
            quizImported: "Quiz importé !"
        },
        en: {
            kwizyIntelligence: "Kwizy AI",
            removeAttachment: "Remove",
            uploadDocumentTitle: "Add a document (txt, pdf, doc...)",
            describeSubject: "Describe your topic...",
            suggestionOne: "Figures of speech in poetry",
            suggestionTwo: "Cell division (Mitosis)",
            suggestionThree: "The Pythagorean theorem",
            backToHome: "Back to home",
            aiConfiguration: "AI configuration",
            aiSettingsDescription: "Adjust settings for a custom assessment.",
            subject: "Subject",
            contextHint: "Specify context for better quality",
            chars: "characters",
            difficulty: "Difficulty",
            format: "Format",
            mixed: "Mixed",
            singleMcq: "Single Choice MCQ",
            writtenAnswer: "Written response",
            difficultyBeginner: "Beginner",
            difficultyIntermediate: "Intermediate",
            difficultyAdvanced: "Advanced",
            examplePrompt: "e.g. Test on the French Revolution...",
            advancedOptions: "Advanced options",
            trickQuestions: "Trick questions",
            trickDesc: "Extra challenge",
            detailedExplanations: "Detailed explanations",
            detailedDesc: "Pedagogical justifications",
            numberOfQuestions: "Number of questions",
            generateQuiz: "Generate quiz",
            preview: "Preview",
            questionsCount: "questions",
            importToEditor: "Import to editor",
            warningDisclaimer: "Kwizy AI may make mistakes. Verify the information.",
            pleaseDescribeSubject: "Please describe the topic.",
            analyzing: "Analyzing with Mistral AI...",
            fileUploadFallback: "Extracted content from document ",
            fileParseError: "Error while parsing the file",
            apiError: "API error",
            generatedQuizTitlePrefix: "AI Quiz: ",
            generatedQuizDescription: "Assessment generated by Kwizy AI.",
            quizImported: "Quiz imported!"
        }
    },
    getLang: function () {
        return localStorage.getItem('kwizy-lang') || document.documentElement.lang || this.lang || 'fr';
    },
    t: function (key) {
        const lang = this.getLang();
        return (this.texts[lang] && this.texts[lang][key]) || this.texts.fr[key] || key;
    },

    renderAttachments: function () {
        if (!this._attachedFiles || this._attachedFiles.length === 0) return '';
        return `
            <div class="flex flex-wrap gap-2 mb-3 w-full" id="ai-attachments-container">
                ${this._attachedFiles.map((f, i) => `
                    <div class="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800/50 shadow-sm transition-all">
                        <i class="fas fa-file-alt"></i>
                        <span class="truncate max-w-[150px]">${f.name}</span>
                        <button type="button" class="ml-1 text-purple-400 hover:text-red-500 transition-colors" onclick="KwizyAIEngine.removeAttachment(${i}); event.stopPropagation();" title="${this.t('removeAttachment')}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    removeAttachment: function (index) {
        if (this._attachedFiles) this._attachedFiles.splice(index, 1);
        if (typeof render === 'function') render();
    },

    getDynamicGreeting: function () {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const month = now.getMonth();
        const isFr = this.getLang() === 'fr';
        if (month === 11) return isFr ? "Qu'allons-nous créer pour cette fin d'année ?" : "What shall we create for the end of the year?";
        if (month === 0) return isFr ? "Nouvelle année, nouvelles idées ! On crée quoi ?" : "New year, new ideas! What shall we create?";
        if (day === 1 && hour < 12) return isFr ? "Nouveau départ ! Prêt à créer aujourd'hui ?" : "A fresh start! Ready to create today?";
        if (day === 5 && hour > 14) return isFr ? "Un dernier effort avant le week-end ?" : "One last push before the weekend?";
        if (hour < 11) return isFr ? "Prêt pour une matinée créative ?" : "Ready for a creative morning?";
        if (hour >= 11 && hour < 14) return isFr ? "Une petite création entre deux cours ?" : "A little creation between classes?";
        if (hour >= 14 && hour < 18) return isFr ? "Qu'allons-nous bâtir cet après-midi ?" : "What shall we build this afternoon?";
        if (hour >= 18) return isFr ? "Une idée brillante pour finir la journée ?" : "A brilliant idea to end the day?";
        return isFr ? "Qu'allons-nous créer aujourd'hui ?" : "What shall we create today?";
    },

    renderInterface: function () {
        if (this.mode === 'landing') return this.renderLanding();
        return this.renderForm();
    },

    renderLanding: function () {
        const greeting = this.getDynamicGreeting();
        setTimeout(() => this._initBgWaves(), 40);
        setTimeout(() => this._initLandingMic(), 60);
        return `
        <style>
            /* ══ KWIZY AI — HUB v3 ══ */

            .ai-hub {
                position: relative; width: 100%; flex: 1; min-height: 100%;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                font-family: 'Inter', system-ui, sans-serif;
                background: #ffffff; overflow: hidden;
            }
            .dark .ai-hub { background: #06060e; }

            /* Container */
            .ai-hub-inner {
                position: relative; z-index: 10; width: 100%; max-width: 740px;
                padding: 0 28px; display: flex; flex-direction: column; align-items: center;
                animation: ai-enter 0.55s cubic-bezier(0.16,1,0.3,1) both;
            }
            @keyframes ai-enter {
                from { opacity: 0; transform: translateY(18px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* Titre */
            .ai-title {
                font-size: clamp(2rem, 4.5vw, 3.6rem);
                font-weight: 800; line-height: 1.08; text-align: center;
                letter-spacing: -0.04em; color: #09090b; margin-bottom: 48px;
            }
            .dark .ai-title { color: #fafafa; }

            /* ── Arc orbital sur la bordure ── */
            @property --glow-angle {
                syntax: '<angle>';
                inherits: false;
                initial-value: 0deg;
            }
            @keyframes border-spin { to { --glow-angle: 360deg; } }

            .ai-hub { --bg: #ffffff; }
            .dark .ai-hub { --bg: #0f0f1a; }

            .ai-bar-wrap { position: relative; width: 100%; }

            .ai-bar {
                width: 100%;
                border: 1.5px solid transparent;
                border-radius: 20px;
                padding: 12px 12px 12px 18px;
                display: flex; align-items: center; gap: 12px;
                background-image:
                    linear-gradient(var(--bg), var(--bg)),
                    conic-gradient(from var(--glow-angle) at 50% 50%,
                        transparent   0deg,
                        #4f46e5      50deg,
                        #7c3aed      85deg,
                        transparent 115deg,
                        transparent 235deg,
                        #4f46e5     290deg,
                        transparent 320deg);
                background-origin: border-box;
                background-clip: padding-box, border-box;
                animation: border-spin 5s linear infinite;
                box-shadow: 0 2px 12px rgba(0,0,0,0.05);
                transition: box-shadow 0.22s ease;
            }
            .dark .ai-bar {
                background-image:
                    linear-gradient(var(--bg), var(--bg)),
                    conic-gradient(from var(--glow-angle) at 50% 50%,
                        transparent   0deg,
                        #6366f1      40deg,
                        #818cf8      80deg,
                        #a78bfa      95deg,
                        transparent 120deg,
                        transparent 230deg,
                        #6366f1     280deg,
                        transparent 315deg);
                box-shadow: 0 2px 20px rgba(0,0,0,0.4);
            }
            /* Aucun changement visuel au focus */

            /* Textarea */
            .ai-input {
                flex: 1; background: transparent; border: none; outline: none; -webkit-appearance: none;
                font-family: inherit; font-size: 0.975rem; font-weight: 400;
                color: #09090b; resize: none; padding: 2px 0;
                line-height: 1.55; min-height: 26px;
            }
            .ai-input:focus { outline: none; box-shadow: none; }
            .dark .ai-input { color: #f4f4f5; }
            .ai-input::placeholder { color: #a1a1aa; }
            .dark .ai-input::placeholder { color: #3f3f5a; }

            /* Bouton + wrapper */
            .ai-attach-wrap { position: relative; flex-shrink: 0; display: flex; align-items: center; }

            /* Popup au-dessus du + */
            .ai-import-popup {
                position: absolute; bottom: calc(100% + 10px); left: 50%;
                transform: translateX(-50%) translateY(6px);
                background: #fff; border: 1px solid #e4e4e7; border-radius: 14px;
                padding: 5px; min-width: 220px; box-shadow: 0 8px 32px rgba(0,0,0,.12);
                opacity: 0; pointer-events: none;
                transition: opacity .18s ease, transform .18s ease;
                z-index: 200;
            }
            .dark .ai-import-popup { background: #1c1c1e; border-color: rgba(255,255,255,.1); box-shadow: 0 8px 32px rgba(0,0,0,.4); }
            .ai-attach-wrap:hover .ai-import-popup,
            .ai-import-popup:hover { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
            /* Bridge invisible pour ne pas perdre le hover dans le gap */
            .ai-import-popup::after {
                content: ''; position: absolute; top: 100%; left: -8px; right: -8px; height: 14px;
            }

            .ai-import-btn {
                display: flex; align-items: center; gap: 9px;
                width: 100%; padding: 9px 12px; border-radius: 10px; border: none;
                background: transparent; color: #3f3f46; font-size: 12px; font-weight: 600;
                cursor: pointer; text-align: left; transition: background .12s ease, color .12s ease;
            }
            .ai-import-btn:hover { background: rgba(99,102,241,.07); color: #4f46e5; }
            .ai-import-btn i { width: 16px; text-align: center; font-size: 13px; color: #6366f1; }
            .dark .ai-import-btn { color: #d4d4d8; }
            .dark .ai-import-btn:hover { background: rgba(99,102,241,.12); color: #a5b4fc; }
            .dark .ai-import-btn i { color: #818cf8; }

            /* Bouton + */
            .ai-attach {
                width: 30px; height: 30px; border-radius: 8px; border: none;
                background: transparent; color: #a1a1aa;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; flex-shrink: 0; font-size: 0.88rem;
                transition: background 0.15s ease, color 0.15s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1);
            }
            .dark .ai-attach { color: #71717a; }
            .ai-attach-wrap:hover .ai-attach { background: rgba(0,0,0,0.05); color: #52525b; transform: rotate(45deg); }
            .dark .ai-attach-wrap:hover .ai-attach { background: rgba(255,255,255,0.06); color: #a1a1aa; }

            /* Bouton mic / envoyer */
            .ai-mic-send {
                width: 38px; height: 38px; border-radius: 50%; border: none;
                background: transparent; color: #b0b0b8;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; flex-shrink: 0; font-size: 0.82rem;
                transition: background 0.18s ease, color 0.18s ease;
            }
            .dark .ai-mic-send { color: rgba(255,255,255,0.25); }
            .ai-mic-send:hover { background: rgba(0,0,0,0.05); color: #6b7280; }
            .dark .ai-mic-send:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.5); }
            .ai-mic-send.has-text { background: #4f46e5; color: #fff; }
            .ai-mic-send.has-text:hover { background: #4338ca; }
            .ai-mic-send.recording { background: #ef4444; color: #fff; }
            .ai-mic-send.stopping { background: #fca5a5; color: #fff; opacity: 0.7; }
            .ai-mic-send.recording .fa-microphone { display: none; }
            .ai-mic-send.has-text .fa-microphone { display: none; }
            .ai-mic-send.has-text #hub-icon-send { display: block !important; }
            .ai-mic-bars { display: none; align-items: flex-end; gap: 2px; height: 14px; }
            .ai-mic-send.recording .ai-mic-bars { display: flex; }
            .ai-mic-bars span { width: 2px; background: #fff; border-radius: 1px; animation: aiMicWave 0.8s ease-in-out infinite; }
            .ai-mic-bars span:nth-child(1) { height: 5px; animation-delay: 0s; }
            .ai-mic-bars span:nth-child(2) { height: 10px; animation-delay: 0.1s; }
            .ai-mic-bars span:nth-child(3) { height: 14px; animation-delay: 0.2s; }
            .ai-mic-bars span:nth-child(4) { height: 8px; animation-delay: 0.15s; }
            .ai-mic-bars span:nth-child(5) { height: 5px; animation-delay: 0.05s; }
            @keyframes aiMicWave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

            /* Chips suggestions */
            .ai-chips {
                display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
                margin-top: 24px; opacity: 0;
                animation: chip-in 0.5s ease forwards 0.35s;
            }
            .ai-chip {
                background: rgba(255,255,255,0.8);
                border: 1px solid rgba(79,70,229,0.13);
                padding: 6px 15px; border-radius: 100px;
                font-size: 0.82rem; font-weight: 500; color: #52525b;
                cursor: pointer; transition: all 0.18s; backdrop-filter: blur(6px);
            }
            .dark .ai-chip { background: rgba(255,255,255,0.03); border-color: rgba(99,102,241,0.16); color: #71717a; }
            .ai-chip:hover { background: rgba(79,70,229,0.08); border-color: rgba(79,70,229,0.28); color: #4f46e5; transform: translateY(-1px); }
            .dark .ai-chip:hover { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.32); color: #a5b4fc; }

            @keyframes chip-in {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            @media (max-width: 768px) {
                .ai-hub-inner { padding: 0 16px; }
                .ai-title { font-size: 1.7rem; margin-bottom: 32px; }
                .ai-bar { border-radius: 16px; padding: 10px 10px 10px 14px; gap: 10px; }
                .ai-glow { border-radius: 20px; }
                .ai-chips { display: none; }
            }
        </style>

        <div class="ai-hub">
            <canvas id="ai-hub-bg-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;"></canvas>

            <div class="ai-hub-inner">
                <h1 class="ai-title">${greeting}</h1>

                <div class="w-full mb-1 pl-1">${this.renderAttachments()}</div>

                <div class="ai-bar-wrap">
                    <div class="ai-bar"
                         ondragover="event.preventDefault();"
                         ondragleave="event.preventDefault();"
                         ondrop="event.preventDefault();KwizyAIEngine.handleFileUpload({target:{files:event.dataTransfer.files}});">
                        <input type="file" id="ai-file-upload-docs" accept=".txt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" style="display:none;" onchange="KwizyAIEngine.handleImportFile(event)">
                        <input type="file" id="ai-file-upload-photos" accept="image/*,.heic,.heif,.webp" style="display:none;" onchange="KwizyAIEngine.handleImportFile(event)">
                        <div class="ai-attach-wrap">
                          <div class="ai-import-popup">
                            <button type="button" class="ai-import-btn" onclick="document.getElementById('ai-file-upload-photos').click()">
                              <i class="fas fa-image"></i>Importer des images
                            </button>
                            <button type="button" class="ai-import-btn" onclick="document.getElementById('ai-file-upload-docs').click()">
                              <i class="fas fa-file-lines"></i>Importer des fichiers
                            </button>
                          </div>
                          <button type="button" class="ai-attach" title="Importer">
                            <i class="fas fa-plus"></i>
                          </button>
                        </div>
                        <textarea
                            id="ai-landing-input" class="ai-input"
                            placeholder="${this.t('describeSubject')}" rows="1"
                            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();if(this.value.trim().length>0)KwizyAIEngine.switchToForm(this.value);}"
                            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';const hasT=this.value.trim().length>0;const mb=document.getElementById('hub-mic-btn');if(mb){mb.classList.toggle('has-text',hasT);}"
                        ></textarea>
                        <button type="button" id="hub-mic-btn" class="ai-mic-send" title="Dicter votre question">
                            <i class="fas fa-microphone"></i>
                            <div class="ai-mic-bars"><span></span><span></span><span></span><span></span><span></span></div>
                            <i class="fas fa-arrow-up" id="hub-icon-send" style="display:none"></i>
                        </button>
                    </div>
                </div>

                <div class="ai-chips">
                    <button class="ai-chip" onclick="const ta=document.getElementById('ai-landing-input');ta.value=this.innerText;ta.focus();ta.dispatchEvent(new Event('input'));">${this.t('suggestionOne')}</button>
                    <button class="ai-chip" onclick="const ta=document.getElementById('ai-landing-input');ta.value=this.innerText;ta.focus();ta.dispatchEvent(new Event('input'));">${this.t('suggestionTwo')}</button>
                    <button class="ai-chip" onclick="const ta=document.getElementById('ai-landing-input');ta.value=this.innerText;ta.focus();ta.dispatchEvent(new Event('input'));">${this.t('suggestionThree')}</button>
                </div>
            </div>
        </div>
        `;
    },

    switchToForm: function (val) {
        this._currentPrompt = val || '';
        this.mode = 'form';
        if (typeof render === 'function') render();
    },

    _kwzWavesScene: null,

    _initBgWaves: function() {
        if (typeof THREE === 'undefined') return;
        const canvas = document.getElementById('ai-hub-bg-canvas');
        if (!canvas) return;
        if (this._kwzWavesScene) { this._kwzWavesScene.destroy(); this._kwzWavesScene = null; }
        const isDark = document.documentElement.classList.contains('dark');
        canvas.style.filter = isDark ? 'none' : 'invert(1)';
        const hub = canvas.parentElement;
        const rect = hub.getBoundingClientRect();
        canvas.width  = rect.width  || 800;
        canvas.height = rect.height || 600;
        this._kwzWavesScene = new KwizyWavesScene();
        this._kwzWavesScene.init(canvas);
        this._kwzWavesScene.run();
    },

    _micLandingState: 'idle',
    _micLandingRec: null,
    _micLandingRestartTimer: null,
    _micLandingBase: '',
    _micLandingFinalText: '',

    _initLandingMic: function() {
        const micBtn = document.getElementById('hub-mic-btn');
        if (!micBtn) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { micBtn.style.display = 'none'; return; }

        if (this._micLandingRec) {
            try { this._micLandingRec.abort(); } catch(e) {}
            this._micLandingRec = null;
        }
        clearTimeout(this._micLandingRestartTimer);
        this._micLandingState = 'idle';

        const self = this;

        function buildRec() {
            const r = new SR();
            r.lang = 'fr-FR';
            r.interimResults = true;
            r.continuous = true;
            r.maxAlternatives = 1;
            let _rafId = null;
            let _pendingInterim = '';

            r.onstart = function() {
                self._micLandingState = 'listening';
                micBtn.classList.add('recording');
                micBtn.classList.remove('stopping');
                micBtn.title = 'Écoute en cours — cliquez pour arrêter';
            };

            r.onresult = function(e) {
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) {
                        self._micLandingFinalText += e.results[i][0].transcript + ' ';
                        _pendingInterim = '';
                    } else {
                        _pendingInterim = e.results[i][0].transcript;
                    }
                }
                const ta = document.getElementById('ai-landing-input');
                if (!ta) return;
                if (_rafId) cancelAnimationFrame(_rafId);
                _rafId = requestAnimationFrame(function() {
                    _rafId = null;
                    const next = ((self._micLandingBase ? self._micLandingBase + ' ' : '') + self._micLandingFinalText + _pendingInterim)
                        .replace(/  +/g, ' ').trimStart();
                    if (ta.value !== next) {
                        ta.value = next;
                        ta.dispatchEvent(new Event('input'));
                    }
                });
            };

            r.onerror = function(e) {
                if (e.error === 'aborted' || e.error === 'no-speech') return;
                hardStop();
            };

            r.onend = function() {
                if (self._micLandingState === 'listening') {
                    clearTimeout(self._micLandingRestartTimer);
                    const ta = document.getElementById('ai-landing-input');
                    if (ta) { self._micLandingBase = ta.value.trim(); self._micLandingFinalText = ''; _pendingInterim = ''; }
                    self._micLandingRestartTimer = setTimeout(function() {
                        if (self._micLandingState !== 'listening') return;
                        try { self._micLandingRec = buildRec(); self._micLandingRec.start(); }
                        catch(err) { hardStop(); }
                    }, 150);
                } else {
                    cleanup();
                }
            };

            return r;
        }

        function start() {
            if (self._micLandingState !== 'idle') return;
            const ta = document.getElementById('ai-landing-input');
            self._micLandingBase = ta ? ta.value.trim() : '';
            self._micLandingFinalText = '';
            self._micLandingRec = buildRec();
            try { self._micLandingRec.start(); } catch(e) {}
        }

        function stop() {
            if (self._micLandingState === 'idle') return;
            self._micLandingState = 'stopping';
            clearTimeout(self._micLandingRestartTimer);
            micBtn.classList.add('stopping');
            micBtn.classList.remove('recording');
            try { self._micLandingRec.stop(); } catch(e) { cleanup(); }
        }

        function hardStop() {
            self._micLandingState = 'stopping';
            clearTimeout(self._micLandingRestartTimer);
            try { self._micLandingRec.abort(); } catch(e) {}
            cleanup();
        }

        function cleanup() {
            self._micLandingState = 'idle';
            micBtn.classList.remove('recording', 'stopping');
            micBtn.title = 'Dicter votre question';
            const ta = document.getElementById('ai-landing-input');
            if (ta) { ta.value = ta.value.trim(); ta.dispatchEvent(new Event('input')); ta.focus(); }
        }

        micBtn.addEventListener('click', function() {
            const ta = document.getElementById('ai-landing-input');
            if (ta && ta.value.trim().length > 0) {
                KwizyAIEngine.switchToForm(ta.value);
                return;
            }
            if (self._micLandingState === 'idle') start(); else stop();
        });

        const ta = document.getElementById('ai-landing-input');
        if (ta) {
            ta.addEventListener('keydown', function() {
                if (self._micLandingState !== 'idle') hardStop();
            });
        }
    },

    renderForm: function () {
        return `
        <style>
            /* ══ KWIZY AI — FORM v2 ══ */
            .aif-wrap {
                position: relative; width: 100%; flex: 1; min-height: 100%;
                display: flex; flex-direction: column; align-items: center;
                font-family: 'Inter', system-ui, sans-serif;
                background: #ffffff; overflow-y: auto; padding: 28px 24px 48px;
                --bg: #ffffff;
            }
            .dark .aif-wrap { background: #06060e; --bg: #06060e; }

            /* orbes fond */
            .aif-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(70px); }
            .aif-orb-a { width:500px;height:500px;top:-120px;left:-80px;background:radial-gradient(circle,rgba(79,70,229,0.13) 0%,transparent 65%); }
            .aif-orb-b { width:440px;height:440px;bottom:-80px;right:-60px;background:radial-gradient(circle,rgba(124,58,237,0.13) 0%,transparent 65%); }
            .dark .aif-orb-a { background:radial-gradient(circle,rgba(79,70,229,0.26) 0%,transparent 65%); }
            .dark .aif-orb-b { background:radial-gradient(circle,rgba(124,58,237,0.26) 0%,transparent 65%); }

            /* inner */
            .aif-inner {
                position: relative; z-index: 10; width: 100%; max-width: 680px;
                display: flex; flex-direction: column; gap: 16px;
                animation: aif-enter 0.45s cubic-bezier(0.16,1,0.3,1) both;
            }
            @keyframes aif-enter { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

            /* back */
            .aif-back {
                display: inline-flex; align-items: center; gap: 7px;
                font-size: 0.82rem; font-weight: 600; color: #71717a;
                background: none; border: none; cursor: pointer; padding: 0;
                transition: color 0.15s; margin-bottom: 4px;
            }
            .aif-back:hover { color: #4f46e5; }

            /* subject display */
            .aif-subject-tag {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 6px 14px; border-radius: 100px;
                background: rgba(79,70,229,0.07); border: 1px solid rgba(79,70,229,0.14);
                font-size: 0.82rem; font-weight: 600; color: #4f46e5;
                margin-bottom: 2px;
            }
            .dark .aif-subject-tag { background:rgba(99,102,241,0.1); border-color:rgba(99,102,241,0.2); color:#818cf8; }

            /* section label */
            .aif-label {
                font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
                text-transform: uppercase; color: #a1a1aa; margin-bottom: 8px;
                display: flex; align-items: center; gap: 6px;
            }

            /* card */
            .aif-card {
                background: #ffffff; border: 1px solid #f0f0f0;
                border-radius: 18px; padding: 20px 22px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.04);
            }
            .dark .aif-card { background: #0f0f18; border-color: rgba(255,255,255,0.07); box-shadow: 0 2px 20px rgba(0,0,0,0.3); }

            /* prompt textarea */
            .aif-prompt {
                width: 100%; background: transparent; border: none; outline: none;
                font-family: inherit; font-size: 0.95rem; color: #09090b;
                resize: none; line-height: 1.65; min-height: 80px; padding: 0;
                font-weight: 400;
            }
            .dark .aif-prompt { color: #f4f4f5; }
            .aif-prompt::placeholder { color: #a1a1aa; }
            .aif-prompt-footer { display:flex; justify-content:space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f4f4f5; }
            .dark .aif-prompt-footer { border-top-color: rgba(255,255,255,0.06); }
            .aif-char { font-size: 0.72rem; color: #a1a1aa; }

            /* params row */
            .aif-params { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            @media(max-width:520px){ .aif-params { grid-template-columns: 1fr; } }

            /* select */
            .aif-select {
                width: 100%; padding: 10px 14px; border-radius: 12px;
                border: 1px solid #e4e4e7; background: #fafafa;
                font-family: inherit; font-size: 0.875rem; font-weight: 600;
                color: #09090b; outline: none; cursor: pointer; appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: right 14px center;
                transition: border-color 0.15s;
            }
            .aif-select:focus { border-color: #6366f1; }
            .dark .aif-select { background-color: #0f0f18; border-color: rgba(255,255,255,0.1); color: #f4f4f5; }

            /* count picker */
            .aif-count-wrap { display:flex; align-items:center; justify-content:center; gap:16px; padding: 8px 0; }
            .aif-count-btn {
                width:38px;height:38px;border-radius:50%;border:1.5px solid #e4e4e7;
                background:transparent;font-size:1.25rem;font-weight:700;color:#52525b;
                display:flex;align-items:center;justify-content:center;cursor:pointer;
                transition:all 0.15s;
            }
            .dark .aif-count-btn { border-color:rgba(255,255,255,0.12);color:#a1a1aa; }
            .aif-count-btn:hover { border-color:#6366f1;color:#4f46e5;background:rgba(99,102,241,0.06); }
            #kwizy-ai-count {
                font-size: 2.8rem; font-weight: 900; width: 72px; text-align: center;
                border: none; outline: none; background: transparent;
                background: linear-gradient(135deg,#4f46e5,#7c3aed);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                -moz-appearance: textfield;
            }
            #kwizy-ai-count::-webkit-inner-spin-button,
            #kwizy-ai-count::-webkit-outer-spin-button { -webkit-appearance: none; }

            /* toggle row */
            .aif-toggle-row {
                display:flex;align-items:center;justify-content:space-between;
                padding: 12px 0; border-bottom: 1px solid #f4f4f5;
            }
            .dark .aif-toggle-row { border-bottom-color: rgba(255,255,255,0.05); }
            .aif-toggle-row:last-child { border-bottom: none; padding-bottom: 0; }
            .aif-toggle-row:first-child { padding-top: 0; }
            .aif-toggle-title { font-size:0.875rem;font-weight:600;color:#09090b; }
            .dark .aif-toggle-title { color:#f4f4f5; }
            .aif-toggle-desc { font-size:0.75rem;color:#a1a1aa;margin-top:1px; }
            .aif-switch { position:relative;display:inline-flex;align-items:center;cursor:pointer; }
            .aif-switch input { position:absolute;opacity:0;width:0;height:0; }
            .aif-switch-track {
                width:42px;height:24px;border-radius:100px;background:#e4e4e7;
                transition:background 0.2s; position:relative;
            }
            .dark .aif-switch-track { background:rgba(255,255,255,0.1); }
            .aif-switch-track::after {
                content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;
                border-radius:50%;background:#fff;transition:transform 0.2s;
                box-shadow:0 1px 3px rgba(0,0,0,0.2);
            }
            .aif-switch input:checked + .aif-switch-track { background: linear-gradient(135deg,#4f46e5,#7c3aed); }
            .aif-switch input:checked + .aif-switch-track::after { transform:translateX(18px); }

            /* error */
            #ai-error-banner { border-radius:12px; font-size:0.85rem; }

            /* generate btn */
            .aif-generate {
                width:100%; padding: 16px; border-radius: 16px; border: none;
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                color: #fff; font-family: inherit; font-size: 1rem; font-weight: 700;
                cursor: pointer; display:flex;align-items:center;justify-content:center;gap:10px;
                box-shadow: 0 8px 28px rgba(79,70,229,0.38);
                transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
            }
            .aif-generate:hover { transform:translateY(-2px);box-shadow:0 12px 36px rgba(79,70,229,0.5); }
            .aif-generate:active { transform:scale(0.98); }
            .aif-generate:disabled { opacity:0.6;cursor:not-allowed;transform:none; }

            /* preview */
            #ai-preview-panel { border-radius:18px;overflow:hidden; }
            .aif-preview-header {
                background: linear-gradient(135deg,#4f46e5,#7c3aed);
                padding:14px 20px;display:flex;align-items:center;justify-content:space-between;
            }
            .aif-preview-header span { color:#fff;font-weight:700;font-size:0.85rem; }
            .aif-preview-header small { color:rgba(255,255,255,0.65);font-size:0.75rem;font-weight:600; }
            #ai-preview-list { padding:16px;display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto; }
            .aif-import {
                margin:0 16px 16px;padding:12px;border-radius:12px;border:none;width:calc(100% - 32px);
                background:rgba(79,70,229,0.08);color:#4f46e5;font-family:inherit;
                font-size:0.875rem;font-weight:700;cursor:pointer;transition:background 0.15s;
            }
            .dark .aif-import { background:rgba(99,102,241,0.12);color:#818cf8; }
            .aif-import:hover { background:rgba(79,70,229,0.14); }

            /* disclaimer */
            .aif-disclaimer { text-align:center;font-size:0.7rem;color:#d4d4d8;letter-spacing:0.04em; }
        </style>

        <div class="aif-wrap">
            <div class="aif-orb aif-orb-a"></div>
            <div class="aif-orb aif-orb-b"></div>
            <div class="aif-inner">

                <button class="aif-back" onclick="KwizyAIEngine.mode='landing';render();">
                    <i class="fas fa-arrow-left" style="font-size:0.75rem;"></i> ${this.t('backToHome')}
                </button>

                ${this._currentPrompt ? `<div class="aif-subject-tag"><i class="fas fa-wand-magic-sparkles" style="font-size:0.75rem;"></i> ${this._currentPrompt.length > 60 ? this._currentPrompt.slice(0,60)+'…' : this._currentPrompt}</div>` : ''}

                <!-- Prompt -->
                <div class="aif-card">
                    <div class="aif-label"><i class="fas fa-pen-to-square" style="color:#4f46e5;"></i> ${this.t('subject')}</div>
                    ${this.renderAttachments()}
                    <textarea id="kwizy-ai-prompt" class="aif-prompt"
                        placeholder="${this.t('examplePrompt')}"
                        oninput="document.getElementById('ai-char-count').textContent=this.value.length"
                    >${this._currentPrompt}</textarea>
                    <div class="aif-prompt-footer">
                        <span class="aif-char">${this.t('contextHint')}</span>
                        <span class="aif-char"><span id="ai-char-count">${this._currentPrompt.length}</span> ${this.t('chars')}
                            <button type="button" style="margin-left:8px;padding:3px 10px;border-radius:8px;border:1px solid rgba(79,70,229,0.18);background:rgba(79,70,229,0.06);color:#6366f1;font-size:0.7rem;font-weight:600;cursor:pointer;" onclick="document.getElementById('ai-file-upload-form').click()"><i class="fas fa-paperclip"></i></button>
                            <input type="file" id="ai-file-upload-form" accept=".txt,.pdf,.doc,.docx" style="display:none;" onchange="KwizyAIEngine.handleFileUpload(event)">
                        </span>
                    </div>
                </div>

                <!-- Params -->
                <div class="aif-params">
                    <div class="aif-card">
                        <div class="aif-label"><i class="fas fa-layer-group" style="color:#7c3aed;"></i> ${this.t('difficulty')}</div>
                        <select id="kwizy-ai-difficulty" class="aif-select">
                            <option value="${this.t('difficultyBeginner')}">🟢 ${this.t('difficultyBeginner')}</option>
                            <option value="${this.t('difficultyIntermediate')}" selected>🟡 ${this.t('difficultyIntermediate')}</option>
                            <option value="${this.t('difficultyAdvanced')}">🔴 ${this.t('difficultyAdvanced')}</option>
                        </select>
                    </div>
                    <div class="aif-card">
                        <div class="aif-label"><i class="fas fa-list-check" style="color:#4f46e5;"></i> ${this.t('format')}</div>
                        <select id="kwizy-ai-type" class="aif-select">
                            <option value="${this.t('mixed')}" selected>${this.t('mixed')}</option>
                            <option value="${this.t('singleMcq')}">${this.t('singleMcq')}</option>
                            <option value="${this.t('writtenAnswer')}">${this.t('writtenAnswer')}</option>
                        </select>
                    </div>
                </div>

                <!-- Nombre de questions -->
                <div class="aif-card" style="text-align:center;">
                    <div class="aif-label" style="justify-content:center;"><i class="fas fa-hashtag" style="color:#4f46e5;"></i> ${this.t('numberOfQuestions')}</div>
                    <div class="aif-count-wrap">
                        <button class="aif-count-btn" onclick="KwizyAIEngine._adjustCount(-1)">−</button>
                        <input type="number" id="kwizy-ai-count" value="5" min="1" max="25">
                        <button class="aif-count-btn" onclick="KwizyAIEngine._adjustCount(1)">+</button>
                    </div>
                </div>

                <!-- Options avancées -->
                <div class="aif-card">
                    <div class="aif-label"><i class="fas fa-sliders" style="color:#7c3aed;"></i> ${this.t('advancedOptions')}</div>
                    <div class="aif-toggle-row">
                        <div>
                            <div class="aif-toggle-title">${this.t('trickQuestions')}</div>
                            <div class="aif-toggle-desc">${this.t('trickDesc')}</div>
                        </div>
                        <label class="aif-switch">
                            <input type="checkbox" id="kwizy-ai-traps">
                            <span class="aif-switch-track"></span>
                        </label>
                    </div>
                    <div class="aif-toggle-row">
                        <div>
                            <div class="aif-toggle-title">${this.t('detailedExplanations')}</div>
                            <div class="aif-toggle-desc">${this.t('detailedDesc')}</div>
                        </div>
                        <label class="aif-switch">
                            <input type="checkbox" id="kwizy-ai-explain">
                            <span class="aif-switch-track"></span>
                        </label>
                    </div>
                </div>

                <!-- Erreur -->
                <div id="ai-error-banner" class="hidden p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation mt-0.5"></i>
                    <span id="ai-error-text"></span>
                </div>

                <!-- Générer -->
                <button onclick="window.KwizyAIEngine.generate()" id="kwizy-ai-btn" class="aif-generate">
                    <i class="fas fa-wand-magic-sparkles"></i> ${this.t('generateQuiz')}
                </button>

                <!-- Preview -->
                <div id="ai-preview-panel" class="hidden aif-card" style="padding:0;">
                    <div class="aif-preview-header">
                        <span>${this.t('preview')}</span>
                        <small id="ai-preview-count">0 ${this.t('questionsCount')}</small>
                    </div>
                    <div id="ai-preview-list"></div>
                    <button onclick="window.KwizyAIEngine.confirmImport()" class="aif-import">${this.t('importToEditor')}</button>
                </div>

                <p class="aif-disclaimer">${this.t('warningDisclaimer')}</p>
            </div>
        </div>`;
    },

    handleFileUpload: async function (event) {
        if (!event.target || !event.target.files) return;
        const file = event.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!this._attachedFiles) this._attachedFiles = [];

        try {
            let text = "";
            if (ext === 'txt') {
                text = await file.text();
            } else {
                // Simulation pour les fichiers complexes sur le client sans lib tierce
                text = "Contenu extrait du document " + file.name + " : (Veuillez copier-coller le texte manuellement pour les PDF/Word s'il n'est pas reconnu par le backend, ou ceci sera traité par l'API backend)";
            }

            this._attachedFiles.push({ name: file.name, text: text });

            if (typeof render === 'function') render();

            // Trigger input event to update send button state after file attach
            setTimeout(() => {
                const ta = document.getElementById('ai-landing-input');
                if (ta) ta.dispatchEvent(new Event('input'));
            }, 50);

        } catch (e) {
            console.error(e);
            alert(this.t('fileParseError') + ' ' + file.name);
        }

        if (event.target && event.target.type === 'file') {
            event.target.value = ''; // Reset
        }
    },

    handleImportFile: async function (event) {
        if (!event.target || !event.target.files) return;
        const file = event.target.files[0];
        if (!file) return;
        if (event.target && event.target.type === 'file') event.target.value = '';

        const imageTypes = ['image/jpeg','image/png','image/gif','image/webp'];
        const isImage = imageTypes.includes(file.type);

        if (!isImage) {
            return this.handleFileUpload({ target: { files: [file] } });
        }

        /* ── Image → Mistral vision ── */
        const apiKey = this._pickMistralKey();

        if (!this._attachedFiles) this._attachedFiles = [];

        // Afficher état de chargement
        const loadingName = file.name + ' (analyse en cours…)';
        this._attachedFiles.push({ name: loadingName, text: '' });
        if (typeof render === 'function') render();

        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'pixtral-12b-2409',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } },
                            { type: 'text', text: 'Extrait tout le texte visible dans cette image. Retourne uniquement le texte extrait, sans commentaire.' }
                        ]
                    }],
                    max_tokens: 2048
                })
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || `Erreur Mistral ${resp.status}`);
            }

            const data = await resp.json();
            const extracted = data.choices?.[0]?.message?.content || '';

            // Remplacer l'entrée loading par le résultat
            const idx = this._attachedFiles.findIndex(f => f.name === loadingName);
            if (idx !== -1) this._attachedFiles[idx] = { name: file.name + ' (image)', text: extracted };

        } catch (e) {
            console.error('Mistral vision:', e);
            const idx = this._attachedFiles.findIndex(f => f.name === loadingName);
            if (idx !== -1) this._attachedFiles.splice(idx, 1);
            alert('Erreur lecture image : ' + e.message);
        }

        if (typeof render === 'function') render();
    },

    _adjustCount: function (delta) {
        const el = document.getElementById('kwizy-ai-count');
        if (!el) return;
        let val = parseInt(el.value) + delta;
        val = Math.min(25, Math.max(1, val));
        el.value = val;
    },

    showError: function (msg) {
        const b = document.getElementById('ai-error-banner');
        const t = document.getElementById('ai-error-text');
        if (b && t) { t.textContent = msg; b.classList.remove('hidden'); }
    },

    _setLoading: function (on) {
        const btn = document.getElementById('kwizy-ai-btn');
        if (!btn) return;
        btn.disabled = on;
        btn.innerHTML = on ? `<i class="fas fa-spinner fa-spin"></i> ${this.t('analyzing')}` : `<i class="fas fa-wand-magic-sparkles"></i> ${this.t('generateQuiz')}`;
        btn.style.opacity = on ? '0.7' : '1';
    },

    generate: async function () {
        const prompt = document.getElementById('kwizy-ai-prompt')?.value.trim();
        const count = parseInt(document.getElementById('kwizy-ai-count')?.value) || 5;
        const difficulty = document.getElementById('kwizy-ai-difficulty')?.value;
        const type = document.getElementById('kwizy-ai-type')?.value;
        const traps = document.getElementById('kwizy-ai-traps')?.checked;
        const explain = document.getElementById('kwizy-ai-explain')?.checked;

        if (!prompt) { this.showError(this.t('pleaseDescribeSubject')); return; }
        this._setLoading(true);

        try {
            const isFr = this.getLang() === 'fr';
            let finalPrompt = isFr
                ? `Génère exactement ${count} questions sur : "${prompt}". Niveau : ${difficulty}. Format : ${type}.`
                : `Generate exactly ${count} questions about: "${prompt}". Level: ${difficulty}. Format: ${type}.`;
            if (traps) finalPrompt += isFr ? ` Inclure des pièges.` : ` Include traps.`;
            if (explain) finalPrompt += isFr ? ` Ajouter des explications.` : ` Add explanations.`;

            if (this._attachedFiles && this._attachedFiles.length > 0) {
                finalPrompt += isFr ? `\n\nDocuments joints pour contexte :\n` : `\n\nAttached documents for context:\n`;
                this._attachedFiles.forEach(f => {
                    finalPrompt += isFr
                        ? `\n--- Document (${f.name}) ---\n${f.text.substring(0, 5000)}\n--- Fin du document ---\n`
                        : `\n--- Document (${f.name}) ---\n${f.text.substring(0, 5000)}\n--- End of document ---\n`;
                });
            }

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: finalPrompt })
            });

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || this.t('apiError'));

            this._lastGenerated = { data: data.data, prompt };
            this._showPreview(data.data);
        } catch (e) {
            this.showError(e.message);
        } finally {
            this._setLoading(false);
        }
    },

    _showPreview: function (generatedData) {
        const panel = document.getElementById('ai-preview-panel');
        const list = document.getElementById('ai-preview-list');
        const countEl = document.getElementById('ai-preview-count');
        if (!panel || !list || !generatedData?.questions) return;

        const qs = generatedData.questions;
        countEl.textContent = qs.length + ' ' + this.t('questionsCount');
        list.innerHTML = qs.map((q, i) => `
            <div class="bg-zinc-50 dark:bg-black/20 rounded-xl p-3 border border-zinc-100 dark:border-white/5">
                <p class="text-xs font-bold text-zinc-900 dark:text-white">${q.text}</p>
                <div class="mt-2 space-y-1">
                    ${(q.options || []).map(o => `<div class="text-[10px] ${o.isCorrect ? 'text-secondary font-bold' : 'text-zinc-400'}">● ${o.text}</div>`).join('')}
                </div>
            </div>`).join('');
        panel.classList.remove('hidden');
    },

    confirmImport: function () {
        if (!this._lastGenerated) return;
        this.injectToDashboard(this._lastGenerated.data, this._lastGenerated.prompt);
        this._lastGenerated = null;
        this._attachedFiles = [];
        this.mode = 'landing';
    },

    injectToDashboard: function (generatedData, originalPrompt) {
        const formattedQuestions = (generatedData.questions || []).map(q => {
            const opts = q.options ? q.options.map(o => o.text) : (this.getLang() === 'fr' ? ['Vrai', 'Faux'] : ['True', 'False']);
            let ci = q.options ? q.options.findIndex(o => o.isCorrect) : 0;
            return {
                id: Math.random().toString(36).substr(2, 9),
                type: 'MCQ', text: q.text || (this.getLang() === 'fr' ? 'Question IA' : 'AI Question'),
                options: opts, correctOptionIndex: ci === -1 ? 0 : ci,
                correctOptionIndexes: [ci === -1 ? 0 : ci],
                explanation: q.explanation || ''
            };
        });

        const newQuiz = {
            id: Math.random().toString(36).substr(2, 9),
            title: generatedData.title || (this.t('generatedQuizTitlePrefix') + originalPrompt.substring(0, 30)),
            description: generatedData.description || this.t('generatedQuizDescription'),
            status: 'Draft', questions: formattedQuestions, createdAt: Date.now()
        };

        if (typeof state !== 'undefined' && typeof render === 'function') {
            state.quizzes.unshift(newQuiz);
            state.activeQuizId = newQuiz.id;
            state.activeTab = 'Editor';
            if (window.actions?.showNotification) actions.showNotification(this.t('quizImported'), 'success');
            render();
        }
    },

    /* ── Animation de fond interactive ── */
    _mouse: { x: -9999, y: -9999 },
    _bgRaf: null,

    _onHubMove: function (e, el) {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        this._mouse = { x, y };
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
    },

    _initBgCanvas: function () {
        const canvas = document.getElementById('ai-bg-canvas');
        if (!canvas || canvas._kwzInit) return;
        canvas._kwzInit = true;

        const ctx = canvas.getContext('2d');
        const hub = canvas.closest('.ai-hub') || canvas.parentElement;

        const resize = () => {
            canvas.width = hub.offsetWidth || 800;
            canvas.height = hub.offsetHeight || 600;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(hub);

        const isDark = () => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

        /* Particules */
        const N = 55;
        const particles = Array.from({ length: N }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            r: 1.8 + Math.random() * 2.2,
            o: 0.3 + Math.random() * 0.5
        }));

        const ATTRACT_DIST = 160;
        const LINE_DIST = 110;
        const FORCE = 0.012;

        const draw = () => {
            if (!document.getElementById('ai-bg-canvas')) {
                ro.disconnect();
                cancelAnimationFrame(this._bgRaf);
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const dark = isDark();
            const baseColor = dark ? [80, 160, 255] : [0, 112, 255];
            const mx = this._mouse.x;
            const my = this._mouse.y;

            particles.forEach(p => {
                /* Attraction vers la souris */
                const dx = mx - p.x, dy = my - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < ATTRACT_DIST && dist > 0) {
                    const f = (1 - dist / ATTRACT_DIST) * FORCE;
                    p.vx += dx / dist * f;
                    p.vy += dy / dist * f;
                }
                /* Friction */
                p.vx *= 0.98; p.vy *= 0.98;
                /* Limiter la vitesse */
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 2) { p.vx = p.vx / speed * 2; p.vy = p.vy / speed * 2; }
                /* Déplacement */
                p.x += p.vx; p.y += p.vy;
                /* Rebond doux aux bords */
                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }
            });

            /* Lignes entre particules proches */
            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < LINE_DIST) {
                        const alpha = (1 - d / LINE_DIST) * (dark ? 0.25 : 0.18);
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${baseColor.join(',')},${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            /* Points */
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseColor.join(',')},${p.o * (dark ? 0.7 : 0.55)})`;
                ctx.fill();
            });

            this._bgRaf = requestAnimationFrame(draw);
        };

        if (this._bgRaf) cancelAnimationFrame(this._bgRaf);
        draw();
    }
};
