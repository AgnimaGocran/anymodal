# AnyModal

This library allows you to centrally manage modal windows with strict typing in your React app. You can pass any typed data to a modal window.

## Installation

```bash
bun add anymodal-ts
yarn add anymodal-ts
```

## Setup

**Initialize the modal manager:**

Create a file, for example, in `@/lib/modals.ts`, and define all your possible modals:

```ts
import anyModal from 'anymodal-ts';

const modals = anyModal<
  | { type: 'view-article'; articleId: number }
  | { type: 'new-article'; categoryId: number }
  | {
      type: 'another-modal';
      param1: string;
      param2: number;
      param3: number[];
    }
>();

export default modals;
```

**Add `ModalContainer` and register modals:**

Place the `ModalContainer` component in the root of your application (e.g., in `layout.tsx`) and import the registry file.

```tsx
// layout.tsx
import modals from '@/lib/modals';
import '@/components/modals/registry'; // Import to register all modals

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <html>
    <body>
      {children}
      <modals.ModalContainer />
    </body>
  </html>
}
```

## Creating Modals

Create a component for each modal.

**Example for `view-article`:**

```tsx
// @/components/modals/view-article.tsx
import modals from '@/lib/modals';
import ReactModal from 'react-modal';

export default modals.create(
  'view-article',
  ({ modal: { articleId } }) => <ReactModal
    isOpen={true}
    onRequestClose={() => modals.prev()}
  >
    <h2>Article #{articleId}</h2>
    <p>This is the content of the article.</p>
    <button onClick={() => modals.close()}>
      Close All Modals
    </button>
  </ReactModal>
);
```

**Register your modals:**

Create a "registry" file that simply imports all your modal components. This ensures that they are registered when the app starts.

```tsx
// @/components/modals/registry.tsx
import './view-article';
import './new-article';
// ... import all other modals
```

## Usage

You can now call your modals from any component.

```tsx
import modals from '@/lib/modals';

export default function MyPageComponent() {
  return <div>
    <button
      onClick={() =>
        modals.show({
          type: 'view-article',
          articleId: 15,
        })
      }
    >
      View article
    </button>
    <button
      onClick={() =>
        modals.show({
          type: 'new-article',
          categoryId: 6,
        })
      }
    >
      New article
    </button>
  </div>
}
```

## API Reference

The `anyModal` instance returns the following methods:

* `show(modal)`: Opens a new modal. If another modal is already open, it's added to a stack.
* `prev()`: Closes the current modal and opens the previous one from the stack. Ideal for "Back" buttons or closing with the `Esc` key.
* `close()`: Closes all modals and clears the stack. Use this for "Close" buttons (like a cross icon) or for actions that should exit the entire modal flow.
* `create(type, Component)`: Registers a component for a specific modal type.
* `createWithFetch(type, fetcher, Component)`: Registers a component that needs to fetch data before rendering.

## Fetching Data

You can use `createWithFetch` to create modals that load data from an API.

```ts
// @/components/modals/view-article-with-fetch.tsx
import modals from '@/lib/modals';
import ReactModal from 'react-modal';

async function fetchMyArticle(articleId: number) {
  const response = await fetch(
    `https://api.example.com/articles/${articleId}`
  );
  return response.json();
}

export default modals.createWithFetch(
  'view-article',
  ({ articleId }) => fetchMyArticle(articleId),
  ({
    modal: { articleId },
    data: article,
  }) => <ReactModal
    isOpen={true}
    onRequestClose={() => modals.prev()}
  >
    <h2>
      {article.title} (Article #{articleId})
    </h2>
    <p>{article.content}</p>
  </ReactModal>
);