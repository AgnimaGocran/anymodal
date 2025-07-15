import type { ReactNode } from 'react';
export default function anyModal<AnyModals extends {
    type: string;
}>(loaderNode?: (modal: AnyModals) => ReactNode | null, errorNode?: (error: Error) => ReactNode | null): {
    show: (modal: AnyModals) => void;
    prev: () => void;
    closeAll: () => void;
    create: <T extends NonNullable<AnyModals>["type"]>(type: T, Body: React.FC<{
        modal: Extract<NonNullable<AnyModals>, {
            type: T;
        }>;
    }>) => () => import("react/jsx-runtime").JSX.Element;
    createWithFetch: <K extends NonNullable<AnyModals>["type"], F>(kind: K, fetchersFn: (m: Extract<AnyModals, {
        type: K;
    }>) => F, Body: React.FC<{
        modal: Extract<AnyModals, {
            type: K;
        }>;
        data: F extends readonly (infer P)[] ? { [I in keyof F]: Awaited<F[I]>; } : never;
    }>) => () => import("react/jsx-runtime").JSX.Element;
    modalsState: {
        modal: AnyModals | null;
        modalsStack: AnyModals[];
    };
};
