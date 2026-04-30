/* eslint-disable react-hooks/refs */
import React from 'react';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import type { ChatInputViewModel } from './ChatInputViewContext';

interface HiddenFileInputsProps {
  fileInputs: ChatInputViewModel['fileInputs'];
}

export const HiddenFileInputs: React.FC<HiddenFileInputsProps> = ({ fileInputs }) => (
  <>
    <input
      type="file"
      ref={fileInputs.fileInputRef}
      onChange={fileInputs.handleFileChange}
      accept={ALL_SUPPORTED_MIME_TYPES.join(',')}
      className="hidden"
      aria-hidden="true"
      multiple
    />
    <input
      type="file"
      ref={fileInputs.imageInputRef}
      onChange={fileInputs.handleFileChange}
      accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')}
      className="hidden"
      aria-hidden="true"
      multiple
    />
    <input
      type="file"
      ref={fileInputs.folderInputRef}
      onChange={fileInputs.handleFolderChange}
      className="hidden"
      aria-hidden="true"
      {...({ webkitdirectory: '', directory: '' } as { webkitdirectory: string; directory: string })}
      multiple
    />
    <input
      type="file"
      ref={fileInputs.zipInputRef}
      onChange={fileInputs.handleZipChange}
      accept=".zip"
      className="hidden"
      aria-hidden="true"
    />
    <input
      type="file"
      ref={fileInputs.cameraInputRef}
      onChange={fileInputs.handleFileChange}
      accept="image/*"
      capture="environment"
      className="hidden"
      aria-hidden="true"
    />
  </>
);
