import React, {
	type ReactNode,
	useEffect,
	useMemo,
	useState,
	useCallback,
	useRef,
} from 'react';
import { proxy, ref } from 'valtio';
import { useSnapshot } from 'valtio/react';

type TFetcherFn<M> = (m: M) => Promise<any>;
type TFetcherFns<M> = readonly TFetcherFn<M>[];

type TDataArray<F extends TFetcherFns<any>> = {
	-readonly [I in keyof F]: Awaited<ReturnType<F[I]>>;
};

type TUpdateFns<F extends TFetcherFns<any>> = {
    -readonly [I in keyof F]: () => Promise<void>;
};

function useMultiAsync<M, F extends TFetcherFns<M>>(
	fetchers: F,
	modal: M
) {
	const [state, setState] = useState<{
		isLoading: boolean;
		error: Error | null;
		data: TDataArray<F> | null;
	}>({
		isLoading: true,
		error: null,
		data: null,
	});

	const promiseFns = useMemo(
		() => fetchers.map((fetcher) => () => fetcher(modal)),
		[modal, fetchers]
	);

	const updateFns = useMemo(
		() =>
			promiseFns.map((_, index) => async () => {
				try {
					const newData = await promiseFns[index]!();
					setState((prevState) => {
						if (!prevState.data) return prevState;
						const updatedData = [...prevState.data] as TDataArray<F>;
						updatedData[index] = newData;
						return { ...prevState, data: updatedData };
					});
				} catch (error) {
					setState((prevState) => ({
						...prevState,
						error: error as Error,
					}));
				}
			}),
		[promiseFns]
	);

	const updateAllFn = useCallback(async () => {
		setState((s) => ({ ...s, isLoading: true, error: null }));
		try {
			const promises = promiseFns.map((fn) => fn());
			const data = (await Promise.all(promises)) as TDataArray<F>;
			setState({ isLoading: false, error: null, data });
		} catch (error) {
			setState({ isLoading: false, error: error as Error, data: null });
		}
	}, [promiseFns]);

	const initialFetchStarted = useRef(false);
	useEffect(() => {
		if (!initialFetchStarted.current) {
			initialFetchStarted.current = true;
			updateAllFn();
		}
	}, [updateAllFn]);

	return { ...state, updateFns, updateAllFn };
}

export default function anyModal<AnyModals extends { type: string }>(
	loaderNode: (modal: AnyModals) => ReactNode | null = () => null,
	errorNode: (error: Error) => ReactNode | null = () => null
) {
	const componentsRegistry = new Map<string, React.FC<any>>();

	const modalsState = proxy<{
		modal: AnyModals | null;
		modalsStack: AnyModals[];
	}>({
		modal: null,
		modalsStack: [],
	});

	type ExtractModal<T extends NonNullable<AnyModals>['type']> = Extract<
		NonNullable<AnyModals>,
		{ type: T }
	>;

	function show(modal: AnyModals) {
		if (modalsState.modal) {
			modalsState.modalsStack.push(modalsState.modal);
		}
		modalsState.modal = ref(modal);
	}

	function prev() {
		modalsState.modal = modalsState.modalsStack.pop() || null;
	}

	function close() {
		modalsState.modalsStack = [];
		modalsState.modal = null;
	}

	function create<T extends NonNullable<AnyModals>['type']>(
		type: T,
		Body: React.FC<{ modal: ExtractModal<T> }>
	) {
		componentsRegistry.set(type, Body);
	}

	type ModalType = NonNullable<AnyModals>['type'];
	type ModalOf<K extends ModalType> = Extract<AnyModals, { type: K }>;

	// Overload for a single fetcher function
	function createWithFetch<
		K extends ModalType,
		F extends TFetcherFn<ModalOf<K>>
	>(
		kind: K,
		fetcher: F,
		Body: React.FC<{
			modal: ModalOf<K>;
			data: Awaited<ReturnType<F>>;
			update: () => Promise<void>;
			updateAll: () => Promise<void>;
		}>
	): void;

	// Overload for an array of fetcher functions
	function createWithFetch<
		K extends ModalType,
		F extends TFetcherFns<ModalOf<K>>
	>(
		kind: K,
		fetchers: F,
		Body: React.FC<{
			modal: ModalOf<K>;
			data: TDataArray<F>;
			update: TUpdateFns<F>;
			updateAll: () => Promise<void>;
		}>
	): void;

	// Implementation
	function createWithFetch<K extends ModalType>(
		kind: K,
		fetcherOrFetchers: TFetcherFn<ModalOf<K>> | TFetcherFns<ModalOf<K>>,
		Body: React.FC<any>
	) {
		const ModalContent: React.FC<{ modal: ModalOf<K> }> = ({ modal }) => {
			const isArray = Array.isArray(fetcherOrFetchers);
			const fetchers = (
				isArray ? fetcherOrFetchers : [fetcherOrFetchers]
			) as TFetcherFns<ModalOf<K>>;

			const { isLoading, data, error, updateFns, updateAllFn } =
				useMultiAsync(fetchers, modal);

			if (error) {
				return errorNode(error);
			}

			if (isLoading || !data) {
				return loaderNode(modal);
			}

			return (
				<Body
					modal={modal}
					data={isArray ? data : data[0]}
					update={isArray ? updateFns : updateFns[0]}
					updateAll={updateAllFn}
				/>
			);
		};

		componentsRegistry.set(kind, ModalContent);
	}

	const ModalContainer = () => {
		const { modal } = useSnapshot(modalsState);

		if (!modal) {
			return null;
		}

		const Component = componentsRegistry.get(modal.type);

		if (!Component) {
			console.warn(
				`[AnyModal] Modal with type "${modal.type}" not found. Make sure it's registered.`
			);
			return null;
		}

		return <Component modal={modal} />;
	};

	return {
		show,
		prev,
		close,
		create,
		createWithFetch,
		modalsState,
		ModalContainer,
	};
}