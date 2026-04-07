import React from "react";
import { Award, Sun, Moon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext.jsx";

export const Footer = ({
  brandName = "Fathom",
  brandDescription = "Explainable Mentor Evaluation System",
  socialLinks = [],
  navLinks = [],
  creatorName,
  creatorUrl,
  brandIcon,
  className,
}) => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <section className={cn("relative w-full mt-0 overflow-hidden", className)}>
      <footer className="bg-transparent mt-20 relative transition-colors duration-300">
        <div className="max-w-7xl flex flex-col justify-between mx-auto min-h-[20rem] sm:min-h-[22rem] md:min-h-[25rem] relative p-4 py-10">
          
          {/* Main Content */}
          <div className="flex flex-col mb-8 sm:mb-12 md:mb-0 w-full">
            <div className="w-full flex flex-col items-center">
              <div className="space-y-2 flex flex-col items-center flex-1">
                <div className="flex items-center gap-2">
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold text-center w-full max-w-sm sm:w-96 px-4 sm:px-0 transition-colors duration-300 text-sm">
                  {brandDescription}
                </p>
              </div>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="flex mb-6 mt-3 gap-4">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-300"
                      target={link.href.startsWith('/') ? "_self" : "_blank"}
                      rel={link.href.startsWith('/') ? "" : "noopener noreferrer"}
                    >
                      <div className="w-5 h-5 hover:scale-110 duration-300">
                        {link.icon}
                      </div>
                      <span className="sr-only">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Navigation Links */}
              {navLinks.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400 max-w-full px-4 transition-colors duration-300">
                  {navLinks.map((link, index) => (
                    <a
                      key={index}
                      className="hover:text-black dark:hover:text-white duration-300 hover:font-semibold"
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Copyright & Creator */}
          <div className="mt-12 md:mt-16 flex flex-col gap-2 md:gap-1 items-center justify-center md:flex-row md:items-center md:justify-between px-4 md:px-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left transition-colors duration-300">
              ©{new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            {creatorName && creatorUrl && (
              <nav className="flex items-center gap-4">
                <a
                  href={creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-300 hover:font-medium"
                >
                  Crafted by {creatorName}
                </a>

                {/* Theme Toggle Button */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full transition-all shadow-md ml-4 ${darkMode
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-black/5 text-gray-900 hover:bg-black/10'
                    }`}
                  aria-label="Toggle Theme"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </nav>
            )}
          </div>
        </div>
        
        <div 
          className="bg-gradient-to-b from-black/20 via-black/10 dark:from-white/20 dark:via-white/10 to-transparent bg-clip-text text-transparent leading-none absolute left-1/2 -translate-x-1/2 bottom-32 md:bottom-28 font-extrabold tracking-tighter pointer-events-none select-none text-center px-4 transition-colors duration-300"
          style={{
            fontSize: 'clamp(3rem, 12vw, 10rem)',
            maxWidth: '95vw'
          }}
        >
          {brandName.toUpperCase()}
        </div>

        {/* Bottom logo - Reduced size */}
        <div className="absolute bottom-16 md:bottom-14 left-1/2 -translate-x-1/2 z-[0] transition-all duration-300 hover:scale-110 drop-shadow-2xl">
          <div className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 flex items-center justify-center">
            {brandIcon || (
              <Award className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 text-white transition-colors duration-300" />
            )}
          </div>
        </div>

      </footer>
    </section>
  );
};