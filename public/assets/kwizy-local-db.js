/**
 * Kwizy Local Database (kwizy-local-db.js)
 * =========================================
 * Replaces the PHP backend with a fully client-side localStorage implementation.
 * Allows Kwizy to work completely offline / on GitHub Pages without a server.
 *
 * Storage keys:
 *   kwizy_local_users    -> Array of user accounts
 *   kwizy_local_quizzes  -> Array of all quizzes
 *   kwizy_local_results  -> Array of student results
 */
'use strict';

const KwizyLocalDB = (() => {

  // Storage helpers
  const get = (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw === 'null' || raw === 'undefined') return fallback;
      return JSON.parse(raw);
    } catch { return fallback; }
  };
  const set = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('KwizyLocalDB write error:', e); }
  };

  const getUsers   = () => get('kwizy_local_users', []);
  const getQuizzes = () => get('kwizy_local_quizzes', []);
  const getResults = () => get('kwizy_local_results', []);
  const saveUsers   = u => set('kwizy_local_users', u);
  const saveQuizzes = q => set('kwizy_local_quizzes', q);
  const saveResults = r => set('kwizy_local_results', r);
  const uid = () => 'loc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

  const hashPass = async (password) => {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + 'kwizy-salt-2026'));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return btoa(unescape(encodeURIComponent(password + ':kwizy')));
  };

  // Auth
  const auth = {
    async register({ nom, email, mot_de_passe }) {
      const users = getUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return { success: false, message: 'Un compte avec cet email existe deja.' };
      const hashed = await hashPass(mot_de_passe);
      const user = { id: uid(), nom, email: email.toLowerCase(), password: hashed, school: '', avatar: null, sidebarOrder: [], createdAt: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
      const sessionUser = Object.assign({}, user);
      delete sessionUser.password;
      const token = 'local_token_' + uid();
      localStorage.setItem('kwizyToken', token);
      localStorage.setItem('kwizySession', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser, token };
    },
    async login({ email, mot_de_passe }) {
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { success: false, message: 'Aucun compte trouve avec cet email.' };
      const hashed = await hashPass(mot_de_passe);
      if (user.password !== hashed) return { success: false, message: 'Mot de passe incorrect.' };
      const sessionUser = Object.assign({}, user);
      delete sessionUser.password;
      const token = 'local_token_' + uid();
      localStorage.setItem('kwizyToken', token);
      localStorage.setItem('kwizySession', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser, token };
    },
    getAccount(id) {
      const users = getUsers();
      const user = users.find(u => u.id === id);
      if (!user) return { success: false, message: 'Compte introuvable.' };
      const sessionUser = Object.assign({}, user);
      delete sessionUser.password;
      return { success: true, user: sessionUser };
    },
    async updateAccount(updates) {
      const users = getUsers();
      const idx = users.findIndex(u => u.id === updates.id);
      if (idx === -1) return { success: false, message: 'Compte introuvable.' };
      if (updates.new_password) {
        users[idx].password = await hashPass(updates.new_password);
      }
      ['nom','email','school','avatar','sidebarOrder','mistralApiKey'].forEach(f => {
        if (updates[f] !== undefined) users[idx][f] = updates[f];
      });
      saveUsers(users);
      const sessionUser = Object.assign({}, users[idx]);
      delete sessionUser.password;
      localStorage.setItem('kwizySession', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    },
    deleteAccount(id) {
      saveUsers(getUsers().filter(u => u.id !== id));
      localStorage.removeItem('kwizySession');
      localStorage.removeItem('kwizyToken');
      return { success: true };
    }
  };

  // Quiz
  const quiz = {
    list(teacherId) { return getQuizzes().filter(q => q.teacher_id === teacherId); },
    getByShareCode(shareCode) {
      return getQuizzes().find(q => q.shareCode === shareCode && q.status !== 'Trash') || null;
    },
    save(quizData) {
      let quizzes = getQuizzes();
      const existing = quizzes.findIndex(q => q.id === quizData.id);
      if (existing !== -1) {
        quizzes[existing] = Object.assign({}, quizzes[existing], quizData, { updatedAt: new Date().toISOString() });
      } else {
        if (!quizData.id || String(quizData.id).startsWith('new_')) quizData.id = uid();
        quizData.createdAt = new Date().toISOString();
        quizData.updatedAt = new Date().toISOString();
        quizzes.push(quizData);
      }
      saveQuizzes(quizzes);
      return { success: true, id: quizData.id };
    },
    trash(id, teacherId) {
      const quizzes = getQuizzes();
      const idx = quizzes.findIndex(q => q.id === id && q.teacher_id === teacherId);
      if (idx !== -1) quizzes[idx].status = 'Trash';
      saveQuizzes(quizzes);
      return { success: true };
    },
    restore(id, teacherId) {
      const quizzes = getQuizzes();
      const idx = quizzes.findIndex(q => q.id === id && q.teacher_id === teacherId);
      if (idx !== -1) quizzes[idx].status = 'Draft';
      saveQuizzes(quizzes);
      return { success: true };
    },
    deletePermanent(id) {
      saveQuizzes(getQuizzes().filter(q => q.id !== id));
      return { success: true };
    }
  };

  // Results
  const results = {
    getByCode(shareCode) { return getResults().filter(r => r.shareCode === shareCode); },
    submit(data) {
      const { code, studentId, name, class: cls, score, total, answers } = data;
      const all = getResults().filter(r => !(r.shareCode === code && r.studentId === studentId));
      all.push({
        id: uid(), shareCode: code, studentId, name, class: cls, score, total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 100,
        answers: answers || [], submittedAt: new Date().toISOString()
      });
      saveResults(all);
      return { success: true };
    },
    deleteStudent({ code, studentId }) {
      saveResults(getResults().filter(r => !(r.shareCode === code && r.studentId === studentId)));
      return { success: true };
    }
  };

  // Mock response builder
  function mockResponse(data, status) {
    if (status === undefined) status = 200;
    return { ok: status >= 200 && status < 300, status: status, json: async () => data };
  }

  // URL router
  async function handleRequest(url, options) {
    if (!options) options = {};
    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    if (options.body) {
      try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; } catch (e) {}
    }
    const cleanUrl = url.replace(/^(\.\.\/)*api\/v1\//, '').replace(/^api\/v1\//, '');

    // AUTH
    if (cleanUrl.indexOf('auth.php') === 0) {
      const qs = cleanUrl.indexOf('?') !== -1 ? cleanUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      const action = params.get('action') || body.action;
      if (action === 'register') return mockResponse(await auth.register(body));
      if (action === 'login') return mockResponse(await auth.login(body));
      if (action === 'get_account') return mockResponse(auth.getAccount(params.get('id')));
      if (action === 'update_account') return mockResponse(await auth.updateAccount(body));
      if (action === 'delete_account') return mockResponse(auth.deleteAccount(body.id));
      if (action === 'upload_image') {
        if (body.image && body.userId) return mockResponse(await auth.updateAccount({ id: body.userId, avatar: body.image }));
        return mockResponse({ success: false, message: 'Donnees manquantes.' });
      }
      return mockResponse({ success: false, message: 'Action inconnue.' }, 400);
    }

    // QUIZ
    if (cleanUrl.indexOf('quiz.php') === 0) {
      const qs = cleanUrl.indexOf('?') !== -1 ? cleanUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      if (params.get('trash_id')) return mockResponse(quiz.trash(params.get('trash_id'), params.get('teacher_id')));
      if (params.get('restore_id')) return mockResponse(quiz.restore(params.get('restore_id'), params.get('teacher_id')));
      if (params.get('delete_permanent') === '1') return mockResponse(quiz.deletePermanent(params.get('id') || body.id));
      if (params.get('teacher_id')) return mockResponse(quiz.list(params.get('teacher_id')));
      if (params.get('share_code')) {
        const q = quiz.getByShareCode(params.get('share_code'));
        return q ? mockResponse({ success: true, quiz: q }) : mockResponse({ success: false, message: 'Quiz introuvable.' }, 404);
      }
      if (method === 'POST' && body) return mockResponse(quiz.save(body));
      return mockResponse([]);
    }

    // RESULTS
    if (cleanUrl.indexOf('results.php') === 0) {
      const qs = cleanUrl.indexOf('?') !== -1 ? cleanUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      if (params.get('delete_student') === '1') return mockResponse(results.deleteStudent(body));
      if (params.get('code')) return mockResponse(results.getByCode(params.get('code')));
      return mockResponse([]);
    }

    // LOOKUP
    if (cleanUrl.indexOf('lookup.php') === 0) {
      const qs = cleanUrl.indexOf('?') !== -1 ? cleanUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      const code = params.get('share_code');
      const q = quiz.getByShareCode(code);
      if (!q) return mockResponse({ status: 'not_found', message: 'Code invalide ou quiz non trouve.' });
      if (q.status !== 'Published') return mockResponse({ status: 'not_found', message: 'Ce quiz n\'est pas encore publie.' });
      return mockResponse({ status: 'found', quiz: q });
    }

    // SESSION
    if (cleanUrl.indexOf('session.php') === 0) {
      const qs = cleanUrl.indexOf('?') !== -1 ? cleanUrl.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      const action = params.get('action') || body.action;
      if (action === 'join') return mockResponse({ success: true });
      if (action === 'check_status' || params.get('check_status')) return mockResponse({ status: 'ok', session_statut: 'lance' });
      if (action === 'finish_and_submit') return mockResponse(results.submit(body));
      return mockResponse({ success: true });
    }

    // MONITORING
    if (cleanUrl.indexOf('monitoring.php') === 0) return mockResponse({ students: [] });

    // FLASHCARDS (local stub)
    if (cleanUrl.indexOf('flashcards.php') === 0) {
      const topic = body.topic || 'Revisions';
      const questions = body.questions || [];
      const cards = questions.slice(0, 5).map(function(q) {
        return { front: q, back: 'Revise cette notion. Consulte tes notes de cours pour approfondir.' };
      });
      if (!cards.length) cards.push({ front: topic, back: 'Consulte tes notes de cours pour reviser ce sujet.' });
      return mockResponse({ success: true, flashcards: cards });
    }

    console.warn('[KwizyLocalDB] Route non geree :', url);
    return mockResponse({ success: false, message: 'Endpoint non disponible en mode local.' }, 404);
  }

  return {
    auth: auth,
    quiz: quiz,
    results: results,
    handleRequest: handleRequest,
    install: function(actionsObj) {
      if (!actionsObj) { console.error('[KwizyLocalDB] No actions object provided.'); return; }
      actionsObj.apiFetch = handleRequest;
      console.info('[KwizyLocalDB] Installed - running in local (offline) mode.');
    }
  };

})();

window.KwizyLocalDB = KwizyLocalDB;
