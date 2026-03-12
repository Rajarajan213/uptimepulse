# UptimePulse 🟢

> Real-time website uptime monitoring with AI-powered features, gamification, and instant alerts.

[![Status](https://uptimepulse-rd95.vercel.app/api/badge/bd9775da-38c1-4c41-b396-ea1f6a7e19aa)](https://uptimepulse-rd95.vercel.app/dashboard/monitor/bd9775da-38c1-4c41-b396-ea1f6a7e19aa)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://uptimepulse-rd95.vercel.app)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?logo=nextdotjs)](https://nextjs.org)

---

## 🌐 Live App

**[https://uptimepulse-rd95.vercel.app](https://uptimepulse-rd95.vercel.app)**

---

## ✨ Features

- 📡 **Website Monitoring** — Checks every 60 seconds, alerts you instantly when something goes down
- 🎮 **Reliability Game** — Earn XP, ranks (🪵Bronze → 👑Legendary), streaks, achievements & boss battles
- 🤖 **AI Self-Healing** — Auto-detects failures and triggers fixes (cache purge, DNS failover)
- 🧬 **Digital Twin** — Live architectural map of your infrastructure
- 👥 **Real User Monitoring** — Track Core Web Vitals and user experience
- ⚠️ **AI Risk Score** — Unified health grade (0–100) based on volatility & trends
- 🗺️ **Failure Propagation Map** — See the blast radius of any outage

---

## 🚀 Getting Started (Local Dev)

```bash
# Install dependencies
npm install

# Add environment variables
cp .env.local.example .env.local
# Fill in your Supabase URL + keys

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + Auth) |
| Styling | Vanilla CSS + Glassmorphism |
| Deployment | Vercel |
| Monitoring | Custom cron + heartbeat system |

---

## 📡 Status Badge

Embed the live status badge on your website or README:

```markdown
[![Status](https://uptimepulse-rd95.vercel.app/api/badge/bd9775da-38c1-4c41-b396-ea1f6a7e19aa)](https://uptimepulse-rd95.vercel.app/dashboard/monitor/bd9775da-38c1-4c41-b396-ea1f6a7e19aa)
```

---

## 📄 License

MIT © 2026 UptimePulse
