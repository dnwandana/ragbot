/* RAGBot landing — interactions: nav state, reveals, hero chat animation, dark mode */
;(function () {
  "use strict"

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  /* ── Nav: add shadow/blur once scrolled ── */
  const nav = document.getElementById("nav")
  const onScroll = () => {
    if (!nav) return
    nav.classList.toggle("scrolled", window.scrollY > 8)
  }
  onScroll()
  window.addEventListener("scroll", onScroll, { passive: true })

  /* ── Reveal on load + scroll ── */
  const reveals = Array.from(document.querySelectorAll(".reveal"))
  if (prefersReduced) {
    reveals.forEach((el) => el.classList.add("shown"))
  } else {
    // Every reveal (hero included) shows as it enters the viewport. The
    // IntersectionObserver fires only once the page is actually laid out and
    // painted, so the entrance transition never stalls the way a load-time
    // requestAnimationFrame can when the document isn't being rendered yet.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("shown")
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    )
    reveals.forEach((el) => io.observe(el))
    // Safety net: if anything in the initial viewport hasn't revealed shortly
    // after load (e.g. an observer hiccup), force it visible so content is
    // never stuck hidden.
    window.addEventListener("load", () => {
      setTimeout(() => {
        reveals.forEach((el) => {
          const r = el.getBoundingClientRect()
          if (r.top < window.innerHeight && !el.classList.contains("shown")) {
            el.classList.add("shown")
          }
        })
      }, 1400)
    })
  }

  /* ── Hero chat animation ── */
  const CONVERSATIONS = [
    {
      question: "What's the cancellation policy?",
      answer:
        "You can cancel any time before your renewal date for a full refund — no fees, no questions asked. After it renews, you're covered through the end of the current term.",
      doc: "Tenant handbook.pdf",
      sub: "Tenant handbook · 1 collection",
    },
    {
      question: "How many vacation days do I get in year one?",
      answer:
        "New employees receive 15 days of paid vacation in their first year, accrued monthly. An extra 5 days are granted automatically on your one-year anniversary.",
      doc: "Employee handbook.pdf",
      sub: "Employee handbook · 1 collection",
    },
    {
      question: "What's the maximum file upload size?",
      answer:
        "Individual file uploads are capped at 50 MB. For larger documents, use the bulk import tool — it supports ZIP archives up to 500 MB.",
      doc: "API Reference.pdf",
      sub: "API Reference · 1 collection",
    },
    {
      question: "When does the NDA expire?",
      answer:
        "The mutual NDA expires on March 15, 2027 — three years from the effective date. Either party may renew with 30 days written notice before expiry.",
      doc: "NDA Agreement.pdf",
      sub: "NDA Agreement · 1 collection",
    },
    {
      question: "What's the Q3 revenue target?",
      answer:
        "The Q3 revenue target is $4.2M, representing a 22% increase over Q2. The board approved this figure at the July planning session.",
      doc: "Q3 Planning Deck.pdf",
      sub: "Q3 Planning Deck · 1 collection",
    },
  ]

  let convIndex = 0

  const qText = document.getElementById("q-text")
  const qCaret = document.getElementById("q-caret")
  const aText = document.getElementById("a-text")
  const mUser = document.getElementById("m-user")
  const mSearch = document.getElementById("m-search")
  const mBot = document.getElementById("m-bot")
  const srcPill = document.getElementById("src-pill")
  const srcText = document.getElementById("src-text")
  const citeIdx = document.getElementById("cite-idx")
  const chatSub = document.getElementById("chat-sub")
  const searchLabel = document.getElementById("search-label")

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  function resetChat() {
    qText.textContent = ""
    aText.textContent = ""
    qCaret.style.display = "inline-block"
    ;[mUser, mSearch, mBot].forEach((m) => m && m.classList.remove("in"))
    srcPill.classList.remove("in")
    if (citeIdx) citeIdx.classList.remove("in")
  }

  function showFinalState() {
    const conv = CONVERSATIONS[0]
    if (chatSub) chatSub.textContent = conv.sub
    if (srcText) srcText.textContent = conv.doc
    qText.textContent = conv.question
    qCaret.style.display = "none"
    aText.textContent = conv.answer
    ;[mUser, mBot].forEach((m) => m && m.classList.add("in"))
    if (mSearch) mSearch.style.display = "none"
    srcPill.classList.add("in")
    if (citeIdx) citeIdx.classList.add("in")
  }

  async function typeInto(el, text, perChar) {
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i]
      // vary cadence a touch so it feels human
      const jitter = text[i] === " " ? perChar * 0.4 : perChar * (0.7 + Math.random() * 0.7)
      await sleep(jitter)
    }
  }

  async function streamWords(el, text, perWord) {
    const words = text.split(" ")
    for (let i = 0; i < words.length; i++) {
      el.textContent += (i === 0 ? "" : " ") + words[i]
      await sleep(perWord * (0.7 + Math.random() * 0.6))
    }
  }

  async function runChat() {
    const conv = CONVERSATIONS[convIndex]
    convIndex = (convIndex + 1) % CONVERSATIONS.length

    resetChat()
    if (chatSub) chatSub.textContent = conv.sub
    if (srcText) srcText.textContent = conv.doc
    await sleep(500)
    // 1. user types question
    mUser.classList.add("in")
    await sleep(400)
    await typeInto(qText, conv.question, 46)
    qCaret.style.display = "none"
    await sleep(400)
    // 2. searching
    if (mSearch) {
      mSearch.style.display = ""
      mSearch.classList.add("in")
    }
    if (searchLabel) searchLabel.textContent = "Searching your documents…"
    await sleep(1300)
    if (searchLabel) searchLabel.textContent = `Reading ${conv.doc}…`
    await sleep(1100)
    // 3. answer streams in
    if (mSearch) mSearch.classList.remove("in")
    await sleep(200)
    if (mSearch) mSearch.style.display = "none"
    mBot.classList.add("in")
    await sleep(250)
    await streamWords(aText, conv.answer, 95)
    // 4. source pill + citation land together
    await sleep(450)
    srcPill.classList.add("in")
    if (citeIdx) citeIdx.classList.add("in")
    // hold, then advance to next conversation
    await sleep(5500)
    scheduleNext()
  }

  // Advance to the next conversation, but pause while the tab is hidden so we
  // don't burn timers/DOM writes in the background. Resume once on return.
  function scheduleNext() {
    if (!document.hidden) {
      runChat()
      return
    }
    document.addEventListener("visibilitychange", function resume() {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", resume)
        runChat()
      }
    })
  }

  // Kick off the chat once the hero is in view (or immediately).
  if (qText) {
    if (prefersReduced) {
      showFinalState()
    } else {
      const chat = document.getElementById("chat")
      const startWhenVisible = () => {
        const obs = new IntersectionObserver(
          (entries, o) => {
            if (entries[0].isIntersecting) {
              o.disconnect()
              setTimeout(runChat, 700)
            }
          },
          { threshold: 0.3 },
        )
        if (chat) obs.observe(chat)
      }
      startWhenVisible()
    }
  }

  /* ── Dark mode toggle ── */
  function initTheme() {
    var btn = document.getElementById("theme-toggle")
    if (!btn) return
    var html = document.documentElement

    function apply(t) {
      html.setAttribute("data-theme", t)
      localStorage.setItem("theme", t)
      btn.setAttribute("title", t === "dark" ? "Light mode" : "Dark mode")
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode")
    }

    apply(html.getAttribute("data-theme") || "light")

    btn.addEventListener("click", function () {
      apply(html.getAttribute("data-theme") === "dark" ? "light" : "dark")
    })
  }
  initTheme()
})()
