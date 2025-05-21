import React, { useState } from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ onFileContent }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };
  
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };
  
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      onFileContent(content);
    };
    reader.readAsText(file);
  };
  
  return (
    <div
      className={`relative border-2 border-dashed ${
        isDragging ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
      } rounded-md p-6 flex flex-col items-center justify-center`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="h-8 w-8 text-gray-400 mb-2" />
      <p className="text-sm text-gray-500">
        Drag and drop transcript file, or <span className="text-blue-600">browse</span>
      </p>
      <input
        type="file"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={handleFileInput}
        accept=".txt,.doc,.docx,.pdf"
      />
    </div>
  );
};

export default FileUpload;
