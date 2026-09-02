import { type JSX, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Space, Spin, Typography } from 'antd';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { LOCALES } from '../../app/i18n';
import { useResumeStore } from '../../state/store';
import { useResponsive } from '../../hooks/useResponsive';
import { useScrollLock } from '../../hooks/useScrollLock';
import { getModalContainer } from '../../utils/modal-container';
import { HelpBlocks } from './blocks';
import { loadHelpContent, getCachedHelpContent } from './content';
import { useHelpStore } from './help-store';
import { HELP_TOPIC_ICONS } from './icons';
import { DEFAULT_HELP_TOPIC, HELP_TOPICS, type HelpTopicId } from './topics';
import type { HelpContent } from './types';

/**
 * The user guide, over whichever screen the user is on (spec §10.4, FR-19).
 *
 * A `Drawer` rather than a `Modal`, and it matters on the screen this is most
 * often opened from: the editor. A drawer slides in from the side and leaves the
 * page beneath it in place, so someone reading "tick **I currently work here**"
 * can close it and still be looking at the same field. A modal re-centres the
 * world; a guide should not.
 *
 * It is lazily mounted by `App` (`React.lazy`), so neither this component nor the
 * guide's copy is in the entry chunk. Content itself is fetched per language on
 * open — see `content/index.ts`.
 */
export function HelpPanel(): JSX.Element {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const uiLocale = useResumeStore((s) => s.uiLocale);

  const open = useHelpStore((s) => s.open);
  const topic = useHelpStore((s) => s.topic);
  const showTopic = useHelpStore((s) => s.showTopic);
  const showTopicList = useHelpStore((s) => s.showTopicList);
  const closeHelp = useHelpStore((s) => s.closeHelp);

  /**
   * Seeded from the cache so reopening the guide — or switching topic after a
   * language change has already been fetched — paints immediately instead of
   * flashing a spinner over content the browser already has.
   */
  const [content, setContent] = useState<HelpContent | null>(
    () => getCachedHelpContent(uiLocale) ?? null,
  );
  const [failed, setFailed] = useState(false);
  const article = useRef<HTMLDivElement>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const cached = getCachedHelpContent(uiLocale);
    if (cached) {
      setContent(cached);
      setFailed(false);
      return;
    }
    /**
     * `cancelled` rather than an AbortController: this is a dynamic `import()`,
     * which cannot be aborted. What must not happen is a slow fetch for a
     * language the user has already switched away from landing on top of the
     * one they are now reading.
     */
    let cancelled = false;
    setContent(null);
    setFailed(false);
    loadHelpContent(uiLocale)
      .then((loaded) => {
        if (!cancelled) setContent(loaded);
      })
      .catch((error: unknown) => {
        // The reader gets a sentence; the console gets the cause. A guide that
        // fails silently is indistinguishable from a guide that is empty.
        console.error('Could not load the guide', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, uiLocale]);

  /** A new topic starts at its own beginning, not where the last one was scrolled to. */
  useEffect(() => {
    article.current?.scrollTo({ top: 0 });
  }, [topic]);

  const rtl = LOCALES[uiLocale].dir === 'rtl';
  /** On desktop the list is always visible, so "nothing chosen" just means the first topic. */
  const current: HelpTopicId | null = isDesktop ? (topic ?? DEFAULT_HELP_TOPIC) : topic;
  const base = import.meta.env.BASE_URL;

  const nav = content ? (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      {HELP_TOPICS.map((id) => {
        const Icon = HELP_TOPIC_ICONS[id];
        const selected = current === id;
        return (
          <Button
            key={id}
            id={`help-topic-${id}`}
            type={selected ? 'primary' : 'text'}
            block
            aria-current={selected ? 'page' : undefined}
            icon={<Icon aria-hidden />}
            onClick={() => showTopic(id)}
            style={{
              // `start`, not `left` — the list has to read from the right-hand
              // edge in Arabic and Hebrew.
              justifyContent: 'flex-start',
              textAlign: 'start',
              // Auto height so a long translated title wraps instead of being
              // clipped; AZ, RU and DE titles run well past the English ones.
              height: 'auto',
              minHeight: 40,
              paddingTop: 8,
              paddingBottom: 8,
              whiteSpace: 'normal',
            }}
          >
            {content.topics[id]?.title ?? id}
          </Button>
        );
      })}
    </Space>
  ) : null;

  const body = ((): JSX.Element => {
    if (failed) return <Alert type="error" showIcon message={t('help.error')} />;
    if (!content) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin aria-label={t('help.loading')} />
        </div>
      );
    }

    const topicContent = current ? content.topics[current] : undefined;

    /** Phone, nothing chosen: the table of contents IS the screen. */
    if (!topicContent) {
      return (
        <div style={{ padding: 16 }}>
          <Typography.Paragraph type="secondary">{content.intro}</Typography.Paragraph>
          {nav}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {isDesktop ? (
          <nav
            aria-label={t('help.topics')}
            style={{
              flex: '0 0 268px',
              overflowY: 'auto',
              padding: 12,
              borderInlineEnd: '1px solid #f0f0f0',
            }}
          >
            {nav}
          </nav>
        ) : null}
        <div
          id="help-article"
          ref={article}
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: isDesktop ? '8px 24px' : 16 }}
        >
          {isDesktop ? null : (
            <Button
              id="help-back"
              type="text"
              // Mirrored by hand: an arrow is a picture, and `dir` does not turn
              // pictures around.
              icon={rtl ? <FiArrowLeft style={{ transform: 'scaleX(-1)' }} /> : <FiArrowLeft />}
              onClick={showTopicList}
              style={{ marginBottom: 8, paddingInlineStart: 0 }}
            >
              {t('help.topics')}
            </Button>
          )}
          {/* Capped, because a guide read across the full width of a 4K screen is
              a guide nobody finishes a line of. */}
          <div style={{ maxWidth: 720 }}>
            <Typography.Title level={3} style={{ marginTop: 8, fontSize: 20 }}>
              {topicContent.title}
            </Typography.Title>
            <Typography.Paragraph type="secondary">{topicContent.lead}</Typography.Paragraph>
            <HelpBlocks blocks={topicContent.blocks} locale={uiLocale} base={base} />
          </div>
        </div>
      </div>
    );
  })();

  return (
    <Drawer
      open={open}
      onClose={closeHelp}
      // From the side the language ends on, so the panel covers the part of the
      // screen the reader's eye leaves rather than the part it starts from.
      placement={rtl ? 'left' : 'right'}
      width={isDesktop ? 'min(1060px, 100vw)' : '100%'}
      title={content?.title ?? t('help.title')}
      // Same portal host as every modal in the app — see `utils/modal-container`
      // for why AntD's own body scroll-lock is opted out of.
      getContainer={getModalContainer}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      extra={
        <Button
          id="help-page-link"
          size="small"
          icon={<FiExternalLink aria-hidden />}
          href={`${base}${uiLocale}/help${current ? `#${current}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {isDesktop ? t('help.openPage') : null}
        </Button>
      }
    >
      {/* The panel's own stable id lives here rather than on the `Drawer`, which
          does not forward one to the DOM. `#help-panel` existing IS "the guide is
          open", which is what automation needs to assert. */}
      <div
        id="help-panel"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {body}
      </div>
    </Drawer>
  );
}
