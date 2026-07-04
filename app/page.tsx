import Spline from '@splinetool/react-spline/next'
import Link from 'next/link'

const features = [
  {
    icon: 'ti ti-bolt',
    title: 'Instant Setup',
    desc: 'Configure your Daraja API keys and start accepting payments in minutes. No complicated integrations.',
  },
  {
    icon: 'ti ti-chart-bar',
    title: 'Real-time Dashboard',
    desc: 'Track every transaction live with detailed analytics, filtering, and export tools.',
  },
  {
    icon: 'ti ti-shield-check',
    title: 'Secure by Default',
    desc: 'End-to-end encrypted payments with automatic callback processing and fraud detection.',
  },
  {
    icon: 'ti ti-code',
    title: 'Simple Integration',
    desc: 'Copy-paste code snippets for React, Vue, HTML, and more. Works with any platform.',
  },
  {
    icon: 'ti ti-users',
    title: 'Multi-tenant',
    desc: 'Manage multiple merchants from a single dashboard. Each with their own API keys.',
  },
  {
    icon: 'ti ti-clock',
    title: '24/7 Processing',
    desc: 'Automatic STK Push processing with retry logic and instant callback handling.',
  },
]

export default function Home() {
  return (
    <>
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <Spline
            scene="https://prod.spline.design/ViEujE9cXet3BkC5/scene.splinecode"
            className="h-full w-full"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(to bottom, var(--bg) 0%, transparent 25%, transparent 60%, var(--bg) 100%),' +
              'linear-gradient(to right, var(--bg) 0%, transparent 40%, var(--bg) 100%)',
          }}
        />

        <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-up max-w-3xl">
            <div
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
              M-PESA STK Push Payment Gateway
            </div>

            <h1
              className="mb-4 text-5xl font-bold tracking-tight md:text-7xl"
              style={{ color: 'var(--text-1)' }}
            >
              Accept M-PESA Payments{' '}
              <span style={{ color: 'var(--accent)' }}>Instantly</span>
            </h1>

            <p
              className="mx-auto mb-10 max-w-xl text-lg leading-relaxed"
              style={{ color: 'var(--text-2)' }}
            >
              The modern payment gateway for African businesses. Integrate STK
              Push in minutes and start accepting payments from millions of
              M-PESA users.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/auth"
                className="btn-apple inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-btn-text)',
                }}
              >
                Get Started
                <i className="ti ti-arrow-right text-base" />
              </Link>
              <Link
                href="/dashboard"
                className="btn-apple inline-flex h-12 items-center gap-2 rounded-xl border px-6 text-sm font-semibold"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-1)',
                }}
              >
                Dashboard
                <i className="ti ti-layout-dashboard text-base" />
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 animate-bounce">
          <i
            className="ti ti-chevron-down text-2xl"
            style={{ color: 'var(--text-3)' }}
          />
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2
              className="mb-4 text-3xl font-bold md:text-4xl"
              style={{ color: 'var(--text-1)' }}
            >
              Everything you need to accept payments
            </h2>
            <p
              className="mx-auto max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              From setup to settlement, we provide all the tools to start
              accepting M-PESA payments on your platform.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="animate-fade-up rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'var(--sidebar)',
                  borderColor: 'var(--border)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-xl"
                  style={{
                    background: 'var(--accent)15',
                    color: 'var(--accent)',
                  }}
                >
                  <i className={f.icon} />
                </div>
                <h3
                  className="mb-2 text-lg font-semibold"
                  style={{ color: 'var(--text-1)' }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-2)' }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:pb-32">
        <div
          className="mx-auto max-w-4xl rounded-2xl border p-12 text-center md:p-20"
          style={{
            background: 'var(--sidebar)',
            borderColor: 'var(--border)',
          }}
        >
          <h2
            className="mb-4 text-3xl font-bold md:text-4xl"
            style={{ color: 'var(--text-1)' }}
          >
            Ready to get started?
          </h2>
          <p
            className="mx-auto mb-8 max-w-lg"
            style={{ color: 'var(--text-2)' }}
          >
            Create your account in minutes and start accepting M-PESA payments
            today. No credit card required.
          </p>
          <Link
            href="/auth"
            className="btn-apple inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-btn-text)',
            }}
          >
            Create your account
            <i className="ti ti-arrow-right text-base" />
          </Link>
        </div>
      </section>

      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            Mash Payments
          </span>
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>
            &copy; {new Date().getFullYear()} Mash Payments
          </span>
        </div>
      </footer>
    </>
  )
}
