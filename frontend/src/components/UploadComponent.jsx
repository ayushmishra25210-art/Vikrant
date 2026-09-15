import { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

export default function UploadComponent({ file, onFileSelected, accept = 'application/pdf', progress = null }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onFileSelected(files[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-navy-600 bg-navy-50' : 'border-gray-300 bg-surface hover:bg-gray-100'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {!file ? (
          <>
            <UploadCloud className="mx-auto text-navy-600 mb-2" size={30} />
            <p className="text-[14px] text-gray-700 font-medium">Click to select a PDF file or drag and drop here</p>
            <p className="text-[12px] text-gray-500 mt-1">Maximum file size: 25 MB. Only PDF documents are accepted.</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText className="text-navy-600" size={26} />
            <div className="text-left">
              <p className="text-[13.5px] font-medium text-gray-900">{file.name}</p>
              <p className="text-[11.5px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelected(null);
              }}
              className="text-gray-400 hover:text-danger"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-[11.5px] text-gray-600 mb-1">
            <span>Uploading and encrypting...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-navy-600 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
