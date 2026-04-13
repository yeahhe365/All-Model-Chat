import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const animationsPath = path.join(projectRoot, 'src/styles/animations.css');
const mainCssPath = path.join(projectRoot, 'src/styles/main.css');
const historySidebarPath = path.join(projectRoot, 'src/components/sidebar/HistorySidebar.tsx');
const chatAreaPath = path.join(projectRoot, 'src/components/layout/ChatArea.tsx');
const welcomeScreenPath = path.join(projectRoot, 'src/components/chat/message-list/WelcomeScreen.tsx');

describe('animation utility coverage', () => {
  it('defines local entry animation utilities used across the UI', () => {
    const css = fs.readFileSync(animationsPath, 'utf8');

    expect(css).toContain('.animate-in');
    expect(css).toContain('.fade-in');
    expect(css).toContain('.zoom-in');
    expect(css).toContain('.zoom-in-95');
    expect(css).toContain('.slide-in-from-top-1');
    expect(css).toContain('.slide-in-from-top-4');
    expect(css).toContain('.slide-in-from-bottom-2');
    expect(css).toContain('.slide-in-from-left-1');
  });

  it('provides a reduced-motion fallback for animated surfaces', () => {
    const css = fs.readFileSync(animationsPath, 'utf8');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('removes stale message entry utility selectors that are no longer wired into the UI', () => {
    const css = fs.readFileSync(animationsPath, 'utf8');

    expect(css).not.toContain('.message-smooth-entry');
    expect(css).not.toContain('.message-container-animate');
  });
});

describe('motion-sensitive UI behavior', () => {
  it('lets the welcome screen opt out of the typewriter effect for reduced-motion users', () => {
    const source = fs.readFileSync(welcomeScreenPath, 'utf8');

    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(source).toContain('if (prefersReducedMotion) {');
  });
});

describe('theme transition scope', () => {
  it('does not animate every div in the application during theme updates', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');

    expect(css).not.toMatch(/body,\s*#root,\s*div,\s*header/s);
  });

  it('limits theme transitions to dedicated surfaces instead of broad layout tags', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');

    expect(css).not.toMatch(/body,\s*#root,\s*header,\s*main/s);
    expect(css).toMatch(/body,\s*#root,\s*\.theme-transition-colors/s);
  });
});

describe('layout animation guardrails', () => {
  it('restores a dedicated desktop width transition without coupling it to transform hints', () => {
    const source = fs.readFileSync(historySidebarPath, 'utf8');

    expect(source).toContain('md:transition-[width]');
    expect(source).toContain('transition-transform');
    expect(source).not.toContain('transition-[width,transform]');
    expect(source).not.toContain('will-change-[width,transform]');
  });

  it('keeps desktop full and mini sidebar shells mounted so opacity can animate between them', () => {
    const source = fs.readFileSync(historySidebarPath, 'utf8');

    expect(source).toContain("md:absolute md:inset-0 transition-opacity");
    expect(source).toContain("hidden md:flex absolute inset-0");
    expect(source).not.toContain('{isOpen ? (');
  });

  it('does not keep chat area on width-based will-change hints', () => {
    const source = fs.readFileSync(chatAreaPath, 'utf8');

    expect(source).not.toContain('will-change-[width]');
  });
});

describe('sidebar backdrop behavior', () => {
  it('keeps the mobile backdrop mounted so exit opacity can animate', () => {
    const mainContentPath = path.join(projectRoot, 'src/components/layout/MainContent.tsx');
    const source = fs.readFileSync(mainContentPath, 'utf8');

    expect(source).toContain("opacity-100 pointer-events-auto");
    expect(source).toContain("opacity-0 pointer-events-none");
    expect(source).not.toContain('uiState.isHistorySidebarOpen && (');
  });
});
