import React, { type ReactNode } from 'react';
type TFetcherFn<M> = (m: M) => Promise<any>;
type TFetcherFns<M> = readonly TFetcherFn<M>[];
type TDataArray<F extends TFetcherFns<any>> = {
    -readonly [I in keyof F]: Awaited<ReturnType<F[I]>>;
};
type TUpdateFns<F extends TFetcherFns<any>> = {
    -readonly [I in keyof F]: () => Promise<void>;
};
export default function anyModal<AnyModals extends {
    type: string;
}>(loaderNode?: (modal: AnyModals) => ReactNode | null, errorNode?: (error: Error) => ReactNode | null): {
    show: (modal: AnyModals) => void;
    prev: () => void;
    close: () => void;
    create: <T extends NonNullable<AnyModals>["type"]>(type: T, Body: React.FC<{
        modal: Extract<NonNullable<AnyModals>, {
            type: T;
        }>;
    }>) => void;
    createWithFetch: {
        <K extends NonNullable<AnyModals>["type"], F extends TFetcherFn<Extract<AnyModals, {
            type: K;
        }>>>(kind: K, fetcher: F, Body: React.FC<{
            modal: Extract<AnyModals, {
                type: K;
            }>;
            data: Awaited<ReturnType<F>>;
            update: () => Promise<void>;
            updateAll: () => Promise<void>;
        }>): void;
        <K extends NonNullable<AnyModals>["type"], F extends TFetcherFns<Extract<AnyModals, {
            type: K;
        }>>>(kind: K, fetchers: F, Body: React.FC<{
            modal: Extract<AnyModals, {
                type: K;
            }>;
            data: TDataArray<F>;
            update: TUpdateFns<F>;
            updateAll: () => Promise<void>;
        }>): void;
    };
    modalsState: {
        modal: AnyModals | null;
        modalsStack: AnyModals[];
    };
    ModalContainer: () => import("react/jsx-runtime").JSX.Element | null;
};
export {};
