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
 * Below `lg` a modal is FULL-SCREEN (spec §10.3): at that size the dialog IS the
 * screen, so its geometry — not just its cross — differs.
 *
 * NO close cross, at any size. A dialog in this app offers its exit in the
 * footer, where the other decisions are: on a phone a 22px × in the corner is
 * under the minimum touch target and there is no mask left around it to make
 * "this is a layer you can leave" legible, and on desktop a second, smaller,
 * unlabelled way out sitting diagonally opposite Cancel only splits attention.
 * Escape and the mask still close a dialog on desktop.
 *
 * The rule this creates: EVERY modal must carry a footer button that closes it
 * (`TemplatePicker` has no Save, so it grows a Close button).
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
      closable: false,
      width: isMobile ? '100%' : desktopWidth,
      // Full-screen placement is CSS; on desktop the dialog just sits a little
      // higher than antd's default 100px so tall forms have more room.
      style: isMobile ? {} : { top: 32 },
      getContainer: getModalContainer,
    },
  };
}
