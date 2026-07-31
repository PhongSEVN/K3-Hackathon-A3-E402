import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ShaderCanvas from '../components/shared/ShaderCanvas';
import ImageUploadPanel from '../components/shared/ImageUploadPanel';
import DiagnosisChatPanel, { type DiagnosisInfo } from '../components/chat/DiagnosisChatPanel';
import { useLanguage } from '../context/LanguageContext';
import './HomePage.css';

const HomePage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [diagnosis, setDiagnosis] = useState<DiagnosisInfo | null>(null);
  // Shared across the upload panel and the chat panel so a case an
  // agronomist reviews (keyed by this same session_id in Feedback) can send
  // their reply into this exact chat thread.
  const sessionIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll('.animate-item');
      gsap.fromTo(elements,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, []);

  return (
    <div className="home-page" ref={containerRef}>
      <div className="shader-bg animate-fade-in-up">
        <ShaderCanvas />
      </div>

      <div className="home-content">
        <div className="greeting-section animate-item">
          <h1 className="font-display-lg greeting-title">
            {t.home.greeting}
          </h1>
        </div>

        <div className="split-panels animate-item">
          <div className="split-panel split-panel-upload">
            <ImageUploadPanel sessionId={sessionIdRef.current} onPredicted={setDiagnosis} />
          </div>
          <div className="split-panel split-panel-prompt">
            <DiagnosisChatPanel sessionId={sessionIdRef.current} diagnosis={diagnosis} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
