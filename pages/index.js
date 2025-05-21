import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import ReactMarkdown from 'react-markdown';
import { Client, Account } from "appwrite";
import { useRouter } from 'next/router'; // Next.js way

export default function Home() {
  const [shareVisible, setShareVisible] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [jams, setJams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [savedJams, setSavedJams] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [likeLoading, setLikeLoading] = useState({});
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [showSidePanel, setShowSidePanel] = useState(false);



  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    // Pegue o parâmetro da url (no client-side)
    if (router.isReady) {
      if (router.query.login === '1') {
        setShowLogin(true);
      }
    }
  }, [router.isReady, router.query.login]);

  // Checar sessão no carregamento
  useEffect(() => {
    account.get().then(setUser).catch(() => setUser(null));
  }, []);

  // Login
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      await account.createEmailPasswordSession(loginForm.email, loginForm.password);
      const user = await account.get();
      setUser(user);
    } catch (err) {
      setLoginError('Login failed');
    }
  }
  // Logout
  async function handleLogout() {
    await account.deleteSession('current');
    setUser(null);
  }

  const avatarCovers = {
    'itch.io': '/assets/covers/itchio.png',
    'devpost.com': '/assets/covers/devpost.png',
    'globalgamejam.org': '/assets/covers/globalgamejam.png',
    'dev.to': '/assets/covers/devto.png',
  };
  const fallbackAvatar = '/assets/covers/default.png';

  const getRootDomain = (hostname) => {
    if (!hostname) return '';
    const clean = hostname.replace(/^www\./, '');
    try {
      const parts = clean.split('.');
      return parts.slice(-2).join('.');
    } catch {
      return clean;
    }
  };
  const getDomains = () => {
    return Array.from(
      new Set(
        jams.map((jam) => {
          try {
            return getRootDomain(new URL(jam.url).hostname);
          } catch {
            return '⚠️ inválido';
          }
        })
      )
    );
  };

  function Loader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.9)', zIndex: 999999
    }}>
      <div style={{
        border: '5px solid #444',
        borderTop: '5px solid #ffd700',
        borderRadius: '50%',
        width: 60,
        height: 60,
        animation: 'spin 1s linear infinite'
      }} />
      <style>
        {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}


  function parseJamDate(dateStr) {
    if (!dateStr) return 0;
    let cleaned = dateStr.replace(/(\d{1,2})(st|nd|rd|th)/g, '$1');
    cleaned = cleaned.replace(' at ', ', ');
    cleaned = cleaned.replace(/^([A-Za-z]+ \d{1,2}) (\d{4},)/, '$1, $2');
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return 0;
    return d.getTime();
  }
  const getUntilLastDot = (text, limit = 300) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= limit) {
      const lastDot = trimmed.lastIndexOf('.');
      return lastDot !== -1 ? trimmed.slice(0, lastDot + 1) : trimmed;
    }
    const substring = trimmed.slice(0, limit);
    const lastDot = substring.lastIndexOf('.');
    return lastDot !== -1 ? substring.slice(0, lastDot + 1).trim() : substring.trim() + '...';
  };

  const domains = sortDomains(getDomains());
  const allPosts = domains.flatMap((domain) => {
    const posts = jams
      .filter((j) => {
        try {
          const host = new URL(j.url).hostname;
          return getRootDomain(host) === domain;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = parseJamDate(a.contestStart);
        const dateB = parseJamDate(b.contestStart);
        return dateB - dateA;
      });
    return posts.map((jam, idx) => ({ jam, domain, idx }));
  });
  const visiblePosts = allPosts.slice(0, visibleCount);

  useEffect(() => {
    const fetchLikeCounts = async () => {
      try {
        const res = await fetch('/api/likes-count');
        const data = await res.json();
        setLikeCounts(data || {});
      } catch {
        setLikeCounts({});
      }
    };
    fetchLikeCounts();
  }, []);

  useEffect(() => {
    const fetchLikedPosts = async () => {
      try {
        const res = await fetch('/api/my-likes');
        const data = await res.json(); // { url1: true, url2: true }
        setLikedPosts(data);
      } catch {}
    };
    fetchLikedPosts();
  }, [jams]);


  useEffect(() => {
    const stored = localStorage.getItem('savedJams');
    if (stored) setSavedJams(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const el = document.getElementById('scrollChat');
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatLog]);

  useEffect(() => {
    const msgBtn = document.getElementById('message');
    const handler = () => setChatVisible(true);
    if (msgBtn) msgBtn.addEventListener('click', handler);
    return () => {
      if (msgBtn) msgBtn.removeEventListener('click', handler);
    };
  }, []);

  useEffect(() => {
    const tryInit = () => {
      const el = document.querySelector('.stories-slider');
      const buttons = document.querySelectorAll('.demo-stories a:not(.demo-stories-saved)');
      if (
        typeof window === 'undefined' ||
        !window.createStoriesSlider ||
        !window.Swiper ||
        !el ||
        buttons.length === 0
      ) {
        return setTimeout(tryInit, 200);
      }
      if (el.classList.contains('stories-slider-initialized')) return;
      const slider = window.createStoriesSlider(el, {
        Swiper: window.Swiper,
        autoplayDuration: 5000,
        enabled: false,
      });
      buttons.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          el.classList.add('stories-slider-in');
          slider.enable();
          slider.slideTo(index, 0);
        });
      });
      document.querySelectorAll('.stories-slider-close-button').forEach((btn) => {
        btn.addEventListener('click', () => {
          el.classList.remove('stories-slider-in');
          slider.disable();
        });
      });
      el.classList.add('stories-slider-initialized');
    };
    tryInit();
  }, [jams]);

  const toggleLike = async (jam) => {
  const wasLiked = !!likedPosts[jam.url];
  setLikedPosts(prev => ({ ...prev, [jam.url]: !wasLiked }));
  setLikeCounts(prev => ({
    ...prev,
    [jam.url]: (prev[jam.url] || 0) + (wasLiked ? -1 : 1)
  }));
  setLikeLoading(prev => ({ ...prev, [jam.url]: true }));

  try {
    const res = await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: jam.url,
        title: jam.title,
        contestStart: jam.contestStart,
      })
    });
    const data = await res.json();

    // (opcional) Re-sincronize aqui se quiser
    // setLikedPosts(prev => ({ ...prev, [jam.url]: data.liked }));
  } catch (err) {
    setLikedPosts(prev => ({ ...prev, [jam.url]: wasLiked }));
    setLikeCounts(prev => ({
      ...prev,
      [jam.url]: (prev[jam.url] || 0) + (wasLiked ? 1 : -1)
    }));
    alert('Erro ao gravar like!');
  } finally {
    setLikeLoading(prev => ({ ...prev, [jam.url]: false }));
  }
};



  const saveJam = (jam) => {
    const already = savedJams.some(j => j.url === jam.url);
    let newSaved;
    if (already) {
      newSaved = savedJams.filter(j => j.url !== jam.url);
    } else {
      newSaved = [...savedJams, jam];
    }
    setSavedJams(newSaved);
    localStorage.setItem('savedJams', JSON.stringify(newSaved));
  };
  const openShareModal = (url) => {
    setShareUrl(url);
    setShareVisible(true);
  };
  const showCopyToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  function sortDomains(domains) {
    return domains.slice().sort((a, b) => {
      if (a === 'dev.to') return -1;
      if (b === 'dev.to') return 1;
      return a.localeCompare(b);
    });
  }

  const fetchJams = async () => {
    try {
      const res = await fetch('/api/result');
      let appwriteJams = await res.json();
      if (!Array.isArray(appwriteJams)) {
        setMessage('Erro ao carregar dados do Appwrite.');
        return;
      }
      const unique = [];
      const map = {};
      for (const jam of appwriteJams) {
        if (!map[jam.url]) {
          map[jam.url] = true;
          unique.push(jam);
        }
      }
      unique.sort((a, b) => {
        const dateA = parseJamDate(a.contestStart);
        const dateB = parseJamDate(b.contestStart);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      });
      setJams(unique);
    } catch (err) {
      setMessage('Erro ao carregar dados.');
    }
  };

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  const account = new Account(client);

  async function doLogin(email, password) {
    try {
      await account.deleteSession('current').catch(() => {});
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      alert("Login OK! Usuário: " + user.email);
    } catch (e) {
      alert("Erro: " + e.message); // Aqui mostra se é "Invalid credentials", "User not found", etc.
    }
  }

  const updateJams = async () => {
    setLoading(true);
    setMessage('Atualizando...');
    try {
      // Gera o JWT SÓ DENTRO DA FUNÇÃO
      const jwt = await account.createJWT();

      const res = await fetch('/api/update', {
        headers: {
          'Authorization': `Bearer ${jwt.jwt}`, // jwt.jwt pega o token string do objeto retornado
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      setMessage(`Dados atualizados: ${json.count || 0} itens.`);
      await fetchJams();
    } catch {
      setMessage('Erro ao atualizar dados.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchJams();
  }, []);

  const renderStoriesSlides = (domain) => {
    const filtered = jams
      .filter((jam) => {
        try {
          const hostname = new URL(jam.url).hostname;
          return getRootDomain(hostname) === domain;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = parseJamDate(a.contestStart);
        const dateB = parseJamDate(b.contestStart);
        return dateB - dateA;
      });

    return filtered.map((jam, idx) => {
      const image = jam.image?.startsWith('//') ? 'https:' + jam.image : jam.image || 'https://placehold.co/300x200?text=No+Image';
      const isDevto = jam.url?.includes('dev.to/challenges');
      return (
        <div className="swiper-slide" key={idx}>
          <div className="stories-slider-user">
            <div className="stories-slider-user-avatar">
              <img src={avatarCovers[domain] || fallbackAvatar} alt={domain} />
            </div>
            <div className="stories-slider-user-name">{domain}</div>
            <div className="stories-slider-user-date">{jam.countdown || ''}</div>
          </div>
          <div className="stories-slider-actions">
            <button className="stories-slider-close-button"></button>
          </div>
          <div
            className="stories-slider-content"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#000',
              height: '100%',
            }}
          >
            <img
              src={image}
              alt={jam.title}
              style={{
                width: '90%',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              }}
            />
            <div style={{ marginTop: '1.2rem', color: '#fff' }}>
              <strong>{jam.title}</strong><br />
              {jam.countdown && <span>⏳ {jam.countdown}</span>}<br />
            </div>
            {isDevto && (
              <ul style={{
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: '#ccc',
                listStyle: 'none',
                padding: 0,
                textAlign: 'left'
              }}>
                {jam.contestStart && (
                  <li><strong>Start:</strong> <span>{jam.contestStart}</span></li>
                )}
                {jam.submissionsDue && (
                  <li><strong>Submissions:</strong> <span>{jam.submissionsDue}</span></li>
                )}
                {jam.winnersAnnounced && (
                  <li><strong>Winners:</strong> <span>{jam.winnersAnnounced}</span></li>
                )}
              </ul>
            )}
            {jam.url && (
              <div className="buttonClick">
                <a
                  href={jam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {isDevto ? 'Sign up challenge' : 'Acessar Jam'}
                </a>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const handleChatSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!chatInput.trim()) return;
    const question = chatInput.trim();

    setChatLog(prev => [...prev, { question, answer: '⏳ Consulting...' }]);
    setChatInput('');

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    setChatLog(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { question, answer: data.answer || '❌ Erro ao responder.' };
      return updated;
    });
  };


  return (
    <>
      <Script src="/assets/js/swiper-bundle.min.js" strategy="beforeInteractive" />
      <Script src="/assets/js/stories-slider.js" strategy="afterInteractive" />
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-356GJ1VDJM"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-356GJ1VDJM', {
            'send_page_view': true,
            'page_path': window.location.pathname,
            'page_location': window.location.href,
            'page_title': document.title
          });
        `}
      </Script>
      {/* BOTÃO FLUTUANTE SUPERIOR DIREITO */}
<button
className="aboutProject"
  aria-label="Open panel"
  onClick={() => setShowSidePanel(true)}
>
  <img src="/assets/icons/arrow.svg" alt="Open panel" />
</button>

<div
  style={{
    position: 'fixed',
    top: 0,
    right: 0,
    width: 340,
    maxWidth: '100vw',
    height: '100vh',
    background: '#181d25',
    color: '#fff',
    zIndex: 99998,
    boxShadow: '-6px 0 24px rgba(0,0,0,0.19)',
    transform: showSidePanel ? 'translateX(0)' : 'translateX(105%)',
    transition: 'transform 0.38s cubic-bezier(.74,.04,.38,1.03)',
    display: 'flex',
    flexDirection: 'column'
  }}
>
  <button
    onClick={() => setShowSidePanel(false)}
    style={{
      alignSelf: 'flex-end',
      background: 'none',
      border: 'none',
      color: '#fff',
      fontSize: 28,
      padding: '16px 18px 6px 12px',
      cursor: 'pointer',
      opacity: 0.7
    }}
    aria-label="Close"
    tabIndex={showSidePanel ? 0 : -1}
  >×</button>
  <div style={{ padding: '18px 30px 18px 26px' }}>
    <h2 style={{ margin: '0 0 18px 0', fontWeight: 700, fontSize: '1.35rem' }}>
      About Project
    </h2>
    <div className="aboutProjectText">
      <p>This project was created for the <a href="https://dev.to/devteam/join-the-bright-data-real-time-ai-agents-challenge-3000-in-prizes-cog?bb=216179" target="_blank">Bright Data Real-Time AI Agents Challenge</a> on dev.to.</p>
      <p>Besides participating in the challenge, this project also serves an educational purpose by showing how to collect, process, and display real-time data using Bright Data.</p>
      <p>For demonstration, only two sites are featured: Itch.io and Dev.to.</p>
      <p>You can check out the full article about this project on <a href="https://dev.to/jamesrmoro/challenge-feed-real-time-programming-challenges-in-one-place-20bh" target="_blank">dev.to</a>.</p>
    </div>
  </div>
</div>


      {user && (
        <div
          className="updatedChallenges"
          onClick={updateJams}
        >
          {loading ? '⏳' : '🔄'}
        </div>
      )}
      {!user && showLogin && (
        <form className="loginForm" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
            required
            style={{ marginRight: 5 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
            required
            style={{ marginRight: 5 }}
          />
          <button type="submit">Login</button>
          {loginError && <span style={{ color: "red", marginLeft: 8 }}>{loginError}</span>}
        </form>
      )}
      {user && (
        <button onClick={handleLogout} style={{ position: "fixed", bottom: 62, right: 10, zIndex: "222" }}>Logout</button>
      )}


      {message && (
        <div
          style={{
            position: 'fixed',
            top: '55px',
            right: '10px',
            zIndex: 9999,
            backgroundColor: '#4CAF50',
            color: '#fff',
            padding: '0.4rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          {message}
        </div>
      )}

      <div id="top-header">
        <div id="logo">
          <h1 style={{fontSize: '19px', color: '#ffdc46'}}>Challenge Feed</h1>
        </div>
        <div id="message">
          <span>1</span>
          <img src="/assets/icons/message.svg" alt="Message" />
        </div>
      </div>

      <div className="demo-stories">
        <a
          href="#"
          className="demo-stories-saved"
          onClick={e => {
            e.preventDefault();
            setShowSavedModal(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            border: 'none',
            background: 'none',
            boxShadow: 'none',
            cursor: 'pointer'
          }}
        >
          {savedJams.length > 0 && (
            <span className="count-saved">{savedJams.length}</span>
          )}
          <span className="demo-stories-avatar" style={{
            width: 72,
            height: 72,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/assets/icons/bookmark-full.svg"
              alt="Saved"
              style={{ width: 26, height: 26 }}
            />
          </span>
          <span className="demo-stories-name">
            Saved
          </span>
        </a>
        {domains.map((domain) => (
          <a href="#" key={domain}>
            <span className="demo-stories-avatar">
              <img src={avatarCovers[domain] || fallbackAvatar} alt={domain} />
            </span>
            <span className="demo-stories-name">{domain.replace('.com', '')}</span>
          </a>
        ))}
      </div>

<div className="demo-posts">
  {visiblePosts.map(({ jam, domain, idx }) => {
    const isLiked = !!likedPosts[jam.url];
    const image = jam.image?.startsWith('//') ? 'https:' + jam.image : jam.image || '/assets/images/fallback.jpeg';
    const domainClass = getRootDomain(new URL(jam.url).hostname).replace(/\W/g, '-');
    const isSaved = savedJams.some(j => j.url === jam.url);
    return (
      <div className="demo-post" key={`${domain}-${idx}`}>
        <div
          className={`group-post domain-${domainClass}${activePost === `${domain}-${idx}` ? ' active' : ''}`}
          onMouseEnter={() => setActivePost(`${domain}-${idx}`)}
          onMouseLeave={() => setActivePost(null)}
        >
          <div className="demo-post-header">
            <div className="groupName">
              <a
                href={jam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="demo-post-avatar"
              >
                <img
                  src={avatarCovers[domain] || fallbackAvatar}
                  alt={domain}
                />
              </a>
              <div className="demo-post-name">
                <a
                  href={jam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-domain"
                >
                  {jam.title}
                </a>
              </div>
            </div>
            <button
              className="buttonLike"
              onClick={() => toggleLike(jam)}
              disabled={!!likeLoading[jam.url]}
              aria-label="Like"
            >
              <div
                className={`heart${isLiked ? ' is-active' : ''}`}
                style={{
                  pointerEvents: 'none',
                }}
              ></div>
              <span className="count-like">{likeCounts[jam.url] || 0}</span>
            </button>
          </div>
          <div className="wrapper-post">
            <div className="gridImage">
              <img
                src={image}
                alt={jam.title}
                className="postImage"
              />
              <div>
                <ul className="listDate">
                  {jam.contestStart && (
                    <li><span><strong>Start:</strong> {jam.contestStart}</span></li>
                  )}
                  {jam.submissionsDue && (
                    <li><span><strong>Submissions:</strong> {jam.submissionsDue}</span></li>
                  )}
                  {jam.winnersAnnounced && (
                    <li><span><strong>Winners:</strong> {jam.winnersAnnounced}</span></li>
                  )}
                </ul>
              </div>
            </div>
            <div>
              <div className="demo-post-content-text">
                <span>{getUntilLastDot(jam.description, 280 || '') || jam.title}</span>
                <div className="demo-post-footer-actions">
                  <div className="demo-post-footer-actions-left">
                    <button
                      className="share"
                      onClick={() => openShareModal(jam.url)}
                    ><img src="/assets/icons/send.svg" /></button>
                  </div>
                  <div className="buttonsShare">
                    <a
                      href={jam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-external"
                    >
                      <img src="/assets/icons/link-external.svg" />
                      <span>View challenge</span>
                    </a>
                    <a
                      href=""
                      className="link link-save"
                      onClick={e => {
                        e.preventDefault();
                        saveJam(jam);
                      }}
                    >
                      <img
                        src={isSaved
                          ? "/assets/icons/bookmark-full.svg"
                          : "/assets/icons/bookmark.svg"}
                        alt="Save"
                      />
                      <span>{isSaved ? "Saved challenge" : "Save challenge"}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })}

  {/* BOTÃO VER MAIS DESAFIOS */}
  {visibleCount < allPosts.length && (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <button
        className="button-view-more-purple"
        onClick={() =>
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allPosts.length))
        }
      >
        View more challenges
      </button>
    </div>
  )}


  {/* MENSAGEM QUANDO CARREGA TUDO */}
  {visibleCount >= allPosts.length && allPosts.length > 0 && (
    <div style={{ textAlign: 'center', padding: 16, color: '#888' }}>
      ✅ All challenges have been loaded!
    </div>
  )}
</div>

    {showScrollTop && (
      <button
        className="scroll-to-top"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 10000,
          background: 'linear-gradient(135deg, #ffd700, #7e57c2 80%)',
          color: '#222',
          border: 'none',
          borderRadius: '50%',
          width: 52,
          height: 52,
          boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          cursor: 'pointer',
          transition: 'background 0.22s'
        }}
      >
       <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M10 16V4M10 4L4 10M10 4l6 6" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>

      </button>
    )}



      {shareVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShareVisible(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '15px',
                fontSize: '1.4rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
              aria-label="Fechar"
            >
              ×
            </button>
            <h3 className="titleShare">Share</h3>
            <p className="textShare">Choose a network to share on:</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '7px', marginTop: '1rem' }}>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/telegram.svg" alt="Telegram" style={{ width: '36px' }} />
              </a>
              <a href={`mailto:?subject=Check this out&body=${encodeURIComponent(shareUrl)}`}>
                <img src="/assets/icons/email.svg" alt="Email" style={{ width: '36px' }} />
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  showCopyToast();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <img src="/assets/icons/link.svg" alt="Copy Link" style={{ width: '36px' }} />
                {showToast && (
                  <div style={{
                    position: 'absolute',
                    bottom: '95px',
                    left: '50%',
                    width: '250px',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#333',
                    color: '#fff',
                    padding: '0.75rem 1.5rem',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    fontSize: '0.95rem',
                    zIndex: 9999,
                    animation: 'fadeInOut 2s ease-in-out'
                  }}>
                    🔗 Link copied to clipboard!
                  </div>
                )}
              </button>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/facebook.svg" alt="Facebook" style={{ width: '36px' }} />
              </a>
              <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/x.svg" alt="Twitter/X" style={{ width: '36px' }} />
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/linkedin.svg" alt="LinkedIn" style={{ width: '36px' }} />
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                <img src="/assets/icons/whatsapp.svg" alt="WhatsApp" style={{ width: '36px' }} />
              </a>
            </div>
          </div>
        </div>
      )}

      {showSavedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            maxWidth: 400,
            width: '100%',
            padding: '2rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowSavedModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 15,
                background: 'transparent',
                border: 'none',
                fontSize: '1.6rem',
                cursor: 'pointer',
                color: '#888'
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="titleChallenge" style={{marginTop:0}}>
            <img src="/assets/icons/list.svg" alt="List" style={{ width: '28px' }} />
             Saved Challenges</h3>
            {savedJams.length === 0 && <div style={{color:'#888',padding:'1rem 0'}}>No challenge saved yet!</div>}
            <ul className="listChallenges">
              {savedJams.map((jam, idx) => {
                let domain = '';
                let domainClass = '';
                try {
                  const hostname = new URL(jam.url).hostname.replace(/^www\./, '');
                  domain = hostname.split('.').slice(-2).join('.');
                  domainClass = 'domain-' + domain.replace(/\./g, '-');
                } catch {
                  domain = '—';
                  domainClass = 'domain-unknown';
                }
                return (
                  <li key={jam.url}>
                    <a
                      href={jam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="listModal"
                    >
                    <div className="groupModal">
                      <img
                        alt={jam.title}
                        src={jam.image?.startsWith('//') ? 'https:' + jam.image : (jam.image || '/assets/images/fallback.jpeg')}
                        style={{objectFit:'cover'}}
                      />
                      <strong className="titleModal">{jam.title}</strong>
                      </div>
                      <ul className="listDate">
                          {jam.contestStart && (
                            <li><span><strong>Start:</strong> {jam.contestStart}</span></li>
                          )}
                          {jam.submissionsDue && (
                            <li><span><strong>Submissions:</strong> {jam.submissionsDue}</span></li>
                          )}
                          {jam.winnersAnnounced && (
                            <li><span><strong>Winners:</strong> {jam.winnersAnnounced}</span></li>
                          )}
                        </ul>
                      <span
                        className={`${domainClass} domain`}>
                      {domain}</span>
                    </a>
                    <button
                      onClick={() => saveJam(jam)}
                      style={{background:'none',border:'none',cursor:'pointer'}}
                      title="Remove"
                    >
                    <div className="trashContainer">
                      <div className="trash">
                        <div className="tap">
                         <div className="tip"></div>
                         <div className="top"></div>
                        </div>
                        <div className="tap2">
                          <div className="bottom">
                           <div className="line"></div>
                           <div className="line"></div>
                           <div className="line"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="stories-slider">
        <div className="swiper">
          <div className="swiper-wrapper">
            {domains.map((domain) => (
              <div className="swiper-slide" key={domain}>
                <div className="swiper">
                  <div className="swiper-wrapper">
                    {renderStoriesSlides(domain)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {chatVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="modalChat">
            <button
              onClick={() => setChatVisible(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                fontSize: '1.6rem',
                cursor: 'pointer',
                color: '#888'
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', marginBottom: '1rem' }}>
              Ask me about challenges
            </h2>
            <div className="listQuestions">
              {[
                "What jam is ending soon?",
                "Any AI hackathons?",
                "What's popular on itch.io?",
                "What's popular on dev.to?",
                "Upcoming game dev jams?",
                "Where can I join a team?",
                "Any game jams about simulation or RPGs?"
              ].map((q, idx) => (
                <button
                  className="buttonChat"
                  key={idx}
                  onClick={() => {
                    setChatInput(q);
                    setTimeout(() => document.querySelector('#chatInput')?.focus(), 100);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div id="scrollChat" style={{
              display: chatLog.length === 0 ? 'none' : 'block'
            }}>
              {chatLog.length === 0 && (
                <div style={{ color: '#666' }}>Start asking something about game jams.</div>
              )}
              {chatLog.map((entry, idx) => (
                <div id="messageChat" key={idx} style={{ marginBottom: '1rem' }}>
                  <div><strong style={{ color: '#0ff' }}>You:</strong> {entry.question}</div><strong style={{ color: '#ffdc46' }}>Bot Challenge Feed:</strong>
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                      )
                    }}
                  >
                    {entry.answer}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="chatInput"
                type="seed"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
                name="input-dont-autofill"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleChatSubmit(e);
                  }
                }}
                style={{
                  width: '80%',
                  padding: '10px',
                  borderRadius: '35px',
                  border: '1px solid #333',
                  background: '#222',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />

              <button
                type="submit"
                onClick={handleChatSubmit}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '10px',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                <img
                  src="/assets/icons/send.png"
                  alt="Send"
                  style={{
                    width: '45px',
                    position: 'relative',
                    top: '1px',
                    right: '-4px'
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
