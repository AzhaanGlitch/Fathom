import React from 'react';
import { Footer } from './modern-animated-footer';
import { Linkedin, Users, Mail, Github } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FathomFooter = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const socialLinks = [
    {
      icon: <Users className="w-6 h-6" />,
      href: "/members",
      label: "Members",
    },
    {
      icon: <Github className="w-6 h-6" />,
      href: "https://github.com/AzhaanGlitch/Fathom",
      label: "GitHub",
    },
    {
      icon: <Mail className="w-6 h-6" />,
      href: "mailto:guptaparth2209@gmail.com",
      label: "Email",
    },
  ];

  const navLinks = [];

  return (
    <Footer
      brandName="Fathom"
      brandDescription=""
      socialLinks={socialLinks}
      navLinks={navLinks}
      creatorName="Group 01"
      creatorUrl="/FATHOM FINAL PPT.pptx"
      brandIcon={
        <img 
          src="/logo.png" 
          alt="Fathom Logo" 
          className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
        />
      }
    />
  );
};

export default FathomFooter;