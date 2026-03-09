'use client';

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Mail,
} from "lucide-react";
import Image from "next/image";

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-b from-[#0b0a2a] to-[#09081f] text-white">
      <div className="absolute inset-0 flex justify-center pointer-events-none">
        <div className="relative w-90 h-60">
          {/* Top blob */}
          {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-30 rounded-full bg-[#2f3b2b] opacity-30" /> */}

          {/* Bottom blob */}
          {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-60 h-30 rounded-full bg-[#2f3b2b] opacity-30" /> */}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div>
            <h2 className="text-3xl font-semibold mb-3">
              Join PartyFud for Business?
            </h2>
            <p className="text-gray-400 max-w-xl">
              Take your catering business to the next level—get discovered,
              get booked, and watch your customer base grow.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="bg-[#1ee87a] text-black font-medium px-6 py-3 rounded-full hover:opacity-90 transition"
          >
            Partner with Us
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-2 mb-4">
            <Image src="/logo_partyfud_light.svg" alt="PartyFud Logo" width={120} height={120} />
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            Partyfud.com <br />
            A platform part of D2 Digital LLC
          </p>
          <p className="text-gray-400 text-xs">
            Your trusted partner for premium catering services in Dubai and across UAE.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
          <ul className="space-y-3 text-gray-400 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/caterers" className="hover:text-white transition-colors">
                Caterers
              </Link>
            </li>
            <li>
              <Link
                href="/onboarding"
                className="hover:text-white transition-colors"
              >
                Partner with Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Company</h4>
          <ul className="space-y-3 text-gray-400 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/caterers" className="hover:text-white transition-colors">
                Our Caterers
              </Link>
            </li>
            <li>
              <Link href="/signup?type=caterer" className="hover:text-white transition-colors">
                Become a Partner
              </Link>
            </li>
            <li>
              <Link href="/login?role=admin" className="hover:text-white transition-colors">
                Admin Login
              </Link>
            </li>
            <li>
              <Link href="/login?role=caterer" className="hover:text-white transition-colors">
                Caterer Login
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </li>
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Contact Us</h4>
          <ul className="space-y-4 text-gray-400 text-sm">
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-[#1ee87a]" />
              <a href="tel:+971501234567" className="hover:text-white transition-colors">
                +971 50 123 4567
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-[#1ee87a]" />
              <a href="mailto:info@partyfud.ae" className="hover:text-white transition-colors">
                info@partyfud.ae
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} className="text-[#1ee87a] mt-1 flex-shrink-0" />
              <span>
                Dubai Marina, Dubai<br />
                United Arab Emirates
              </span>
            </li>
          </ul>

          {/* Social Icons */}
          <div className="flex gap-4 mt-6">
            <a
              href="https://facebook.com/partyfud"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition hover:text-[#1ee87a]"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://instagram.com/partyfud"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition hover:text-[#1ee87a]"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://youtube.com/partyfud"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition hover:text-[#1ee87a]"
            >
              <Youtube size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-px bg-white/10" />
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm gap-3">
        <span>© 2025 PartyFud. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Use
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

// export default Footer;