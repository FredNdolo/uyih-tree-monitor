import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { token } = useAuth()

  return (
    <div className="space-y-16 pb-12">
      {/* Hero */}
      <section className="text-center pt-6 sm:pt-10">
        <p className="text-sm font-medium text-uyih-orange uppercase tracking-wide mb-3">
          Green Futures Initiative
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-uyih-green leading-tight max-w-3xl mx-auto">
          Youth building a sustainable future — tree by tree
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Umoja Youth Impact Hub monitors every tree from nursery to long-term survival.
          Field teams register, check in, and photograph trees so communities — and future
          carbon programs — can trust the data.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {token ? (
            <Link
              to="/dashboard"
              className="bg-uyih-green hover:bg-uyih-green-dark text-white px-6 py-3 rounded-lg font-medium"
            >
              Open dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-uyih-orange hover:bg-uyih-orange-light text-white px-6 py-3 rounded-lg font-medium"
            >
              Sign in to the app
            </Link>
          )}
          <a
            href="https://umoja-youth-impact-hub.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="border border-uyih-green text-uyih-green hover:bg-green-50 px-6 py-3 rounded-lg font-medium"
          >
            About UYIH
          </a>
        </div>
      </section>

      {/* What it does */}
      <section className="grid sm:grid-cols-3 gap-5">
        {[
          {
            title: 'Register',
            body: 'Each tree gets a unique QR code, GPS point, species, and plot link at planting.',
          },
          {
            title: 'Monitor',
            body: 'Field teams record health, height, photos, and location on every check-in — even with imperfect connectivity planned for offline later.',
          },
          {
            title: 'Evidence',
            body: 'One dataset supports internal M&E, donor updates, and audit-ready history for carbon readiness.',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-uyih-green">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.body}</p>
          </div>
        ))}
      </section>

      {/* Who it's for */}
      <section className="bg-white border rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-uyih-slate text-center mb-8">
          Built for the people doing the work
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          {[
            {
              role: 'Field teams',
              desc: 'Girl Guides, volunteers, and coordinators register trees and run check-ins.',
            },
            {
              role: 'UYIH admin / M&E',
              desc: 'Manage schools, plots, nurseries, users, and see survival at a glance.',
            },
            {
              role: 'Donors & sponsors',
              desc: 'Follow growth stories — carbon claims only after real issuance.',
            },
            {
              role: 'Future auditors',
              desc: 'Same records, structured for Plan Vivo / Verra / NEMA pathways.',
            },
          ].map((item) => (
            <div key={item.role}>
              <h3 className="font-semibold text-uyih-green">{item.role}</h3>
              <p className="mt-1 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <h2 className="text-2xl font-bold text-uyih-slate text-center mb-6">
          From nursery to long-term care
        </h2>
        <ol className="max-w-xl mx-auto space-y-3 text-sm text-slate-700">
          {[
            'Nurseries & seed batches tracked per school',
            'Baselines designed to lock before planting (additionality)',
            'Planting with QR + GPS + species',
            'Recurring check-ins with photos and measurements',
            'Dashboard stats for survival and activity',
          ].map((step, i) => (
            <li key={step} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-uyih-green text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Carbon note */}
      <section className="bg-green-50 border border-green-100 rounded-2xl p-6 sm:p-8 text-center max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold text-uyih-green">
          Carbon credits as a framework, not a claim today
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Certification (Plan Vivo and/or Verra, plus Kenya’s NEMA/DNA path) is a multi-year
          goal. Day-to-day data is collected so it can double as audit evidence later —
          without greenwashing. Eventual credit revenue is earmarked mainly for community
          benefits such as sanitary products for girls at partner schools.
        </p>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-uyih-slate">Ready to monitor trees?</h2>
        <p className="text-slate-600 mt-2 text-sm">
          Sign in with Google to access the field and admin tools.
        </p>
        <div className="mt-5">
          {token ? (
            <Link
              to="/dashboard"
              className="inline-block bg-uyih-green hover:bg-uyih-green-dark text-white px-6 py-3 rounded-lg font-medium"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-block bg-uyih-orange hover:bg-uyih-orange-light text-white px-6 py-3 rounded-lg font-medium"
            >
              Sign in with Google
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}