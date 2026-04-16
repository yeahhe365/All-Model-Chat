import React from 'react';
import { Modal } from '../shared/Modal';

interface TextEditorModalShellProps {
  onClose: () => void;
  contentClassName: string;
  header: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
}

export const TextEditorModalShell: React.FC<TextEditorModalShellProps> = ({
  onClose,
  contentClassName,
  header,
  body,
  footer,
}) => {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      noPadding
      contentClassName={contentClassName}
    >
      {header}
      {body}
      {footer}
    </Modal>
  );
};
