"use client";

import React from "react";

export default function Footer() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .site-footer {
          width: 100%;
          padding: 12px 20px;
          margin-top: auto;
          background-color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          text-align: center;
          font-family: Inter, ui-sans-serif, -apple-system, system-ui, sans-serif;
          z-index: 40;
          box-sizing: border-box;
        }

        .dark .site-footer {
          background-color: rgba(15, 23, 42, 0.8);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
        }

        .dark .footer-content {
          color: #94a3b8;
        }

        .footer-text {
          margin: 0;
          padding: 0;
          display: inline-flex;
          align-items: center;
        }

        .footer-link {
          color: inherit;
          font-weight: 500;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.15s ease, text-decoration-color 0.15s ease;
        }

        .dark .footer-link {
          color: inherit;
        }

        .footer-link:hover {
          color: #0f172a;
          text-decoration-color: #0f172a;
        }

        .dark .footer-link:hover {
          color: #f1f5f9;
          text-decoration-color: #f1f5f9;
        }


        .footer-divider {
          color: #cbd5e1;
          user-select: none;
        }

        .dark .footer-divider {
          color: #475569;
        }

        @media (max-width: 640px) {
          .site-footer {
            padding: 20px 16px;
          }
          .footer-content {
            flex-direction: column;
            gap: 10px;
          }
          .footer-divider {
            display: none;
          }
        }
      `}} />
      <footer className="site-footer">
        <div className="footer-content">
          <p className="footer-text">
            Images from&nbsp;
            <a
              href="https://www.magnific.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Freepik - Magnific.com
            </a>
          </p>
          <span className="footer-divider" aria-hidden="true">|</span>
          <p className="footer-text">
            Vectors from&nbsp;
            <a
              href="https://www.vecteezy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Vecteezy.com
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

