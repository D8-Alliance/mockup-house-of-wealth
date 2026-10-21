import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a modal at the end of <body>. A page wrapped in an animation with a transform traps
 * position:fixed children under the sticky header; a portal lifts the modal above everything.
 */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(children, document.body);
