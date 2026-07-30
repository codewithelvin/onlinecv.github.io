import type { CSSProperties } from 'react';
import { useResponsive } from './useResponsive';
import { getModalContainer } from '../utils/modal-container';

/**
 * The chrome every Ant Design `Modal` in this app shares, so the three of them
 * (item editors, avatar cropper, template gallery) cannot drift apart.
 *
 * `app-modal` is the opt-in marker for the layout in `index.css`: the dialog is
 * capped to the viewport and becomes a flex column, so the title and the action
 * buttons stay put and only the body between them scrolls. Without it a tall
 * dialog simply grows and the whole thing scrolls inside `.ant-modal-wrap`,
 * which carries Save and Cancel off the bottom of the screen. It also keeps the
 * rules OFF `Modal.confirm`, which has no header or scroll area to speak of.
 *
 * Below `lg` a modal is FULL-SCREEN (spec §10.3) and loses its close cross: at
 * that size the dialog IS the screen, a 22px × in the corner is under the
 * minimum touch target, and there is no mask left around it to make "this is a
 * layer you can leave" legible. The footer buttons carry the exit instead —
 * which is why a modal that hides the cross must have one (`TemplatePicker`
 * grows a Close button on mobile for exactly this reason).
 *
 * Only the parts that need a prop live here; the geometry is CSS, so it tracks
 * the viewport — including a phone's collapsing toolbar — without a re-render.
 */
export interface ModalChrome {
  /** True while the modal is drawn full-screen. */
  fullScreen: boolean;
  /** Spread onto the `Modal`. */
  modalProps: {
    className?: string;
    closable: boolean;
    width?: number | string;
    style: CSSProperties;
    getContainer: () => HTMLElement;
  };
}

export function useModalChrome(desktopWidth?: number): ModalChrome {
  const { isMobile } = useResponsive();
  return {
    fullScreen: isMobile,
    modalProps: {
      className: isMobile ? 'app-modal modal-fullscreen' : 'app-modal',
      closable: !isMobile,
      width: isMobile ? '100%' : desktopWidth,
      // Full-screen placement is CSS; on desktop the dialog just sits a little
      // higher than antd's default 100px so tall forms have more room.
      style: isMobile ? {} : { top: 32 },
      getContainer: getModalContainer,
    },
  };
}
