# AnyModal

This library allows you to centrally manage modal windows with strict typing in your React app. You can pass any typed data to a modal window.

## Installation

```bash
bun add anymodal-ts
yarn add anymodal-ts
```

## Setup

Set up the modal manager anywhere in your project (for example, in `@/modals/modals.ts`):

```ts
import anyModal from 'anymodal-ts';

const modals = anyModal<
    | { type: 'view-article', articleId: number }
    | { type: 'new-article', categoryId: number }
    | { type: 'another-modal', param1: string, param2: number, param3: number[] }
>();

export default modals;
```

## Create a modals

Create modal `@/modals/view-article.ts` (use modal component from any library, example with ReactModal):

```ts
export default modals.create('view-article', ({ modal: { articleId } }) => {
    return <ReactModal
        onRequestClose={() => modals.prev()}
        shouldCloseOnEsc={true}
        isOpen={true} // Modal renders only when invoked, so no need to manage this manually
    >
        Your content of the view-article modal of article #{articleId} 
    </ReactModal>;
});
```

## Modals loader

Create a loader file, such as `@/modals/loader.ts`, to register your modals and configure the modal library (make sure to invoke this component in your layout or app root):

```ts
'use client';

import ViewArticle from '@/modals/view-article';
import NewArticle from '@/modals/new-article';
import AnotherModal from '@/modals/another-modal';
import { useEffect } from 'react';
import ReactModal from 'react-modal';

export default function ModalsLoader() {
    useEffect(() => {
        ReactModal.setAppElement('#modal-root');
    }, []);

    return <>
        <ViewArticle/>
        <NewArticle/>
        <AnotherModal/>
        <div id="modal-root"></div>
    </>;
}
```

## Usage

In any component or page:

```ts
import modals from '@modals/modals';

export default MyPageComponent() {
    return <div>
        <button onClick={() => modals.show({ type: 'view-article', articleId: 15 })}>
            View article
        </button>
        <button onClick={() => modals.show({ type: 'new-article', categoryId: 6 })}>
            New article
        </button>
        <button onClick={() => modals.show({ type: 'another-modal', param1: 'param1', param2: 2, param3: [3, 2, 1] })}>
            Another modal
        </button>
    </div>;
}
```