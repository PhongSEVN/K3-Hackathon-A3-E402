import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ApiError, createPrediction } from '../../lib/api';
import './ImageUploadPanel.css';

interface PredictionState {
  feedbackId: string;
  sessionId: string;
  label: string;
  confidence: number;
  imageUrl: string;
}

interface ImageUploadPanelProps {
  onPredicted?: (prediction: PredictionState | null) => void;
}

const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({ onPredicted }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionState | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const runPrediction = async (file: File) => {
    if (!token) return;

    setIsPredicting(true);
    setPrediction(null);
    setPredictionError(null);
    onPredicted?.(null);
    try {
      const result = await createPrediction(token, file);
      const nextPrediction: PredictionState = {
        feedbackId: result.feedback_id,
        sessionId: result.session_id,
        label: result.predicted_label,
        confidence: result.confidence,
        imageUrl: result.image_url,
      };
      setPrediction(nextPrediction);
      onPredicted?.(nextPrediction);
    } catch (err) {
      setPredictionError(err instanceof ApiError ? err.message : t.home.predictionError);
    } finally {
      setIsPredicting(false);
    }
  };

  const applyFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
    void runPrediction(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    applyFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName(null);
    setPrediction(null);
    setPredictionError(null);
    onPredicted?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className={`image-upload-panel ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-image' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="image-upload-input"
        onChange={handleInputChange}
      />

      {previewUrl ? (
        <div className="image-preview-container">
          <div className="image-preview" onClick={() => inputRef.current?.click()}>
            <img src={previewUrl} alt="Ảnh cây trồng đã chọn" />

            <div className="image-preview-footer">
              <span className="font-label-sm image-file-name">{fileName}</span>
              <button type="button" className="image-remove-btn" onClick={handleRemove} aria-label="Xóa ảnh">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          {(isPredicting || prediction || predictionError) && (
            <div className={`prediction-result ${predictionError ? 'prediction-result-error' : ''}`}>
              {isPredicting && <span className="font-label-sm">{t.home.analyzing}</span>}
              {!isPredicting && prediction && (
                <span className="font-label-sm font-medium" style={{ fontSize: '14px' }}>
                  Chuẩn đoán: {prediction.label.replaceAll('_', ' ')} ({(prediction.confidence * 100).toFixed(0)}%)
                </span>
              )}
              {!isPredicting && predictionError && <span className="font-label-sm">{predictionError}</span>}
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="image-upload-trigger" onClick={() => inputRef.current?.click()}>
          <span className="material-symbols-outlined upload-icon">upload</span>
          <span className="font-body-md upload-title">{t.home.uploadTitle}</span>
          <span className="font-label-sm upload-subtitle">{t.home.uploadSubtitle}</span>
        </button>
      )}
    </div>
  );
};

export default ImageUploadPanel;
