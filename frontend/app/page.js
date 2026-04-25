"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function SmartSeasonLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Head>
        <title>SmartSeason | Agricultural Operations Consulting Platform</title>
        <meta
          name="description"
          content="SmartSeason helps agricultural organizations improve field visibility, reduce operational risk, and make informed seasonal decisions."
        />
      </Head>

      {/* NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled
            ? "bg-white border-b border-slate-200"
            : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-700 text-white flex items-center justify-center font-bold">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">SmartSeason</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#approach" className="text-slate-600 hover:text-slate-900">Approach</a>
            <a href="#services" className="text-slate-600 hover:text-slate-900">Capabilities</a>
            <a href="#clients" className="text-slate-600 hover:text-slate-900">Clients</a>
            <Link
              href="/auth"
              className="ml-4 px-5 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Request Demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-28">
        {/* HERO */}
        <section className="bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-28 grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h1 className="text-5xl font-semibold leading-tight mb-6">
                Operational clarity for
                <span className="block">modern agricultural organizations</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mb-10">
                SmartSeason supports agribusinesses with structured field oversight, consistent reporting, and early risk visibility — enabling confident seasonal decisions.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/auth"
                  className="px-8 py-4 bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                >
                  Request a Demo
                </Link>
                <a
                  href="#approach"
                  className="px-8 py-4 border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Our Approach
                </a>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-slate-200 bg-white">
              <div className="px-5 py-3 border-b border-slate-200 text-sm font-medium">
                Field Operations Overview
              </div>
              <div className="p-6 space-y-4">
                {["North Farm", "East Valley", "South Plains"].map((name, i) => (
                  <div
                    key={name}
                    className="flex justify-between items-center p-4 border border-slate-200"
                  >
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-slate-500">Growth stage: In progress</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium ${
                        i === 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {i === 1 ? "Attention required" : "On track"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* APPROACH */}
        <section id="approach" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-semibold mb-6">Our approach</h2>
            <p className="text-slate-600 leading-relaxed">
              SmartSeason is designed around operational discipline. We help organizations replace fragmented reporting with a single source of truth — ensuring field activity, crop progress, and emerging risks are visible and actionable.
            </p>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section id="services" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-semibold mb-16">Core capabilities</h2>
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <h3 className="font-semibold mb-3">Field Oversight</h3>
                <p className="text-slate-600">
                  Maintain consistent visibility across all active fields, teams, and crop cycles.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Structured Reporting</h3>
                <p className="text-slate-600">
                  Standardize updates from field agents to support accurate, timely decision-making.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Risk Identification</h3>
                <p className="text-slate-600">
                  Identify stalled or delayed fields early, before they impact yield or timelines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CLIENTS */}
        <section id="clients" className="py-24 bg-white border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-semibold mb-6">Who we work with</h2>
            <p className="text-slate-600">
              SmartSeason supports agricultural enterprises, cooperatives, and production-focused organizations seeking improved operational control and seasonal predictability.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-semibold mb-6">Bring structure to your field operations</h2>
            <p className="text-slate-300 mb-10">
              Request a demonstration to see how SmartSeason supports operational clarity across the growing season.
            </p>
            <Link
              href="/auth"
              className="inline-block px-10 py-4 bg-emerald-700 hover:bg-emerald-800 font-medium"
            >
              Request Demo
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-slate-500">
          <span>© {new Date().getFullYear()} SmartSeason</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-700">Privacy</a>
            <a href="#" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
