import '@testing-library/jest-dom';
import i18n from './i18n';

// Reset i18n language to English before every test to prevent state bleed
beforeEach(async () => {
  vi.resetAllMocks();
  if (i18n.isInitialized) {
    await i18n.changeLanguage('en');
  }
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
