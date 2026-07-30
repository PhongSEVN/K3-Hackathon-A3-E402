import React, { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './ImageUploadPanel.css';

const ImageUploadPanel: React.FC = () => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;

    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
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
        <div className="image-preview" onClick={() => inputRef.current?.click()}>
          <img src={previewUrl} alt="Ảnh cây trồng đã chọn" />
          <div className="image-preview-footer">
            <span className="font-label-sm image-file-name">{fileName}</span>
            <button type="button" className="image-remove-btn" onClick={handleRemove} aria-label="Xóa ảnh">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
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
