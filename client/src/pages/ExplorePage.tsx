import React, { useEffect, useRef } from 'react';
import BentoCard from '../components/shared/BentoCard';
import PromptBar from '../components/shared/PromptBar';
import './ExplorePage.css';

const ExplorePage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.explore-card');
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      cards.forEach(card => observer.observe(card));
      
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="explore-page" ref={containerRef}>
      <section className="hero-section">
        <h1 className="font-display-lg text-on-surface">Meet Gemini, your personal AI assistant</h1>
        <p className="font-body-md text-secondary hero-subtitle">
          Explore the possibilities of generative AI. From crafting complex code to writing creative stories, discover how Gemini can enhance your productivity and creativity.
        </p>
      </section>

      <div className="search-bar-wrapper">
        <PromptBar />
      </div>

      <div className="bento-grid-container">
        <BentoCard className="explore-card col-span-8 creative-card">
          <div className="bg-glow"></div>
          <div className="card-header">
            <div>
              <span className="badge font-label-md">Creative</span>
              <h2 className="font-headline-md">Writing & Drafting</h2>
            </div>
            <span className="material-symbols-outlined icon-large">edit_note</span>
          </div>
          <div className="examples-grid">
            <div className="example-item">
              <p className="font-label-md title">Outline a blog post</p>
              <p className="desc">"Create a structure for an article about sustainable living..."</p>
            </div>
            <div className="example-item">
              <p className="font-label-md title">Refine my email</p>
              <p className="desc">"Make this email sound more professional and concise..."</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="explore-card col-span-4 image-gen-card">
          <div className="card-bg"></div>
          <div className="gradient-overlay"></div>
          <div className="card-content-bottom">
            <span className="material-symbols-outlined text-white">image</span>
            <h3 className="font-headline-md text-white">Image Generation</h3>
            <p className="font-label-md text-white-80">Visualize your wildest ideas instantly</p>
          </div>
        </BentoCard>

        <BentoCard className="explore-card col-span-4 coding-card">
          <div className="icon-box">
            <span className="material-symbols-outlined">code</span>
          </div>
          <h3 className="font-headline-md">Coding & Logic</h3>
          <p className="font-body-md text-secondary desc">Debug, refactor, or build from scratch in seconds across 20+ languages.</p>
          
          <div className="code-snippets">
            <div className="snippet">
              <span className="lang font-mono text-google-blue">Python</span>
              <span className="text">Write a web scraper...</span>
            </div>
            <div className="snippet">
              <span className="lang font-mono text-google-blue">React</span>
              <span className="text">Create a reusable hook...</span>
            </div>
            <div className="snippet">
              <span className="lang font-mono text-google-blue">SQL</span>
              <span className="text">Optimize this query...</span>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="explore-card col-span-4 analysis-card bg-white">
          <div className="card-header-small">
            <div className="icon-circle bg-tertiary-fixed text-on-tertiary-fixed-variant">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h3 className="font-headline-md">Data Analysis</h3>
          </div>
          <p className="font-body-md text-secondary desc">Upload a spreadsheet and get insights, charts, and summaries instantly.</p>
          
          <div className="upload-box">
            <div className="upload-content">
              <span className="material-symbols-outlined icon">upload_file</span>
              <p className="font-label-md text">Drop files here</p>
            </div>
          </div>
        </BentoCard>

        <div className="col-span-4 stacked-cards">
          <BentoCard className="explore-card stacked-item border-blue">
            <p className="font-label-md text-google-blue mb-1">Learning</p>
            <p className="font-headline-md text-on-surface">Explain Quantum Physics like I'm 5</p>
          </BentoCard>
          <BentoCard className="explore-card stacked-item border-secondary">
            <p className="font-label-md text-secondary mb-1">Planning</p>
            <p className="font-headline-md text-on-surface">3-day itinerary for Tokyo</p>
          </BentoCard>
          <BentoCard className="explore-card stacked-item border-tertiary">
            <p className="font-label-md text-tertiary mb-1">Lifestyle</p>
            <p className="font-headline-md text-on-surface">Healthy meal plan for vegetarians</p>
          </BentoCard>
        </div>
      </div>
      
      <footer className="explore-footer">
        <div className="links">
          <a href="#">Google Terms</a>
          <a href="#">Google Privacy Policy</a>
        </div>
        <p className="disclaimer">Gemini is AI and can make mistakes. Always check critical information.</p>
      </footer>
    </div>
  );
};

export default ExplorePage;
