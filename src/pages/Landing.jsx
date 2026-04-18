import { Link } from 'react-router-dom'
import {
  Camera, ClipboardCheck, FileText, AlertTriangle, ChevronDown,
  Check, CheckCircle2, Phone, Mail, MapPin, Car, Shield,
  ShieldCheck, Image, Clock, ScanLine, Workflow,
} from 'lucide-react'

const airports = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland', 'Wellington', 'Christchurch', 'Adelaide']

const features = [
  { Icon: Camera, title: 'Before & After Photos', body: 'Capture vehicle condition before and after cleaning. Timestamped, geotagged, and stored securely in the cloud.' },
  { Icon: Shield, title: 'Damage Protection', body: 'Photographic evidence of pre-existing damage protects your team against false claims from customers.' },
  { Icon: ScanLine, title: 'Vehicle ID Scanning', body: 'Scan registration plates or barcodes to instantly link photos to the correct vehicle record.' },
  { Icon: ClipboardCheck, title: 'Inspection Checklists', body: 'Guided walkaround checklists ensure every angle is captured — front, rear, sides, and interior.' },
  { Icon: FileText, title: 'Automated Reports', body: 'Daily and weekly reports generated automatically with full photo evidence for airport management.' },
  { Icon: AlertTriangle, title: 'Damage Flagging', body: 'Flag and document pre-existing damage instantly. Create a timestamped record for disputes.' },
]

const values = [
  { Icon: ShieldCheck, title: 'Protect Against Claims', body: 'Customer says you scratched their car? You have timestamped before-photos proving the damage was already there.' },
  { Icon: Clock, title: '15 Minute Training', body: 'Workers scan, snap, and go. The app guides them through every step. No manuals, no confusion.' },
  { Icon: FileText, title: 'Automatic Reports', body: 'Every vehicle documented. Daily reports generated automatically with full photo evidence for airport management.' },
]

const steps = [
  { n: '01', Icon: Car, title: 'Vehicle Arrives', body: 'Car arrives at the cleaning station. Worker scans the registration plate.' },
  { n: '02', Icon: Camera, title: 'Before Photos', body: 'Guided checklist prompts photos of every angle. Pre-existing damage is flagged.' },
  { n: '03', Icon: Workflow, title: 'Clean & Inspect', body: 'Complete the clean. App tracks the job and time spent on each vehicle.' },
  { n: '04', Icon: Image, title: 'After Photos', body: 'Capture after photos. Full before/after comparison stored with the vehicle record.' },
]

const checklist = [
  { t: 'Front bumper — no damage', d: true },
  { t: 'Driver side panels', d: true },
  { t: 'Rear bumper check', d: false },
  { t: 'Interior dashboard', d: false },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ────────── NAV ────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400">
              <Car size={16} className="text-black" />
            </div>
            <span className="text-sm font-bold tracking-wide text-white">CPC Services</span>
          </div>
          <Link
            to="/login"
            className="rounded-lg bg-brand-400 px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-300"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ────────── HERO ────────── */}
      <section className="bg-black px-6 pb-28 pt-44">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-12 text-[11px] font-bold uppercase tracking-[0.35em] text-brand-400">
            CPC Services Pty Ltd.
          </p>

          <h1 className="text-[clamp(40px,6vw,72px)] font-extrabold leading-none tracking-tight text-white">
            Vehicle Cleaning
          </h1>
          <h1 className="mb-12 text-[clamp(40px,6vw,72px)] font-extrabold leading-none tracking-tight text-brand-400">
            Documentation
          </h1>

          <p className="mx-auto mb-14 max-w-[520px] text-xl font-light leading-relaxed text-white/35">
            Capture every vehicle before and after cleaning. Protect your team against false damage claims with timestamped photo evidence.
          </p>

          <a href="#platform" className="inline-flex items-center gap-2 text-sm font-medium text-brand-400/70 transition-colors hover:text-brand-400">
            See How It Works <ChevronDown size={16} />
          </a>
        </div>

        {/* Phone Mockup */}
        <div className="mx-auto mt-20 max-w-[270px]">
          <div className="rounded-[40px] border border-white/5 bg-[#111] p-2.5">
            <div className="overflow-hidden rounded-[32px] bg-[#0a0a0a] px-5 pb-6 pt-5">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400">
                  <Car size={15} className="text-black" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">CPC Capture</p>
                  <p className="text-[10px] text-white/25">Sydney Airport</p>
                </div>
              </div>

              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">Current Vehicle</p>
              <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">ABC-123</p>
                    <p className="mt-1 text-[11px] text-white/20">Toyota Camry — Bay 7</p>
                  </div>
                  <CheckCircle2 size={18} className="text-brand-400" />
                </div>
              </div>

              <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">Inspection</p>
              {checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-white/[0.03] py-2">
                  <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] ${
                    c.d ? 'bg-brand-400' : 'border-2 border-white/10 bg-transparent'
                  }`}>
                    {c.d && <Check size={11} className="text-black" strokeWidth={3} />}
                  </div>
                  <span className={`text-xs ${c.d ? 'text-white/25 line-through' : 'text-white/60'}`}>{c.t}</span>
                </div>
              ))}

              <div className="mt-5 flex items-center justify-center gap-2 rounded-[14px] bg-brand-400 py-3.5">
                <Camera size={15} className="text-black" />
                <span className="text-[13px] font-bold text-black">Capture Photo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── AIRPORTS ────────── */}
      <section className="px-6 py-28">
        <p className="mb-12 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">
          Airports We Service
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {airports.map(city => (
            <div key={city} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-6 py-3">
              <MapPin size={14} className="text-brand-400" />
              <span className="text-[15px] font-semibold text-slate-900">{city}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ────────── WHY IT MATTERS ────────── */}
      <section className="bg-black px-6 py-28">
        <div className="mx-auto grid max-w-[1100px] gap-16 sm:grid-cols-3">
          {values.map(({ Icon, title, body }) => (
            <div key={title} className="text-center">
              <Icon size={36} className="mx-auto mb-8 text-brand-400" strokeWidth={1.5} />
              <h3 className="mb-5 text-xl font-bold text-white">{title}</h3>
              <p className="text-base leading-relaxed text-white/35">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────── PLATFORM ────────── */}
      <section id="platform" className="scroll-mt-2 bg-slate-50 px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-20 max-w-[640px] text-center">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-600">Platform</p>
            <h2 className="mb-6 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Everything you need to document vehicle cleaning
            </h2>
            <p className="text-lg leading-relaxed text-slate-400">
              Built for cleaning station workers on mobile and tablets. Set up at your booth and start capturing.
            </p>
          </div>

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-10">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-[14px] border border-brand-100 bg-brand-50">
                  <Icon size={24} className="text-brand-600" />
                </div>
                <h3 className="mb-4 text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-[15px] leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── PROCESS ────────── */}
      <section className="bg-white px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-20 max-w-[640px] text-center">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-600">Process</p>
            <h2 className="mb-6 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Scan. Snap. Clean. Done.
            </h2>
            <p className="text-lg leading-relaxed text-slate-400">
              Four steps per vehicle. Workers follow the app. Everything is documented automatically.
            </p>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ n, Icon, title, body }) => (
              <div key={n} className="text-center">
                <span className="mb-7 block font-mono text-7xl font-extrabold leading-none text-brand-400/15">{n}</span>
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[14px] bg-black">
                  <Icon size={24} className="text-brand-400" />
                </div>
                <h3 className="mb-4 text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-[15px] leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── CTA ────────── */}
      <section className="bg-black px-6 py-28">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to protect your team?
          </h2>
          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-white/35">
            Start documenting every vehicle in minutes. No complex setup required.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-8 py-3.5 text-sm font-bold text-black transition-colors hover:bg-brand-300"
          >
            <Camera size={18} />
            Get Started
          </Link>
        </div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <footer className="bg-black px-6 py-20">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-10">
          <div className="max-w-[360px]">
            <p className="mb-4 text-sm font-bold text-brand-400">CPC Services Pty Ltd.</p>
            <p className="mb-5 text-sm leading-relaxed text-white/25">
              Vehicle cleaning documentation platform for airport contracts across Australia and New Zealand.
            </p>
            <p className="text-xs text-white/[0.12]">ABN 64 654 435 962</p>
            <p className="text-xs text-white/[0.12]">Headquarters: Victoria, Melbourne</p>
          </div>
          <div className="flex flex-col gap-3.5">
            {[
              { icon: Phone, text: 'AU: +61 2 8000 0000' },
              { icon: Phone, text: 'NZ: +64 9 000 0000' },
              { icon: Mail, text: 'info@cpcservicesptyltd.com.au' },
            ].map(({ icon: Ic, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/30">
                <Ic size={14} className="text-white/15" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-[1200px] border-t border-white/5 pt-8 text-center">
          <p className="text-[11px] tracking-wide text-white/[0.12]">
            &copy; 2026 CPC Services Pty Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
