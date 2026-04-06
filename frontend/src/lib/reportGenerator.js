import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import React from 'react';

/**
 * Captures a given DOM element and downloads it as a PDF.
 * @param {HTMLElement} element - The DOM element to capture.
 * @param {string} filename - The name of the downloaded PDF file.
 */
export const downloadElementAsPDF = async (element, filename = 'report.pdf') => {
  if (!element) return false;
  
  try {
    // Add a temporary class to fix some common html2canvas issues
    element.classList.add('pdf-rendering');
    
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff', // Force white background for PDF
    });
    
    element.classList.remove('pdf-rendering');

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

/**
 * Manually creates and renders a component off-screen, captures it, and destroys it.
 * This is useful for generating a PDF from data without showing it to the user.
 */
export const generatePdfFromComponent = async (Component, props, filename = 'report.pdf') => {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    // Position off-screen but visible, large enough to render fully
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '0';
    container.style.width = '1200px'; 
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    const root = createRoot(container);
    
    // We add a specific callback prop or just wait an arbitrary amount of time 
    // for charts (like Recharts) to finish animating before capturing.
    root.render(
      <div id="pdf-export-container" style={{ padding: '40px', background: 'white', color: 'black' }}>
        <Component {...props} />
      </div>
    );

    // Give it 1.5 seconds to render and animate charts
    setTimeout(async () => {
      try {
        const element = document.getElementById('pdf-export-container');
        if (element) {
          // Recharts animations take about ~1s, so 1.5s usually is enough
          await downloadElementAsPDF(element, filename);
        }
      } catch (err) {
        console.error('Failed to capture component', err);
      } finally {
        root.unmount();
        document.body.removeChild(container);
        resolve(true);
      }
    }, 1500);
  });
};
