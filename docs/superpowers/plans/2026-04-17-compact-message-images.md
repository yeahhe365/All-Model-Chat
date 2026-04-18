# Compact Message Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make message images consume less vertical space while preserving click-to-preview behavior.

**Architecture:** Tighten single-image attachment sizing in the shared file renderer, add a dedicated strip-style layout for non-grid multi-image galleries, and cap Markdown-rendered images globally in CSS. Keep the fullscreen preview flow untouched so only in-bubble presentation changes.

**Tech Stack:** React 18, Vite, Vitest, Tailwind CSS, plain CSS

---

### Task 1: Lock The New Image Presentation With Tests

**Files:**
- Create: `src/components/message/FileDisplay.test.tsx`
- Create: `src/components/message/content/MessageFiles.test.tsx`
- Create: `src/__tests__/markdownImageStyles.test.ts`

- [ ] **Step 1: Write the failing attachment image sizing test**

```tsx
it('uses a tighter max height for standalone message images', () => {
  render(<FileDisplay file={imageFile} onFileClick={() => {}} isFromMessageList />);
  expect(screen.getByRole('img')).toHaveClass('max-h-56');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/message/FileDisplay.test.tsx`
Expected: FAIL because the image still uses `max-h-80`

- [ ] **Step 3: Write the failing multi-image strip layout test**

```tsx
it('renders non-quad multi-image rows as fixed-height cover thumbnails', () => {
  render(<MessageFiles files={[firstImage, secondImage]} ... />);
  expect(container.querySelector('.h-40')).not.toBeNull();
  expect(screen.getAllByRole('img')[0]).toHaveClass('object-cover');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- src/components/message/content/MessageFiles.test.tsx`
Expected: FAIL because the strip items do not yet have fixed height or cover styling

- [ ] **Step 5: Write the failing Markdown image CSS test**

```ts
it('caps markdown image height and keeps containment styling', () => {
  const css = fs.readFileSync(markdownCssPath, 'utf8');
  expect(css).toContain('max-height: 320px;');
  expect(css).toContain('object-fit: contain;');
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/__tests__/markdownImageStyles.test.ts`
Expected: FAIL because `.markdown-body img` has no height cap yet

### Task 2: Implement The Minimal UI Changes

**Files:**
- Modify: `src/components/message/FileDisplay.tsx`
- Modify: `src/components/message/content/MessageFiles.tsx`
- Modify: `src/styles/markdown.css`

- [ ] **Step 1: Tighten standalone attachment image sizing**

```tsx
className={
  isGridView
    ? 'w-full h-full object-cover aspect-square'
    : isStripView
      ? 'h-full w-48 object-cover'
      : 'w-auto h-auto max-w-full max-h-56 object-contain'
}
```

- [ ] **Step 2: Add a dedicated strip-view prop for multi-image rows**

```tsx
interface FileDisplayProps {
  ...
  isStripView?: boolean;
}
```

- [ ] **Step 3: Apply fixed-height cover thumbnails only for non-quad multi-image rows**

```tsx
const isStripImageView = imageFiles.length > 1 && !isQuadImageView;

<div key={file.id} className={isStripImageView ? 'flex-shrink-0 h-40' : 'flex-shrink-0'}>
  <FileDisplay ... isStripView={isStripImageView} />
</div>
```

- [ ] **Step 4: Cap Markdown image height globally**

```css
.markdown-body img {
  max-width: 100%;
  max-height: 320px;
  height: auto;
  object-fit: contain;
  background-color: var(--theme-bg-tertiary);
}
```

### Task 3: Verify The Behavior

**Files:**
- Test: `src/components/message/FileDisplay.test.tsx`
- Test: `src/components/message/content/MessageFiles.test.tsx`
- Test: `src/__tests__/markdownImageStyles.test.ts`

- [ ] **Step 1: Run the focused image regression tests**

Run: `npm test -- src/components/message/FileDisplay.test.tsx src/components/message/content/MessageFiles.test.tsx src/__tests__/markdownImageStyles.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: PASS
