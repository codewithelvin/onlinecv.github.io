import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary (spec §17): the app never crashes to a blank screen.
 * Renders a localized fallback with a reload action.
 */
class ErrorBoundaryInner extends Component<WithTranslation & { children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the console for diagnostics; never swallow silently.
    console.error('Unhandled error:', error, info.componentStack);
  }

  render(): ReactNode {
    const { t, children } = this.props;
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title={t('errorPage.title')}
          subTitle={t('errorPage.body')}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {t('errorPage.reload')}
            </Button>
          }
        />
      );
    }
    return children;
  }
}

export const ErrorBoundary: ComponentType<{ children: ReactNode }> =
  withTranslation()(ErrorBoundaryInner);
