import type { ReactNode } from 'react';
import { useSnapshot } from 'valtio/react';
import { useAsync } from '@siberiacancode/reactuse';
import { proxy } from 'valtio';

export default function anyModal<AnyModals extends { type: string }>(
	loaderNode: (modal: AnyModals) => ReactNode | null = () => null,
	errorNode: (error: Error) => ReactNode | null = () => null
) {
	const modalsState = proxy<{
		modal: AnyModals | null;
		modalsStack: AnyModals[];
	}>({
		modal: null,
		modalsStack: [],
	});

	type ExtractModal<T extends NonNullable<AnyModals>['type']> = Extract<NonNullable<AnyModals>, { type: T }>;

	interface ModalProps<T extends NonNullable<AnyModals>['type']> {
		type: T;
		render: (modal: ExtractModal<T>) => ReactNode;
	}

	function show(modal: AnyModals) {
		if (modalsState.modal) {
			modalsState.modalsStack.push(modalsState.modal);
		}
		modalsState.modal = modal;
	}

	function prev() {
		modalsState.modal = modalsState.modalsStack.pop() || null;
	}

	function closeAll() {
		modalsState.modalsStack = [];
		modalsState.modal = null;
	}

	function Modal<T extends NonNullable<AnyModals>['type']>({ type, render }: ModalProps<T>) {
		const { modal } = useSnapshot(modalsState);

		if (!modal || modal.type !== type) {
			return null;
		}

		return render(modal as ExtractModal<T>);
	}

	function create<T extends NonNullable<AnyModals>['type']>(
		type: T,
		Body: React.FC<{ modal: ExtractModal<T> }>
	) {
		return function Wrapper() {
			return <Modal
				type={type}
				render={(modal) => <Body modal={modal} />}
			/>;
		};
	}

	type ModalType = NonNullable<AnyModals>['type'];
	type ModalOf<K extends ModalType> = Extract<AnyModals, { type: K }>;

	type Result<F> =
	F extends readonly (infer P)[]
	? { [I in keyof F]: Awaited<F[I]> }
	: never;

	function createWithFetch<
	K extends ModalType,
	F
	>(
		kind: K,
		fetchersFn: (m: ModalOf<K>) => F,
	  Body: React.FC<{
		  modal: ModalOf<K>;
		  data: Result<F>;
	  }>
	) {
		function ModalContent({ modal }: { modal: ModalOf<K> }) {
			const { isLoading, data, error } = useAsync<Result<F>>(
				async () => {
					const promises = fetchersFn(modal) as unknown as readonly unknown[];
					return await Promise.all(
						promises as readonly unknown[]
					) as unknown as Result<F>;
				},
				[modal],
			);

			if (error) {
				return errorNode(error);
			}

			if (isLoading || !data) {
				return loaderNode(modal);
			}

			return <Body modal={modal} data={data} />;
		}

		return function Wrapper() {
			return <Modal
				type={kind}
				render={(modal) => <ModalContent modal={modal} />}
			/>;
		};
	}

	return {
		show,
		prev,
		closeAll,
		create,
		createWithFetch,
		modalsState,
	};
}