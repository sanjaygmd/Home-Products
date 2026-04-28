import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id='contact' className="bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Home Products
          </h2>
          <p className="text-sm leading-6 text-gray-400">
            Modern shopping experience with quality products, fast delivery,
            and trusted service.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Quick Links
          </h3>

          <ul className="space-y-3 text-sm">
            <li><a href="/#shop" className="hover:text-white cursor-pointer transition">Shop</a></li>
            <li><a href="/#about" className="hover:text-white cursor-pointer transition">About Us</a></li>
            <li><a href="#contact" className="hover:text-white cursor-pointer transition">Contact</a></li>
            <li><Link to="/terms" className="hover:text-white cursor-pointer transition">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-white cursor-pointer transition">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Contact
          </h3>

          <div className="space-y-3 text-sm text-gray-400">
            <p>No. 000, Kerala, India</p>
            <p>+91 12345 67890</p>
            <p>sanjay@gmail.com</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Follow Us
          </h3>

          <div className="flex flex-col gap-3 text-sm">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition cursor-pointer">
              Instagram
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition cursor-pointer">
              Facebook
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition cursor-pointer">
              Twitter / X
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-white transition cursor-pointer">
              YouTube
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Home Products. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;