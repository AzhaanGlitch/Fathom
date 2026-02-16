import React from 'react';
import { Footer } from './modern-animated-footer';
import { Linkedin, Github, Mail } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FathomFooter = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const socialLinks = [
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
      creatorUrl="https://www.linkedin.com/in/parth-gupta-4598b8324/"
      brandIcon={
        <img 
          src="/logo.png" 
          alt="Fathom Logo" 
          className="w-full h-full object-cover rounded-xl drop-shadow-lg" 
        />
      }
    />
  );
};

export default FathomFooter;