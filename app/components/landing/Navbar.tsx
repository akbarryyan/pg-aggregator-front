"use client";

import { useState } from "react";
import Link from "next/link";
import Container from "./Container";

const navItems = [
  { label: "Beranda", href: "#", active: true },
  { label: "Produk", href: "#" },
  { label: "Harga", href: "#" },
  { label: "News", href: "#" },
  { label: "Bantuan", href: "#" },
];

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="text-2xl font-bold lowercase italic tracking-tight text-white">
          whuzpay
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`relative pb-1 text-sm font-medium transition-colors ${
                item.active
                  ? "text-brand-yellow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {item.label}
              {item.active && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-brand-yellow" />
              )}
            </a>
          ))}
        </nav>

        <a
          href="#"
          className="hidden items-center gap-2 text-sm font-medium text-white/90 hover:text-white lg:flex"
        >
          Login
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <UserIcon />
          </span>
        </a>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </Container>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-brand-navy-dark px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm font-medium ${
                  item.active ? "text-brand-yellow" : "text-white/80"
                }`}
              >
                {item.label}
              </a>
            ))}
            <a href="#" className="text-sm font-medium text-white/90">
              Login
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
